import { createHash, randomBytes } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import type postgres from "postgres";
import { enGimnasio } from "@/shared/infrastructure/baseDeDatos";
import type {
  Cuenta,
  HashDeClaves,
  PropositoEnlace,
  RegistroDeIntentos,
  RepositorioCuentas,
  RepositorioEnlaces,
  RepositorioSesiones,
  Tokens,
} from "../application/puertos";

/** Argon2id (el predeterminado) con los parámetros mínimos que recomienda OWASP: 19 MiB, 2 pasadas. */
export const argon2id: HashDeClaves = {
  hash: (clave) => hash(clave, { memoryCost: 19_456, timeCost: 2, parallelism: 1 }),
  verificar: (h, clave) => verify(h, clave).catch(() => false),
};

export const tokensAleatorios: Tokens = {
  nuevo: () => randomBytes(32).toString("base64url"),
  huella: (token) => createHash("sha256").update(token).digest("hex"),
};

type FilaCuenta = { id: string; nombre: string; correo: string | null; usuario: string | null; hash_clave: string | null; estado: Cuenta["estado"] };
const aCuenta = (f: FilaCuenta): Cuenta => ({ id: f.id, nombre: f.nombre, correo: f.correo, usuario: f.usuario, hashClave: f.hash_clave, estado: f.estado });

export class CuentasPostgres implements RepositorioCuentas {
  constructor(private readonly sql: postgres.Sql) {}

  async porId(id: string) {
    const [f] = await this.sql<FilaCuenta[]>`
      SELECT id, nombre, correo, usuario, hash_clave, estado FROM usuario WHERE id = ${id} AND eliminado_en IS NULL`;
    return f ? aCuenta(f) : null;
  }

  async porCorreo(correo: string) {
    const [f] = await this.sql<FilaCuenta[]>`
      SELECT id, nombre, correo, usuario, hash_clave, estado FROM usuario WHERE correo = ${correo} AND eliminado_en IS NULL`;
    return f ? aCuenta(f) : null;
  }

  async porUsuario(usuario: string) {
    const [f] = await this.sql<FilaCuenta[]>`
      SELECT id, nombre, correo, usuario, hash_clave, estado FROM usuario WHERE usuario = ${usuario} AND eliminado_en IS NULL`;
    return f ? aCuenta(f) : null;
  }

  async cambiarUsuario(usuarioId: string, usuario: string | null) {
    await this.sql`UPDATE usuario SET usuario = ${usuario} WHERE id = ${usuarioId}`;
  }

  async crearMiembro(gimnasioId: string, m: { id: string; nombre: string; usuario: string | null; rol: "admin" | "coach" }) {
    await enGimnasio(this.sql, gimnasioId, async (tx) => {
      await tx`INSERT INTO usuario (id, nombre, usuario, estado) VALUES (${m.id}, ${m.nombre}, ${m.usuario}, 'pendiente')`;
      await tx`INSERT INTO usuario_rol (usuario_id, rol_codigo, gimnasio_id) VALUES (${m.id}, ${m.rol}, ${gimnasioId})`;
      if (m.rol === "coach") {
        // Código de invitación sin acentos, como los demás coaches.
        await tx`
          INSERT INTO coach (gimnasio_id, usuario_id, apodo, estado, codigo_invitacion)
          VALUES (${gimnasioId}, ${m.id}, ${m.nombre.split(" ")[0]}, 'aprobado',
                  translate(lower(${m.nombre.split(" ")[0]}), 'áéíóúüñ', 'aeiouun') || '-' || substr(md5(${m.id}), 1, 4))`;
      }
    });
  }

  async esDelGimnasio(usuarioId: string, gimnasioId: string) {
    const [f] = await this.sql`
      SELECT 1 FROM usuario_rol WHERE usuario_id = ${usuarioId} AND gimnasio_id = ${gimnasioId} AND hasta IS NULL LIMIT 1`;
    return Boolean(f);
  }

  async guardarCredenciales(usuarioId: string, acceso: { correo: string | null; usuario: string | null }, hashClave: string) {
    await this.sql`
      UPDATE usuario SET correo = ${acceso.correo}, usuario = ${acceso.usuario}, hash_clave = ${hashClave}, estado = 'activo'
      WHERE id = ${usuarioId} AND estado <> 'suspendido'`;
  }
}

export interface ContextoDeSesion {
  usuarioId: string;
  nombre: string;
  /** Gimnasio donde trabaja o entrena; null si solo administra el sistema. */
  gimnasioId: string | null;
  zonaHoraria: string;
  roles: string[];
  permisos: string[];
  vioBienvenida: boolean;
}

export class SesionesPostgres implements RepositorioSesiones {
  constructor(private readonly sql: postgres.Sql) {}

  async crear(huella: string, usuarioId: string, expiraEn: Date) {
    await this.sql`INSERT INTO sesion (token_hash, usuario_id, expira_en) VALUES (${huella}, ${usuarioId}, ${expiraEn})`;
  }

  async revocar(huella: string) {
    await this.sql`UPDATE sesion SET revocada_en = now() WHERE token_hash = ${huella} AND revocada_en IS NULL`;
  }

  async revocarTodas(usuarioId: string) {
    await this.sql`UPDATE sesion SET revocada_en = now() WHERE usuario_id = ${usuarioId} AND revocada_en IS NULL`;
  }

  /** Quién está detrás de una sesión vigente, con sus roles y permisos. */
  async contexto(huella: string): Promise<ContextoDeSesion | null> {
    const [u] = await this.sql<{ id: string; nombre: string; bienvenida_vista_en: Date | null }[]>`
      SELECT u.id, u.nombre, u.bienvenida_vista_en
      FROM sesion s JOIN usuario u ON u.id = s.usuario_id
      WHERE s.token_hash = ${huella} AND s.revocada_en IS NULL AND s.expira_en > now()
        AND u.estado = 'activo' AND u.eliminado_en IS NULL`;
    if (!u) return null;
    // LEFT JOIN: un rol puede no tener permisos todavía (el de cliente) y aun así cuenta.
    const filas = await this.sql<{ rol: string; gimnasio_id: string | null; zona_horaria: string | null; permiso: string | null }[]>`
      SELECT ur.rol_codigo AS rol, ur.gimnasio_id, g.zona_horaria, rp.permiso_codigo AS permiso
      FROM usuario_rol ur
      LEFT JOIN rol_permiso rp ON rp.rol_codigo = ur.rol_codigo
      LEFT JOIN gimnasio g ON g.id = ur.gimnasio_id
      WHERE ur.usuario_id = ${u.id} AND ur.hasta IS NULL`;
    const delGimnasio = filas.find((f) => f.gimnasio_id);
    return {
      usuarioId: u.id,
      nombre: u.nombre,
      gimnasioId: delGimnasio?.gimnasio_id ?? null,
      zonaHoraria: delGimnasio?.zona_horaria ?? "America/Mexico_City",
      roles: [...new Set(filas.map((f) => f.rol))],
      permisos: [...new Set(filas.flatMap((f) => (f.permiso ? [f.permiso] : [])))],
      vioBienvenida: u.bienvenida_vista_en !== null,
    };
  }

  async marcarBienvenidaVista(usuarioId: string) {
    await this.sql`UPDATE usuario SET bienvenida_vista_en = now() WHERE id = ${usuarioId} AND bienvenida_vista_en IS NULL`;
  }
}

export interface MiembroDelEquipo {
  usuarioId: string;
  nombre: string;
  correo: string | null;
  usuario: string | null;
  estado: Cuenta["estado"];
  roles: string[];
}

/** Coaches y administración del gimnasio, con el estado de su cuenta (solo lectura). */
export class ConsultasEquipo {
  constructor(private readonly sql: postgres.Sql) {}

  async delGimnasio(gimnasioId: string): Promise<MiembroDelEquipo[]> {
    return this.sql<MiembroDelEquipo[]>`
      SELECT u.id AS "usuarioId", u.nombre, u.correo, u.usuario, u.estado, array_agg(ur.rol_codigo ORDER BY ur.rol_codigo) AS roles
      FROM usuario u JOIN usuario_rol ur ON ur.usuario_id = u.id
      WHERE ur.gimnasio_id = ${gimnasioId} AND ur.hasta IS NULL AND ur.rol_codigo <> 'cliente' AND u.eliminado_en IS NULL
      GROUP BY u.id ORDER BY u.nombre`;
  }

  /** Código de invitación del coach para sus clientes; null si no es coach aprobado. */
  async invitacionDe(gimnasioId: string, usuarioId: string): Promise<string | null> {
    const [f] = await enGimnasio(this.sql, gimnasioId, (tx) => tx<{ codigo: string }[]>`
      SELECT codigo_invitacion AS codigo FROM coach
      WHERE gimnasio_id = ${gimnasioId} AND usuario_id = ${usuarioId} AND estado = 'aprobado'`);
    return f?.codigo ?? null;
  }
}

export class EnlacesPostgres implements RepositorioEnlaces {
  constructor(private readonly sql: postgres.Sql) {}

  async crear(e: { huella: string; usuarioId: string; proposito: PropositoEnlace; expiraEn: Date; creadoPor: string | null }) {
    await this.sql`
      INSERT INTO enlace_acceso (token_hash, usuario_id, proposito, expira_en, creado_por)
      VALUES (${e.huella}, ${e.usuarioId}, ${e.proposito}, ${e.expiraEn}, ${e.creadoPor})`;
  }

  async vigente(huella: string, ahora: Date) {
    const [f] = await this.sql<{ usuario_id: string; proposito: PropositoEnlace }[]>`
      SELECT usuario_id, proposito FROM enlace_acceso
      WHERE token_hash = ${huella} AND usado_en IS NULL AND expira_en > ${ahora}`;
    return f ? { usuarioId: f.usuario_id, proposito: f.proposito } : null;
  }

  async consumir(huella: string, ahora: Date) {
    const filas = await this.sql`
      UPDATE enlace_acceso SET usado_en = ${ahora}
      WHERE token_hash = ${huella} AND usado_en IS NULL AND expira_en > ${ahora}
      RETURNING 1`;
    return filas.length === 1;
  }
}

export class IntentosPostgres implements RegistroDeIntentos {
  constructor(private readonly sql: postgres.Sql) {}

  async fallosDesde(correo: string, desde: Date) {
    const [f] = await this.sql<{ n: number }[]>`
      SELECT count(*)::int AS n FROM intento_acceso WHERE correo = ${correo} AND NOT exito AND creado_en >= ${desde}`;
    return f.n;
  }

  async registrar(correo: string, exito: boolean) {
    await this.sql`INSERT INTO intento_acceso (correo, exito) VALUES (${correo}, ${exito})`;
  }
}

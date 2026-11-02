import type postgres from "postgres";
import { enGimnasio } from "@/shared/infrastructure/baseDeDatos";
import type { EstadoCliente } from "../domain/SolicitudCliente";
import type { CoachParaRegistro, NuevoCliente, RepositorioClientes } from "../application/puertos";

export class ClientesPostgres implements RepositorioClientes {
  constructor(private readonly sql: postgres.Sql) {}

  /** Coaches a los que un cliente nuevo se puede registrar (vista pública). */
  async coachesParaRegistro(): Promise<(CoachParaRegistro & { codigo: string })[]> {
    const filas = await this.sql<{ coach_id: string; gimnasio_id: string; apodo: string; codigo: string }[]>`
      SELECT coach_id, gimnasio_id, apodo, codigo FROM coaches_para_registro()`;
    return filas.map((f) => ({ coachId: f.coach_id, gimnasioId: f.gimnasio_id, apodo: f.apodo, codigo: f.codigo }));
  }

  async coachPorCodigo(codigo: string) {
    return (await this.coachesParaRegistro()).find((c) => c.codigo === codigo) ?? null;
  }

  async correoEnUso(correo: string) {
    const [f] = await this.sql`SELECT 1 FROM usuario WHERE correo = ${correo} AND eliminado_en IS NULL`;
    return Boolean(f);
  }

  async registrar(n: NuevoCliente) {
    await enGimnasio(this.sql, n.gimnasioId, async (tx) => {
      await tx`
        INSERT INTO usuario (id, correo, nombre, telefono, hash_clave, estado)
        VALUES (${n.usuarioId}, ${n.correo}, ${n.nombre}, ${n.telefono}, ${n.hashClave}, 'activo')`;
      await tx`INSERT INTO usuario_rol (usuario_id, rol_codigo, gimnasio_id) VALUES (${n.usuarioId}, 'cliente', ${n.gimnasioId})`;
      await tx`
        INSERT INTO cliente (id, gimnasio_id, usuario_id, coach_id, reglamento_version, reglamento_aceptado_en)
        VALUES (${n.clienteId}, ${n.gimnasioId}, ${n.usuarioId}, ${n.coachId}, ${n.reglamentoVersion}, ${n.reglamentoAceptadoEn})`;
      // Primera entrada del historial de coach; la franja la asigna después la administración.
      await tx`
        INSERT INTO asignacion_coach_cliente (id, gimnasio_id, cliente_id, coach_id, desde, motivo)
        VALUES (gen_random_uuid(), ${n.gimnasioId}, ${n.clienteId}, ${n.coachId}, ${n.reglamentoAceptadoEn}, 'Registro con invitación del coach')`;
    });
  }

  async porId(gimnasioId: string, clienteId: string) {
    const [f] = await enGimnasio(this.sql, gimnasioId, (tx) => tx<{ id: string; estado: EstadoCliente }[]>`
      SELECT id, estado FROM cliente WHERE id = ${clienteId} AND gimnasio_id = ${gimnasioId}`);
    return f ?? null;
  }

  async cambiarEstado(gimnasioId: string, clienteId: string, estado: EstadoCliente, revisadoPor: string, en: Date) {
    await enGimnasio(this.sql, gimnasioId, (tx) => tx`
      UPDATE cliente SET estado = ${estado}, revisado_por = ${revisadoPor}, revisado_en = ${en}
      WHERE id = ${clienteId} AND gimnasio_id = ${gimnasioId}`);
  }
}

export interface FilaCliente {
  id: string;
  nombre: string;
  correo: string;
  telefono: string | null;
  coach: string;
  estado: EstadoCliente;
  creadoEn: Date;
}

/** Listas para las pantallas (solo lectura). */
export class ConsultasClientes {
  constructor(private readonly sql: postgres.Sql) {}

  async delGimnasio(gimnasioId: string, estado?: EstadoCliente): Promise<FilaCliente[]> {
    return enGimnasio(this.sql, gimnasioId, (tx) => tx<FilaCliente[]>`
      SELECT cl.id, u.nombre, u.correo, u.telefono, c.apodo AS coach, cl.estado, cl.creado_en AS "creadoEn"
      FROM cliente cl JOIN usuario u ON u.id = cl.usuario_id JOIN coach c ON c.id = cl.coach_id
      WHERE cl.gimnasio_id = ${gimnasioId} ${estado ? tx`AND cl.estado = ${estado}` : tx``}
      ORDER BY cl.creado_en DESC`);
  }

  async delCoach(gimnasioId: string, usuarioCoachId: string): Promise<FilaCliente[]> {
    return enGimnasio(this.sql, gimnasioId, (tx) => tx<FilaCliente[]>`
      SELECT cl.id, u.nombre, u.correo, u.telefono, c.apodo AS coach, cl.estado, cl.creado_en AS "creadoEn"
      FROM cliente cl JOIN usuario u ON u.id = cl.usuario_id JOIN coach c ON c.id = cl.coach_id
      WHERE cl.gimnasio_id = ${gimnasioId} AND c.usuario_id = ${usuarioCoachId} AND cl.estado IN ('pendiente', 'activo')
      ORDER BY u.nombre`);
  }

  async delUsuario(gimnasioId: string, usuarioId: string): Promise<FilaCliente | null> {
    const [f] = await enGimnasio(this.sql, gimnasioId, (tx) => tx<FilaCliente[]>`
      SELECT cl.id, u.nombre, u.correo, u.telefono, c.apodo AS coach, cl.estado, cl.creado_en AS "creadoEn"
      FROM cliente cl JOIN usuario u ON u.id = cl.usuario_id JOIN coach c ON c.id = cl.coach_id
      WHERE cl.gimnasio_id = ${gimnasioId} AND cl.usuario_id = ${usuarioId}`);
    return f ?? null;
  }
}

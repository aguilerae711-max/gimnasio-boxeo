import type postgres from "postgres";
import { enGimnasio } from "@/shared/infrastructure/baseDeDatos";
import type { PublicacionGuardada, RepositorioNovedades } from "../application/Novedades";
import { audienciasPara, type Audiencia, type Lector, type Publicacion, type TipoPublicacion } from "../domain/Novedades";

export class NovedadesPostgres implements RepositorioNovedades {
  constructor(private readonly sql: postgres.Sql) {}

  async contarClientes(gimnasioId: string, ids: string[]) {
    const [f] = await enGimnasio(this.sql, gimnasioId, (tx) => tx<{ n: number }[]>`
      SELECT count(*)::int AS n FROM cliente WHERE gimnasio_id = ${gimnasioId} AND id IN ${tx(ids)}`);
    return f.n;
  }

  async crear(gimnasioId: string, id: string, p: Publicacion, autorId: string) {
    await enGimnasio(this.sql, gimnasioId, async (tx) => {
      await tx`
        INSERT INTO publicacion (id, gimnasio_id, tipo, titulo, cuerpo, audiencia, fijada, inicio, fin, lugar, cupo, requiere_inscripcion, autor_id, expira_en)
        VALUES (${id}, ${gimnasioId}, ${p.tipo}, ${p.titulo}, ${p.cuerpo}, ${p.audiencia}, ${p.fijada}, ${p.inicio}, ${p.fin}, ${p.lugar},
                ${p.cupo}, ${p.requiereInscripcion}, ${autorId}, ${p.expiraEn})`;
      for (const clienteId of p.menciones) {
        await tx`INSERT INTO mencion (publicacion_id, gimnasio_id, cliente_id) VALUES (${id}, ${gimnasioId}, ${clienteId})`;
      }
    });
  }

  async publicacion(gimnasioId: string, id: string): Promise<PublicacionGuardada | null> {
    const [f] = await enGimnasio(this.sql, gimnasioId, (tx) => tx<
      { id: string; audiencia: Audiencia; requiere_inscripcion: boolean; inicio: Date | null; fin: Date | null; expira_en: Date | null; cupo: number | null; archivada_en: Date | null }[]
    >`SELECT id, audiencia, requiere_inscripcion, inicio, fin, expira_en, cupo, archivada_en FROM publicacion WHERE id = ${id} AND gimnasio_id = ${gimnasioId}`);
    return f
      ? { id: f.id, audiencia: f.audiencia, requiereInscripcion: f.requiere_inscripcion, inicio: f.inicio, fin: f.fin, expiraEn: f.expira_en, cupo: f.cupo, archivada: f.archivada_en !== null }
      : null;
  }

  async archivar(gimnasioId: string, id: string, en: Date) {
    await enGimnasio(this.sql, gimnasioId, (tx) => tx`UPDATE publicacion SET archivada_en = ${en} WHERE id = ${id} AND gimnasio_id = ${gimnasioId}`);
  }

  async inscritos(gimnasioId: string, publicacionId: string) {
    const [f] = await enGimnasio(this.sql, gimnasioId, (tx) => tx<{ n: number }[]>`
      SELECT count(*)::int AS n FROM inscripcion_evento WHERE publicacion_id = ${publicacionId} AND cancelada_en IS NULL`);
    return f.n;
  }

  async estaInscrito(gimnasioId: string, publicacionId: string, usuarioId: string) {
    const [f] = await enGimnasio(this.sql, gimnasioId, (tx) => tx`
      SELECT 1 FROM inscripcion_evento WHERE publicacion_id = ${publicacionId} AND usuario_id = ${usuarioId} AND cancelada_en IS NULL`);
    return Boolean(f);
  }

  async inscribir(gimnasioId: string, publicacionId: string, usuarioId: string) {
    await enGimnasio(this.sql, gimnasioId, (tx) => tx`
      INSERT INTO inscripcion_evento (publicacion_id, gimnasio_id, usuario_id) VALUES (${publicacionId}, ${gimnasioId}, ${usuarioId})
      ON CONFLICT (publicacion_id, usuario_id) DO UPDATE SET cancelada_en = NULL, inscrito_en = now()`);
  }

  async cancelar(gimnasioId: string, publicacionId: string, usuarioId: string, en: Date) {
    await enGimnasio(this.sql, gimnasioId, (tx) => tx`
      UPDATE inscripcion_evento SET cancelada_en = ${en} WHERE publicacion_id = ${publicacionId} AND usuario_id = ${usuarioId}`);
  }
}

export interface PublicacionEnFeed {
  id: string;
  tipo: TipoPublicacion;
  titulo: string;
  cuerpo: string;
  audiencia: Audiencia;
  fijada: boolean;
  inicio: Date | null;
  fin: Date | null;
  lugar: string | null;
  cupo: number | null;
  requiereInscripcion: boolean;
  publicadaEn: Date;
  expiraEn: Date | null;
  autor: string;
  mencionados: string[];
  meMenciona: boolean;
  inscritos: number;
  estoyInscrito: boolean;
}

/** Feed de novedades (solo lectura). */
export class ConsultasNovedades {
  constructor(private readonly sql: postgres.Sql) {}

  /** Lo vigente que la persona puede ver: fijadas primero, luego lo más reciente. */
  feed(gimnasioId: string, lector: Lector, usuarioId: string) {
    return enGimnasio(this.sql, gimnasioId, (tx) => tx<PublicacionEnFeed[]>`
      SELECT p.id, p.tipo, p.titulo, p.cuerpo, p.audiencia, p.fijada, p.inicio, p.fin, p.lugar, p.cupo,
             p.requiere_inscripcion AS "requiereInscripcion", p.publicada_en AS "publicadaEn", p.expira_en AS "expiraEn", u.nombre AS autor,
             coalesce((SELECT array_agg(uc.nombre ORDER BY uc.nombre) FROM mencion m JOIN cliente cl ON cl.id = m.cliente_id
                       JOIN usuario uc ON uc.id = cl.usuario_id WHERE m.publicacion_id = p.id), '{}') AS mencionados,
             EXISTS (SELECT 1 FROM mencion m JOIN cliente cl ON cl.id = m.cliente_id WHERE m.publicacion_id = p.id AND cl.usuario_id = ${usuarioId}) AS "meMenciona",
             (SELECT count(*)::int FROM inscripcion_evento i WHERE i.publicacion_id = p.id AND i.cancelada_en IS NULL) AS inscritos,
             EXISTS (SELECT 1 FROM inscripcion_evento i WHERE i.publicacion_id = p.id AND i.usuario_id = ${usuarioId} AND i.cancelada_en IS NULL) AS "estoyInscrito"
      FROM publicacion p JOIN usuario u ON u.id = p.autor_id
      WHERE p.gimnasio_id = ${gimnasioId} AND p.archivada_en IS NULL AND p.audiencia IN ${tx(audienciasPara(lector))}
        AND (p.expira_en IS NULL OR p.expira_en > now())
        AND (coalesce(p.fin, p.inicio + interval '1 day') IS NULL OR coalesce(p.fin, p.inicio + interval '1 day') > now())
      ORDER BY p.fijada DESC, p.publicada_en DESC
      LIMIT 50`);
  }

  /** Quiénes se inscribieron a un evento (para la administración). */
  inscritos(gimnasioId: string, publicacionId: string) {
    return enGimnasio(this.sql, gimnasioId, (tx) => tx<{ nombre: string; telefono: string | null; inscritoEn: Date }[]>`
      SELECT u.nombre, u.telefono, i.inscrito_en AS "inscritoEn" FROM inscripcion_evento i JOIN usuario u ON u.id = i.usuario_id
      WHERE i.publicacion_id = ${publicacionId} AND i.cancelada_en IS NULL ORDER BY i.inscrito_en`);
  }

  clientes(gimnasioId: string) {
    return enGimnasio(this.sql, gimnasioId, (tx) => tx<{ id: string; nombre: string }[]>`
      SELECT cl.id, u.nombre FROM cliente cl JOIN usuario u ON u.id = cl.usuario_id
      WHERE cl.gimnasio_id = ${gimnasioId} AND cl.estado = 'activo' ORDER BY u.nombre`);
  }

  /** Cuántas novedades nuevas desde la última vez que entró a Novedades. */
  async sinVer(gimnasioId: string, lector: Lector, usuarioId: string) {
    const [f] = await enGimnasio(this.sql, gimnasioId, (tx) => tx<{ n: number }[]>`
      SELECT count(*)::int AS n FROM publicacion p
      WHERE p.gimnasio_id = ${gimnasioId} AND p.archivada_en IS NULL AND p.audiencia IN ${tx(audienciasPara(lector))}
        AND p.autor_id <> ${usuarioId}
        AND (p.expira_en IS NULL OR p.expira_en > now())
        AND p.publicada_en > coalesce((SELECT novedades_vistas_en FROM usuario WHERE id = ${usuarioId}), '-infinity')`);
    return f.n;
  }

  async marcarVistas(usuarioId: string) {
    await this.sql`UPDATE usuario SET novedades_vistas_en = now() WHERE id = ${usuarioId}`;
  }

  /** Portada: lo público vigente (sin cuenta). */
  publicas(gimnasioId: string) {
    return this.sql<{ id: string; tipo: TipoPublicacion; titulo: string; cuerpo: string; inicio: Date | null; fin: Date | null; lugar: string | null; fijada: boolean }[]>`
      SELECT * FROM novedades_publicas(${gimnasioId})`;
  }
}

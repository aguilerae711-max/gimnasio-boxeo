import type postgres from "postgres";
import { enGimnasio } from "@/shared/infrastructure/baseDeDatos";
import type { RepositorioSolicitudesCoach } from "../application/SolicitudesDeCoach";

export class SolicitudesCoachPostgres implements RepositorioSolicitudesCoach {
  constructor(private readonly sql: postgres.Sql) {}

  async recientesDelTelefono(gimnasioId: string, telefono: string, desde: Date) {
    const [f] = await enGimnasio(this.sql, gimnasioId, (tx) => tx<{ n: number }[]>`
      SELECT count(*)::int AS n FROM solicitud_coach WHERE gimnasio_id = ${gimnasioId} AND telefono = ${telefono} AND creada_en >= ${desde}`);
    return f.n;
  }

  async crear(gimnasioId: string, s: { id: string; nombre: string; telefono: string; experiencia: string; disponibilidad: string | null; en: Date }) {
    await enGimnasio(this.sql, gimnasioId, (tx) => tx`
      INSERT INTO solicitud_coach (id, gimnasio_id, nombre, telefono, experiencia, disponibilidad, creada_en)
      VALUES (${s.id}, ${gimnasioId}, ${s.nombre}, ${s.telefono}, ${s.experiencia}, ${s.disponibilidad}, ${s.en})`);
  }

  async pendiente(gimnasioId: string, id: string) {
    const [f] = await enGimnasio(this.sql, gimnasioId, (tx) => tx<{ nombre: string }[]>`
      SELECT nombre FROM solicitud_coach WHERE id = ${id} AND gimnasio_id = ${gimnasioId} AND estado = 'pendiente'`);
    return f ?? null;
  }

  async cerrar(gimnasioId: string, id: string, c: { estado: "aprobada" | "descartada"; por: string; en: Date; usuarioId: string | null }) {
    const filas = await enGimnasio(this.sql, gimnasioId, (tx) => tx`
      UPDATE solicitud_coach SET estado = ${c.estado}, atendida_por = ${c.por}, atendida_en = ${c.en}, usuario_id = ${c.usuarioId}
      WHERE id = ${id} AND gimnasio_id = ${gimnasioId} AND estado = 'pendiente' RETURNING 1`);
    return filas.length === 1;
  }

  /** Pendientes para la administración. */
  pendientes(gimnasioId: string) {
    return enGimnasio(this.sql, gimnasioId, (tx) => tx<{ id: string; nombre: string; telefono: string; experiencia: string; disponibilidad: string | null; creadaEn: Date }[]>`
      SELECT id, nombre, telefono, experiencia, disponibilidad, creada_en AS "creadaEn"
      FROM solicitud_coach WHERE gimnasio_id = ${gimnasioId} AND estado = 'pendiente' ORDER BY creada_en`);
  }
}

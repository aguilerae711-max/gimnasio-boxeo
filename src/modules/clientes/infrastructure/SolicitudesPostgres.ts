import type postgres from "postgres";
import { enGimnasio } from "@/shared/infrastructure/baseDeDatos";
import type { RepositorioSolicitudes } from "../application/SolicitudesDePrueba";

export class SolicitudesPostgres implements RepositorioSolicitudes {
  constructor(private readonly sql: postgres.Sql) {}

  async franjaExiste(gimnasioId: string, franjaId: string) {
    const [f] = await enGimnasio(this.sql, gimnasioId, (tx) => tx`SELECT 1 FROM franja_horaria WHERE id = ${franjaId} AND gimnasio_id = ${gimnasioId} AND activa`);
    return Boolean(f);
  }

  async recientesDelTelefono(gimnasioId: string, telefono: string, desde: Date) {
    const [f] = await enGimnasio(this.sql, gimnasioId, (tx) => tx<{ n: number }[]>`
      SELECT count(*)::int AS n FROM solicitud_prueba WHERE gimnasio_id = ${gimnasioId} AND telefono = ${telefono} AND creada_en >= ${desde}`);
    return f.n;
  }

  async crear(gimnasioId: string, s: { id: string; nombre: string; telefono: string; franjaId: string | null; comentario: string | null; en: Date }) {
    await enGimnasio(this.sql, gimnasioId, (tx) => tx`
      INSERT INTO solicitud_prueba (id, gimnasio_id, nombre, telefono, franja_id, comentario, creada_en)
      VALUES (${s.id}, ${gimnasioId}, ${s.nombre}, ${s.telefono}, ${s.franjaId}, ${s.comentario}, ${s.en})`);
  }

  async atender(gimnasioId: string, id: string, estado: "contactado" | "descartado", por: string, en: Date) {
    const filas = await enGimnasio(this.sql, gimnasioId, (tx) => tx`
      UPDATE solicitud_prueba SET estado = ${estado}, atendida_por = ${por}, atendida_en = ${en}
      WHERE id = ${id} AND gimnasio_id = ${gimnasioId} AND estado = 'pendiente' RETURNING 1`);
    return filas.length === 1;
  }

  /** Pendientes para la administración, con el horario que prefieren. */
  pendientes(gimnasioId: string) {
    return enGimnasio(this.sql, gimnasioId, (tx) => tx<{ id: string; nombre: string; telefono: string; franja: string | null; comentario: string | null; creadaEn: Date }[]>`
      SELECT s.id, s.nombre, s.telefono, to_char(f.hora_inicio, 'HH24:MI') || '–' || to_char(f.hora_fin, 'HH24:MI') AS franja, s.comentario, s.creada_en AS "creadaEn"
      FROM solicitud_prueba s LEFT JOIN franja_horaria f ON f.id = s.franja_id
      WHERE s.gimnasio_id = ${gimnasioId} AND s.estado = 'pendiente' ORDER BY s.creada_en`);
  }

  /** Franjas para el formulario público. */
  franjas(gimnasioId: string) {
    return enGimnasio(this.sql, gimnasioId, (tx) => tx<{ id: string; inicio: string; fin: string }[]>`
      SELECT id, to_char(hora_inicio, 'HH24:MI') AS inicio, to_char(hora_fin, 'HH24:MI') AS fin
      FROM franja_horaria WHERE gimnasio_id = ${gimnasioId} AND activa ORDER BY orden`);
  }
}

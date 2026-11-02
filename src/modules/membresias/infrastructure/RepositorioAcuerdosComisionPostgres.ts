import type postgres from "postgres";
import { enGimnasio } from "@/shared/infrastructure/baseDeDatos";
import { Fecha } from "@/shared/domain/Fecha";
import { Porcentaje } from "@/shared/domain/Porcentaje";
import { AcuerdoComision } from "../domain/AcuerdoComision";
import type { RepositorioAcuerdosComision } from "../application/puertos";

type Fila = {
  id: string;
  gimnasio_id: string;
  coach_id: string | null;
  porcentaje_pb: number;
  vigente_desde: string;
  vigente_hasta: string | null;
  motivo: string;
  creado_por: string;
};

const aAcuerdo = (f: Fila) =>
  AcuerdoComision.crear({
    id: f.id,
    gimnasioId: f.gimnasio_id,
    coachId: f.coach_id,
    porcentaje: Porcentaje.dePuntosBase(f.porcentaje_pb),
    vigenteDesde: Fecha.de(f.vigente_desde),
    vigenteHasta: f.vigente_hasta ? Fecha.de(f.vigente_hasta) : null,
    motivo: f.motivo,
    creadoPor: f.creado_por,
  });

export class RepositorioAcuerdosComisionPostgres implements RepositorioAcuerdosComision {
  constructor(private readonly sql: postgres.Sql) {}

  async delGimnasio(gimnasioId: string): Promise<AcuerdoComision[]> {
    const filas = await enGimnasio(this.sql, gimnasioId, (tx) => tx<Fila[]>`
      SELECT id, gimnasio_id, coach_id, porcentaje_pb,
             vigente_desde::text AS vigente_desde, vigente_hasta::text AS vigente_hasta, motivo, creado_por
      FROM acuerdo_comision WHERE gimnasio_id = ${gimnasioId}
      ORDER BY vigente_desde`);
    return filas.map(aAcuerdo);
  }

  async aplicarCambio(cambio: { nuevo: AcuerdoComision; cerrados: AcuerdoComision[]; cancelados: AcuerdoComision[] }): Promise<void> {
    const n = cambio.nuevo;
    await enGimnasio(this.sql, n.gimnasioId, async (tx) => {
      for (const a of cambio.cancelados) {
        await tx`DELETE FROM acuerdo_comision WHERE id = ${a.id}`;
      }
      for (const a of cambio.cerrados) {
        await tx`UPDATE acuerdo_comision SET vigente_hasta = ${a.vigenteHasta?.valor ?? null} WHERE id = ${a.id}`;
      }
      await tx`
        INSERT INTO acuerdo_comision (id, gimnasio_id, coach_id, porcentaje_pb, vigente_desde, vigente_hasta, motivo, creado_por)
        VALUES (${n.id}, ${n.gimnasioId}, ${n.coachId}, ${n.porcentaje.puntosBase}, ${n.vigenteDesde.valor},
                ${n.vigenteHasta?.valor ?? null}, ${n.motivo}, ${n.creadoPor})`;
    });
  }
}

export interface FilaHistorialComision {
  id: string;
  coach: string | null;
  porcentaje: number;
  vigenteDesde: string;
  vigenteHasta: string | null;
  motivo: string;
  creadoPor: string;
}

/** Datos de la pantalla de Comisiones (solo lectura). */
export class ConsultasComisiones {
  constructor(private readonly sql: postgres.Sql) {}

  async coaches(gimnasioId: string): Promise<{ id: string; apodo: string }[]> {
    return enGimnasio(this.sql, gimnasioId, (tx) => tx<{ id: string; apodo: string }[]>`
      SELECT id, apodo FROM coach WHERE gimnasio_id = ${gimnasioId} AND estado = 'aprobado' ORDER BY apodo`);
  }

  async historial(gimnasioId: string): Promise<FilaHistorialComision[]> {
    return enGimnasio(this.sql, gimnasioId, (tx) => tx<FilaHistorialComision[]>`
      SELECT a.id, c.apodo AS coach, (a.porcentaje_pb / 100.0)::float8 AS porcentaje,
             a.vigente_desde::text AS "vigenteDesde", a.vigente_hasta::text AS "vigenteHasta",
             a.motivo, u.nombre AS "creadoPor"
      FROM acuerdo_comision a
      LEFT JOIN coach c ON c.id = a.coach_id
      JOIN usuario u ON u.id = a.creado_por
      WHERE a.gimnasio_id = ${gimnasioId}
      ORDER BY a.vigente_desde DESC, a.creado_en DESC`);
  }
}

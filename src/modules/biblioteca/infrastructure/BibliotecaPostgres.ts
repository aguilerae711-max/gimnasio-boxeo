import type postgres from "postgres";
import { enGimnasio } from "@/shared/infrastructure/baseDeDatos";
import type { EjercicioGuardado, PlanGuardado, RepositorioBiblioteca } from "../application/Biblioteca";
import type { Golpe, NombreConocido, Visibilidad } from "../domain/Biblioteca";
import { claveTurno, type EstadoPlan, type Rutina } from "../domain/Planes";

type FilaEjercicio = { id: string; nombre: string; estado: EjercicioGuardado["estado"]; visibilidad: Visibilidad; es_basico: boolean; creado_por_coach: string | null };
const aEjercicio = (f: FilaEjercicio): EjercicioGuardado => ({
  id: f.id,
  nombre: f.nombre,
  estado: f.estado,
  visibilidad: f.visibilidad,
  esBasico: f.es_basico,
  creadoPorCoachId: f.creado_por_coach,
});

async function leerPlan(tx: postgres.TransactionSql, filtro: postgres.PendingQuery<postgres.Row[]>): Promise<PlanGuardado | null> {
  const [p] = await tx<{ id: string; coach_id: string; mes: string; es_fijo: boolean; estado: EstadoPlan }[]>`
    SELECT id, coach_id, mes, es_fijo, estado FROM plan_trabajo WHERE ${filtro}`;
  if (!p) return null;
  const turnos = await tx<{ dia_semana: number; franja_id: string; rutina_id: string }[]>`
    SELECT dia_semana, franja_id, rutina_id FROM plan_turno WHERE plan_id = ${p.id}`;
  return {
    id: p.id,
    coachId: p.coach_id,
    mes: p.mes,
    esFijo: p.es_fijo,
    estado: p.estado,
    asignaciones: new Map(turnos.map((t) => [claveTurno(t.dia_semana, t.franja_id), t.rutina_id])),
  };
}

export class BibliotecaPostgres implements RepositorioBiblioteca {
  constructor(private readonly sql: postgres.Sql) {}

  golpes(gimnasioId: string) {
    return this.sql<Golpe[]>`
      SELECT g.codigo, g.nombre, g.mano FROM golpe g JOIN gimnasio gi ON gi.disciplina_id = g.disciplina_id
      WHERE gi.id = ${gimnasioId} ORDER BY g.orden`;
  }

  async nombresConocidos(gimnasioId: string): Promise<NombreConocido[]> {
    const ejercicios = await enGimnasio(this.sql, gimnasioId, (tx) => tx<NombreConocido[]>`
      SELECT e.id, e.nombre, e.nombre AS oficial, 'ejercicio' AS tipo FROM ejercicio e
      WHERE e.gimnasio_id = ${gimnasioId} AND e.estado IN ('propuesto', 'formalizado')
      UNION ALL
      SELECT e.id, a.nombre, e.nombre, 'ejercicio' FROM ejercicio_alias a JOIN ejercicio e ON e.id = a.ejercicio_id
      WHERE e.estado IN ('propuesto', 'formalizado')`);
    const golpes = await this.sql<NombreConocido[]>`
      SELECT g.codigo AS id, g.nombre, g.nombre AS oficial, 'golpe' AS tipo FROM golpe g JOIN gimnasio gi ON gi.disciplina_id = g.disciplina_id WHERE gi.id = ${gimnasioId}
      UNION ALL
      SELECT a.golpe_codigo, a.nombre, g.nombre, 'golpe' FROM golpe_alias a JOIN golpe g ON g.disciplina_id = a.disciplina_id AND g.codigo = a.golpe_codigo
      JOIN gimnasio gi ON gi.disciplina_id = a.disciplina_id WHERE gi.id = ${gimnasioId}`;
    return [...ejercicios, ...golpes];
  }

  async coachDelUsuario(gimnasioId: string, usuarioId: string) {
    const [f] = await enGimnasio(this.sql, gimnasioId, (tx) => tx<{ id: string; accesoBiblioteca: boolean }[]>`
      SELECT id, acceso_biblioteca AS "accesoBiblioteca" FROM coach WHERE usuario_id = ${usuarioId} AND gimnasio_id = ${gimnasioId} AND estado = 'aprobado'`);
    return f ?? null;
  }

  async ejercicio(gimnasioId: string, id: string) {
    const [f] = await this.ejerciciosPorId(gimnasioId, [id]);
    return f ?? null;
  }

  async ejerciciosPorId(gimnasioId: string, ids: string[]) {
    if (ids.length === 0) return [];
    const filas = await enGimnasio(this.sql, gimnasioId, (tx) => tx<FilaEjercicio[]>`
      SELECT id, nombre, estado, visibilidad, es_basico, creado_por_coach FROM ejercicio WHERE gimnasio_id = ${gimnasioId} AND id IN ${tx(ids)}`);
    return filas.map(aEjercicio);
  }

  async crearEjercicio(gimnasioId: string, e: { id: string; nombre: string; descripcion: string; categoria: string; estado: "propuesto" | "formalizado"; visibilidad: Visibilidad; creadoPor: string; creadoPorCoach: string | null }) {
    await enGimnasio(this.sql, gimnasioId, (tx) => tx`
      INSERT INTO ejercicio (id, gimnasio_id, categoria_codigo, nombre, descripcion, estado, visibilidad, creado_por, creado_por_coach,
                             formalizado_por, formalizado_en)
      VALUES (${e.id}, ${gimnasioId}, ${e.categoria}, ${e.nombre}, ${e.descripcion}, ${e.estado}, ${e.visibilidad}, ${e.creadoPor}, ${e.creadoPorCoach},
              ${e.estado === "formalizado" ? e.creadoPor : null}, ${e.estado === "formalizado" ? new Date() : null})`);
  }

  async formalizar(
    gimnasioId: string,
    id: string,
    d: { nombre: string; descripcion: string; ejecucion: string | null; errores: string | null; nivel: string | null; categoria: string; visibilidad: Visibilidad; alias: string[]; por: string; en: Date },
  ) {
    await enGimnasio(this.sql, gimnasioId, async (tx) => {
      await tx`
        UPDATE ejercicio SET nombre = ${d.nombre}, descripcion = ${d.descripcion}, ejecucion = ${d.ejecucion}, errores_comunes = ${d.errores},
          nivel = ${d.nivel}, categoria_codigo = ${d.categoria}, visibilidad = ${d.visibilidad}, estado = 'formalizado',
          formalizado_por = ${d.por}, formalizado_en = ${d.en}
        WHERE id = ${id} AND gimnasio_id = ${gimnasioId}`;
      await tx`DELETE FROM ejercicio_alias WHERE ejercicio_id = ${id}`;
      for (const nombre of d.alias) {
        await tx`INSERT INTO ejercicio_alias (ejercicio_id, gimnasio_id, nombre) VALUES (${id}, ${gimnasioId}, ${nombre}) ON CONFLICT DO NOTHING`;
      }
    });
  }

  async fusionar(gimnasioId: string, origenId: string, destinoId: string) {
    await enGimnasio(this.sql, gimnasioId, async (tx) => {
      await tx`
        INSERT INTO ejercicio_alias (ejercicio_id, gimnasio_id, nombre)
        SELECT ${destinoId}::uuid, ${gimnasioId}::uuid, nombre FROM ejercicio WHERE id = ${origenId}
        UNION SELECT ${destinoId}::uuid, ${gimnasioId}::uuid, nombre FROM ejercicio_alias WHERE ejercicio_id = ${origenId}
        ON CONFLICT DO NOTHING`;
      await tx`UPDATE bloque_elemento SET ejercicio_id = ${destinoId} WHERE ejercicio_id = ${origenId}`;
      await tx`UPDATE ejercicio SET estado = 'fusionado', fusionado_en_id = ${destinoId} WHERE id = ${origenId}`;
    });
  }

  async darAcceso(gimnasioId: string, coachId: string, acceso: boolean) {
    await enGimnasio(this.sql, gimnasioId, (tx) => tx`UPDATE coach SET acceso_biblioteca = ${acceso} WHERE id = ${coachId} AND gimnasio_id = ${gimnasioId}`);
  }

  async rutinaDelCoach(gimnasioId: string, rutinaId: string) {
    const [f] = await enGimnasio(this.sql, gimnasioId, (tx) => tx<{ id: string; coachId: string }[]>`
      SELECT id, coach_id AS "coachId" FROM rutina WHERE id = ${rutinaId} AND gimnasio_id = ${gimnasioId}`);
    return f ?? null;
  }

  async guardarRutina(gimnasioId: string, coachId: string, id: string, r: Rutina, ids: () => string) {
    await enGimnasio(this.sql, gimnasioId, async (tx) => {
      await tx`
        INSERT INTO rutina (id, gimnasio_id, coach_id, nombre, descripcion) VALUES (${id}, ${gimnasioId}, ${coachId}, ${r.nombre}, ${r.descripcion})
        ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion, cambiada_en = now()`;
      await tx`DELETE FROM bloque_elemento WHERE bloque_id IN (SELECT id FROM rutina_bloque WHERE rutina_id = ${id})`;
      await tx`DELETE FROM rutina_bloque WHERE rutina_id = ${id}`;
      for (const [n, b] of r.bloques.entries()) {
        const bloqueId = ids();
        await tx`
          INSERT INTO rutina_bloque (id, rutina_id, gimnasio_id, orden, tipo, minutos, rounds, descripcion)
          VALUES (${bloqueId}, ${id}, ${gimnasioId}, ${n + 1}, ${b.tipo}, ${b.minutos}, ${b.rounds}, ${b.descripcion})`;
        for (const [m, e] of b.elementos.entries()) {
          await tx`
            INSERT INTO bloque_elemento (id, bloque_id, gimnasio_id, orden, ejercicio_id, combinacion, modalidad, detalle)
            VALUES (${ids()}, ${bloqueId}, ${gimnasioId}, ${m + 1}, ${e.ejercicioId}, ${e.ejercicioId ? null : (e.combinacion?.trim() ?? null)}, ${e.modalidad}, ${e.detalle.trim()})`;
        }
      }
    });
  }

  rutinasDelCoach(gimnasioId: string, coachId: string) {
    return enGimnasio(this.sql, gimnasioId, (tx) => tx<{ id: string; nombre: string }[]>`
      SELECT id, nombre FROM rutina WHERE gimnasio_id = ${gimnasioId} AND coach_id = ${coachId} AND NOT archivada ORDER BY nombre`);
  }

  async turnosDelCoach(gimnasioId: string, coachId: string) {
    const filas = await enGimnasio(this.sql, gimnasioId, (tx) => tx<{ dia: number; franjaId: string }[]>`
      SELECT a.dia_semana AS dia, a.franja_id AS "franjaId" FROM asignacion_horario a
      WHERE a.gimnasio_id = ${gimnasioId} AND a.coach_id = ${coachId} AND a.hasta IS NULL`);
    return filas;
  }

  plan(gimnasioId: string, coachId: string, mes: string) {
    return enGimnasio(this.sql, gimnasioId, (tx) => leerPlan(tx, tx`gimnasio_id = ${gimnasioId} AND coach_id = ${coachId} AND mes = ${mes}`));
  }

  planPorId(gimnasioId: string, id: string) {
    return enGimnasio(this.sql, gimnasioId, (tx) => leerPlan(tx, tx`gimnasio_id = ${gimnasioId} AND id = ${id}`));
  }

  async guardarPlan(gimnasioId: string, p: PlanGuardado & { basadoEnId: string | null; enviadoEn: Date | null }) {
    await enGimnasio(this.sql, gimnasioId, async (tx) => {
      await tx`
        INSERT INTO plan_trabajo (id, gimnasio_id, coach_id, mes, es_fijo, estado, basado_en_id, enviado_en)
        VALUES (${p.id}, ${gimnasioId}, ${p.coachId}, ${p.mes}, ${p.esFijo}, ${p.estado}, ${p.basadoEnId}, ${p.enviadoEn})
        ON CONFLICT (id) DO UPDATE SET es_fijo = EXCLUDED.es_fijo, estado = EXCLUDED.estado,
          enviado_en = coalesce(EXCLUDED.enviado_en, plan_trabajo.enviado_en), comentario = CASE WHEN EXCLUDED.estado = 'enviado' THEN NULL ELSE plan_trabajo.comentario END`;
      await tx`DELETE FROM plan_turno WHERE plan_id = ${p.id}`;
      for (const [turno, rutina] of p.asignaciones) {
        const [dia, franja] = turno.split(":");
        await tx`INSERT INTO plan_turno (plan_id, gimnasio_id, dia_semana, franja_id, rutina_id) VALUES (${p.id}, ${gimnasioId}, ${Number(dia)}, ${franja}, ${rutina})`;
      }
    });
  }

  async revisarPlan(gimnasioId: string, id: string, d: { estado: EstadoPlan; comentario: string | null; por: string; en: Date }) {
    await enGimnasio(this.sql, gimnasioId, (tx) => tx`
      UPDATE plan_trabajo SET estado = ${d.estado}, comentario = ${d.comentario}, revisado_por = ${d.por}, revisado_en = ${d.en}
      WHERE id = ${id} AND gimnasio_id = ${gimnasioId}`);
  }
}

export interface EjercicioEnLista {
  id: string;
  nombre: string;
  descripcion: string;
  ejecucion: string | null;
  erroresComunes: string | null;
  nivel: string | null;
  categoria: string;
  categoriaNombre: string;
  esBasico: boolean;
  estado: EjercicioGuardado["estado"];
  visibilidad: Visibilidad;
  creadoPorCoachId: string | null;
  autor: string | null;
  alias: string[];
}

export interface RutinaCompleta {
  id: string;
  nombre: string;
  descripcion: string;
  bloques: {
    tipo: string;
    minutos: number;
    rounds: number | null;
    descripcion: string;
    elementos: { ejercicioId: string | null; ejercicio: string | null; combinacion: string | null; modalidad: string; detalle: string }[];
  }[];
}

/** Datos para las pantallas de biblioteca, rutinas y planes (solo lectura). */
export class ConsultasBiblioteca {
  constructor(private readonly sql: postgres.Sql) {}

  glosario(gimnasioId: string) {
    return this.sql<{ codigo: string; nombre: string; mano: string; descripcion: string; alias: string[] }[]>`
      SELECT g.codigo, g.nombre, g.mano, g.descripcion,
             coalesce(array_agg(a.nombre ORDER BY a.nombre) FILTER (WHERE a.nombre IS NOT NULL), '{}') AS alias
      FROM golpe g JOIN gimnasio gi ON gi.disciplina_id = g.disciplina_id
      LEFT JOIN golpe_alias a ON a.disciplina_id = g.disciplina_id AND a.golpe_codigo = g.codigo
      WHERE gi.id = ${gimnasioId} GROUP BY g.disciplina_id, g.codigo ORDER BY min(g.orden)`;
  }

  categorias(gimnasioId: string) {
    return this.sql<{ codigo: string; nombre: string }[]>`
      SELECT c.codigo, c.nombre FROM categoria_ejercicio c JOIN gimnasio g ON g.disciplina_id = c.disciplina_id WHERE g.id = ${gimnasioId} ORDER BY c.orden`;
  }

  /** Todos los ejercicios vigentes del gimnasio; la pantalla filtra con `puedeVer`. */
  ejercicios(gimnasioId: string) {
    return enGimnasio(this.sql, gimnasioId, (tx) => tx<EjercicioEnLista[]>`
      SELECT e.id, e.nombre, e.descripcion, e.ejecucion, e.errores_comunes AS "erroresComunes", e.nivel, e.categoria_codigo AS categoria,
             c.nombre AS "categoriaNombre", e.es_basico AS "esBasico", e.estado, e.visibilidad, e.creado_por_coach AS "creadoPorCoachId",
             co.apodo AS autor, coalesce((SELECT array_agg(nombre ORDER BY nombre) FROM ejercicio_alias WHERE ejercicio_id = e.id), '{}') AS alias
      FROM ejercicio e
      JOIN gimnasio g ON g.id = e.gimnasio_id
      JOIN categoria_ejercicio c ON c.disciplina_id = g.disciplina_id AND c.codigo = e.categoria_codigo
      LEFT JOIN coach co ON co.id = e.creado_por_coach
      WHERE e.gimnasio_id = ${gimnasioId} AND e.estado IN ('propuesto', 'formalizado')
      ORDER BY e.es_basico DESC, e.nombre`);
  }

  coaches(gimnasioId: string) {
    return enGimnasio(this.sql, gimnasioId, (tx) => tx<{ id: string; apodo: string; color: string; accesoBiblioteca: boolean }[]>`
      SELECT id, apodo, color, acceso_biblioteca AS "accesoBiblioteca" FROM coach WHERE gimnasio_id = ${gimnasioId} AND estado = 'aprobado' ORDER BY apodo`);
  }

  async rutinas(gimnasioId: string, coachId: string): Promise<RutinaCompleta[]> {
    return enGimnasio(this.sql, gimnasioId, async (tx) => {
      const rutinas = await tx<{ id: string; nombre: string; descripcion: string }[]>`
        SELECT id, nombre, descripcion FROM rutina WHERE gimnasio_id = ${gimnasioId} AND coach_id = ${coachId} AND NOT archivada ORDER BY nombre`;
      const bloques = await tx<{ id: string; rutinaId: string; tipo: string; minutos: number; rounds: number | null; descripcion: string }[]>`
        SELECT b.id, b.rutina_id AS "rutinaId", b.tipo, b.minutos, b.rounds, b.descripcion FROM rutina_bloque b
        JOIN rutina r ON r.id = b.rutina_id WHERE r.coach_id = ${coachId} ORDER BY b.orden`;
      const elementos = await tx<{ bloqueId: string; ejercicioId: string | null; ejercicio: string | null; combinacion: string | null; modalidad: string; detalle: string }[]>`
        SELECT el.bloque_id AS "bloqueId", el.ejercicio_id AS "ejercicioId", e.nombre AS ejercicio, el.combinacion, el.modalidad, el.detalle
        FROM bloque_elemento el JOIN rutina_bloque b ON b.id = el.bloque_id JOIN rutina r ON r.id = b.rutina_id
        LEFT JOIN ejercicio e ON e.id = el.ejercicio_id WHERE r.coach_id = ${coachId} ORDER BY el.orden`;
      return rutinas.map((r) => ({
        ...r,
        bloques: bloques
          .filter((b) => b.rutinaId === r.id)
          .map((b) => ({ tipo: b.tipo, minutos: b.minutos, rounds: b.rounds, descripcion: b.descripcion, elementos: elementos.filter((e) => e.bloqueId === b.id) })),
      }));
    });
  }

  /** Planes del mes de todos los coaches, para la administración. */
  planesDelMes(gimnasioId: string, mes: string) {
    return enGimnasio(this.sql, gimnasioId, (tx) => tx<{ coachId: string; apodo: string; color: string; planId: string | null; estado: EstadoPlan | null; turnos: number }[]>`
      SELECT c.id AS "coachId", c.apodo, c.color, p.id AS "planId", p.estado,
             (SELECT count(*)::int FROM plan_turno WHERE plan_id = p.id) AS turnos
      FROM coach c LEFT JOIN plan_trabajo p ON p.coach_id = c.id AND p.mes = ${mes}
      WHERE c.gimnasio_id = ${gimnasioId} AND c.estado = 'aprobado' ORDER BY c.apodo`);
  }

  async detallePlan(gimnasioId: string, planId: string) {
    return enGimnasio(this.sql, gimnasioId, async (tx) => {
      const [p] = await tx<{ id: string; coachId: string; apodo: string; mes: string; estado: EstadoPlan; esFijo: boolean; comentario: string | null; revisadoEn: Date | null }[]>`
        SELECT p.id, p.coach_id AS "coachId", c.apodo, p.mes, p.estado, p.es_fijo AS "esFijo", p.comentario, p.revisado_en AS "revisadoEn"
        FROM plan_trabajo p JOIN coach c ON c.id = p.coach_id WHERE p.id = ${planId} AND p.gimnasio_id = ${gimnasioId}`;
      return p ?? null;
    });
  }

  /** Nombres de rutinas por id, para mostrar asignaciones y diferencias. */
  async nombresDeRutinas(gimnasioId: string, coachId: string) {
    const filas = await enGimnasio(this.sql, gimnasioId, (tx) => tx<{ id: string; nombre: string }[]>`
      SELECT id, nombre FROM rutina WHERE gimnasio_id = ${gimnasioId} AND coach_id = ${coachId}`);
    return new Map(filas.map((f) => [f.id, f.nombre]));
  }

  /** Planes aprobados del coach (para saber cuál está vigente). */
  planesDelCoach(gimnasioId: string, coachId: string) {
    return enGimnasio(this.sql, gimnasioId, (tx) => tx<{ id: string; mes: string; estado: EstadoPlan }[]>`
      SELECT id, mes, estado FROM plan_trabajo WHERE gimnasio_id = ${gimnasioId} AND coach_id = ${coachId} ORDER BY mes DESC`);
  }
}

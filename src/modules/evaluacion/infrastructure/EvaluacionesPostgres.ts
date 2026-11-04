import type postgres from "postgres";
import { enGimnasio } from "@/shared/infrastructure/baseDeDatos";
import type { Bateria, RepositorioEvaluaciones, SesionGuardada } from "../application/Evaluaciones";
import type { DivisionPeso, Sexo } from "../domain/Composicion";
import type { Captura, Chequeo, CodigoPilar, CriterioRubrica, DefinicionTest, Formula } from "../domain/Indices";
import type { EstadoSesion, ResultadoSesion } from "../domain/Sesion";

type FilaTest = {
  codigo: string;
  nombre: string;
  pilar: CodigoPilar;
  formula: Formula;
  campos: string[];
  intentos: number;
  mayor_es_mejor: boolean;
  peso: number;
  obligatorio: boolean;
};

/** Las sesiones que cuentan como evaluación hecha. */
const CERRADAS = ["completa", "parcial"];

async function leerBateria(tx: postgres.TransactionSql, gimnasioId: string, bateriaId: string): Promise<Bateria> {
  const tests = await tx<FilaTest[]>`
    SELECT t.codigo, t.nombre, t.pilar_codigo AS pilar, t.formula, t.campos, t.intentos, t.mayor_es_mejor,
           bt.peso_en_pilar AS peso, bt.obligatorio
    FROM bateria_test bt
    JOIN bateria b ON b.id = bt.bateria_id
    JOIN gimnasio g ON g.id = b.gimnasio_id
    JOIN test_def t ON t.disciplina_id = g.disciplina_id AND t.codigo = bt.test_codigo
    WHERE bt.bateria_id = ${bateriaId} AND b.gimnasio_id = ${gimnasioId}
    ORDER BY bt.orden`;
  const criterios = await tx<CriterioRubrica[]>`
    SELECT r.codigo, r.test_codigo AS "testCodigo", r.subpilar
    FROM rubrica_criterio r JOIN gimnasio g ON g.disciplina_id = r.disciplina_id
    WHERE g.id = ${gimnasioId} AND r.test_codigo IN ${tx(tests.filter((t) => t.formula === "rubrica").map((t) => t.codigo).concat(["-"]))}
    ORDER BY r.test_codigo, r.orden`;
  return {
    id: bateriaId,
    tests: tests.map(
      (t): DefinicionTest => ({
        codigo: t.codigo,
        nombre: t.nombre,
        pilar: t.pilar,
        formula: t.formula,
        campos: t.campos,
        intentos: t.intentos,
        mayorEsMejor: t.mayor_es_mejor,
        pesoEnPilar: t.peso,
        obligatorio: t.obligatorio,
      }),
    ),
    criterios,
  };
}

type FilaSesion = {
  id: string;
  cliente_id: string;
  coach_id: string;
  estado: EstadoSesion;
  tipo: "inicial" | "mensual";
  periodo: string;
  bateria_id: string;
  chequeo: unknown;
  peso_kg: string | null;
};
const aSesion = (f: FilaSesion): SesionGuardada => ({
  id: f.id,
  clienteId: f.cliente_id,
  coachId: f.coach_id,
  estado: f.estado,
  tipo: f.tipo,
  periodo: f.periodo,
  bateriaId: f.bateria_id,
  chequeoHecho: f.peso_kg !== null,
});
const COLUMNAS_SESION = "id, cliente_id, coach_id, estado, tipo, periodo, bateria_id, chequeo, peso_kg";

export class EvaluacionesPostgres implements RepositorioEvaluaciones {
  constructor(private readonly sql: postgres.Sql) {}

  async pinHash(usuarioId: string) {
    const [f] = await this.sql<{ pin_hash: string | null }[]>`SELECT pin_hash FROM usuario WHERE id = ${usuarioId}`;
    return f?.pin_hash ?? null;
  }

  async guardarPin(usuarioId: string, hash: string) {
    await this.sql`UPDATE usuario SET pin_hash = ${hash} WHERE id = ${usuarioId}`;
  }

  async clienteParaEvaluar(gimnasioId: string, clienteId: string) {
    const [f] = await enGimnasio(this.sql, gimnasioId, (tx) => tx<{ clienteId: string; coachId: string; estado: string; sexo: Sexo | null }[]>`
      SELECT cl.id AS "clienteId", cl.coach_id AS "coachId", cl.estado, p.sexo
      FROM cliente cl LEFT JOIN perfil_cliente p ON p.cliente_id = cl.id
      WHERE cl.id = ${clienteId} AND cl.gimnasio_id = ${gimnasioId}`);
    return f ?? null;
  }

  async bateriaVigente(gimnasioId: string) {
    return enGimnasio(this.sql, gimnasioId, async (tx) => {
      const [b] = await tx<{ id: string }[]>`
        SELECT id FROM bateria WHERE gimnasio_id = ${gimnasioId} AND vigente_desde <= current_date
          AND (vigente_hasta IS NULL OR vigente_hasta >= current_date)
        ORDER BY vigente_desde DESC LIMIT 1`;
      return b ? leerBateria(tx, gimnasioId, b.id) : null;
    });
  }

  bateria(gimnasioId: string, bateriaId: string) {
    return enGimnasio(this.sql, gimnasioId, (tx) => leerBateria(tx, gimnasioId, bateriaId));
  }

  async divisiones(gimnasioId: string): Promise<DivisionPeso[]> {
    const filas = await this.sql<{ nombre: string; sexo: Sexo; limite: string | null }[]>`
      SELECT d.nombre, d.sexo, d.limite_kg AS limite FROM division_peso d JOIN gimnasio g ON g.disciplina_id = d.disciplina_id
      WHERE g.id = ${gimnasioId} AND d.estandar = 'world_boxing_elite' ORDER BY d.sexo, d.orden`;
    return filas.map((d) => ({ nombre: d.nombre, sexo: d.sexo, limiteKg: d.limite === null ? null : Number(d.limite) }));
  }

  async sesionDelMes(gimnasioId: string, clienteId: string, periodo: string) {
    const [f] = await enGimnasio(this.sql, gimnasioId, (tx) => tx<FilaSesion[]>`
      SELECT ${tx.unsafe(COLUMNAS_SESION)} FROM sesion_evaluacion
      WHERE cliente_id = ${clienteId} AND periodo = ${periodo} AND estado NOT IN ('anulada', 'no_apta')`);
    return f ? aSesion(f) : null;
  }

  async tieneEvaluacionPrevia(gimnasioId: string, clienteId: string, exceptoSesionId: string) {
    const [f] = await enGimnasio(this.sql, gimnasioId, (tx) => tx`
      SELECT 1 FROM sesion_evaluacion WHERE cliente_id = ${clienteId} AND id <> ${exceptoSesionId} AND estado IN ${tx(CERRADAS)} LIMIT 1`);
    return Boolean(f);
  }

  async crearSesion(gimnasioId: string, s: Omit<SesionGuardada, "chequeoHecho"> & { evaluadorId: string }) {
    await enGimnasio(this.sql, gimnasioId, (tx) => tx`
      INSERT INTO sesion_evaluacion (id, gimnasio_id, cliente_id, coach_id, evaluador_id, bateria_id, tipo, periodo, estado)
      VALUES (${s.id}, ${gimnasioId}, ${s.clienteId}, ${s.coachId}, ${s.evaluadorId}, ${s.bateriaId}, ${s.tipo}, ${s.periodo}, ${s.estado})`);
  }

  async sesion(gimnasioId: string, sesionId: string) {
    const [f] = await enGimnasio(this.sql, gimnasioId, (tx) => tx<FilaSesion[]>`
      SELECT ${tx.unsafe(COLUMNAS_SESION)} FROM sesion_evaluacion WHERE id = ${sesionId} AND gimnasio_id = ${gimnasioId}`);
    return f ? aSesion(f) : null;
  }

  async guardarChequeo(
    gimnasioId: string,
    sesionId: string,
    d: { chequeo: Chequeo; estado: EstadoSesion; pesoKg: number | null; division: string | null; medicion: { id: string; clienteId: string; fecha: string; estaturaCm: number | null; registradoPor: string } | null },
  ) {
    await enGimnasio(this.sql, gimnasioId, async (tx) => {
      await tx`
        UPDATE sesion_evaluacion SET chequeo = ${tx.json(d.chequeo as unknown as postgres.JSONValue)}, estado = ${d.estado},
          peso_kg = ${d.pesoKg}, division = ${d.division},
          finalizada_en = CASE WHEN ${d.estado} = 'no_apta' THEN now() ELSE finalizada_en END
        WHERE id = ${sesionId}`;
      if (d.medicion && d.pesoKg !== null) {
        await tx`DELETE FROM medicion_corporal WHERE sesion_id = ${sesionId}`;
        await tx`
          INSERT INTO medicion_corporal (id, gimnasio_id, cliente_id, fecha, peso_kg, estatura_cm, origen, aproximado, registrado_por, sesion_id)
          VALUES (${d.medicion.id}, ${gimnasioId}, ${d.medicion.clienteId}, ${d.medicion.fecha}, ${d.pesoKg}, ${d.medicion.estaturaCm},
                  'evaluacion', false, ${d.medicion.registradoPor}, ${sesionId})`;
      }
    });
  }

  async guardarCaptura(gimnasioId: string, sesionId: string, testCodigo: string, captura: Captura) {
    await enGimnasio(this.sql, gimnasioId, async (tx) => {
      await tx`DELETE FROM resultado_intento WHERE sesion_id = ${sesionId} AND test_codigo = ${testCodigo}`;
      for (const [n, intento] of captura.entries()) {
        for (const [campo, valor] of Object.entries(intento ?? {})) {
          if (valor === null) continue;
          await tx`
            INSERT INTO resultado_intento (sesion_id, gimnasio_id, test_codigo, intento, campo, valor)
            VALUES (${sesionId}, ${gimnasioId}, ${testCodigo}, ${n + 1}, ${campo}, ${valor})`;
        }
      }
    });
  }

  async guardarRubrica(gimnasioId: string, sesionId: string, niveles: ReadonlyMap<string, number>, companero: { nombre: string; habitual: boolean }) {
    await enGimnasio(this.sql, gimnasioId, async (tx) => {
      await tx`DELETE FROM resultado_rubrica WHERE sesion_id = ${sesionId}`;
      for (const [codigo, nivel] of niveles) {
        await tx`INSERT INTO resultado_rubrica (sesion_id, gimnasio_id, criterio_codigo, nivel) VALUES (${sesionId}, ${gimnasioId}, ${codigo}, ${nivel})`;
      }
      await tx`UPDATE sesion_evaluacion SET companero = ${companero.nombre}, companero_habitual = ${companero.habitual} WHERE id = ${sesionId}`;
    });
  }

  async capturas(gimnasioId: string, sesionId: string) {
    return enGimnasio(this.sql, gimnasioId, async (tx) => {
      const intentos = await tx<{ test_codigo: string; intento: number; campo: string; valor: string }[]>`
        SELECT test_codigo, intento, campo, valor FROM resultado_intento WHERE sesion_id = ${sesionId} ORDER BY test_codigo, intento`;
      const rubrica = await tx<{ criterio_codigo: string; nivel: number }[]>`
        SELECT criterio_codigo, nivel FROM resultado_rubrica WHERE sesion_id = ${sesionId}`;
      const capturas = new Map<string, Captura>();
      for (const f of intentos) {
        const lista = capturas.get(f.test_codigo) ?? [];
        lista[f.intento - 1] = { ...(lista[f.intento - 1] ?? {}), [f.campo]: Number(f.valor) };
        capturas.set(f.test_codigo, lista);
      }
      capturas.forEach((lista, codigo) => capturas.set(codigo, Array.from(lista, (i) => i ?? null)));
      return { capturas, rubrica: new Map(rubrica.map((r) => [r.criterio_codigo, r.nivel])) };
    });
  }

  async lineasBase(gimnasioId: string, clienteId: string) {
    const filas = await enGimnasio(this.sql, gimnasioId, (tx) => tx<{ clave: string; valor: string }[]>`
      SELECT DISTINCT ON (lb.clave) lb.clave, lb.valor
      FROM linea_base lb JOIN sesion_evaluacion s ON s.id = lb.sesion_id
      WHERE lb.cliente_id = ${clienteId} AND s.estado <> 'anulada'
      ORDER BY lb.clave, lb.vigente_desde DESC`);
    return new Map(filas.map((f) => [f.clave, Number(f.valor)]));
  }

  async valoresAnteriores(gimnasioId: string, clienteId: string, sesionId: string) {
    const filas = await enGimnasio(this.sql, gimnasioId, (tx) => tx<{ clave: string; valor: string }[]>`
      SELECT p.clave, p.valor FROM puntaje_test p
      WHERE p.valor IS NOT NULL AND p.sesion_id = (
        SELECT id FROM sesion_evaluacion
        WHERE cliente_id = ${clienteId} AND id <> ${sesionId} AND estado IN ${tx(CERRADAS)}
        ORDER BY iniciada_en DESC LIMIT 1)`);
    return new Map(filas.map((f) => [f.clave, Number(f.valor)]));
  }

  async guardarResultado(gimnasioId: string, sesionId: string, clienteId: string, r: ResultadoSesion, nuevasBasesIds: string[], en: Date) {
    await enGimnasio(this.sql, gimnasioId, async (tx) => {
      // Se puede volver a cerrar una parcial: se reemplaza la foto de esta sesión, nunca la de otras.
      await tx`DELETE FROM puntaje_test WHERE sesion_id = ${sesionId}`;
      await tx`DELETE FROM puntaje_pilar WHERE sesion_id = ${sesionId}`;
      for (const p of r.puntajes) {
        await tx`
          INSERT INTO puntaje_test (sesion_id, gimnasio_id, clave, valor, base, indice, atipico)
          VALUES (${sesionId}, ${gimnasioId}, ${p.clave}, ${p.valor}, ${p.base}, ${p.indice}, ${p.atipico})`;
      }
      for (const p of r.pilares) {
        await tx`INSERT INTO puntaje_pilar (sesion_id, gimnasio_id, pilar, indice, completo) VALUES (${sesionId}, ${gimnasioId}, ${p.pilar}, ${p.indice}, ${p.completo})`;
      }
      for (const [i, b] of r.nuevasBases.entries()) {
        const [ya] = await tx`SELECT 1 FROM linea_base WHERE sesion_id = ${sesionId} AND clave = ${b.clave}`;
        if (ya) continue;
        await tx`
          INSERT INTO linea_base (id, gimnasio_id, cliente_id, clave, valor, sesion_id, vigente_desde)
          VALUES (${nuevasBasesIds[i]}, ${gimnasioId}, ${clienteId}, ${b.clave}, ${b.valor}, ${sesionId}, ${en})`;
      }
      await tx`UPDATE sesion_evaluacion SET estado = ${r.estado}, finalizada_en = ${en} WHERE id = ${sesionId}`;
    });
  }

  async anular(gimnasioId: string, sesionId: string, motivo: string, en: Date) {
    await enGimnasio(this.sql, gimnasioId, (tx) => tx`
      UPDATE sesion_evaluacion SET estado = 'anulada', motivo_anulacion = ${motivo}, finalizada_en = coalesce(finalizada_en, ${en})
      WHERE id = ${sesionId}`);
  }
}

export interface TestEnPantalla {
  codigo: string;
  nombre: string;
  pilar: CodigoPilar;
  protocolo: string;
  equipo: string | null;
  formula: Formula;
  campos: string[];
  etiquetas: string[];
  unidad: string;
  intentos: number;
  duracionSeg: number | null;
  contador: boolean;
  obligatorio: boolean;
}

export interface ResumenPilares {
  sesionId: string;
  periodo: string;
  tipo: "inicial" | "mensual";
  estado: EstadoSesion;
  pesoKg: number | null;
  division: string | null;
  pilares: Record<string, number | null>;
  tactica: number | null;
  adaptabilidad: number | null;
}

/** Datos para las pantallas de evaluación y resultados (solo lectura). */
export class ConsultasEvaluacion {
  constructor(private readonly sql: postgres.Sql) {}

  async tienePin(usuarioId: string) {
    const [f] = await this.sql<{ tiene: boolean }[]>`SELECT pin_hash IS NOT NULL AS tiene FROM usuario WHERE id = ${usuarioId}`;
    return Boolean(f?.tiene);
  }

  /** Clientes activos y su evaluación del mes (si la hay). */
  delMes(gimnasioId: string, periodo: string) {
    return enGimnasio(this.sql, gimnasioId, (tx) => tx<
      { clienteId: string; nombre: string; coach: string; sesionId: string | null; estado: EstadoSesion | null; tipo: string | null }[]
    >`
      SELECT cl.id AS "clienteId", u.nombre, c.apodo AS coach, s.id AS "sesionId", s.estado, s.tipo
      FROM cliente cl JOIN usuario u ON u.id = cl.usuario_id JOIN coach c ON c.id = cl.coach_id
      LEFT JOIN LATERAL (
        SELECT id, estado, tipo FROM sesion_evaluacion
        WHERE cliente_id = cl.id AND periodo = ${periodo} AND estado <> 'anulada'
        ORDER BY iniciada_en DESC LIMIT 1) s ON true
      WHERE cl.gimnasio_id = ${gimnasioId} AND cl.estado = 'activo'
      ORDER BY (s.estado IS NOT NULL), u.nombre`);
  }

  async detalle(gimnasioId: string, sesionId: string) {
    return enGimnasio(this.sql, gimnasioId, async (tx) => {
      const [s] = await tx<
        { id: string; clienteId: string; cliente: string; coach: string; estado: EstadoSesion; tipo: string; periodo: string; chequeo: unknown; pesoKg: string | null; division: string | null; companero: string | null; companeroHabitual: boolean | null; bateriaId: string }[]
      >`
        SELECT s.id, s.cliente_id AS "clienteId", u.nombre AS cliente, c.apodo AS coach, s.estado, s.tipo, s.periodo, s.chequeo,
               s.peso_kg AS "pesoKg", s.division, s.companero, s.companero_habitual AS "companeroHabitual", s.bateria_id AS "bateriaId"
        FROM sesion_evaluacion s JOIN cliente cl ON cl.id = s.cliente_id JOIN usuario u ON u.id = cl.usuario_id JOIN coach c ON c.id = s.coach_id
        WHERE s.id = ${sesionId} AND s.gimnasio_id = ${gimnasioId}`;
      if (!s) return null;
      const tests = await tx<TestEnPantalla[]>`
        SELECT t.codigo, t.nombre, t.pilar_codigo AS pilar, t.protocolo, t.equipo, t.formula, t.campos, t.etiquetas, t.unidad,
               t.intentos, t.duracion_seg AS "duracionSeg", t.contador, bt.obligatorio
        FROM bateria_test bt JOIN gimnasio g ON g.id = bt.gimnasio_id
        JOIN test_def t ON t.disciplina_id = g.disciplina_id AND t.codigo = bt.test_codigo
        WHERE bt.bateria_id = ${s.bateriaId} ORDER BY bt.orden`;
      const criterios = await tx<{ codigo: string; testCodigo: string; subpilar: string; nombre: string }[]>`
        SELECT r.codigo, r.test_codigo AS "testCodigo", r.subpilar, r.nombre
        FROM rubrica_criterio r JOIN gimnasio g ON g.disciplina_id = r.disciplina_id
        WHERE g.id = ${gimnasioId} ORDER BY r.test_codigo, r.orden`;
      const puntajes = await tx<{ clave: string; valor: string | null; base: string | null; indice: number | null; atipico: boolean }[]>`
        SELECT clave, valor, base, indice, atipico FROM puntaje_test WHERE sesion_id = ${sesionId}`;
      const pilares = await tx<{ pilar: string; indice: number | null; completo: boolean }[]>`
        SELECT pilar, indice, completo FROM puntaje_pilar WHERE sesion_id = ${sesionId}`;
      return { ...s, pesoKg: s.pesoKg === null ? null : Number(s.pesoKg), tests, criterios, puntajes, pilares };
    });
  }

  /** Historial de pilares de un cliente (solo evaluaciones cerradas), del más viejo al más nuevo. */
  async historialDeCliente(gimnasioId: string, clienteId: string): Promise<ResumenPilares[]> {
    const filas = await enGimnasio(this.sql, gimnasioId, (tx) => tx<
      { sesionId: string; periodo: string; tipo: "inicial" | "mensual"; estado: EstadoSesion; pesoKg: string | null; division: string | null; clave: string | null; indice: number | null }[]
    >`
      SELECT s.id AS "sesionId", s.periodo, s.tipo, s.estado, s.peso_kg AS "pesoKg", s.division, x.clave, x.indice
      FROM sesion_evaluacion s
      LEFT JOIN LATERAL (
        SELECT pilar AS clave, indice FROM puntaje_pilar WHERE sesion_id = s.id
        UNION ALL SELECT clave, indice FROM puntaje_test WHERE sesion_id = s.id AND clave IN ('tactica', 'adaptabilidad')) x ON true
      WHERE s.cliente_id = ${clienteId} AND s.estado IN ${tx(CERRADAS)}
      ORDER BY s.iniciada_en`);
    const porSesion = new Map<string, ResumenPilares>();
    for (const f of filas) {
      const r = porSesion.get(f.sesionId) ?? {
        sesionId: f.sesionId,
        periodo: f.periodo,
        tipo: f.tipo,
        estado: f.estado,
        pesoKg: f.pesoKg === null ? null : Number(f.pesoKg),
        division: f.division,
        pilares: {},
        tactica: null,
        adaptabilidad: null,
      };
      if (f.clave === "tactica") r.tactica = f.indice;
      else if (f.clave === "adaptabilidad") r.adaptabilidad = f.indice;
      else if (f.clave) r.pilares[f.clave] = f.indice;
      porSesion.set(f.sesionId, r);
    }
    return [...porSesion.values()];
  }

  /**
   * Resultado del coach en un mes: índice promedio por pilar de sus clientes evaluados y cobertura
   * (% de sus clientes activos evaluados). Sin coachId, de todos los coaches.
   */
  resultadoCoaches(gimnasioId: string, periodo: string) {
    return enGimnasio(this.sql, gimnasioId, (tx) => tx<
      { coachId: string; apodo: string; color: string; activos: number; evaluados: number; fuerza: number | null; velocidad: number | null; resistencia: number | null; estrategia: number | null }[]
    >`
      SELECT c.id AS "coachId", c.apodo, c.color,
        (SELECT count(*)::int FROM cliente cl WHERE cl.coach_id = c.id AND cl.estado = 'activo') AS activos,
        count(DISTINCT s.id)::int AS evaluados,
        round(avg(pp.indice) FILTER (WHERE pp.pilar = 'fuerza'))::int AS fuerza,
        round(avg(pp.indice) FILTER (WHERE pp.pilar = 'velocidad'))::int AS velocidad,
        round(avg(pp.indice) FILTER (WHERE pp.pilar = 'resistencia'))::int AS resistencia,
        round(avg(pp.indice) FILTER (WHERE pp.pilar = 'estrategia'))::int AS estrategia
      FROM coach c
      LEFT JOIN sesion_evaluacion s ON s.coach_id = c.id AND s.periodo = ${periodo} AND s.estado IN ${tx(CERRADAS)}
      LEFT JOIN puntaje_pilar pp ON pp.sesion_id = s.id
      WHERE c.gimnasio_id = ${gimnasioId} AND c.estado = 'aprobado'
      GROUP BY c.id ORDER BY c.apodo`);
  }

  /** Último resultado por pilar de cada cliente de un coach. */
  ultimosDelCoach(gimnasioId: string, coachId: string) {
    return enGimnasio(this.sql, gimnasioId, (tx) => tx<
      { clienteId: string; nombre: string; periodo: string | null; division: string | null; fuerza: number | null; velocidad: number | null; resistencia: number | null; estrategia: number | null }[]
    >`
      SELECT cl.id AS "clienteId", u.nombre, s.periodo, s.division,
        (SELECT indice FROM puntaje_pilar WHERE sesion_id = s.id AND pilar = 'fuerza') AS fuerza,
        (SELECT indice FROM puntaje_pilar WHERE sesion_id = s.id AND pilar = 'velocidad') AS velocidad,
        (SELECT indice FROM puntaje_pilar WHERE sesion_id = s.id AND pilar = 'resistencia') AS resistencia,
        (SELECT indice FROM puntaje_pilar WHERE sesion_id = s.id AND pilar = 'estrategia') AS estrategia
      FROM cliente cl JOIN usuario u ON u.id = cl.usuario_id
      LEFT JOIN LATERAL (
        SELECT id, periodo, division FROM sesion_evaluacion
        WHERE cliente_id = cl.id AND estado IN ${tx(CERRADAS)} ORDER BY iniciada_en DESC LIMIT 1) s ON true
      WHERE cl.gimnasio_id = ${gimnasioId} AND cl.coach_id = ${coachId} AND cl.estado = 'activo'
      ORDER BY u.nombre`);
  }

  referencias(gimnasioId: string) {
    return this.sql<{ clave: string; nombre: string; inicial: string; intermedio: string; avanzado: string }[]>`
      SELECT r.clave, r.nombre, r.inicial, r.intermedio, r.avanzado FROM referencia_nivel r JOIN gimnasio g ON g.disciplina_id = r.disciplina_id
      WHERE g.id = ${gimnasioId} ORDER BY r.orden`;
  }
}

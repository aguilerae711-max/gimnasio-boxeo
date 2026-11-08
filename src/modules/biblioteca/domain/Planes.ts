import { ErrorDeDominio } from "@/shared/domain/ErrorDeDominio";

export const DURACION_TURNO_MIN = 120;
/** Cada bloque parte de un pilar de la evaluación, con calentamiento al inicio y enfriamiento al final. */
export const TIPOS_BLOQUE = ["calentamiento", "fuerza", "velocidad", "resistencia", "estrategia", "enfriamiento"] as const;
export type TipoBloque = (typeof TIPOS_BLOQUE)[number];
export type Modalidad = "individual" | "parejas" | "grupal";

export interface ElementoBloque {
  /** Ejercicio de la biblioteca o, si no, una combinación de golpes ("1-2-3"). */
  ejercicioId: string | null;
  combinacion: string | null;
  modalidad: Modalidad;
  detalle: string; // "3 × 3 min", "6 rounds"
}

export interface Bloque {
  tipo: TipoBloque;
  minutos: number;
  rounds: number | null;
  descripcion: string;
  elementos: ElementoBloque[];
}

export interface Rutina {
  nombre: string;
  descripcion: string;
  bloques: Bloque[];
}

/** Una rutina es lo que se hace en un turno de 2 horas: bloques con ejercicios, que no pasen de 120 minutos. */
export function validarRutina(r: Rutina): Rutina {
  const nombre = r.nombre.trim();
  if (nombre.length < 2 || nombre.length > 60) throw new ErrorDeDominio("rutina_nombre", "El nombre de la rutina debe tener de 2 a 60 letras.");
  if (r.bloques.length === 0) throw new ErrorDeDominio("rutina_vacia", "Agrega al menos un bloque.");
  for (const b of r.bloques) {
    if (!TIPOS_BLOQUE.includes(b.tipo)) throw new ErrorDeDominio("bloque_tipo", "Tipo de bloque no válido.");
    if (!Number.isInteger(b.minutos) || b.minutos < 1 || b.minutos > DURACION_TURNO_MIN) throw new ErrorDeDominio("bloque_minutos", "Cada bloque dura de 1 a 120 minutos.");
    if (b.rounds !== null && (!Number.isInteger(b.rounds) || b.rounds < 1 || b.rounds > 30)) throw new ErrorDeDominio("bloque_rounds", "Los rounds van de 1 a 30.");
    for (const e of b.elementos) {
      if (!e.ejercicioId && !e.combinacion?.trim()) throw new ErrorDeDominio("elemento_vacio", "Cada renglón lleva un ejercicio o una combinación.");
    }
  }
  const total = r.bloques.reduce((s, b) => s + b.minutos, 0);
  if (total > DURACION_TURNO_MIN) throw new ErrorDeDominio("rutina_larga", `La rutina suma ${total} minutos; un turno dura ${DURACION_TURNO_MIN}.`);
  return { ...r, nombre, descripcion: r.descripcion.trim() };
}

export type EstadoPlan = "borrador" | "enviado" | "aprobado" | "requiere_cambios";

/** Qué rutina va en cada turno: clave "dia:franjaId". */
export type Asignaciones = ReadonlyMap<string, string>;
export const claveTurno = (dia: number, franjaId: string) => `${dia}:${franjaId}`;

export interface Diferencia {
  turno: string;
  antes: string | null;
  ahora: string | null;
}

/** La administración solo revisa lo que cambió contra el plan aprobado del mes anterior. */
export function diferencias(anterior: Asignaciones | null, actual: Asignaciones): Diferencia[] {
  const turnos = new Set([...(anterior?.keys() ?? []), ...actual.keys()]);
  return [...turnos]
    .map((turno) => ({ turno, antes: anterior?.get(turno) ?? null, ahora: actual.get(turno) ?? null }))
    .filter((d) => d.antes !== d.ahora)
    .sort((a, b) => a.turno.localeCompare(b.turno));
}

/** Borrador o con cambios pedidos → se edita y se envía; enviado → se aprueba o se piden cambios. */
export function siguienteEstado(actual: EstadoPlan, accion: "editar" | "enviar" | "aprobar" | "pedir_cambios"): EstadoPlan {
  const editable = actual === "borrador" || actual === "requiere_cambios";
  switch (accion) {
    case "editar":
      if (!editable) throw new ErrorDeDominio("plan_no_editable", actual === "enviado" ? "El plan está en revisión." : "El plan ya está aprobado.");
      return actual;
    case "enviar":
      if (!editable) throw new ErrorDeDominio("plan_no_editable", "Este plan ya fue enviado.");
      return "enviado";
    case "aprobar":
    case "pedir_cambios":
      if (actual !== "enviado") throw new ErrorDeDominio("plan_no_enviado", "Solo se revisan planes enviados.");
      return accion === "aprobar" ? "aprobado" : "requiere_cambios";
  }
}

/** El plan vigente del mes: el aprobado; si aún no hay, sigue el último aprobado (así un cambio en revisión no deja al coach sin plan). */
export function planVigente<T extends { mes: string; estado: EstadoPlan }>(planes: readonly T[], mes: string): T | null {
  const aprobados = planes.filter((p) => p.estado === "aprobado" && p.mes <= mes).sort((a, b) => b.mes.localeCompare(a.mes));
  return aprobados[0] ?? null;
}

import { ErrorDeDominio } from "@/shared/domain/ErrorDeDominio";

export const NOMBRE_DIA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"] as const;

export interface Franja {
  id: string;
  inicio: string; // "08:00"
  fin: string; // "10:00"
}

export interface AsignacionDeTurno {
  id: string;
  coachId: string;
  franjaId: string;
  diaSemana: number;
  cupoMax: number | null;
}

/**
 * El horario vigente del gimnasio: qué días opera, sus franjas y qué coaches dan cada turno.
 * Varios coaches pueden compartir un día y franja; el mismo coach no se repite en la misma celda.
 */
export class Horario {
  constructor(
    readonly dias: readonly number[],
    readonly franjas: readonly Franja[],
    readonly asignaciones: readonly AsignacionDeTurno[],
  ) {}

  validarNueva(nueva: { coachId: string; franjaId: string; diaSemana: number; cupoMax: number | null }): void {
    if (!this.dias.includes(nueva.diaSemana)) {
      throw new ErrorDeDominio("dia_cerrado", `El gimnasio no abre el ${NOMBRE_DIA[nueva.diaSemana]?.toLowerCase() ?? "día indicado"}.`);
    }
    if (!this.franjas.some((f) => f.id === nueva.franjaId)) {
      throw new ErrorDeDominio("franja_invalida", "Esa franja no existe o está desactivada.");
    }
    if (this.asignaciones.some((a) => a.coachId === nueva.coachId && a.franjaId === nueva.franjaId && a.diaSemana === nueva.diaSemana)) {
      throw new ErrorDeDominio("turno_repetido", "Ese coach ya tiene ese turno.");
    }
    if (nueva.cupoMax !== null && (!Number.isInteger(nueva.cupoMax) || nueva.cupoMax < 1 || nueva.cupoMax > 100)) {
      throw new ErrorDeDominio("cupo_invalido", "El cupo debe ser un número entre 1 y 100, o dejarse vacío.");
    }
  }

  /** Días en que un coach da clase en una franja: así se sabe cuándo entrena su cliente. */
  diasDe(coachId: string, franjaId: string): number[] {
    return this.asignaciones
      .filter((a) => a.coachId === coachId && a.franjaId === franjaId)
      .map((a) => a.diaSemana)
      .sort((a, b) => a - b);
  }

  turnosDe(coachId: string): AsignacionDeTurno[] {
    const orden = new Map(this.franjas.map((f, i) => [f.id, i]));
    return this.asignaciones
      .filter((a) => a.coachId === coachId)
      .sort((a, b) => a.diaSemana - b.diaSemana || (orden.get(a.franjaId) ?? 0) - (orden.get(b.franjaId) ?? 0));
  }

  franja(franjaId: string): Franja | undefined {
    return this.franjas.find((f) => f.id === franjaId);
  }
}

/** "Lunes, Miércoles y Viernes" */
export function listaDeDias(dias: readonly number[]): string {
  const nombres = dias.map((d) => NOMBRE_DIA[d]);
  return nombres.length <= 1 ? (nombres[0] ?? "") : `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`;
}

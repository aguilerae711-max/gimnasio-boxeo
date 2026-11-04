import { ErrorDeDominio } from "@/shared/domain/ErrorDeDominio";

export type Sexo = "F" | "M";
export type OrigenMedicion = "registro" | "evaluacion" | "imprevista";

export const NOMBRE_ORIGEN: Record<OrigenMedicion, string> = {
  registro: "Al registrarse (aproximado)",
  evaluacion: "Evaluación periódica",
  imprevista: "Pesaje imprevisto",
};

export interface Medicion {
  fecha: string; // AAAA-MM-DD
  pesoKg: number;
  estaturaCm: number | null;
  origen: OrigenMedicion;
  aproximado: boolean;
}

export interface DivisionPeso {
  nombre: string;
  sexo: Sexo;
  /** Límite superior en kg; null = división abierta (más de...). */
  limiteKg: number | null;
}

export function validarPeso(pesoKg: number): number {
  if (!Number.isFinite(pesoKg) || pesoKg < 20 || pesoKg > 250) {
    throw new ErrorDeDominio("peso_invalido", "El peso debe estar entre 20 y 250 kg.");
  }
  return Math.round(pesoKg * 10) / 10;
}

export function validarEstatura(estaturaCm: number): number {
  if (!Number.isFinite(estaturaCm) || estaturaCm < 100 || estaturaCm > 230) {
    throw new ErrorDeDominio("estatura_invalida", "La estatura debe estar entre 100 y 230 cm.");
  }
  return Math.round(estaturaCm);
}

/** Índice de masa corporal con su lectura según la OMS. En atletas con mucho músculo es solo una referencia. */
export function imc(pesoKg: number, estaturaCm: number): { valor: number; lectura: string } {
  const metros = estaturaCm / 100;
  const valor = Math.round((pesoKg / (metros * metros)) * 10) / 10;
  const lectura = valor < 18.5 ? "Bajo peso" : valor < 25 ? "Peso adecuado" : valor < 30 ? "Sobrepeso" : "Obesidad";
  return { valor, lectura };
}

/** La división es la más ligera cuyo límite alcanza el peso; si lo rebasa todo, la abierta. */
export function divisionPara(pesoKg: number, sexo: Sexo, divisiones: readonly DivisionPeso[]): DivisionPeso | null {
  const propias = divisiones.filter((d) => d.sexo === sexo);
  const conLimite = propias
    .filter((d): d is DivisionPeso & { limiteKg: number } => d.limiteKg !== null)
    .sort((a, b) => a.limiteKg - b.limiteKg);
  return conLimite.find((d) => pesoKg <= d.limiteKg) ?? propias.find((d) => d.limiteKg === null) ?? null;
}

export interface EstadoCorporal {
  actual: Medicion;
  /** La estatura más reciente registrada (no cambia en cada pesaje). */
  estaturaCm: number | null;
  imc: { valor: number; lectura: string } | null;
  division: DivisionPeso | null;
  /** kg contra el pesaje anterior y contra el primero; negativo = bajó. */
  cambioAnterior: number | null;
  cambioTotal: number | null;
}

/**
 * Situación actual del cliente: el último pesaje manda (la división se mantiene hasta el siguiente).
 * Si hay un pesaje real, el aproximado del registro ya no cuenta como punto de partida.
 */
export function estadoCorporal(mediciones: readonly Medicion[], sexo: Sexo | null, divisiones: readonly DivisionPeso[]): EstadoCorporal | null {
  if (mediciones.length === 0) return null;
  const ordenadas = [...mediciones].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const reales = ordenadas.filter((m) => !m.aproximado);
  const serie = reales.length > 0 ? reales : ordenadas;
  const actual = ordenadas.at(-1)!;
  const estaturaCm = [...ordenadas].reverse().find((m) => m.estaturaCm !== null)?.estaturaCm ?? null;
  const anterior = serie.length > 1 ? serie.at(-2)! : null;
  const redondear = (n: number) => Math.round(n * 10) / 10;
  return {
    actual,
    estaturaCm,
    imc: estaturaCm ? imc(actual.pesoKg, estaturaCm) : null,
    division: sexo ? divisionPara(actual.pesoKg, sexo, divisiones) : null,
    cambioAnterior: anterior ? redondear(actual.pesoKg - anterior.pesoKg) : null,
    cambioTotal: serie.length > 1 ? redondear(actual.pesoKg - serie[0].pesoKg) : null,
  };
}

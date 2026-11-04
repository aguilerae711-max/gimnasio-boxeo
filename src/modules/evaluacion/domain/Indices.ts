import { ErrorDeDominio } from "@/shared/domain/ErrorDeDominio";

/**
 * Cálculo de la evaluación por pilares (plan, sección 6). Todo lo propio del boxeo (tests, pesos, rúbrica)
 * llega como catálogo desde la base; aquí solo viven las reglas.
 */

export type CodigoPilar = "fuerza" | "velocidad" | "resistencia" | "estrategia";
export type Subpilar = "tactica" | "adaptabilidad";

/** Cómo se convierte lo capturado en un valor por test. */
export type Formula =
  | "mejor" // mejor intento de un campo (cm, repeticiones)
  | "mejor_x2" // se cuenta el cross y se multiplica por 2
  | "mejor_resta" // mejor intento de (campo 1 − campo 2), ej. toques − pisadas
  | "retencion" // G3 ÷ G1 × 100
  | "diferencia" // FC pico − FC a los 60 s
  | "rubrica"; // conductas 0-1-2, se suman por subpilar

export interface DefinicionTest {
  codigo: string;
  nombre: string;
  pilar: CodigoPilar;
  formula: Formula;
  campos: string[];
  intentos: number;
  mayorEsMejor: boolean;
  pesoEnPilar: number;
  obligatorio: boolean;
}

export interface CriterioRubrica {
  codigo: string;
  testCodigo: string;
  subpilar: Subpilar;
}

/** Lo capturado de un test: por intento, el valor de cada campo (null = nulo o no hecho). */
export type Captura = (Record<string, number | null> | null)[];

export const TOPE_INDICE = 150;
export const UMBRAL_ALERTA = 0.4;

function exigirNumero(v: number | null | undefined): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/** Valor final de un test (no rúbrica) a partir de sus intentos; null si no hay ningún intento válido. */
export function valorDelTest(test: DefinicionTest, captura: Captura): number | null {
  const intentos = captura.filter((i): i is Record<string, number | null> => i !== null);
  const [a, b] = test.campos;
  const porIntento = intentos
    .map((i) => {
      switch (test.formula) {
        case "mejor":
          return exigirNumero(i[a]) ? i[a] : null;
        case "mejor_x2":
          return exigirNumero(i[a]) ? i[a] * 2 : null;
        case "mejor_resta":
          return exigirNumero(i[a]) && exigirNumero(i[b]) ? i[a] - i[b] : null;
        case "retencion":
          return exigirNumero(i[a]) && exigirNumero(i[b]) && i[a] > 0 ? Math.round((i[b] / i[a]) * 1000) / 10 : null;
        case "diferencia":
          return exigirNumero(i[a]) && exigirNumero(i[b]) ? i[a] - i[b] : null;
        case "rubrica":
          throw new ErrorDeDominio("formula", "La rúbrica se calcula por subpilar.");
      }
    })
    .filter(exigirNumero);
  if (porIntento.length === 0) return null;
  // Dos decimales, igual que se guarda en la base.
  return Math.round((test.mayorEsMejor ? Math.max(...porIntento) : Math.min(...porIntento)) * 100) / 100;
}

/** Táctica y Adaptabilidad de 0 a 10: suma de sus conductas (0-1-2). Null si falta alguna conducta. */
export function valoresDeRubrica(criterios: readonly CriterioRubrica[], niveles: ReadonlyMap<string, number>): Record<Subpilar, number | null> {
  const total = (sub: Subpilar) => {
    const propios = criterios.filter((c) => c.subpilar === sub);
    if (propios.length === 0 || propios.some((c) => !niveles.has(c.codigo))) return null;
    return propios.reduce((t, c) => t + Math.min(2, Math.max(0, niveles.get(c.codigo)!)), 0);
  };
  return { tactica: total("tactica"), adaptabilidad: total("adaptabilidad") };
}

const acotar = (n: number) => Math.round(Math.min(TOPE_INDICE, Math.max(0, n)));

/**
 * Índice contra la línea base (la evaluación inicial = 100). Mayor es mejor: actual ÷ base × 100;
 * menor es mejor: base ÷ actual × 100. Si la base es 0 no se puede dividir: null (se anota como sin base).
 */
export function indice(actual: number, base: number, mayorEsMejor: boolean): number | null {
  if (mayorEsMejor) return base > 0 ? acotar((actual / base) * 100) : null;
  return actual > 0 ? acotar((base / actual) * 100) : null;
}

/** En la rúbrica (0–10) la base puede ser 0: 100 + (actual − base) × 10. */
export function indiceRubrica(actual: number, base: number): number {
  return acotar(100 + (actual - base) * 10);
}

/** Cambio de más de ±40% contra la evaluación anterior: probable error de captura o algo que revisar. */
export function esAtipico(actual: number, anterior: number | null): boolean {
  if (anterior === null || anterior === 0) return false;
  return Math.abs(actual - anterior) / Math.abs(anterior) > UMBRAL_ALERTA;
}

export interface IndiceDeTest {
  codigo: string;
  pilar: CodigoPilar;
  peso: number;
  obligatorio: boolean;
  /** null = no se hizo o no tiene base válida. */
  indice: number | null;
  /** El test se estrenó en esta sesión pero el cliente ya tenía evaluaciones: aún no cuenta en el pilar. */
  estreno: boolean;
}

export interface IndicePilar {
  pilar: CodigoPilar;
  indice: number | null;
  completo: boolean;
  tactica?: number | null;
  adaptabilidad?: number | null;
}

/**
 * Pilar = promedio ponderado de sus tests. Si falta un test obligatorio, el pilar no se publica.
 * Estrategia = Táctica 50% + Adaptabilidad 50%.
 */
export function indicesPorPilar(tests: readonly IndiceDeTest[], estrategia: { tactica: number | null; adaptabilidad: number | null }): IndicePilar[] {
  const pilares: CodigoPilar[] = ["fuerza", "velocidad", "resistencia"];
  const resultado: IndicePilar[] = pilares.map((pilar) => {
    const propios = tests.filter((t) => t.pilar === pilar);
    const faltaObligatorio = propios.some((t) => t.obligatorio && t.indice === null && !t.estreno);
    const cuentan = propios.filter((t): t is IndiceDeTest & { indice: number } => t.indice !== null && !t.estreno);
    const pesoTotal = cuentan.reduce((s, t) => s + t.peso, 0);
    if (faltaObligatorio || pesoTotal === 0) return { pilar, indice: null, completo: false };
    return { pilar, indice: Math.round(cuentan.reduce((s, t) => s + t.indice * t.peso, 0) / pesoTotal), completo: true };
  });
  const { tactica, adaptabilidad } = estrategia;
  resultado.push({
    pilar: "estrategia",
    indice: tactica !== null && adaptabilidad !== null ? Math.round((tactica + adaptabilidad) / 2) : null,
    completo: tactica !== null && adaptabilidad !== null,
    tactica,
    adaptabilidad,
  });
  return resultado;
}

export interface Chequeo {
  lesionODolor: boolean;
  durmioBien: boolean;
  comio3h: boolean;
}

/** Con lesión o dolor no se evalúa: se reprograma. Dormir mal o no comer solo se anota. */
export function esApto(c: Chequeo): boolean {
  return !c.lesionODolor;
}

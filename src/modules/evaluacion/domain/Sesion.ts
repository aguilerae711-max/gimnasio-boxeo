import {
  esAtipico,
  indice,
  indiceRubrica,
  indicesPorPilar,
  valorDelTest,
  valoresDeRubrica,
  type Captura,
  type CriterioRubrica,
  type DefinicionTest,
  type IndiceDeTest,
  type IndicePilar,
  type Subpilar,
} from "./Indices";

export type EstadoSesion = "en_curso" | "parcial" | "completa" | "no_apta" | "anulada";

export interface PuntajeTest {
  clave: string;
  valor: number | null;
  base: number | null;
  indice: number | null;
  atipico: boolean;
}

export interface ResultadoSesion {
  estado: "parcial" | "completa";
  puntajes: PuntajeTest[];
  pilares: IndicePilar[];
  /** Tests (o subpilares) que estrenan línea base en esta sesión. */
  nuevasBases: { clave: string; valor: number }[];
}

/**
 * Cierra una sesión: valor de cada test, índice contra su línea base, alertas y pilares.
 * La primera vez que un cliente hace un test, ese valor queda como su base (índice 100).
 * Si el cliente ya tenía evaluaciones, un test que se estrena no cuenta en el pilar hasta su segunda medición.
 * Sin rúbrica completa (sin compañero de sparring), la sesión queda parcial: Estrategia se completa otro día del mes.
 */
export function calcularSesion(datos: {
  tests: readonly DefinicionTest[];
  criterios: readonly CriterioRubrica[];
  capturas: ReadonlyMap<string, Captura>;
  rubrica: ReadonlyMap<string, number>;
  bases: ReadonlyMap<string, number>;
  anteriores: ReadonlyMap<string, number>;
  tieneEvaluacionPrevia: boolean;
}): ResultadoSesion {
  const puntajes: PuntajeTest[] = [];
  const nuevasBases: { clave: string; valor: number }[] = [];
  const indicesTest: IndiceDeTest[] = [];

  const conBase = (clave: string, valor: number | null) => {
    if (valor === null) return { base: datos.bases.get(clave) ?? null, estreno: false };
    if (datos.bases.has(clave)) return { base: datos.bases.get(clave)!, estreno: false };
    nuevasBases.push({ clave, valor });
    return { base: valor, estreno: datos.tieneEvaluacionPrevia };
  };

  for (const test of datos.tests.filter((t) => t.formula !== "rubrica")) {
    const valor = valorDelTest(test, datos.capturas.get(test.codigo) ?? []);
    const { base, estreno } = conBase(test.codigo, valor);
    const i = valor !== null && base !== null ? indice(valor, base, test.mayorEsMejor) : null;
    puntajes.push({ clave: test.codigo, valor, base, indice: i, atipico: valor !== null && esAtipico(valor, datos.anteriores.get(test.codigo) ?? null) });
    indicesTest.push({ codigo: test.codigo, pilar: test.pilar, peso: test.pesoEnPilar, obligatorio: test.obligatorio, indice: i, estreno });
  }

  const valores = valoresDeRubrica(datos.criterios, datos.rubrica);
  const subpilares = {} as Record<Subpilar, number | null>;
  for (const sub of ["tactica", "adaptabilidad"] as const) {
    const valor = valores[sub];
    const { base, estreno } = conBase(sub, valor);
    const i = valor !== null && base !== null && !estreno ? indiceRubrica(valor, base) : null;
    subpilares[sub] = i;
    puntajes.push({ clave: sub, valor, base, indice: i, atipico: false });
  }

  const pilares = indicesPorPilar(indicesTest, subpilares);
  return { estado: valores.tactica !== null && valores.adaptabilidad !== null ? "completa" : "parcial", puntajes, pilares, nuevasBases };
}

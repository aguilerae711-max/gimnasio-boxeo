import { describe, expect, it } from "vitest";
import type { CriterioRubrica, DefinicionTest } from "./Indices";
import { calcularSesion } from "./Sesion";

const t = (codigo: string, pilar: DefinicionTest["pilar"], formula: DefinicionTest["formula"], campos: string[], peso: number, obligatorio = true): DefinicionTest => ({
  codigo,
  nombre: codigo,
  pilar,
  formula,
  campos,
  intentos: 2,
  mayorEsMejor: true,
  pesoEnPilar: peso,
  obligatorio,
});
const tests = [
  t("sprint", "velocidad", "mejor_x2", ["cross"], 60),
  t("cuad", "velocidad", "mejor_resta", ["toques", "pisadas"], 40),
  t("salto", "fuerza", "mejor", ["cm"], 50),
  t("flex", "fuerza", "mejor", ["reps"], 50),
  t("esc_a", "estrategia", "rubrica", ["rubrica"], 0),
  t("ret", "resistencia", "retencion", ["g1", "g3"], 60),
  t("fc", "resistencia", "diferencia", ["fc_pico", "fc_60"], 40, false),
];
const criterios: CriterioRubrica[] = [
  ...["a1", "a2"].map((codigo) => ({ codigo, testCodigo: "esc_a", subpilar: "tactica" as const })),
  ...["b1", "b2"].map((codigo) => ({ codigo, testCodigo: "esc_a", subpilar: "adaptabilidad" as const })),
];
const capturas = (escala = 1) =>
  new Map([
    ["sprint", [{ cross: 15 * escala }, { cross: 14 * escala }]],
    ["cuad", [{ toques: 22 * escala, pisadas: 2 }]],
    ["salto", [{ cm: 190 * escala }, null]],
    ["flex", [{ reps: 18 * escala }]],
    ["ret", [{ g1: 40, g3: 32 * escala }]],
    ["fc", [null]],
  ]);

describe("cálculo de una sesión", () => {
  it("evaluación inicial: todo queda en 100, se fijan las bases y sin pulsómetro Resistencia igual se publica", () => {
    const r = calcularSesion({
      tests,
      criterios,
      capturas: capturas(),
      rubrica: new Map([["a1", 1], ["a2", 1], ["b1", 2], ["b2", 0]]),
      bases: new Map(),
      anteriores: new Map(),
      tieneEvaluacionPrevia: false,
    });
    expect(r.estado).toBe("completa");
    expect(Object.fromEntries(r.pilares.map((p) => [p.pilar, p.indice]))).toEqual({ fuerza: 100, velocidad: 100, resistencia: 100, estrategia: 100 });
    expect(r.nuevasBases.map((b) => b.clave).sort()).toEqual(["adaptabilidad", "cuad", "flex", "ret", "salto", "sprint", "tactica"]);
    expect(r.nuevasBases.find((b) => b.clave === "sprint")?.valor).toBe(30);
  });

  it("mensual con 10% de mejora en todo; Estrategia sin compañero queda parcial", () => {
    const bases = new Map([["sprint", 30], ["cuad", 20], ["salto", 190], ["flex", 18], ["ret", 80], ["tactica", 2], ["adaptabilidad", 2]]);
    const r = calcularSesion({
      tests,
      criterios,
      capturas: capturas(1.1),
      rubrica: new Map(),
      bases,
      anteriores: new Map([["salto", 190]]),
      tieneEvaluacionPrevia: true,
    });
    expect(r.estado).toBe("parcial");
    const p = Object.fromEntries(r.pilares.map((x) => [x.pilar, x.indice]));
    expect(p.fuerza).toBe(110);
    expect(p.estrategia).toBeNull();
    expect(r.nuevasBases).toEqual([]);
    expect(r.puntajes.find((x) => x.clave === "salto")).toMatchObject({ valor: 209, base: 190, indice: 110, atipico: false });
  });

  it("marca como atípico un salto de más del 40% contra el mes anterior", () => {
    const r = calcularSesion({
      tests,
      criterios,
      capturas: new Map([["salto", [{ cm: 300 }]]]),
      rubrica: new Map(),
      bases: new Map([["salto", 190]]),
      anteriores: new Map([["salto", 195]]),
      tieneEvaluacionPrevia: true,
    });
    expect(r.puntajes.find((x) => x.clave === "salto")).toMatchObject({ indice: 150, atipico: true });
  });
});

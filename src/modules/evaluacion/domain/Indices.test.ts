import { describe, expect, it } from "vitest";
import { esAtipico, indice, indiceRubrica, indicesPorPilar, valorDelTest, valoresDeRubrica, type DefinicionTest } from "./Indices";

const test = (extra: Partial<DefinicionTest>): DefinicionTest => ({
  codigo: "t",
  nombre: "t",
  pilar: "fuerza",
  formula: "mejor",
  campos: ["valor"],
  intentos: 3,
  mayorEsMejor: true,
  pesoEnPilar: 50,
  obligatorio: true,
  ...extra,
});

describe("valor de cada test", () => {
  it("salto: el mejor de 3 intentos, ignorando nulos", () => {
    expect(valorDelTest(test({}), [{ valor: 182 }, null, { valor: 190 }])).toBe(190);
  });
  it("sprint en costal: se cuenta el cross y se multiplica por 2", () => {
    expect(valorDelTest(test({ formula: "mejor_x2", campos: ["cross"], intentos: 2 }), [{ cross: 14 }, { cross: 16 }])).toBe(32);
  });
  it("cuadrantes: mejor (toques − pisadas)", () => {
    expect(valorDelTest(test({ formula: "mejor_resta", campos: ["toques", "pisadas"] }), [{ toques: 25, pisadas: 3 }, { toques: 24, pisadas: 0 }])).toBe(24);
  });
  it("retención: G3 ÷ G1 × 100", () => {
    expect(valorDelTest(test({ formula: "retencion", campos: ["g1", "g3"], intentos: 1 }), [{ g1: 40, g3: 33 }])).toBe(82.5);
  });
  it("recuperación cardíaca: FC pico − FC a los 60 s; sin pulsómetro queda sin valor", () => {
    const fc = test({ formula: "diferencia", campos: ["fc_pico", "fc_60"], intentos: 1 });
    expect(valorDelTest(fc, [{ fc_pico: 182, fc_60: 150 }])).toBe(32);
    expect(valorDelTest(fc, [null])).toBeNull();
  });
});

describe("índices", () => {
  it("la evaluación inicial es 100; mejorar 10% da 110; tope 150", () => {
    expect(indice(190, 190, true)).toBe(100);
    expect(indice(209, 190, true)).toBe(110);
    expect(indice(400, 190, true)).toBe(150);
  });
  it("si menor es mejor (tiempos) se invierte", () => {
    expect(indice(9, 10, false)).toBe(111);
  });
  it("con base 0 no hay índice; la rúbrica sí funciona desde 0", () => {
    expect(indice(5, 0, true)).toBeNull();
    expect(indiceRubrica(3, 0)).toBe(130);
    expect(indiceRubrica(4, 6)).toBe(80);
  });
  it("alerta si cambia más de ±40% contra la anterior", () => {
    expect(esAtipico(30, 20)).toBe(true);
    expect(esAtipico(26, 20)).toBe(false);
    expect(esAtipico(26, null)).toBe(false);
  });
});

describe("rúbrica y pilares", () => {
  const criterios = [
    ...["c1", "c2", "c6", "c7", "c10"].map((codigo) => ({ codigo, testCodigo: "esc", subpilar: "adaptabilidad" as const })),
    ...["c3", "c4", "c5", "c8", "c9"].map((codigo) => ({ codigo, testCodigo: "esc", subpilar: "tactica" as const })),
  ];
  it("Táctica y Adaptabilidad suman sus 5 conductas; si falta una, no hay valor", () => {
    const niveles = new Map(["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "c10"].map((c, i) => [c, i % 3]));
    expect(valoresDeRubrica(criterios, niveles)).toEqual({ tactica: 6, adaptabilidad: 3 });
    niveles.delete("c3");
    expect(valoresDeRubrica(criterios, niveles).tactica).toBeNull();
  });

  it("pilar = promedio ponderado; Estrategia = mitad Táctica y mitad Adaptabilidad", () => {
    const pilares = indicesPorPilar(
      [
        { codigo: "salto", pilar: "fuerza", peso: 50, obligatorio: true, indice: 110, estreno: false },
        { codigo: "flex", pilar: "fuerza", peso: 50, obligatorio: true, indice: 120, estreno: false },
        { codigo: "sprint", pilar: "velocidad", peso: 60, obligatorio: true, indice: 100, estreno: false },
        { codigo: "cuad", pilar: "velocidad", peso: 40, obligatorio: true, indice: 125, estreno: false },
        { codigo: "ret", pilar: "resistencia", peso: 60, obligatorio: true, indice: 105, estreno: false },
        { codigo: "fc", pilar: "resistencia", peso: 40, obligatorio: false, indice: null, estreno: false },
      ],
      { tactica: 110, adaptabilidad: 100 },
    );
    expect(Object.fromEntries(pilares.map((p) => [p.pilar, p.indice]))).toEqual({ fuerza: 115, velocidad: 110, resistencia: 105, estrategia: 105 });
  });

  it("si falta un test obligatorio el pilar no se publica; un test que se estrena no cuenta todavía", () => {
    const [fuerza] = indicesPorPilar(
      [
        { codigo: "salto", pilar: "fuerza", peso: 50, obligatorio: true, indice: null, estreno: false },
        { codigo: "flex", pilar: "fuerza", peso: 50, obligatorio: true, indice: 120, estreno: false },
      ],
      { tactica: null, adaptabilidad: null },
    );
    expect(fuerza).toMatchObject({ indice: null, completo: false });
    const [conEstreno] = indicesPorPilar(
      [
        { codigo: "salto", pilar: "fuerza", peso: 50, obligatorio: true, indice: 100, estreno: true },
        { codigo: "flex", pilar: "fuerza", peso: 50, obligatorio: true, indice: 120, estreno: false },
      ],
      { tactica: null, adaptabilidad: null },
    );
    expect(conEstreno.indice).toBe(120);
  });
});

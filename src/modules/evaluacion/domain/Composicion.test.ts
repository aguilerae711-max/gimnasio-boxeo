import { describe, expect, it } from "vitest";
import { divisionPara, estadoCorporal, imc, type DivisionPeso, type Medicion } from "./Composicion";

const divisiones: DivisionPeso[] = [
  ...[50, 55, 60, 65, 70, 75, 80, 85, 90].map((l) => ({ nombre: `${l} kg`, sexo: "M" as const, limiteKg: l })),
  { nombre: "+90 kg", sexo: "M", limiteKg: null },
  ...[48, 51, 54, 57, 60, 65, 70, 75, 80].map((l) => ({ nombre: `${l} kg`, sexo: "F" as const, limiteKg: l })),
  { nombre: "+80 kg", sexo: "F", limiteKg: null },
];

describe("composición corporal", () => {
  it("IMC con su lectura", () => {
    expect(imc(70, 175)).toEqual({ valor: 22.9, lectura: "Peso adecuado" });
    expect(imc(85, 170).lectura).toBe("Sobrepeso");
  });

  it("la división depende del sexo: 58 kg es 60 kg en hombres y 60 kg en mujeres; 52 kg cambia", () => {
    expect(divisionPara(58, "M", divisiones)?.nombre).toBe("60 kg");
    expect(divisionPara(52, "M", divisiones)?.nombre).toBe("55 kg");
    expect(divisionPara(52, "F", divisiones)?.nombre).toBe("54 kg");
    expect(divisionPara(60, "F", divisiones)?.nombre).toBe("60 kg");
    expect(divisionPara(96, "M", divisiones)?.nombre).toBe("+90 kg");
  });

  it("el último pesaje manda; el aproximado del registro no es punto de partida si hay pesajes reales", () => {
    const mediciones: Medicion[] = [
      { fecha: "2026-11-01", pesoKg: 80, estaturaCm: 175, origen: "registro", aproximado: true },
      { fecha: "2026-11-05", pesoKg: 77.4, estaturaCm: null, origen: "evaluacion", aproximado: false },
      { fecha: "2026-12-05", pesoKg: 74.9, estaturaCm: null, origen: "evaluacion", aproximado: false },
    ];
    const e = estadoCorporal(mediciones, "M", divisiones)!;
    expect(e.actual.pesoKg).toBe(74.9);
    expect(e.estaturaCm).toBe(175);
    expect(e.division?.nombre).toBe("75 kg");
    expect([e.cambioAnterior, e.cambioTotal]).toEqual([-2.5, -2.5]);
    expect(e.imc?.valor).toBe(24.5);
  });

  it("sin sexo registrado no asigna división", () => {
    expect(estadoCorporal([{ fecha: "2026-11-01", pesoKg: 70, estaturaCm: null, origen: "registro", aproximado: true }], null, divisiones)?.division).toBeNull();
  });
});

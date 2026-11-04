import { describe, expect, it } from "vitest";
import { normalizar, parecidos, puedeVer, traducirCombinacion, validarPropuesta, type NombreConocido } from "./Biblioteca";
import { claveTurno, diferencias, planVigente, siguienteEstado, validarRutina } from "./Planes";

const golpes = [
  { codigo: "1", nombre: "Jab", mano: "adelante" as const },
  { codigo: "2", nombre: "Recto de atrás", mano: "atras" as const },
  { codigo: "3", nombre: "Gancho de adelante", mano: "adelante" as const },
  { codigo: "3c", nombre: "Gancho al hígado", mano: "adelante" as const },
  { codigo: "V", nombre: "Volado", mano: "atras" as const },
];

describe("glosario y nombres", () => {
  it("normaliza acentos, mayúsculas y signos", () => {
    expect(normalizar("  Gancho al Hígado! ")).toBe("gancho al higado");
  });

  it("traduce combinaciones con cualquier separador y avisa de números que no existen", () => {
    expect(traducirCombinacion("1-2-3c", golpes).map((g) => g.nombre)).toEqual(["Jab", "Recto de atrás", "Gancho al hígado"]);
    expect(traducirCombinacion("1, 2 v", golpes).map((g) => g.codigo)).toEqual(["1", "2", "V"]);
    expect(() => traducirCombinacion("1-9", golpes)).toThrow(/número 9/);
  });

  it("encuentra duplicados por nombre oficial, alias o una letra de diferencia", () => {
    const conocidos: NombreConocido[] = [
      { id: "e1", nombre: "Manopleo", oficial: "Manopleo", tipo: "ejercicio" },
      { id: "e1", nombre: "Manoplas", oficial: "Manopleo", tipo: "ejercicio" },
      { id: "e2", nombre: "Sombra", oficial: "Sombra", tipo: "ejercicio" },
      { id: "g1", nombre: "Overhand", oficial: "Volado", tipo: "golpe" },
    ];
    expect(parecidos("manopleo grupal", conocidos).map((c) => c.id)).toEqual(["e1"]);
    expect(parecidos("Sonbra", conocidos).map((c) => c.id)).toEqual(["e2"]);
    expect(parecidos("overhand", conocidos).map((c) => c.tipo)).toEqual(["golpe"]);
    expect(parecidos("Burpees", conocidos)).toEqual([]);
  });

  it("propuesta: nombre y descripción con largo razonable", () => {
    expect(() => validarPropuesta({ nombre: "Ab", descripcion: "muy corta" })).toThrow(/nombre/);
    expect(validarPropuesta({ nombre: " Escalera  de pies ", descripcion: "Pasos rápidos en escalera de agilidad." }).nombre).toBe("Escalera de pies");
  });
});

describe("quién ve cada ejercicio", () => {
  const base = { estado: "formalizado" as const, visibilidad: "compartido" as const, esBasico: false, creadoPorCoachId: "mike" };
  it("los básicos todos; uno privado solo su autor; uno compartido, quien tiene acceso", () => {
    const chato = { esAdministracion: false, coachId: "chato", accesoCompartido: false };
    expect(puedeVer({ ...base, esBasico: true }, chato)).toBe(true);
    expect(puedeVer({ ...base, visibilidad: "privado" }, chato)).toBe(false);
    expect(puedeVer({ ...base, visibilidad: "privado" }, { ...chato, coachId: "mike" })).toBe(true);
    expect(puedeVer(base, chato)).toBe(false);
    expect(puedeVer(base, { ...chato, accesoCompartido: true })).toBe(true);
    expect(puedeVer({ ...base, estado: "propuesto" }, { ...chato, accesoCompartido: true })).toBe(false);
  });
});

describe("rutinas y planes", () => {
  const bloque = (minutos: number) => ({ tipo: "tecnica" as const, minutos, rounds: null, descripcion: "", elementos: [] });
  it("una rutina no pasa de 120 minutos", () => {
    expect(() => validarRutina({ nombre: "A", descripcion: "", bloques: [bloque(20)] })).toThrow(/nombre/);
    expect(() => validarRutina({ nombre: "Técnica", descripcion: "", bloques: [bloque(90), bloque(40)] })).toThrow(/130 minutos/);
    expect(validarRutina({ nombre: " Técnica y saco ", descripcion: "", bloques: [bloque(60), bloque(60)] }).nombre).toBe("Técnica y saco");
  });

  it("la administración solo ve los turnos que cambiaron", () => {
    const enero = new Map([[claveTurno(1, "f18"), "A"], [claveTurno(3, "f18"), "B"]]);
    const febrero = new Map([[claveTurno(1, "f18"), "A"], [claveTurno(3, "f18"), "C"], [claveTurno(5, "f18"), "A"]]);
    expect(diferencias(enero, febrero)).toEqual([
      { turno: "3:f18", antes: "B", ahora: "C" },
      { turno: "5:f18", antes: null, ahora: "A" },
    ]);
  });

  it("flujo: borrador → enviado → aprobado o con cambios; en revisión no se edita", () => {
    expect(siguienteEstado("borrador", "enviar")).toBe("enviado");
    expect(() => siguienteEstado("enviado", "editar")).toThrow(/revisión/);
    expect(siguienteEstado("enviado", "pedir_cambios")).toBe("requiere_cambios");
    expect(siguienteEstado("requiere_cambios", "enviar")).toBe("enviado");
    expect(() => siguienteEstado("borrador", "aprobar")).toThrow(/enviados/);
  });

  it("mientras el plan nuevo está en revisión, sigue vigente el último aprobado", () => {
    const planes = [
      { mes: "2026-11", estado: "aprobado" as const },
      { mes: "2026-12", estado: "enviado" as const },
    ];
    expect(planVigente(planes, "2026-12")?.mes).toBe("2026-11");
  });
});

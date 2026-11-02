import { describe, expect, it } from "vitest";
import { Fecha } from "@/shared/domain/Fecha";
import { Horario, listaDeDias } from "./Horario";
import { perfilCliente } from "./Perfiles";

const franjas = [
  { id: "f08", inicio: "08:00", fin: "10:00" },
  { id: "f18", inicio: "18:00", fin: "20:00" },
];
const horario = new Horario([1, 2, 3, 4, 5], franjas, [
  { id: "a1", coachId: "mike", franjaId: "f18", diaSemana: 1, cupoMax: null },
  { id: "a2", coachId: "mike", franjaId: "f18", diaSemana: 3, cupoMax: null },
  { id: "a3", coachId: "chato", franjaId: "f18", diaSemana: 1, cupoMax: 12 },
]);

describe("Horario", () => {
  it("deja varios coaches en la misma celda", () => {
    expect(() => horario.validarNueva({ coachId: "ivan", franjaId: "f18", diaSemana: 1, cupoMax: null })).not.toThrow();
  });

  it("no repite al mismo coach en la misma celda", () => {
    expect(() => horario.validarNueva({ coachId: "mike", franjaId: "f18", diaSemana: 1, cupoMax: null })).toThrow(/ya tiene ese turno/);
  });

  it("no asigna en días que el gimnasio no abre", () => {
    expect(() => horario.validarNueva({ coachId: "mike", franjaId: "f08", diaSemana: 6, cupoMax: null })).toThrow(/no abre el sábado/);
  });

  it("valida el cupo", () => {
    expect(() => horario.validarNueva({ coachId: "ivan", franjaId: "f08", diaSemana: 2, cupoMax: 0 })).toThrow(/cupo/);
  });

  it("sabe qué días da clase un coach en una franja", () => {
    expect(horario.diasDe("mike", "f18")).toEqual([1, 3]);
    expect(listaDeDias(horario.diasDe("mike", "f18"))).toBe("Lunes y Miércoles");
    expect(listaDeDias([1, 3, 5])).toBe("Lunes, Miércoles y Viernes");
  });
});

describe("perfil del cliente", () => {
  const hoy = Fecha.de("2026-11-02");

  it("acepta campos vacíos y limpia espacios", () => {
    expect(perfilCliente({ fechaNacimiento: "", contactoEmergencia: "  Mamá 5512345678 ", notasMedicas: " " }, hoy)).toEqual({
      fechaNacimiento: null,
      contactoEmergencia: "Mamá 5512345678",
      notasMedicas: null,
    });
  });

  it("rechaza fechas de nacimiento imposibles", () => {
    expect(() => perfilCliente({ fechaNacimiento: "2025-01-01", contactoEmergencia: "", notasMedicas: "" }, hoy)).toThrow(/nacimiento/);
  });
});

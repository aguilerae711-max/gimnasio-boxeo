import { describe, expect, it } from "vitest";
import { Dinero } from "@/shared/domain/Dinero";
import { Fecha } from "@/shared/domain/Fecha";
import { Porcentaje } from "@/shared/domain/Porcentaje";
import { AcuerdoComision } from "./AcuerdoComision";
import { PoliticaComision } from "./PoliticaComision";

const acuerdo = (id: string, coachId: string | null, pct: number, desde: string, hasta: string | null = null) =>
  AcuerdoComision.crear({
    id,
    gimnasioId: "g1",
    coachId,
    porcentaje: Porcentaje.de(pct),
    vigenteDesde: Fecha.de(desde),
    vigenteHasta: hasta ? Fecha.de(hasta) : null,
    motivo: "Inicial",
    creadoPor: "admin",
  });

describe("PoliticaComision", () => {
  it("aplica la comisión general de 50% a una membresía de $600", () => {
    const politica = new PoliticaComision([acuerdo("a", null, 50, "2026-11-01")]);
    const { comision } = politica.calcular("mike", Dinero.dePesos(600), Fecha.de("2026-11-15"));
    expect(comision.esIgualA(Dinero.dePesos(300))).toBe(true);
  });

  it("prefiere la excepción del coach sobre la general", () => {
    const politica = new PoliticaComision([acuerdo("a", null, 50, "2026-11-01"), acuerdo("b", "chato", 60, "2026-11-01")]);
    expect(politica.acuerdoPara("chato", Fecha.de("2026-11-10")).porcentaje.valor).toBe(60);
    expect(politica.acuerdoPara("mike", Fecha.de("2026-11-10")).porcentaje.valor).toBe(50);
  });

  it("usa el acuerdo vigente en la fecha de confirmación del pago", () => {
    const politica = new PoliticaComision([
      acuerdo("a", null, 50, "2026-11-01", "2026-11-30"),
      acuerdo("b", null, 45, "2026-12-01"),
    ]);
    expect(politica.acuerdoPara("ivan", Fecha.de("2026-11-30")).porcentaje.valor).toBe(50);
    expect(politica.acuerdoPara("ivan", Fecha.de("2026-12-01")).porcentaje.valor).toBe(45);
  });

  it("redondea al centavo", () => {
    const politica = new PoliticaComision([acuerdo("a", null, 33.33, "2026-11-01")]);
    const { comision } = politica.calcular("ivan", Dinero.dePesos(1650), Fecha.de("2026-11-02"));
    expect(comision.centavos).toBe(54995);
  });

  it("falla si no hay comisión vigente", () => {
    const politica = new PoliticaComision([acuerdo("a", null, 50, "2026-12-01")]);
    expect(() => politica.acuerdoPara("ivan", Fecha.de("2026-11-15"))).toThrow(/No hay comisión vigente/);
  });
});

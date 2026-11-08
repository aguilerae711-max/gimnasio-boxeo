import { describe, expect, it } from "vitest";
import { Dinero } from "@/shared/domain/Dinero";
import { Fecha } from "@/shared/domain/Fecha";
import { Porcentaje } from "@/shared/domain/Porcentaje";
import { AcuerdoComision } from "./AcuerdoComision";
import { cargoDelSistema, cuadreDelMes, estadoMembresia, ingresosDelMes, renovacionesDelMes, situacionDePago, validarMesCerrable, type PagoConfirmado } from "./Cuentas";
import { Pago } from "./Pago";
import { finDelPeriodo } from "./Plan";
import { PoliticaComision } from "./PoliticaComision";

const f = Fecha.de;
const pesos = Dinero.dePesos;
const mensual = { unidad: "meses" as const, cantidad: 1 };
const politica = new PoliticaComision([
  AcuerdoComision.crear({
    id: "g",
    gimnasioId: "g1",
    coachId: null,
    porcentaje: Porcentaje.de(50),
    vigenteDesde: f("2026-11-01"),
    vigenteHasta: null,
    motivo: "Inicial",
    creadoPor: "ivan",
  }),
]);

const nuevoPago = (extra: Partial<Parameters<typeof Pago.nuevo>[0]> = {}, hoy = f("2026-11-20")) =>
  Pago.nuevo(
    {
      id: "p1",
      gimnasioId: "g1",
      clienteId: "ana",
      coachClienteId: "mike",
      planId: "mensual",
      monto: pesos(600),
      fechaPago: f("2026-11-15"),
      metodo: "efectivo",
      recibidoPor: "coach",
      coachReceptorId: "mike",
      esCargaInicial: false,
      ...extra,
    },
    hoy,
  );

describe("plan", () => {
  it("un mes desde el 15 cubre hasta el 14 del siguiente; del 31 de enero, hasta el 27 de febrero", () => {
    expect(finDelPeriodo(f("2026-11-15"), mensual).valor).toBe("2026-12-14");
    expect(finDelPeriodo(f("2027-01-31"), mensual).valor).toBe("2027-02-27");
    expect(finDelPeriodo(f("2026-11-01"), { unidad: "semanas", cantidad: 2 }).valor).toBe("2026-11-14");
  });
});

describe("pago", () => {
  it("al confirmar corre desde la fecha del pago y genera la comisión del coach del cliente", () => {
    const pago = nuevoPago();
    pago.confirmar(f("2026-11-20"), mensual, null, politica);
    const p = pago.instantanea();
    expect([p.periodoDesde?.valor, p.periodoHasta?.valor]).toEqual(["2026-11-15", "2026-12-14"]);
    expect(p.comision?.esIgualA(pesos(300))).toBe(true);
  });

  it("si paga antes de vencer, el periodo nuevo empieza al terminar el que tiene", () => {
    const pago = nuevoPago();
    pago.confirmar(f("2026-11-20"), mensual, f("2026-11-30"), politica);
    expect(pago.instantanea().periodoDesde?.valor).toBe("2026-12-01");
  });

  it("la carga inicial no genera comisión y acepta pagos antiguos", () => {
    const pago = nuevoPago({ esCargaInicial: true, fechaPago: f("2026-08-01"), recibidoPor: "administracion", coachReceptorId: null });
    pago.confirmar(f("2026-11-20"), mensual, null, politica);
    expect(pago.instantanea().comision?.centavos).toBe(0);
  });

  it("no acepta pagos futuros ni de hace más de 60 días sin ser carga inicial", () => {
    expect(() => nuevoPago({ fechaPago: f("2026-11-21") })).toThrow(/posterior a hoy/);
    expect(() => nuevoPago({ fechaPago: f("2026-09-01") })).toThrow(/carga inicial/);
  });

  it("si lo cobró un coach hay que decir cuál", () => {
    expect(() => nuevoPago({ coachReceptorId: null })).toThrow(/qué coach/);
  });

  it("se revisa una sola vez y el rechazo pide motivo", () => {
    const pago = nuevoPago();
    expect(() => pago.rechazar(" ", f("2026-11-20"))).toThrow(/por qué/);
    pago.rechazar("No llegó la transferencia", f("2026-11-20"));
    expect(() => pago.confirmar(f("2026-11-20"), mensual, null, politica)).toThrow(/ya fue revisado/);
  });
});

describe("membresía", () => {
  const periodo = { periodoDesde: f("2026-11-15"), periodoHasta: f("2026-12-14") };
  it("activo, por vencer (5 días o menos) y vencido", () => {
    expect(estadoMembresia([periodo], f("2026-11-20"))).toMatchObject({ estado: "activo", diasRestantes: 25 });
    expect(estadoMembresia([periodo], f("2026-12-12"))).toMatchObject({ estado: "por_vencer", diasRestantes: 3 });
    expect(estadoMembresia([periodo], f("2026-12-15"))).toMatchObject({ estado: "vencido", diasRestantes: 0 });
    expect(estadoMembresia([], f("2026-12-15")).estado).toBe("sin_pago");
  });
});

describe("cuentas del mes", () => {
  const pago = (extra: Partial<PagoConfirmado>): PagoConfirmado => ({
    coachClienteId: "mike",
    coachReceptorId: null,
    monto: pesos(600),
    comision: pesos(300),
    esCargaInicial: false,
    fechaConfirmacion: f("2026-11-20"),
    periodoDesde: f("2026-11-15"),
    periodoHasta: f("2026-12-14"),
    ...extra,
  });
  const pagos = [
    pago({ coachReceptorId: "mike" }), // Mike cobró $600 en efectivo
    pago({}), // pagó en administración
    pago({ coachClienteId: "chato", coachReceptorId: "mike" }), // Mike cobró a un cliente de Chato
    pago({ esCargaInicial: true, comision: pesos(0), coachReceptorId: "mike" }),
    pago({ fechaConfirmacion: f("2026-12-01"), coachReceptorId: "mike" }),
  ];

  it("Mike: $600 de comisión contra $1,200 cobrados → entrega $600 a la administración", () => {
    const c = cuadreDelMes(pagos, "mike", "2026-11");
    expect([c.comisiones.centavos, c.cobrosEnMano.centavos, c.saldoCentavos]).toEqual([60000, 120000, -60000]);
  });

  it("Chato no cobró nada: la administración le paga su comisión", () => {
    expect(cuadreDelMes(pagos, "chato", "2026-11").saldoCentavos).toBe(30000);
  });

  it("los ingresos del mes no cuentan la carga inicial", () => {
    expect(ingresosDelMes(pagos, "2026-11").centavos).toBe(180000);
  });

  it("la cuota del sistema empieza en 0% y puede pasar a porcentaje o cuota fija", () => {
    const tarifas = [
      { tipo: "porcentaje" as const, puntosBase: 0, cuotaFija: pesos(0), vigenteDesde: f("2026-11-01") },
      { tipo: "cuota_fija" as const, puntosBase: 0, cuotaFija: pesos(499), vigenteDesde: f("2027-01-01") },
    ];
    expect(cargoDelSistema(tarifas, "2026-11", pesos(1800)).cargo.centavos).toBe(0);
    expect(cargoDelSistema(tarifas, "2027-01", pesos(1800)).cargo.centavos).toBe(49900);
    expect(cargoDelSistema([{ ...tarifas[0], puntosBase: 500 }], "2026-11", pesos(1800)).cargo.centavos).toBe(9000);
  });

  it("solo se cuadran meses terminados", () => {
    expect(() => validarMesCerrable("2026-11", f("2026-11-20"))).toThrow(/ya terminaron/);
    expect(() => validarMesCerrable("2026-10", f("2026-11-20"))).not.toThrow();
  });

describe("seguimiento de vencimientos", () => {
  const p = (desde: string, hasta: string) => ({ periodoDesde: Fecha.de(desde), periodoHasta: Fecha.de(hasta) });

  it("cuenta los días que quedan (incluido hoy); 0 o menos es vencida", () => {
    expect(situacionDePago([], Fecha.de("2026-11-10"))).toEqual({ vence: null, dias: null });
    expect(situacionDePago([p("2026-10-18", "2026-11-17")], Fecha.de("2026-11-10")).dias).toBe(8);
    expect(situacionDePago([p("2026-10-18", "2026-11-17")], Fecha.de("2026-11-17")).dias).toBe(1);
    expect(situacionDePago([p("2026-10-18", "2026-11-17")], Fecha.de("2026-11-20")).dias).toBe(-2);
  });

  it("de quienes vencieron en el mes, separa a quien renovó de quien dejó de pagar", () => {
    const periodos = new Map([
      ["renovo", [p("2026-10-05", "2026-11-04"), p("2026-11-05", "2026-12-04")]],
      ["se_fue", [p("2026-10-08", "2026-11-07")]],
      ["aun_no_vence", [p("2026-11-01", "2026-11-30")]],
    ]);
    expect(renovacionesDelMes(periodos, "2026-11", Fecha.de("2026-11-15"))).toEqual({ renovaron: ["renovo"], sinRenovar: ["se_fue"] });
  });
});
});

import { beforeEach, describe, expect, it } from "vitest";
import type { Actor, EntradaAuditoria } from "@/shared/application/puertos";
import { Fecha } from "@/shared/domain/Fecha";
import { Porcentaje } from "@/shared/domain/Porcentaje";
import { AcuerdoComision } from "../domain/AcuerdoComision";
import { RepositorioAcuerdosComisionEnMemoria } from "../infrastructure/RepositorioAcuerdosComisionEnMemoria";
import { CambiarComision } from "./CambiarComision";

const admin: Actor = { usuarioId: "ivan", gimnasioId: "g1" };
const coach: Actor = { usuarioId: "mike", gimnasioId: "g1" };
// 1 nov 2026, 10:00 en Ciudad de México.
const AHORA = new Date("2026-11-01T16:00:00Z");

const general50 = () =>
  AcuerdoComision.crear({
    id: "inicial",
    gimnasioId: "g1",
    coachId: null,
    porcentaje: Porcentaje.de(50),
    vigenteDesde: Fecha.de("2026-11-01"),
    vigenteHasta: null,
    motivo: "Comisión inicial",
    creadoPor: "ivan",
  });

describe("CambiarComision", () => {
  let repositorio: RepositorioAcuerdosComisionEnMemoria;
  let bitacora: EntradaAuditoria[];
  let caso: CambiarComision;

  beforeEach(() => {
    repositorio = new RepositorioAcuerdosComisionEnMemoria([general50()]);
    bitacora = [];
    let n = 0;
    caso = new CambiarComision(
      repositorio,
      { tienePermiso: async (actor) => actor.usuarioId === "ivan" },
      { registrar: async (e) => void bitacora.push(e) },
      { ahora: () => AHORA },
      { nuevo: () => `nuevo-${++n}` },
      "America/Mexico_City",
    );
  });

  it("cambia la comisión general desde una fecha y cierra la anterior el día previo", async () => {
    await caso.ejecutar(admin, { coachId: null, porcentaje: 45, vigenteDesde: "2026-12-01", motivo: "Ajuste anual" });

    const acuerdos = await repositorio.delGimnasio("g1");
    const anterior = acuerdos.find((a) => a.id === "inicial")!;
    expect(anterior.vigenteHasta?.valor).toBe("2026-11-30");
    expect(acuerdos.find((a) => a.id === "nuevo-1")!.porcentaje.valor).toBe(45);
  });

  it("crea una excepción para un coach sin tocar la general", async () => {
    await caso.ejecutar(admin, { coachId: "chato", porcentaje: 60, vigenteDesde: "2026-11-01", motivo: "Grupo avanzado" });

    const acuerdos = await repositorio.delGimnasio("g1");
    expect(acuerdos.find((a) => a.id === "inicial")!.vigenteHasta).toBeNull();
    expect(acuerdos.find((a) => a.coachId === "chato")!.porcentaje.valor).toBe(60);
  });

  it("reemplaza un cambio futuro que aún no empieza", async () => {
    await caso.ejecutar(admin, { coachId: null, porcentaje: 45, vigenteDesde: "2026-12-01", motivo: "Ajuste" });
    await caso.ejecutar(admin, { coachId: null, porcentaje: 40, vigenteDesde: "2026-12-01", motivo: "Corrección" });

    const generales = (await repositorio.delGimnasio("g1")).filter((a) => a.esGeneral());
    expect(generales.map((a) => a.porcentaje.valor).sort()).toEqual([40, 50]);
  });

  it("no permite cambios hacia atrás", async () => {
    await expect(
      caso.ejecutar(admin, { coachId: null, porcentaje: 40, vigenteDesde: "2026-10-31", motivo: "Error" }),
    ).rejects.toThrow(/no hacia atrás/);
  });

  it("exige motivo", async () => {
    await expect(
      caso.ejecutar(admin, { coachId: null, porcentaje: 40, vigenteDesde: "2026-12-01", motivo: "  " }),
    ).rejects.toThrow(/motivo/);
  });

  it("solo la administración puede cambiarla", async () => {
    await expect(
      caso.ejecutar(coach, { coachId: "mike", porcentaje: 90, vigenteDesde: "2026-12-01", motivo: "Quiero más" }),
    ).rejects.toThrow(/permiso/);
  });

  it("deja el cambio en la auditoría con el antes y el después", async () => {
    await caso.ejecutar(admin, { coachId: null, porcentaje: 45, vigenteDesde: "2026-12-01", motivo: "Ajuste anual" });

    expect(bitacora).toHaveLength(1);
    expect(bitacora[0]).toMatchObject({ accion: "comision.cambiada", usuarioId: "ivan", motivo: "Ajuste anual" });
  });
});

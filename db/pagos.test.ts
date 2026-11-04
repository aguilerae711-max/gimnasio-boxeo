import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { argon2id } from "@/modules/acceso/infrastructure/AccesoPostgres";
import { RegistrarCliente } from "@/modules/clientes/application/RegistroDeClientes";
import { ClientesPostgres } from "@/modules/clientes/infrastructure/ClientesPostgres";
import { RegistrarPesaje } from "@/modules/evaluacion/application/Pesajes";
import { estadoCorporal } from "@/modules/evaluacion/domain/Composicion";
import { ConsultasPesajes, PesajesPostgres } from "@/modules/evaluacion/infrastructure/PesajesPostgres";
import { CambiarTarifaSistema, CerrarCuadre, GuardarPlan, RegistrarPago, RevisarPago, type DependenciasPagos } from "@/modules/membresias/application/Pagos";
import { cargoDelSistema, cuadreDelMes, estadoMembresia, ingresosDelMes } from "@/modules/membresias/domain/Cuentas";
import { ConsultasPagos, PagosPostgres } from "@/modules/membresias/infrastructure/PagosPostgres";
import { RepositorioAcuerdosComisionPostgres } from "@/modules/membresias/infrastructure/RepositorioAcuerdosComisionPostgres";
import { Fecha } from "@/shared/domain/Fecha";
import { almacenamientoLocal } from "@/shared/infrastructure/almacenamiento";
import { enGimnasio } from "@/shared/infrastructure/baseDeDatos";
import { AuditoriaPostgres, autorizacionConPermisos, idsAleatorios } from "@/shared/infrastructure/comunes";
import { servidorDePrueba } from "./pgliteDePrueba";

const GIMNASIO = "00000000-0000-4000-8000-000000000101";
const IVAN = "00000000-0000-4000-8000-000000000201";
const MIKE = "00000000-0000-4000-8000-000000000202";
const admin = { usuarioId: IVAN, gimnasioId: GIMNASIO };
const mike = { usuarioId: MIKE, gimnasioId: GIMNASIO };
const ADMIN = ["pago.reportar", "pago.confirmar", "gimnasio.configurar", "cuadre.cerrar", "evaluacion.realizar", "sistema.administrar"];

describe("pagos, cuadre y pesajes en Postgres", () => {
  let sql: postgres.Sql;
  let cerrar: () => Promise<void>;
  let ahora: Date;
  let deps: (permisos: string[]) => DependenciasPagos;
  let planId: string;
  let ana: string;
  let beto: string;
  let coachMike: string;
  const archivos = almacenamientoLocal(mkdtempSync(join(tmpdir(), "comprobantes-")));

  beforeAll(async () => {
    ({ sql, cerrar } = await servidorDePrueba(55_436));
    ahora = new Date("2026-11-20T18:00:00Z");
    const reloj = { ahora: () => ahora };
    deps = (permisos) => ({
      pagos: new PagosPostgres(sql),
      acuerdos: new RepositorioAcuerdosComisionPostgres(sql),
      autorizacion: autorizacionConPermisos(permisos),
      auditoria: new AuditoriaPostgres(sql),
      reloj,
      ids: idsAleatorios,
      zonaHoraria: "America/Mexico_City",
    });
    const clientes = new ClientesPostgres(sql);
    const codigo = (await clientes.coachesParaRegistro()).find((c) => c.apodo === "Mike")!.codigo;
    const registrar = new RegistrarCliente(clientes, argon2id, idsAleatorios, reloj);
    const base = { codigoCoach: codigo, telefono: "", clave: "mi clave de boxeo", aceptaReglamento: true };
    ana = (await registrar.ejecutar({ ...base, nombre: "Ana López", correo: "ana@correo.mx", sexo: "F", pesoKg: 58, estaturaCm: 162 })).clienteId;
    beto = (await registrar.ejecutar({ ...base, nombre: "Beto Ruiz", correo: "beto@correo.mx", sexo: "M" })).clienteId;
    coachMike = (await new PagosPostgres(sql).coachDelUsuario(GIMNASIO, MIKE))!.id;
  }, 60_000);

  afterAll(() => cerrar());

  it("la administración crea la mensualidad", async () => {
    planId = (await new GuardarPlan(deps(ADMIN)).ejecutar(admin, { nombre: "Mensualidad", precioPesos: 600, unidad: "meses", cantidad: 1, activo: true })).id;
    expect((await new PagosPostgres(sql).planes(GIMNASIO)).map((p) => p.nombre)).toEqual(["Mensualidad"]);
  });

  it("Mike reporta el pago de Ana con foto; queda por confirmar y él no puede confirmarlo", async () => {
    const foto = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
    const pago = await new RegistrarPago(deps(["pago.reportar"]), archivos).ejecutar(mike, {
      clienteId: ana,
      planId,
      montoPesos: 600,
      fechaPago: "2026-11-18",
      metodo: "efectivo",
      recibidoPor: "coach",
      comprobante: { contenido: foto, tipo: "image/jpeg" },
    });
    expect(pago.estado).toBe("reportado");
    const consultas = new ConsultasPagos(sql);
    const [enLista] = await consultas.porRevisar(GIMNASIO);
    expect(enLista).toMatchObject({ cliente: "Ana López", receptor: "Mike", montoCentavos: 60000, tieneComprobante: true });
    const ruta = (await consultas.comprobante(GIMNASIO, pago.id))!.ruta!;
    expect((await archivos.leer(ruta))?.contenido).toEqual(foto);
    await expect(new RevisarPago(deps(["pago.reportar"])).ejecutar(mike, pago.id, "confirmar")).rejects.toThrow(/permiso/);

    await new RevisarPago(deps(ADMIN)).ejecutar(admin, pago.id, "confirmar");
    const [confirmado] = await consultas.delCliente(GIMNASIO, ana);
    expect(confirmado).toMatchObject({ estado: "confirmado", periodoDesde: "2026-11-18", periodoHasta: "2026-12-17", comisionCentavos: 30000 });
  });

  it("Mike no puede reportar pagos de clientes ajenos ni carga inicial", async () => {
    const otro = { clienteId: beto, planId, montoPesos: 600, fechaPago: "2026-11-18", metodo: "efectivo" as const, recibidoPor: "coach" as const };
    await expect(new RegistrarPago(deps(["pago.reportar"]), archivos).ejecutar(mike, { ...otro, esCargaInicial: true })).rejects.toThrow(/carga inicial/);
  });

  it("la administración registra la carga inicial de Beto (pagó en agosto en el gimnasio): activo, sin comisión", async () => {
    const pago = await new RegistrarPago(deps(ADMIN), archivos).ejecutar(admin, {
      clienteId: beto,
      planId,
      montoPesos: 600,
      fechaPago: "2026-11-05",
      metodo: "transferencia",
      recibidoPor: "administracion",
      esCargaInicial: true,
    });
    expect(pago.instantanea()).toMatchObject({ estado: "confirmado", esCargaInicial: true });
    const periodos = await new ConsultasPagos(sql).periodos(GIMNASIO);
    expect(estadoMembresia(periodos.get(beto)!, Fecha.de("2026-11-20")).estado).toBe("activo");
  });

  it("cuadre de noviembre: Mike tiene $600 cobrados y $300 de comisión → entrega $300; ingresos del mes $600", async () => {
    const pagos = await new PagosPostgres(sql).confirmadosDelMes(GIMNASIO, "2026-11");
    const c = cuadreDelMes(pagos, coachMike, "2026-11");
    expect([c.comisiones.centavos, c.cobrosEnMano.centavos, c.saldoCentavos]).toEqual([30000, 60000, -30000]);
    expect(ingresosDelMes(pagos, "2026-11").centavos).toBe(60000);
    await expect(new CerrarCuadre(deps(ADMIN)).ejecutar(admin, coachMike, "2026-11")).rejects.toThrow(/ya terminaron/);

    ahora = new Date("2026-12-02T18:00:00Z");
    await new CerrarCuadre(deps(ADMIN)).ejecutar(admin, coachMike, "2026-11", "Entregó efectivo");
    expect(await new ConsultasPagos(sql).cuadresDelMes(GIMNASIO, "2026-11")).toEqual([expect.objectContaining({ coachId: coachMike, saldoCentavos: -30000 })]);
    await expect(new CerrarCuadre(deps(ADMIN)).ejecutar(admin, coachMike, "2026-11")).rejects.toThrow(/ya está cuadrado/);
  });

  it("la cuota del sistema arranca en 0% y el superadmin la programa para un mes futuro", async () => {
    const repo = new PagosPostgres(sql);
    expect(cargoDelSistema(await repo.tarifas(GIMNASIO), "2026-11", (await repo.confirmadosDelMes(GIMNASIO, "2026-11"))[0].monto).cargo.centavos).toBe(0);
    const cambiar = new CambiarTarifaSistema(deps(ADMIN));
    await expect(cambiar.ejecutar(admin, { tipo: "porcentaje", porcentaje: 5, cuotaPesos: 0, desdeMes: "2026-12", motivo: "Prueba" })).rejects.toThrow(/mes futuro/);
    await cambiar.ejecutar(admin, { tipo: "cuota_fija", porcentaje: 0, cuotaPesos: 499, desdeMes: "2027-01", motivo: "Plan básico" });
    await expect(new CambiarTarifaSistema(deps(["pago.confirmar"])).ejecutar(admin, { tipo: "porcentaje", porcentaje: 5, cuotaPesos: 0, desdeMes: "2027-02", motivo: "x" })).rejects.toThrow(/permiso/);
    const tarifas = await repo.tarifas(GIMNASIO);
    expect(cargoDelSistema(tarifas, "2027-01", (await repo.confirmadosDelMes(GIMNASIO, "2026-11"))[0].monto).cargo.centavos).toBe(49900);
  });

  it("pesajes: el aproximado del registro, luego evaluación e imprevisto; la división sigue al último pesaje", async () => {
    const registrar = new RegistrarPesaje(
      { repositorio: new PesajesPostgres(sql), autorizacion: autorizacionConPermisos(ADMIN), auditoria: new AuditoriaPostgres(sql), reloj: { ahora: () => ahora }, ids: idsAleatorios },
      "America/Mexico_City",
    );
    await registrar.ejecutar(admin, { clienteId: ana, fecha: "2026-11-25", pesoKg: 56.8, estaturaCm: 163, origen: "evaluacion" });
    await registrar.ejecutar(admin, { clienteId: ana, fecha: "2026-12-01", pesoKg: 54.6, estaturaCm: null, origen: "imprevista" });
    const { mediciones, sexo, divisiones } = await new ConsultasPesajes(sql).delCliente(GIMNASIO, ana);
    expect(mediciones.map((m) => [m.origen, m.aproximado])).toEqual([["registro", true], ["evaluacion", false], ["imprevista", false]]);
    const e = estadoCorporal(mediciones, sexo, divisiones)!;
    expect(e.division?.nombre).toBe("57 kg");
    expect([e.cambioAnterior, e.cambioTotal, e.estaturaCm]).toEqual([-2.2, -2.2, 163]);
    await expect(new RegistrarPesaje({ repositorio: new PesajesPostgres(sql), autorizacion: autorizacionConPermisos([]), auditoria: new AuditoriaPostgres(sql), reloj: { ahora: () => ahora }, ids: idsAleatorios }, "America/Mexico_City").ejecutar(mike, { clienteId: ana, fecha: "2026-12-01", pesoKg: 50, estaturaCm: null, origen: "imprevista" })).rejects.toThrow(/permiso/);
  });

  it("la app no puede borrar pagos (solo rechazarlos)", async () => {
    await expect(enGimnasio(sql, GIMNASIO, (tx) => tx`DELETE FROM pago`)).rejects.toThrow(/permission denied/);
  });
});

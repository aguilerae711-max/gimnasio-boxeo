import type postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AtenderSolicitud, SolicitarClaseDePrueba } from "@/modules/clientes/application/SolicitudesDePrueba";
import { SolicitudesPostgres } from "@/modules/clientes/infrastructure/SolicitudesPostgres";
import { AuditoriaPostgres, autorizacionConPermisos, idsAleatorios } from "@/shared/infrastructure/comunes";
import { servidorDePrueba } from "./pgliteDePrueba";

const GIMNASIO = "00000000-0000-4000-8000-000000000101";
const admin = { usuarioId: "00000000-0000-4000-8000-000000000201", gimnasioId: GIMNASIO };

describe("solicitudes de clase de prueba en Postgres", () => {
  let sql: postgres.Sql;
  let cerrar: () => Promise<void>;
  let repo: SolicitudesPostgres;
  let ahora: Date;
  let solicitar: SolicitarClaseDePrueba;

  beforeAll(async () => {
    ({ sql, cerrar } = await servidorDePrueba(55_441));
    repo = new SolicitudesPostgres(sql);
    ahora = new Date("2026-11-20T18:00:00Z");
    solicitar = new SolicitarClaseDePrueba({ repositorio: repo, reloj: { ahora: () => ahora }, ids: idsAleatorios });
  }, 60_000);

  afterAll(() => cerrar());

  it("un visitante pide clase con su horario preferido; no se duplica en 24 horas", async () => {
    const [f18] = (await repo.franjas(GIMNASIO)).filter((f) => f.inicio === "18:00");
    const datos = { nombre: "Pedro Ruiz", telefono: "55 1234 5678", franjaId: f18.id, comentario: "Nunca he boxeado", aceptaContacto: true };
    await expect(solicitar.ejecutar(GIMNASIO, { ...datos, aceptaContacto: false })).rejects.toThrow(/permiso para escribirte/);
    await expect(solicitar.ejecutar(GIMNASIO, { ...datos, telefono: "" })).rejects.toThrow(/WhatsApp/);
    expect(await solicitar.ejecutar(GIMNASIO, datos)).toEqual({ repetida: false });
    expect(await solicitar.ejecutar(GIMNASIO, datos)).toEqual({ repetida: true });
    expect(await repo.pendientes(GIMNASIO)).toEqual([expect.objectContaining({ nombre: "Pedro Ruiz", telefono: "5512345678", franja: "18:00–20:00" })]);
  });

  it("se agenda, después de la prueba se inscribe, y cada paso solo una vez", async () => {
    const [p] = await repo.pendientes(GIMNASIO);
    const atender = new AtenderSolicitud({ repositorio: repo, autorizacion: autorizacionConPermisos(["cliente.aprobar"]), auditoria: new AuditoriaPostgres(sql), reloj: { ahora: () => ahora } });
    await atender.ejecutar(admin, p.id, "contactado");
    expect(await repo.pendientes(GIMNASIO)).toEqual([]);
    expect((await repo.agendadas(GIMNASIO)).map((a) => a.id)).toEqual([p.id]);
    await expect(atender.ejecutar(admin, p.id, "contactado")).rejects.toThrow(/ya fue atendida/);
    await atender.ejecutar(admin, p.id, "inscrito");
    expect(await repo.agendadas(GIMNASIO)).toEqual([]);
    await expect(atender.ejecutar(admin, p.id, "descartado")).rejects.toThrow(/ya fue atendida/);
    await expect(new AtenderSolicitud({ repositorio: repo, autorizacion: autorizacionConPermisos([]), auditoria: new AuditoriaPostgres(sql), reloj: { ahora: () => ahora } }).ejecutar(admin, p.id, "contactado")).rejects.toThrow(/permiso/);
  });
});

import type postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AgregarMiembro } from "@/modules/acceso/application/Equipo";
import { AplicarComoCoach, AtenderSolicitudCoach } from "@/modules/acceso/application/SolicitudesDeCoach";
import { CuentasPostgres } from "@/modules/acceso/infrastructure/AccesoPostgres";
import { SolicitudesCoachPostgres } from "@/modules/acceso/infrastructure/SolicitudesCoachPostgres";
import { enGimnasio } from "@/shared/infrastructure/baseDeDatos";
import { AuditoriaPostgres, autorizacionConPermisos, idsAleatorios } from "@/shared/infrastructure/comunes";
import { servidorDePrueba } from "./pgliteDePrueba";

const GIMNASIO = "00000000-0000-4000-8000-000000000101";
const admin = { usuarioId: "00000000-0000-4000-8000-000000000201", gimnasioId: GIMNASIO };

describe("solicitudes para ser coach", () => {
  let sql: postgres.Sql;
  let cerrar: () => Promise<void>;
  let repo: SolicitudesCoachPostgres;
  const reloj = { ahora: () => new Date("2026-11-20T18:00:00Z") };
  const atender = (permisos: string[]) => {
    const autorizacion = autorizacionConPermisos(permisos);
    const auditoria = new AuditoriaPostgres(sql);
    return new AtenderSolicitudCoach({
      repositorio: repo,
      agregar: new AgregarMiembro({ cuentas: new CuentasPostgres(sql), autorizacion, auditoria, ids: idsAleatorios }),
      autorizacion,
      auditoria,
      reloj,
    });
  };

  beforeAll(async () => {
    ({ sql, cerrar } = await servidorDePrueba(55_443));
    repo = new SolicitudesCoachPostgres(sql);
  }, 60_000);

  afterAll(() => cerrar());

  it("aplica desde la portada, sin duplicar el mismo teléfono en 24 horas", async () => {
    const aplicar = new AplicarComoCoach({ repositorio: repo, reloj, ids: idsAleatorios });
    const datos = { nombre: "Raúl Torres", telefono: "55 8765 4321", experiencia: "10 años, 30 peleas amateur", disponibilidad: "tardes", aceptaContacto: true };
    await expect(aplicar.ejecutar(GIMNASIO, { ...datos, experiencia: " " })).rejects.toThrow(/experiencia/);
    await expect(aplicar.ejecutar(GIMNASIO, { ...datos, aceptaContacto: false })).rejects.toThrow(/permiso/);
    expect(await aplicar.ejecutar(GIMNASIO, datos)).toEqual({ repetida: false });
    expect(await aplicar.ejecutar(GIMNASIO, datos)).toEqual({ repetida: true });
    expect(await repo.pendientes(GIMNASIO)).toEqual([expect.objectContaining({ nombre: "Raúl Torres", telefono: "5587654321", disponibilidad: "tardes" })]);
  });

  it("la administración lo aprueba: queda como coach con su usuario; solo una vez y con permiso", async () => {
    const [s] = await repo.pendientes(GIMNASIO);
    await expect(atender([]).aprobar(admin, s.id, "raul")).rejects.toThrow(/permiso/);
    const r = await atender(["equipo.agregar"]).aprobar(admin, s.id, "raul");
    expect(r.nombre).toBe("Raúl Torres");
    const [coach] = await enGimnasio(sql, GIMNASIO, (tx) => tx<{ estado: string }[]>`SELECT estado FROM coach WHERE usuario_id = ${r.usuarioId}`);
    expect(coach).toBeDefined();
    expect(await repo.pendientes(GIMNASIO)).toEqual([]);
    await expect(atender(["equipo.agregar"]).aprobar(admin, s.id, "raul2")).rejects.toThrow(/ya fue atendida/);
  });
});

import type postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ConsultasEquipo, SesionesPostgres } from "@/modules/acceso/infrastructure/AccesoPostgres";
import { servidorDePrueba } from "./pgliteDePrueba";

const GIMNASIO = "00000000-0000-4000-8000-000000000101";
const SUPERADMIN = "00000000-0000-4000-8000-000000000201";

describe("ver como (superadministrador)", () => {
  let sql: postgres.Sql;
  let cerrar: () => Promise<void>;

  beforeAll(async () => {
    ({ sql, cerrar } = await servidorDePrueba(55_444));
    // En la semilla las cuentas esperan su enlace de activación; aquí ya entraron.
    await sql`UPDATE usuario SET estado = 'activo' WHERE estado = 'pendiente'`;
  }, 60_000);

  afterAll(() => cerrar());

  it("lista a las personas del gimnasio con sus roles, incluidos coaches", async () => {
    const personas = await new ConsultasEquipo(sql).personasDelGimnasio(GIMNASIO);
    expect(personas.length).toBeGreaterThan(0);
    expect(personas.some((p) => p.roles.includes("coach"))).toBe(true);
    expect(personas.every((p) => p.usuarioId && p.nombre)).toBe(true);
  });

  it("arma el contexto de una cuenta con sus roles y permisos, igual que una sesión", async () => {
    const sesiones = new SesionesPostgres(sql);
    const [coach] = (await new ConsultasEquipo(sql).personasDelGimnasio(GIMNASIO)).filter((p) => p.roles.includes("coach") && !p.roles.includes("admin"));
    const ctx = await sesiones.contextoDeUsuario(coach.usuarioId);
    expect(ctx).toEqual(expect.objectContaining({ usuarioId: coach.usuarioId, gimnasioId: GIMNASIO }));
    expect(ctx!.roles).toContain("coach");
    expect(ctx!.permisos).not.toContain("sistema.administrar");

    const yo = await sesiones.contextoDeUsuario(SUPERADMIN);
    expect(yo!.permisos).toContain("sistema.administrar");
    expect(await sesiones.contextoDeUsuario("00000000-0000-4000-8000-000000009999")).toBeNull();
  });

  it("el superadministrador entra a un gimnasio que elige, con los roles que tenga ahí", async () => {
    const sesiones = new SesionesPostgres(sql);
    const dentro = await sesiones.contextoEnGimnasio(SUPERADMIN, GIMNASIO);
    expect(dentro).toEqual(expect.objectContaining({ gimnasioId: GIMNASIO, zonaHoraria: expect.any(String) }));
    expect(dentro!.permisos).toContain("sistema.administrar");
    expect(dentro!.roles).toContain("superadmin");
    expect(await sesiones.contextoEnGimnasio(SUPERADMIN, "00000000-0000-4000-8000-000000009999")).toBeNull();
  });
});

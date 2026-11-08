import type postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ConsultasEquipo, CuentasPostgres, SesionesPostgres } from "@/modules/acceso/infrastructure/AccesoPostgres";
import { ConsultasClientes } from "@/modules/clientes/infrastructure/ClientesPostgres";
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

  it("arma el árbol de la administración: cada coach con sus clientes", async () => {
    const arbol = await new ConsultasClientes(sql).arbolDelGimnasio(GIMNASIO);
    expect(arbol.coaches.length).toBeGreaterThan(0);
    expect(arbol.coaches.every((c) => c.usuarioId && c.nombre)).toBe(true);
    const deCoaches = new Set(arbol.coaches.map((c) => c.usuarioId));
    expect(arbol.clientes.every((cl) => deCoaches.has(cl.coachUsuarioId))).toBe(true);
  });

  it("el superadministrador entra a un gimnasio que elige, con los roles que tenga ahí", async () => {
    const sesiones = new SesionesPostgres(sql);
    const dentro = await sesiones.contextoEnGimnasio(SUPERADMIN, GIMNASIO);
    expect(dentro).toEqual(expect.objectContaining({ gimnasioId: GIMNASIO, zonaHoraria: expect.any(String) }));
    expect(dentro!.permisos).toContain("sistema.administrar");
    expect(dentro!.roles).toContain("superadmin");
    expect(await sesiones.contextoEnGimnasio(SUPERADMIN, "00000000-0000-4000-8000-000000009999")).toBeNull();
  });

  it("quien administra se suma como coach con su misma cuenta (una vez) y aparece en el árbol", async () => {
    const equipo = new ConsultasEquipo(sql);
    const cuentas = new CuentasPostgres(sql);
    const admin = { usuarioId: "00000000-0000-4000-8000-000000000777" };
    await cuentas.crearMiembro(GIMNASIO, { id: admin.usuarioId, nombre: "Laura Admin", usuario: "laura.admin", rol: "admin" });
    await sql`UPDATE usuario SET estado = 'activo' WHERE id = ${admin.usuarioId}`;
    expect(await cuentas.sumarCoach(GIMNASIO, admin.usuarioId, "Laura")).toBe(true);
    expect(await cuentas.sumarCoach(GIMNASIO, admin.usuarioId, "Laura")).toBe(false);
    const roles = (await equipo.personasDelGimnasio(GIMNASIO)).find((p) => p.usuarioId === admin.usuarioId)!.roles;
    expect(roles).toEqual(expect.arrayContaining(["admin", "coach"]));
    const arbol = await new ConsultasClientes(sql).arbolDelGimnasio(GIMNASIO);
    expect(arbol.coaches.some((c) => c.usuarioId === admin.usuarioId && c.estado === "aprobado")).toBe(true);
  });
});

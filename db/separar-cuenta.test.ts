import type postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ConsultasEquipo, CuentasPostgres } from "@/modules/acceso/infrastructure/AccesoPostgres";
import { enGimnasio } from "@/shared/infrastructure/baseDeDatos";
import { servidorDePrueba } from "./pgliteDePrueba";

const GIMNASIO = "00000000-0000-4000-8000-000000000101";
const SISTEMA = "00000000-0000-4000-8000-000000000201";
const DESTINO = "00000000-0000-4000-8000-000000000888";

describe("separar la cuenta del sistema de una administración", () => {
  let sql: postgres.Sql;
  let cerrar: () => Promise<void>;

  beforeAll(async () => {
    ({ sql, cerrar } = await servidorDePrueba(55_446));
    await sql`UPDATE usuario SET estado = 'activo' WHERE estado = 'pendiente'`;
  }, 60_000);

  afterAll(() => cerrar());

  const coachDe = async (usuarioId: string) =>
    (await enGimnasio(sql, GIMNASIO, (tx) => tx<{ id: string }[]>`SELECT id FROM coach WHERE gimnasio_id = ${GIMNASIO} AND usuario_id = ${usuarioId}`))[0]?.id ?? null;
  const rolesEnGimnasio = async (usuarioId: string) =>
    (await sql<{ rol: string }[]>`SELECT rol_codigo AS rol FROM usuario_rol WHERE usuario_id = ${usuarioId} AND gimnasio_id = ${GIMNASIO} AND hasta IS NULL ORDER BY 1`).map((r) => r.rol);

  it("no acepta una cuenta destino que no es administración del gimnasio", async () => {
    const cuentas = new CuentasPostgres(sql);
    const [soloCoach] = (await new ConsultasEquipo(sql).personasDelGimnasio(GIMNASIO)).filter((p) => p.roles.includes("coach") && !p.roles.includes("admin"));
    await expect(cuentas.separarCuentaSistema(GIMNASIO, SISTEMA, soloCoach.usuarioId)).rejects.toThrow(/no es administración/);
    expect(await rolesEnGimnasio(SISTEMA)).toEqual(expect.arrayContaining(["admin"]));
  });

  it("el coach del sistema pasa completo a la cuenta de la administración y el sistema queda independiente", async () => {
    const cuentas = new CuentasPostgres(sql);
    await cuentas.crearMiembro(GIMNASIO, { id: DESTINO, nombre: "Iván", usuario: "ivan.diamante", rol: "admin" });
    await sql`UPDATE usuario SET estado = 'activo' WHERE id = ${DESTINO}`;
    // Ya se había sumado como coach (vacío): se reemplaza por el coach del sistema.
    await cuentas.sumarCoach(GIMNASIO, DESTINO, "Iván");
    const coachSistema = await coachDe(SISTEMA);
    expect(coachSistema).not.toBeNull();

    expect(await cuentas.separarCuentaSistema(GIMNASIO, SISTEMA, DESTINO)).toMatch(/coach pasó/);

    expect(await coachDe(DESTINO)).toBe(coachSistema);
    expect(await coachDe(SISTEMA)).toBeNull();
    expect(await rolesEnGimnasio(SISTEMA)).toEqual([]);
    expect(await rolesEnGimnasio(DESTINO)).toEqual(["admin", "coach"]);
    const [superadmin] = await sql`SELECT 1 FROM usuario_rol WHERE usuario_id = ${SISTEMA} AND rol_codigo = 'superadmin' AND hasta IS NULL`;
    expect(superadmin).toBeDefined();
    const [auditado] = await enGimnasio(sql, GIMNASIO, (tx) => tx`SELECT 1 FROM auditoria WHERE accion = 'sistema.cuenta_separada' AND entidad_id = ${DESTINO}`);
    expect(auditado).toBeDefined();
  });
});

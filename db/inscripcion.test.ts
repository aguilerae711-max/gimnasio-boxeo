import type postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { InscribirmeComoCliente } from "@/modules/clientes/application/RegistroDeClientes";
import { ClientesPostgres, ConsultasClientes } from "@/modules/clientes/infrastructure/ClientesPostgres";
import { enGimnasio } from "@/shared/infrastructure/baseDeDatos";
import { AuditoriaPostgres, autorizacionConPermisos, idsAleatorios } from "@/shared/infrastructure/comunes";
import { servidorDePrueba } from "./pgliteDePrueba";

const GIMNASIO = "00000000-0000-4000-8000-000000000101";
const admin = { usuarioId: "00000000-0000-4000-8000-000000000201", gimnasioId: GIMNASIO };

describe("inscribirse como cliente con la propia cuenta", () => {
  let sql: postgres.Sql;
  let cerrar: () => Promise<void>;
  let coachId: string;
  const inscribir = (permisos: string[]) =>
    new InscribirmeComoCliente({
      inscripciones: new ClientesPostgres(sql),
      autorizacion: autorizacionConPermisos(permisos),
      auditoria: new AuditoriaPostgres(sql),
      ids: idsAleatorios,
      reloj: { ahora: () => new Date("2026-11-20T18:00:00Z") },
    });

  beforeAll(async () => {
    ({ sql, cerrar } = await servidorDePrueba(55_442));
    [{ id: coachId }] = await enGimnasio(sql, GIMNASIO, (tx) => tx<{ id: string }[]>`SELECT id FROM coach WHERE estado = 'aprobado' ORDER BY apodo LIMIT 1`);
  }, 60_000);

  afterAll(() => cerrar());

  it("la administración se inscribe activa, con su mismo usuario y rol de cliente; solo una vez", async () => {
    const datos = { coachId, sexo: "M" as const, aceptaReglamento: true };
    await expect(inscribir(["cliente.aprobar"]).ejecutar(admin, { ...datos, aceptaReglamento: false })).rejects.toThrow(/reglamento/);
    await expect(inscribir(["cliente.aprobar"]).ejecutar(admin, { ...datos, coachId: "00000000-0000-4000-8000-000000009999" })).rejects.toThrow(/coach/);

    const r = await inscribir(["cliente.aprobar"]).ejecutar(admin, datos);
    expect(r.estado).toBe("activo");
    const yo = await new ConsultasClientes(sql).delUsuario(GIMNASIO, admin.usuarioId);
    expect(yo).toEqual(expect.objectContaining({ id: r.clienteId, estado: "activo" }));
    expect(await new ConsultasClientes(sql).usuarioDe(GIMNASIO, r.clienteId)).toEqual(expect.objectContaining({ usuarioId: admin.usuarioId }));
    const roles = await enGimnasio(sql, GIMNASIO, (tx) => tx<{ rol_codigo: string }[]>`
      SELECT rol_codigo FROM usuario_rol WHERE usuario_id = ${admin.usuarioId} AND gimnasio_id = ${GIMNASIO} AND hasta IS NULL`);
    expect(roles.map((x) => x.rol_codigo)).toContain("cliente");

    await expect(inscribir(["cliente.aprobar"]).ejecutar(admin, datos)).rejects.toThrow(/Ya estás inscrito/);
  });

  it("la marca del gimnasio piloto es Diamante Boxing Club", async () => {
    const [g] = await sql<{ nombre: string; eslogan: string; logo: string }[]>`SELECT nombre, eslogan, logo FROM gimnasio WHERE id = ${GIMNASIO}`;
    expect(g).toEqual({ nombre: "Diamante Boxing Club", eslogan: "Forjado bajo presión", logo: "/marca/diamante-boxing-club.png" });
  });
});

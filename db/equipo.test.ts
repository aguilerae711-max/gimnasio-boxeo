import type postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GenerarEnlaceDeAcceso, UsarEnlaceDeAcceso } from "@/modules/acceso/application/EnlacesDeAcceso";
import { AgregarMiembro, CambiarMiUsuario } from "@/modules/acceso/application/Equipo";
import { IniciarSesion } from "@/modules/acceso/application/IniciarSesion";
import {
  argon2id,
  ConsultasEquipo,
  CuentasPostgres,
  EnlacesPostgres,
  IntentosPostgres,
  SesionesPostgres,
  tokensAleatorios,
} from "@/modules/acceso/infrastructure/AccesoPostgres";
import { ClientesPostgres } from "@/modules/clientes/infrastructure/ClientesPostgres";
import { AuditoriaPostgres, autorizacionConPermisos, idsAleatorios } from "@/shared/infrastructure/comunes";
import { servidorDePrueba } from "./pgliteDePrueba";

const GIMNASIO = "00000000-0000-4000-8000-000000000101";
const IVAN = "00000000-0000-4000-8000-000000000201";
const admin = { usuarioId: IVAN, gimnasioId: GIMNASIO };
const reloj = { ahora: () => new Date("2026-11-20T18:00:00Z") };

describe("equipo con usuario corto en Postgres", () => {
  let sql: postgres.Sql;
  let cerrar: () => Promise<void>;
  let cuentas: CuentasPostgres;
  let sesiones: SesionesPostgres;

  beforeAll(async () => {
    ({ sql, cerrar } = await servidorDePrueba(55_440));
    cuentas = new CuentasPostgres(sql);
    sesiones = new SesionesPostgres(sql);
  }, 60_000);

  afterAll(() => cerrar());

  const activar = async (usuarioId: string, datos: { correo: string; usuario: string; clave: string }) => {
    const enlaces = new EnlacesPostgres(sql);
    const { token } = await new GenerarEnlaceDeAcceso(cuentas, enlaces, autorizacionConPermisos(["usuario.enlace_acceso"]), new AuditoriaPostgres(sql), tokensAleatorios, reloj).ejecutar(admin, usuarioId);
    await new UsarEnlaceDeAcceso(cuentas, enlaces, sesiones, argon2id, tokensAleatorios, reloj).ejecutar(token, datos);
  };
  const entrar = () => new IniciarSesion(cuentas, sesiones, new IntentosPostgres(sql), argon2id, tokensAleatorios, reloj, "x");

  it("alta de una administradora: entra con su usuario y tiene permisos de administración, no de superadmin", async () => {
    const agregar = new AgregarMiembro({ cuentas, autorizacion: autorizacionConPermisos(["equipo.agregar"]), auditoria: new AuditoriaPostgres(sql), ids: idsAleatorios });
    const id = await agregar.ejecutar(admin, { nombre: "Laura Pérez", usuario: "admin2", rol: "admin" });
    await activar(id, { correo: "", usuario: "admin2", clave: "contraseña de laura" });
    const { token } = await entrar().ejecutar("admin2", "contraseña de laura");
    const contexto = await sesiones.contexto(tokensAleatorios.huella(token));
    expect(contexto).toMatchObject({ nombre: "Laura Pérez", roles: ["admin"], gimnasioId: GIMNASIO });
    expect(contexto!.permisos).toContain("pago.confirmar");
    expect(contexto!.permisos).not.toContain("sistema.administrar");
    expect((await new ConsultasEquipo(sql).delGimnasio(GIMNASIO)).find((m) => m.usuarioId === id)).toMatchObject({ usuario: "admin2", estado: "activo" });
  });

  it("alta de un coach nuevo: queda aprobado con su código de invitación sin acentos", async () => {
    const agregar = new AgregarMiembro({ cuentas, autorizacion: autorizacionConPermisos(["equipo.agregar"]), auditoria: new AuditoriaPostgres(sql), ids: idsAleatorios });
    await agregar.ejecutar(admin, { nombre: "Ramón Díaz", usuario: "", rol: "coach" });
    const ramon = (await new ClientesPostgres(sql).coachesParaRegistro()).find((c) => c.apodo === "Ramón");
    expect(ramon?.codigo).toMatch(/^ramon-[0-9a-f]{4}$/);
  });

  it("Iván se pone usuario corto y entra con él o con su correo", async () => {
    await activar(IVAN, { correo: "ivan@gym.mx", usuario: "", clave: "jab cruzado gancho" });
    await new CambiarMiUsuario({ cuentas, auditoria: new AuditoriaPostgres(sql) }).ejecutar(admin, "ivan");
    await expect(entrar().ejecutar("ivan", "jab cruzado gancho")).resolves.toMatchObject({ usuarioId: IVAN });
    await expect(entrar().ejecutar("IVAN@gym.mx", "jab cruzado gancho")).resolves.toMatchObject({ usuarioId: IVAN });
    await expect(new CambiarMiUsuario({ cuentas, auditoria: new AuditoriaPostgres(sql) }).ejecutar(admin, "admin2")).rejects.toThrow(/ocupado/);
  });
});

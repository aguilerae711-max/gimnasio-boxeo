import type postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GenerarEnlaceDeAcceso, UsarEnlaceDeAcceso } from "@/modules/acceso/application/EnlacesDeAcceso";
import { IniciarSesion } from "@/modules/acceso/application/IniciarSesion";
import {
  argon2id,
  CuentasPostgres,
  EnlacesPostgres,
  IntentosPostgres,
  SesionesPostgres,
  tokensAleatorios,
} from "@/modules/acceso/infrastructure/AccesoPostgres";
import { RegistrarCliente, RevisarRegistroCliente } from "@/modules/clientes/application/RegistroDeClientes";
import { ClientesPostgres, ConsultasClientes } from "@/modules/clientes/infrastructure/ClientesPostgres";
import { CambiarComision } from "@/modules/membresias/application/CambiarComision";
import { PoliticaComision } from "@/modules/membresias/domain/PoliticaComision";
import {
  ConsultasComisiones,
  RepositorioAcuerdosComisionPostgres,
} from "@/modules/membresias/infrastructure/RepositorioAcuerdosComisionPostgres";
import { Dinero } from "@/shared/domain/Dinero";
import { Fecha } from "@/shared/domain/Fecha";
import { AuditoriaPostgres, autorizacionConPermisos, idsAleatorios } from "@/shared/infrastructure/comunes";
import { servidorDePrueba } from "./pgliteDePrueba";

const GIMNASIO = "00000000-0000-4000-8000-000000000101";
const IVAN = "00000000-0000-4000-8000-000000000201";
const MIKE = "00000000-0000-4000-8000-000000000202";
const reloj = { ahora: () => new Date("2026-11-02T16:00:00Z") };

/** El flujo real contra Postgres: lo que hará la app en Neon. */
describe("repositorios en Postgres", () => {
  let sql: postgres.Sql;
  let cerrar: () => Promise<void>;
  let sesiones: SesionesPostgres;
  let entrar: IniciarSesion;

  beforeAll(async () => {
    ({ sql, cerrar } = await servidorDePrueba(55_432));
    sesiones = new SesionesPostgres(sql);
    entrar = new IniciarSesion(
      new CuentasPostgres(sql),
      sesiones,
      new IntentosPostgres(sql),
      argon2id,
      tokensAleatorios,
      reloj,
      await argon2id.hash("relleno"),
    );
  }, 60_000);

  afterAll(() => cerrar());

  async function activar(usuarioId: string, correo: string, clave: string) {
    const ivan = await sesionDe(IVAN);
    const cuentas = new CuentasPostgres(sql);
    const enlaces = new EnlacesPostgres(sql);
    const { token } = await new GenerarEnlaceDeAcceso(
      cuentas,
      enlaces,
      autorizacionConPermisos(ivan?.permisos ?? ["usuario.enlace_acceso"]),
      new AuditoriaPostgres(sql),
      tokensAleatorios,
      reloj,
    ).ejecutar({ usuarioId: IVAN, gimnasioId: GIMNASIO }, usuarioId);
    await new UsarEnlaceDeAcceso(cuentas, enlaces, sesiones, argon2id, tokensAleatorios, reloj).ejecutar(token, { correo, clave });
  }

  async function sesionDe(usuarioId: string) {
    const [s] = await sql<{ token_hash: string }[]>`SELECT token_hash FROM sesion WHERE usuario_id = ${usuarioId} AND revocada_en IS NULL LIMIT 1`;
    return s ? sesiones.contexto(s.token_hash) : null;
  }

  it("Iván activa su cuenta, entra y su sesión trae sus roles y el gimnasio", async () => {
    await activar(IVAN, "ivan@gym.mx", "jab cruzado gancho");
    const { token } = await entrar.ejecutar("ivan@gym.mx", "jab cruzado gancho");
    const contexto = await sesiones.contexto(tokensAleatorios.huella(token));
    expect(contexto).toMatchObject({ nombre: "Iván", gimnasioId: GIMNASIO, zonaHoraria: "America/Mexico_City" });
    expect(contexto!.roles.sort()).toEqual(["admin", "coach", "superadmin"]);
    expect(contexto!.permisos).toContain("comision.cambiar");
    const [h] = await sql<{ hash_clave: string }[]>`SELECT hash_clave FROM usuario WHERE id = ${IVAN}`;
    expect(h.hash_clave).toMatch(/^\$argon2id\$/);
  });

  it("Mike solo tiene permisos de coach", async () => {
    await activar(MIKE, "mike@gym.mx", "uppercut al hígado");
    const { token } = await entrar.ejecutar("mike@gym.mx", "uppercut al hígado");
    const contexto = await sesiones.contexto(tokensAleatorios.huella(token));
    expect(contexto!.roles).toEqual(["coach"]);
    expect(contexto!.permisos).not.toContain("cliente.aprobar");
  });

  it("una clienta se registra con la invitación de Mike y la administración la aprueba", async () => {
    const clientes = new ClientesPostgres(sql);
    const coaches = await clientes.coachesParaRegistro();
    // Sin acentos, para que el enlace se vea limpio en WhatsApp (Iván → ivan-xxxx).
    expect(coaches.map((c) => c.codigo.split("-")[0])).toEqual(["chato", "ivan", "mike"]);
    expect(coaches.every((c) => /^[a-z]+-[0-9a-f]{4}$/.test(c.codigo))).toBe(true);
    const mike = coaches.find((c) => c.apodo === "Mike")!;

    const { clienteId } = await new RegistrarCliente(clientes, argon2id, idsAleatorios, reloj).ejecutar({
      codigoCoach: mike.codigo,
      nombre: "Ana López",
      correo: "ana@correo.mx",
      telefono: "5512345678",
      clave: "mi clave de boxeo",
      aceptaReglamento: true,
    });
    const consultas = new ConsultasClientes(sql);
    expect((await consultas.delGimnasio(GIMNASIO, "pendiente")).map((c) => c.nombre)).toEqual(["Ana López"]);
    expect((await consultas.delCoach(GIMNASIO, MIKE)).map((c) => c.estado)).toEqual(["pendiente"]);

    await new RevisarRegistroCliente(clientes, autorizacionConPermisos(["cliente.aprobar"]), new AuditoriaPostgres(sql), reloj).ejecutar(
      { usuarioId: IVAN, gimnasioId: GIMNASIO },
      clienteId,
      "aprobar",
    );
    expect((await consultas.delGimnasio(GIMNASIO))[0]).toMatchObject({ nombre: "Ana López", coach: "Mike", estado: "activo" });
    const { token } = await entrar.ejecutar("ana@correo.mx", "mi clave de boxeo");
    // El rol de cliente aún no tiene permisos, pero su sesión debe traer el gimnasio y el rol.
    expect(await sesiones.contexto(tokensAleatorios.huella(token))).toMatchObject({ gimnasioId: GIMNASIO, roles: ["cliente"], permisos: [] });
  });

  it("mueve la comisión de Mike desde el 1 de diciembre y la general sigue en 50%", async () => {
    const repo = new RepositorioAcuerdosComisionPostgres(sql);
    const consultas = new ConsultasComisiones(sql);
    const mike = (await consultas.coaches(GIMNASIO)).find((c) => c.apodo === "Mike")!;
    await new CambiarComision(
      repo,
      autorizacionConPermisos(["comision.cambiar"]),
      new AuditoriaPostgres(sql),
      reloj,
      idsAleatorios,
      "America/Mexico_City",
    ).ejecutar({ usuarioId: IVAN, gimnasioId: GIMNASIO }, { coachId: mike.id, porcentaje: 55, vigenteDesde: "2026-12-01", motivo: "Grupo avanzado" });

    const politica = new PoliticaComision(await repo.delGimnasio(GIMNASIO));
    const pago = Dinero.dePesos(600);
    expect(politica.calcular(mike.id, pago, Fecha.de("2026-11-15")).comision.esIgualA(Dinero.dePesos(300))).toBe(true);
    expect(politica.calcular(mike.id, pago, Fecha.de("2026-12-01")).comision.esIgualA(Dinero.dePesos(330))).toBe(true);
    expect((await consultas.historial(GIMNASIO))[0]).toMatchObject({ coach: "Mike", porcentaje: 55, creadoPor: "Iván" });

    const [audit] = await sql<{ accion: string; motivo: string }[]>`SELECT accion, motivo FROM auditoria WHERE accion = 'comision.cambiada'`;
    expect(audit).toEqual({ accion: "comision.cambiada", motivo: "Grupo avanzado" });
  });
});

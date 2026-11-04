import type postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { argon2id } from "@/modules/acceso/infrastructure/AccesoPostgres";
import { RegistrarCliente } from "@/modules/clientes/application/RegistroDeClientes";
import { ClientesPostgres } from "@/modules/clientes/infrastructure/ClientesPostgres";
import { Archivar, CancelarInscripcion, Inscribirse, Publicar } from "@/modules/novedades/application/Novedades";
import type { Publicacion } from "@/modules/novedades/domain/Novedades";
import { ConsultasNovedades, NovedadesPostgres } from "@/modules/novedades/infrastructure/NovedadesPostgres";
import { enGimnasio } from "@/shared/infrastructure/baseDeDatos";
import { AuditoriaPostgres, autorizacionConPermisos, idsAleatorios } from "@/shared/infrastructure/comunes";
import { servidorDePrueba } from "./pgliteDePrueba";

const GIMNASIO = "00000000-0000-4000-8000-000000000101";
const IVAN = "00000000-0000-4000-8000-000000000201";
const MIKE = "00000000-0000-4000-8000-000000000202";
const admin = { usuarioId: IVAN, gimnasioId: GIMNASIO };

describe("novedades en Postgres", () => {
  let sql: postgres.Sql;
  let cerrar: () => Promise<void>;
  let ahora: Date;
  let d: (permisos: string[]) => ConstructorParameters<typeof Publicar>[0];
  let consultas: ConsultasNovedades;
  let ana: { clienteId: string; usuarioId: string };
  let beto: { clienteId: string; usuarioId: string };
  let sparring: string;

  const pub = (extra: Partial<Publicacion>): Publicacion => ({
    tipo: "anuncio",
    titulo: "Aviso",
    cuerpo: "",
    audiencia: "todos",
    fijada: false,
    expiraEn: null,
    inicio: null,
    fin: null,
    lugar: null,
    cupo: null,
    requiereInscripcion: false,
    menciones: [],
    ...extra,
  });

  beforeAll(async () => {
    ({ sql, cerrar } = await servidorDePrueba(55_439));
    ahora = new Date("2026-11-20T18:00:00Z");
    d = (permisos) => ({
      repositorio: new NovedadesPostgres(sql),
      autorizacion: autorizacionConPermisos(permisos),
      auditoria: new AuditoriaPostgres(sql),
      reloj: { ahora: () => ahora },
      ids: idsAleatorios,
    });
    consultas = new ConsultasNovedades(sql);
    const clientes = new ClientesPostgres(sql);
    const codigo = (await clientes.coachesParaRegistro()).find((c) => c.apodo === "Mike")!.codigo;
    const registrar = new RegistrarCliente(clientes, argon2id, idsAleatorios, { ahora: () => ahora });
    const base = { codigoCoach: codigo, telefono: "", clave: "mi clave de boxeo", aceptaReglamento: true, sexo: "F" as const };
    ana = await registrar.ejecutar({ ...base, nombre: "Ana López", correo: "ana@correo.mx" });
    beto = await registrar.ejecutar({ ...base, nombre: "Beto Ruiz", correo: "beto@correo.mx", sexo: "F" });
    await enGimnasio(sql, GIMNASIO, (tx) => tx`UPDATE cliente SET estado = 'activo'`);
  }, 60_000);

  afterAll(() => cerrar());

  it("solo la administración publica; cada audiencia ve lo suyo", async () => {
    await expect(new Publicar(d([])).ejecutar({ usuarioId: MIKE, gimnasioId: GIMNASIO }, pub({}))).rejects.toThrow(/permiso/);
    const publicar = new Publicar(d(["novedades.publicar"]));
    await publicar.ejecutar(admin, pub({ titulo: "Junta de coaches", audiencia: "coaches" }));
    await publicar.ejecutar(admin, pub({ titulo: "Nuevo horario de sábado", audiencia: "clientes", fijada: true }));
    await publicar.ejecutar(admin, pub({ titulo: "Clase de prueba gratis", audiencia: "publico", tipo: "dia_prueba", inicio: new Date("2026-11-28T15:00:00Z") }));
    const deCliente = (await consultas.feed(GIMNASIO, "cliente", ana.usuarioId)).map((p) => p.titulo);
    const deCoach = (await consultas.feed(GIMNASIO, "coach", MIKE)).map((p) => p.titulo);
    expect(deCliente).toEqual(["Nuevo horario de sábado", "Clase de prueba gratis"]);
    expect(deCoach).toEqual(["Clase de prueba gratis", "Junta de coaches"]);
    expect((await consultas.publicas(GIMNASIO)).map((p) => p.titulo)).toEqual(["Clase de prueba gratis"]);
  });

  it("la felicitación le aparece destacada a quien mencionan", async () => {
    await new Publicar(d(["novedades.publicar"])).ejecutar(admin, pub({ tipo: "felicitacion", titulo: "¡Ana ganó su primera pelea!", menciones: [ana.clienteId] }));
    const [paraAna] = (await consultas.feed(GIMNASIO, "cliente", ana.usuarioId)).filter((p) => p.tipo === "felicitacion");
    const [paraBeto] = (await consultas.feed(GIMNASIO, "cliente", beto.usuarioId)).filter((p) => p.tipo === "felicitacion");
    expect(paraAna).toMatchObject({ meMenciona: true, mencionados: ["Ana López"] });
    expect(paraBeto.meMenciona).toBe(false);
  });

  it("sparring con cupo 1: Ana se inscribe, Beto ya no alcanza; si Ana cancela, hay lugar", async () => {
    sparring = await new Publicar(d(["novedades.publicar"])).ejecutar(
      admin,
      pub({ tipo: "sparring", titulo: "Sparring del sábado", audiencia: "clientes", inicio: new Date("2026-11-28T16:00:00Z"), requiereInscripcion: true, cupo: 1 }),
    );
    const inscribirse = new Inscribirse(d([]));
    await inscribirse.ejecutar({ usuarioId: ana.usuarioId, gimnasioId: GIMNASIO }, "cliente", sparring);
    await expect(inscribirse.ejecutar({ usuarioId: beto.usuarioId, gimnasioId: GIMNASIO }, "cliente", sparring)).rejects.toThrow(/lugares/);
    await expect(inscribirse.ejecutar({ usuarioId: MIKE, gimnasioId: GIMNASIO }, "coach", sparring)).rejects.toThrow(/no está disponible/);
    expect((await consultas.inscritos(GIMNASIO, sparring)).map((i) => i.nombre)).toEqual(["Ana López"]);
    await new CancelarInscripcion(d([])).ejecutar({ usuarioId: ana.usuarioId, gimnasioId: GIMNASIO }, sparring);
    await inscribirse.ejecutar({ usuarioId: beto.usuarioId, gimnasioId: GIMNASIO }, "cliente", sparring);
    expect((await consultas.feed(GIMNASIO, "cliente", beto.usuarioId)).find((p) => p.id === sparring)).toMatchObject({ inscritos: 1, estoyInscrito: true });
  });

  it("aviso de novedades sin ver, y archivar las quita", async () => {
    expect(await consultas.sinVer(GIMNASIO, "cliente", ana.usuarioId)).toBe(4);
    await consultas.marcarVistas(ana.usuarioId);
    expect(await consultas.sinVer(GIMNASIO, "cliente", ana.usuarioId)).toBe(0);
    await new Archivar(d(["novedades.publicar"])).ejecutar(admin, sparring);
    expect((await consultas.feed(GIMNASIO, "cliente", ana.usuarioId)).some((p) => p.id === sparring)).toBe(false);
  });
});

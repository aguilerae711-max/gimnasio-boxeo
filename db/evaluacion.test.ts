import type postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { argon2id, IntentosPostgres } from "@/modules/acceso/infrastructure/AccesoPostgres";
import { RegistrarCliente } from "@/modules/clientes/application/RegistroDeClientes";
import { ClientesPostgres } from "@/modules/clientes/infrastructure/ClientesPostgres";
import {
  AnularEvaluacion,
  CerrarEvaluacion,
  DefinirPin,
  GuardarCaptura,
  GuardarRubrica,
  IniciarEvaluacion,
  RegistrarChequeo,
  type DependenciasEvaluacion,
} from "@/modules/evaluacion/application/Evaluaciones";
import { ConsultasEvaluacion, EvaluacionesPostgres } from "@/modules/evaluacion/infrastructure/EvaluacionesPostgres";
import { enGimnasio } from "@/shared/infrastructure/baseDeDatos";
import { AuditoriaPostgres, autorizacionConPermisos, idsAleatorios } from "@/shared/infrastructure/comunes";
import { servidorDePrueba } from "./pgliteDePrueba";

const GIMNASIO = "00000000-0000-4000-8000-000000000101";
const IVAN = "00000000-0000-4000-8000-000000000201";
const MIKE = "00000000-0000-4000-8000-000000000202";
const admin = { usuarioId: IVAN, gimnasioId: GIMNASIO };

describe("evaluación por pilares en Postgres", () => {
  let sql: postgres.Sql;
  let cerrar: () => Promise<void>;
  let ahora: Date;
  let d: (permisos: string[]) => DependenciasEvaluacion;
  let ana: string;
  let coachMike: string;
  const capturaCompleta = async (sesionId: string, mejora = 1) => {
    const guardar = new GuardarCaptura(d(["evaluacion.realizar"]));
    const r = (n: number) => Math.round(n * mejora);
    await guardar.ejecutar(admin, sesionId, "sprint_costal", [{ cross: r(14) }, { cross: r(15) }]);
    await guardar.ejecutar(admin, sesionId, "cuadrantes", [{ toques: r(22), pisadas: 2 }, { toques: r(20), pisadas: 0 }]);
    await guardar.ejecutar(admin, sesionId, "salto_horizontal", [{ cm: r(180) }, null, { cm: r(185) }]);
    await guardar.ejecutar(admin, sesionId, "flexiones_despegue", [{ reps: r(18) }]);
    await guardar.ejecutar(admin, sesionId, "dropoff", [{ g1: 40, g3: r(30) }]);
    await guardar.ejecutar(admin, sesionId, "recuperacion_fc", [null]);
  };

  beforeAll(async () => {
    ({ sql, cerrar } = await servidorDePrueba(55_437));
    ahora = new Date("2026-11-10T18:00:00Z");
    d = (permisos) => ({
      repositorio: new EvaluacionesPostgres(sql),
      autorizacion: autorizacionConPermisos(permisos),
      auditoria: new AuditoriaPostgres(sql),
      reloj: { ahora: () => ahora },
      ids: idsAleatorios,
      claves: argon2id,
      intentos: new IntentosPostgres(sql),
      zonaHoraria: "America/Mexico_City",
    });
    const clientes = new ClientesPostgres(sql);
    const codigo = (await clientes.coachesParaRegistro()).find((c) => c.apodo === "Mike")!;
    coachMike = codigo.coachId;
    ana = (
      await new RegistrarCliente(clientes, argon2id, idsAleatorios, { ahora: () => ahora }).ejecutar({
        codigoCoach: codigo.codigo,
        nombre: "Ana López",
        correo: "ana@correo.mx",
        telefono: "",
        clave: "mi clave de boxeo",
        aceptaReglamento: true,
        sexo: "F",
      })
    ).clienteId;
    await enGimnasio(sql, GIMNASIO, (tx) => tx`UPDATE cliente SET estado = 'activo' WHERE id = ${ana}`);
  }, 60_000);

  afterAll(() => cerrar());

  it("PIN: se define, se rechaza uno débil y uno incorrecto, y bloquea tras 5 fallos", async () => {
    const definir = new DefinirPin(d(["evaluacion.realizar"]));
    await expect(definir.ejecutar(admin, "1234")).rejects.toThrow(/fácil de adivinar/);
    await definir.ejecutar(admin, "4826");
    const iniciar = new IniciarEvaluacion(d(["evaluacion.realizar"]));
    await expect(iniciar.ejecutar(admin, ana, "0000")).rejects.toThrow(/PIN incorrecto/);
    await expect(new IniciarEvaluacion(d([])).ejecutar({ usuarioId: MIKE, gimnasioId: GIMNASIO }, ana, "4826")).rejects.toThrow(/permiso/);
  });

  it("con lesión o dolor no se evalúa: queda no apta y se puede reprogramar el mismo mes", async () => {
    const { sesionId } = await new IniciarEvaluacion(d(["evaluacion.realizar"])).ejecutar(admin, ana, "4826");
    expect((await new RegistrarChequeo(d(["evaluacion.realizar"])).ejecutar(admin, sesionId, { lesionODolor: true, durmioBien: true, comio3h: true, pesoKg: null, estaturaCm: null })).apto).toBe(false);
    expect((await new EvaluacionesPostgres(sql).sesion(GIMNASIO, sesionId))?.estado).toBe("no_apta");
  });

  it("evaluación inicial: pesaje con división, captura completa y todos los pilares en 100", async () => {
    const { sesionId, continuada } = await new IniciarEvaluacion(d(["evaluacion.realizar"])).ejecutar(admin, ana, "4826");
    expect(continuada).toBe(false);
    await expect(new GuardarCaptura(d(["evaluacion.realizar"])).ejecutar(admin, sesionId, "salto_horizontal", [{ cm: 180 }])).rejects.toThrow(/check-in/);
    const chequeo = await new RegistrarChequeo(d(["evaluacion.realizar"])).ejecutar(admin, sesionId, { lesionODolor: false, durmioBien: true, comio3h: true, pesoKg: 56.4, estaturaCm: 163 });
    expect(chequeo).toEqual({ apto: true, division: "57 kg" });
    await capturaCompleta(sesionId);
    await new GuardarRubrica(d(["evaluacion.realizar"])).ejecutar(admin, sesionId, new Map(["c01", "c02", "c03", "c04", "c05", "c06", "c07", "c08", "c09", "c10"].map((c) => [c, 1])), { nombre: "Beto", habitual: true });
    const r = await new CerrarEvaluacion(d(["evaluacion.realizar"])).ejecutar(admin, sesionId);
    expect(r.estado).toBe("completa");
    expect(Object.fromEntries(r.pilares.map((p) => [p.pilar, p.indice]))).toEqual({ fuerza: 100, velocidad: 100, resistencia: 100, estrategia: 100 });
    const [s] = await enGimnasio(sql, GIMNASIO, (tx) => tx`SELECT tipo, division FROM sesion_evaluacion WHERE id = ${sesionId}`);
    expect(s).toEqual({ tipo: "inicial", division: "57 kg" });
    await expect(new IniciarEvaluacion(d(["evaluacion.realizar"])).ejecutar(admin, ana, "4826")).rejects.toThrow(/ya tiene su evaluación/);
  });

  it("mensual de diciembre: sin compañero queda parcial; al completar Estrategia se publica completa", async () => {
    ahora = new Date("2026-12-08T18:00:00Z");
    const { sesionId } = await new IniciarEvaluacion(d(["evaluacion.realizar"])).ejecutar(admin, ana, "4826");
    await new RegistrarChequeo(d(["evaluacion.realizar"])).ejecutar(admin, sesionId, { lesionODolor: false, durmioBien: false, comio3h: true, pesoKg: 55.2, estaturaCm: null });
    await capturaCompleta(sesionId, 1.1);
    const parcial = await new CerrarEvaluacion(d(["evaluacion.realizar"])).ejecutar(admin, sesionId);
    expect(parcial.estado).toBe("parcial");
    expect(parcial.pilares.find((p) => p.pilar === "estrategia")?.indice).toBeNull();
    // Salto 185 → 204 cm (110) y flexiones 18 → 20 (111): 50/50 da 111.
    expect(parcial.pilares.find((p) => p.pilar === "fuerza")?.indice).toBe(111);

    ahora = new Date("2026-12-15T18:00:00Z");
    const otra = await new IniciarEvaluacion(d(["evaluacion.realizar"])).ejecutar(admin, ana, "4826");
    expect(otra).toEqual({ sesionId, continuada: true });
    await new GuardarRubrica(d(["evaluacion.realizar"])).ejecutar(admin, sesionId, new Map(["c01", "c02", "c03", "c04", "c05", "c06", "c07", "c08", "c09", "c10"].map((c) => [c, 2])), { nombre: "Carlos", habitual: false });
    const completa = await new CerrarEvaluacion(d(["evaluacion.realizar"])).ejecutar(admin, sesionId);
    expect(completa.estado).toBe("completa");
    // Táctica y Adaptabilidad pasan de 5 a 10: 100 + 5 × 10 = 150.
    expect(completa.pilares.find((p) => p.pilar === "estrategia")?.indice).toBe(150);
  });

  it("historial del cliente, división de cada evaluación y resultado del coach", async () => {
    const consultas = new ConsultasEvaluacion(sql);
    const historial = await consultas.historialDeCliente(GIMNASIO, ana);
    expect(historial.map((h) => [h.tipo, h.periodo, h.division, h.pilares.fuerza])).toEqual([
      ["inicial", "2026-11", "57 kg", 100],
      ["mensual", "2026-12", "57 kg", 111],
    ]);
    const mike = (await consultas.resultadoCoaches(GIMNASIO, "2026-12")).find((c) => c.coachId === coachMike)!;
    expect(mike).toMatchObject({ activos: 1, evaluados: 1, fuerza: 111, estrategia: 150 });
    expect((await consultas.ultimosDelCoach(GIMNASIO, coachMike))[0]).toMatchObject({ nombre: "Ana López", periodo: "2026-12", fuerza: 111 });
  });

  it("anular con motivo permite repetir la del mes; los datos crudos se conservan", async () => {
    const consultas = new ConsultasEvaluacion(sql);
    const [, diciembre] = await consultas.historialDeCliente(GIMNASIO, ana);
    await expect(new AnularEvaluacion(d(["evaluacion.realizar"])).ejecutar(admin, diciembre.sesionId, " ")).rejects.toThrow(/motivo/);
    await new AnularEvaluacion(d(["evaluacion.realizar"])).ejecutar(admin, diciembre.sesionId, "Se capturó el salto en pulgadas");
    expect((await consultas.historialDeCliente(GIMNASIO, ana)).map((h) => h.periodo)).toEqual(["2026-11"]);
    const { continuada } = await new IniciarEvaluacion(d(["evaluacion.realizar"])).ejecutar(admin, ana, "4826");
    expect(continuada).toBe(false);
    const [crudos] = await enGimnasio(sql, GIMNASIO, (tx) => tx<{ n: number }[]>`SELECT count(*)::int AS n FROM resultado_intento WHERE sesion_id = ${diciembre.sesionId}`);
    expect(crudos.n).toBeGreaterThan(0);
  });
});

import type postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  DarAccesoBiblioteca,
  FormalizarEjercicio,
  FusionarEjercicio,
  GuardarPlanDeTrabajo,
  GuardarRutina,
  MantenerPlan,
  ProponerEjercicio,
  RevisarPlan,
  type DependenciasBiblioteca,
} from "@/modules/biblioteca/application/Biblioteca";
import { claveTurno, type Rutina } from "@/modules/biblioteca/domain/Planes";
import { BibliotecaPostgres, ConsultasBiblioteca } from "@/modules/biblioteca/infrastructure/BibliotecaPostgres";
import { AsignarTurno } from "@/modules/operacion/application/Operacion";
import { OperacionPostgres } from "@/modules/operacion/infrastructure/OperacionPostgres";
import { AuditoriaPostgres, autorizacionConPermisos, idsAleatorios } from "@/shared/infrastructure/comunes";
import { servidorDePrueba } from "./pgliteDePrueba";

const GIMNASIO = "00000000-0000-4000-8000-000000000101";
const IVAN = "00000000-0000-4000-8000-000000000201";
const MIKE = "00000000-0000-4000-8000-000000000202";
const CHATO = "00000000-0000-4000-8000-000000000203";
const admin = { usuarioId: IVAN, gimnasioId: GIMNASIO };
const mike = { usuarioId: MIKE, gimnasioId: GIMNASIO };
const chato = { usuarioId: CHATO, gimnasioId: GIMNASIO };
const ADMIN = ["biblioteca.proponer", "biblioteca.formalizar", "plan.enviar", "plan.aprobar", "horario.asignar"];
const COACH = ["biblioteca.proponer", "plan.enviar"];

describe("biblioteca, rutinas y planes en Postgres", () => {
  let sql: postgres.Sql;
  let cerrar: () => Promise<void>;
  let ahora: Date;
  let d: (permisos: string[]) => DependenciasBiblioteca;
  let consultas: ConsultasBiblioteca;
  let escalera: string;
  let sombraMike: string;
  let sombra: string;
  let rutinaA: string;
  let rutinaB: string;
  let turnos: string[];

  const rutina = (nombre: string, ejercicioId: string | null, combinacion: string | null = null): Rutina => ({
    nombre,
    descripcion: "",
    bloques: [
      { tipo: "calentamiento", minutos: 20, rounds: null, descripcion: "Movilidad", elementos: [] },
      { tipo: "tecnica", minutos: 60, rounds: 6, descripcion: "", elementos: [{ ejercicioId, combinacion, modalidad: "grupal", detalle: "6 rounds" }] },
    ],
  });

  beforeAll(async () => {
    ({ sql, cerrar } = await servidorDePrueba(55_438));
    ahora = new Date("2026-11-20T18:00:00Z");
    d = (permisos) => ({
      repositorio: new BibliotecaPostgres(sql),
      autorizacion: autorizacionConPermisos(permisos),
      auditoria: new AuditoriaPostgres(sql),
      reloj: { ahora: () => ahora },
      ids: idsAleatorios,
      zonaHoraria: "America/Mexico_City",
    });
    consultas = new ConsultasBiblioteca(sql);
  }, 60_000);

  afterAll(() => cerrar());

  it("el glosario trae los 11 golpes con sus nombres alternos, incluido el volado", async () => {
    const glosario = await consultas.glosario(GIMNASIO);
    expect(glosario).toHaveLength(11);
    expect(glosario.find((g) => g.codigo === "V")).toMatchObject({ nombre: "Volado", alias: ["Golpe en arco por arriba", "Overhand"] });
  });

  it("proponer avisa de parecidos (también con el glosario) y deja guardar si es distinto", async () => {
    const proponer = new ProponerEjercicio(d(COACH));
    await expect(proponer.ejecutar(mike, { nombre: "Manoplas", descripcion: "Combinaciones con manoplas.", categoria: "implementos", esDistinto: false })).rejects.toThrow(/Se parece a: Manopleo/);
    await expect(proponer.ejecutar(mike, { nombre: "Overhand", descripcion: "Golpe en arco por encima.", categoria: "tecnica", esDistinto: false })).rejects.toThrow(/Volado \(golpe\)/);
    escalera = await proponer.ejecutar(mike, { nombre: "Escalera de agilidad", descripcion: "Pasos rápidos dentro de la escalera.", categoria: "desplazamiento", esDistinto: false });
    sombraMike = await proponer.ejecutar(mike, { nombre: "Sombra al espejo", descripcion: "Sombra mirando la guardia en el espejo.", categoria: "tecnica", esDistinto: true });
    const ej = (await consultas.ejercicios(GIMNASIO)).find((e) => e.id === escalera);
    expect(ej).toMatchObject({ estado: "propuesto", visibilidad: "privado", autor: "Mike" });
  });

  it("Mike usa su propuesta de inmediato; Chato no la ve hasta que se formaliza y tiene acceso", async () => {
    rutinaA = await new GuardarRutina(d(COACH)).ejecutar(mike, null, rutina("A · Técnica y saco", escalera));
    await expect(new GuardarRutina(d(COACH)).ejecutar(chato, null, rutina("Prueba", escalera))).rejects.toThrow(/no está disponible/);

    await new FormalizarEjercicio(d(ADMIN)).ejecutar(admin, escalera, {
      nombre: "Escalera de agilidad",
      descripcion: "Pasos rápidos dentro de la escalera.",
      ejecucion: "Dos pies por cuadro, brazos en guardia.",
      errores: "Mirar los pies.",
      nivel: "inicial",
      categoria: "desplazamiento",
      visibilidad: "compartido",
      alias: ["Agility ladder"],
    });
    await expect(new GuardarRutina(d(COACH)).ejecutar(chato, null, rutina("Prueba", escalera))).rejects.toThrow(/no está disponible/);
    await new DarAccesoBiblioteca(d(ADMIN)).ejecutar(admin, (await new BibliotecaPostgres(sql).coachDelUsuario(GIMNASIO, CHATO))!.id, true);
    await expect(new GuardarRutina(d(COACH)).ejecutar(chato, null, rutina("Prueba", escalera))).resolves.toBeDefined();
  });

  it("las combinaciones se validan con el glosario", async () => {
    await expect(new GuardarRutina(d(COACH)).ejecutar(mike, null, rutina("Combos", null, "1-2-9"))).rejects.toThrow(/número 9/);
    rutinaB = await new GuardarRutina(d(COACH)).ejecutar(mike, null, rutina("B · Manoplas", sombraMike));
  });

  it("al fusionar, el nombre queda como alias y la rutina pasa al ejercicio oficial", async () => {
    sombra = (await consultas.ejercicios(GIMNASIO)).find((e) => e.nombre === "Sombra")!.id;
    await new FusionarEjercicio(d(ADMIN)).ejecutar(admin, sombraMike, sombra);
    const lista = await consultas.ejercicios(GIMNASIO);
    expect(lista.find((e) => e.id === sombra)?.alias).toContain("Sombra al espejo");
    expect(lista.some((e) => e.id === sombraMike)).toBe(false);
    const coachMike = (await new BibliotecaPostgres(sql).coachDelUsuario(GIMNASIO, MIKE))!.id;
    const [, b] = await consultas.rutinas(GIMNASIO, coachMike);
    expect(b.bloques[1].elementos[0]).toMatchObject({ ejercicioId: sombra, ejercicio: "Sombra" });
  });

  it("plan de noviembre: se envía, la administración pide cambios, se corrige y se aprueba", async () => {
    const repo = new BibliotecaPostgres(sql);
    const coachMike = (await repo.coachDelUsuario(GIMNASIO, MIKE))!.id;
    const f18 = (await new OperacionPostgres(sql).horario(GIMNASIO)).franjas.find((f) => f.inicio === "18:00")!.id;
    const asignar = new AsignarTurno({ repositorio: new OperacionPostgres(sql), autorizacion: autorizacionConPermisos(ADMIN), auditoria: new AuditoriaPostgres(sql), reloj: { ahora: () => ahora }, ids: idsAleatorios });
    for (const dia of [1, 3]) await asignar.ejecutar(admin, { coachId: coachMike, franjaId: f18, diaSemana: dia, cupoMax: null });
    turnos = [claveTurno(1, f18), claveTurno(3, f18)];

    const guardar = new GuardarPlanDeTrabajo(d(COACH));
    await expect(guardar.ejecutar(mike, { mes: "2026-11", esFijo: true, asignaciones: new Map([[turnos[0], rutinaA]]), enviar: true })).rejects.toThrow(/cada turno/);
    const { id, estado } = await guardar.ejecutar(mike, { mes: "2026-11", esFijo: true, asignaciones: new Map([[turnos[0], rutinaA], [turnos[1], rutinaA]]), enviar: true });
    expect(estado).toBe("enviado");
    await expect(guardar.ejecutar(mike, { mes: "2026-11", esFijo: true, asignaciones: new Map(), enviar: false })).rejects.toThrow(/en revisión/);

    await expect(new RevisarPlan(d(ADMIN)).ejecutar(admin, id, "pedir_cambios", " ")).rejects.toThrow(/qué cambios/);
    await new RevisarPlan(d(ADMIN)).ejecutar(admin, id, "pedir_cambios", "El miércoles pon manoplas");
    await guardar.ejecutar(mike, { mes: "2026-11", esFijo: true, asignaciones: new Map([[turnos[0], rutinaA], [turnos[1], rutinaB]]), enviar: true });
    await new RevisarPlan(d(ADMIN)).ejecutar(admin, id, "aprobar", "");
    expect((await repo.plan(GIMNASIO, coachMike, "2026-11"))?.estado).toBe("aprobado");
  });

  it("el día 25 se mantiene el plan fijo: diciembre queda aprobado con las mismas rutinas", async () => {
    ahora = new Date("2026-11-25T18:00:00Z");
    const r = await new MantenerPlan(d(COACH)).ejecutar(mike);
    expect(r).toEqual({ mes: "2026-12", completo: true });
    const repo = new BibliotecaPostgres(sql);
    const coachMike = (await repo.coachDelUsuario(GIMNASIO, MIKE))!.id;
    const diciembre = (await repo.plan(GIMNASIO, coachMike, "2026-12"))!;
    expect(diciembre.estado).toBe("aprobado");
    expect([...diciembre.asignaciones.values()]).toEqual(expect.arrayContaining([rutinaA, rutinaB]));
    await expect(new MantenerPlan(d(COACH)).ejecutar(mike)).rejects.toThrow(/Ya tienes plan/);
  });
});

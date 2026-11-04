import { randomBytes } from "node:crypto";
import type postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { RegistrarCliente } from "@/modules/clientes/application/RegistroDeClientes";
import { ClientesPostgres } from "@/modules/clientes/infrastructure/ClientesPostgres";
import { argon2id } from "@/modules/acceso/infrastructure/AccesoPostgres";
import {
  ActualizarPerfilCliente,
  ActualizarPerfilCoach,
  AsignarCliente,
  AsignarTurno,
  QuitarTurno,
} from "@/modules/operacion/application/Operacion";
import { ConsultasOperacion, OperacionPostgres } from "@/modules/operacion/infrastructure/OperacionPostgres";
import { enGimnasio } from "@/shared/infrastructure/baseDeDatos";
import { cifradorAes } from "@/shared/infrastructure/cifrado";
import { AuditoriaPostgres, autorizacionConPermisos, idsAleatorios } from "@/shared/infrastructure/comunes";
import { servidorDePrueba } from "./pgliteDePrueba";

const GIMNASIO = "00000000-0000-4000-8000-000000000101";
const IVAN = "00000000-0000-4000-8000-000000000201";
const MIKE = "00000000-0000-4000-8000-000000000202";
const admin = { usuarioId: IVAN, gimnasioId: GIMNASIO };
const reloj = { ahora: () => new Date("2026-11-02T16:00:00Z") };
const cifrador = cifradorAes(randomBytes(32).toString("base64"));

describe("operación en Postgres", () => {
  let sql: postgres.Sql;
  let cerrar: () => Promise<void>;
  let repo: OperacionPostgres;
  let consultas: ConsultasOperacion;
  let deps: ConstructorParameters<typeof AsignarTurno>[0];
  let coaches: { id: string; apodo: string; color: string }[];
  let f18: string;
  let clienteId: string;
  let usuarioAna: string;

  beforeAll(async () => {
    ({ sql, cerrar } = await servidorDePrueba(55_435));
    repo = new OperacionPostgres(sql);
    consultas = new ConsultasOperacion(sql, () => cifrador);
    deps = {
      repositorio: repo,
      autorizacion: autorizacionConPermisos(["horario.asignar", "cliente.asignar", "cliente.ver_todos"]),
      auditoria: new AuditoriaPostgres(sql),
      reloj,
      ids: idsAleatorios,
    };
    coaches = await consultas.coaches(GIMNASIO);
    f18 = (await repo.horario(GIMNASIO)).franjas.find((f) => f.inicio === "18:00")!.id;
    const clientes = new ClientesPostgres(sql);
    const mike = (await clientes.coachesParaRegistro()).find((c) => c.apodo === "Mike")!;
    ({ clienteId, usuarioId: usuarioAna } = await new RegistrarCliente(clientes, argon2id, idsAleatorios, reloj).ejecutar({
      codigoCoach: mike.codigo,
      nombre: "Ana López",
      correo: "ana@correo.mx",
      telefono: "",
      clave: "mi clave de boxeo",
      aceptaReglamento: true,
      sexo: "F",
      pesoKg: 62,
      estaturaCm: 165,
    }));
  }, 60_000);

  afterAll(() => cerrar());

  const id = (apodo: string) => coaches.find((c) => c.apodo === apodo)!.id;

  it("los coaches tienen su color del prototipo", () => {
    expect(Object.fromEntries(coaches.map((c) => [c.apodo, c.color]))).toEqual({ Chato: "#2F80ED", Iván: "#D7263D", Mike: "#E8B04B" });
  });

  it("arma el horario con dos coaches en la misma franja", async () => {
    const asignar = new AsignarTurno(deps);
    await asignar.ejecutar(admin, { coachId: id("Mike"), franjaId: f18, diaSemana: 1, cupoMax: null });
    await asignar.ejecutar(admin, { coachId: id("Mike"), franjaId: f18, diaSemana: 3, cupoMax: null });
    await asignar.ejecutar(admin, { coachId: id("Chato"), franjaId: f18, diaSemana: 1, cupoMax: 12 });
    const horario = await repo.horario(GIMNASIO);
    expect(horario.asignaciones.filter((a) => a.diaSemana === 1 && a.franjaId === f18)).toHaveLength(2);
    await expect(asignar.ejecutar(admin, { coachId: id("Mike"), franjaId: f18, diaSemana: 1, cupoMax: null })).rejects.toThrow(/ya tiene/);
  });

  it("quitar un turno lo cierra pero queda en el historial", async () => {
    const t = await new AsignarTurno(deps).ejecutar(admin, { coachId: id("Iván"), franjaId: f18, diaSemana: 5, cupoMax: null });
    await new QuitarTurno(deps).ejecutar(admin, t.id);
    expect((await repo.horario(GIMNASIO)).asignaciones.some((a) => a.id === t.id)).toBe(false);
    const [f] = await enGimnasio(sql, GIMNASIO, (tx) => tx`SELECT hasta FROM asignacion_horario WHERE id = ${t.id}`);
    expect(f.hasta).not.toBeNull();
  });

  it("la vista pública muestra el horario sin gimnasio fijado", async () => {
    const publico = await consultas.horarioPublico(GIMNASIO);
    expect(publico.franjas).toHaveLength(7);
    expect(publico.turnos.filter((t) => t.dia === 1 && t.inicio === "18:00").map((t) => t.apodo)).toEqual(["Chato", "Mike"]);
  });

  it("asigna a Ana a la franja de 18 con Mike y guarda el historial", async () => {
    await expect(
      new AsignarCliente(deps).ejecutar(admin, { clienteId, coachId: id("Iván"), franjaId: f18, motivo: "Prueba" }),
    ).rejects.toThrow(/no da clase en esa franja/);
    await new AsignarCliente(deps).ejecutar(admin, { clienteId, coachId: id("Mike"), franjaId: f18, motivo: "Horario de la tarde" });
    const enTurno = await consultas.clientesDelCoach(GIMNASIO, id("Mike"));
    expect(enTurno).toEqual([expect.objectContaining({ nombre: "Ana López", franjaId: f18 })]);
    const historial = await consultas.historialDeCliente(GIMNASIO, clienteId);
    expect(historial.map((h) => h.motivo)).toEqual(["Horario de la tarde", "Registro con invitación del coach"]);
    expect(historial[1].hasta).not.toBeNull();
  });

  it("Ana guarda su perfil; lo médico queda cifrado en la base", async () => {
    const actualizar = new ActualizarPerfilCliente({ ...deps, autorizacion: autorizacionConPermisos([]) }, cifrador, "America/Mexico_City");
    await actualizar.ejecutar({ usuarioId: usuarioAna, gimnasioId: GIMNASIO }, clienteId, {
      fechaNacimiento: "1998-05-20",
      contactoEmergencia: "Mamá 5512345678",
      notasMedicas: "Asma leve",
    });
    const [crudo] = await enGimnasio(sql, GIMNASIO, (tx) => tx<{ notas: string }[]>`
      SELECT notas_medicas_cifrado AS notas FROM perfil_cliente WHERE cliente_id = ${clienteId}`);
    expect(crudo.notas).not.toContain("Asma");
    expect(await consultas.perfilCliente(GIMNASIO, clienteId)).toEqual({
      sexo: "F",
      fechaNacimiento: "1998-05-20",
      contactoEmergencia: "Mamá 5512345678",
      notasMedicas: "Asma leve",
    });
    // Otro usuario sin permiso no puede editarlo.
    await expect(actualizar.ejecutar({ usuarioId: MIKE, gimnasioId: GIMNASIO }, clienteId, { fechaNacimiento: "", contactoEmergencia: "", notasMedicas: "" })).rejects.toThrow(/permiso/);
  });

  it("Mike escribe su presentación", async () => {
    await new ActualizarPerfilCoach(deps).ejecutar({ usuarioId: MIKE, gimnasioId: GIMNASIO }, { bio: "Boxeo técnico", especialidad: "Principiantes" });
    expect(await consultas.perfilCoach(GIMNASIO, MIKE)).toEqual({ bio: "Boxeo técnico", especialidad: "Principiantes" });
  });
});

import { ErrorDeDominio, SinPermiso } from "@/shared/domain/ErrorDeDominio";
import { Fecha } from "@/shared/domain/Fecha";
import type { Actor, Auditoria, Autorizacion, GeneradorDeIds, Reloj } from "@/shared/application/puertos";
import { parecidos, puedeVer, traducirCombinacion, validarPropuesta, type EjercicioVisible, type Golpe, type NombreConocido, type Visibilidad } from "../domain/Biblioteca";
import { claveTurno, diferencias, siguienteEstado, validarRutina, type Asignaciones, type EstadoPlan, type Rutina } from "../domain/Planes";

export const PERMISO_PROPONER = "biblioteca.proponer";
export const PERMISO_FORMALIZAR = "biblioteca.formalizar";
export const PERMISO_ENVIAR_PLAN = "plan.enviar";
export const PERMISO_APROBAR_PLAN = "plan.aprobar";

export interface EjercicioGuardado extends EjercicioVisible {
  id: string;
  nombre: string;
}

export interface PlanGuardado {
  id: string;
  coachId: string;
  mes: string;
  esFijo: boolean;
  estado: EstadoPlan;
  asignaciones: Map<string, string>;
}

export interface RepositorioBiblioteca {
  golpes(gimnasioId: string): Promise<Golpe[]>;
  /** Nombres oficiales y alternos de ejercicios vigentes y del glosario, para detectar duplicados. */
  nombresConocidos(gimnasioId: string): Promise<NombreConocido[]>;
  coachDelUsuario(gimnasioId: string, usuarioId: string): Promise<{ id: string; accesoBiblioteca: boolean } | null>;
  ejercicio(gimnasioId: string, id: string): Promise<EjercicioGuardado | null>;
  ejerciciosPorId(gimnasioId: string, ids: string[]): Promise<EjercicioGuardado[]>;
  crearEjercicio(gimnasioId: string, e: { id: string; nombre: string; descripcion: string; categoria: string; estado: "propuesto" | "formalizado"; visibilidad: Visibilidad; creadoPor: string; creadoPorCoach: string | null }): Promise<void>;
  formalizar(
    gimnasioId: string,
    id: string,
    d: { nombre: string; descripcion: string; ejecucion: string | null; errores: string | null; nivel: string | null; categoria: string; visibilidad: Visibilidad; alias: string[]; por: string; en: Date },
  ): Promise<void>;
  /** El origen queda fusionado, su nombre pasa a alias del destino y las rutinas se actualizan solas. */
  fusionar(gimnasioId: string, origenId: string, destinoId: string): Promise<void>;
  darAcceso(gimnasioId: string, coachId: string, acceso: boolean): Promise<void>;

  rutinaDelCoach(gimnasioId: string, rutinaId: string): Promise<{ id: string; coachId: string } | null>;
  guardarRutina(gimnasioId: string, coachId: string, id: string, r: Rutina, ids: () => string): Promise<void>;
  rutinasDelCoach(gimnasioId: string, coachId: string): Promise<{ id: string; nombre: string }[]>;

  /** Turnos (día y franja) que el coach tiene en el horario vigente. */
  turnosDelCoach(gimnasioId: string, coachId: string): Promise<{ dia: number; franjaId: string }[]>;
  plan(gimnasioId: string, coachId: string, mes: string): Promise<PlanGuardado | null>;
  planPorId(gimnasioId: string, id: string): Promise<PlanGuardado | null>;
  guardarPlan(gimnasioId: string, p: PlanGuardado & { basadoEnId: string | null; enviadoEn: Date | null }): Promise<void>;
  revisarPlan(gimnasioId: string, id: string, d: { estado: EstadoPlan; comentario: string | null; por: string; en: Date }): Promise<void>;
}

export interface DependenciasBiblioteca {
  repositorio: RepositorioBiblioteca;
  autorizacion: Autorizacion;
  auditoria: Auditoria;
  reloj: Reloj;
  ids: GeneradorDeIds;
  zonaHoraria: string;
}

async function exigir(d: DependenciasBiblioteca, actor: Actor, permiso: string) {
  if (!(await d.autorizacion.tienePermiso(actor, permiso))) throw new SinPermiso(permiso);
}

const registrar = (d: DependenciasBiblioteca, actor: Actor, accion: string, entidad: string, entidadId: string, despues: unknown, motivo?: string) =>
  d.auditoria.registrar({ gimnasioId: actor.gimnasioId, usuarioId: actor.usuarioId, accion, entidad, entidadId, antes: null, despues, motivo });

/**
 * El coach propone un ejercicio con nombre y descripción y lo usa de inmediato en sus rutinas.
 * Si se parece a uno existente, se avisa: solo se guarda si confirma que es distinto.
 * Si lo crea la administración, queda formalizado y compartido.
 */
export class ProponerEjercicio {
  constructor(private readonly d: DependenciasBiblioteca) {}

  async ejecutar(actor: Actor, s: { nombre: string; descripcion: string; categoria: string; esDistinto: boolean }) {
    await exigir(this.d, actor, PERMISO_PROPONER);
    const { nombre, descripcion } = validarPropuesta(s);
    if (!s.esDistinto) {
      const parecido = parecidos(nombre, await this.d.repositorio.nombresConocidos(actor.gimnasioId));
      if (parecido.length > 0) {
        const lista = [...new Set(parecido.map((p) => (p.tipo === "golpe" ? `${p.oficial} (golpe)` : p.oficial)))].join(", ");
        throw new ErrorDeDominio("parecido", `Se parece a: ${lista}. Si es otro ejercicio, marca “Es distinto” y vuelve a enviarlo.`);
      }
    }
    const esAdministracion = await this.d.autorizacion.tienePermiso(actor, PERMISO_FORMALIZAR);
    const coach = await this.d.repositorio.coachDelUsuario(actor.gimnasioId, actor.usuarioId);
    if (!esAdministracion && !coach) throw new ErrorDeDominio("no_es_coach", "Solo coaches y administración proponen ejercicios.");
    const id = this.d.ids.nuevo();
    await this.d.repositorio.crearEjercicio(actor.gimnasioId, {
      id,
      nombre,
      descripcion,
      categoria: s.categoria,
      estado: esAdministracion ? "formalizado" : "propuesto",
      visibilidad: esAdministracion ? "compartido" : "privado",
      creadoPor: actor.usuarioId,
      creadoPorCoach: coach?.id ?? null,
    });
    await registrar(this.d, actor, esAdministracion ? "biblioteca.ejercicio_creado" : "biblioteca.ejercicio_propuesto", "ejercicio", id, { nombre });
    return id;
  }
}

export class FormalizarEjercicio {
  constructor(private readonly d: DependenciasBiblioteca) {}

  async ejecutar(
    actor: Actor,
    id: string,
    s: { nombre: string; descripcion: string; ejecucion: string; errores: string; nivel: string; categoria: string; visibilidad: Visibilidad; alias: string[] },
  ) {
    await exigir(this.d, actor, PERMISO_FORMALIZAR);
    const e = await this.d.repositorio.ejercicio(actor.gimnasioId, id);
    if (!e || e.estado === "fusionado") throw new ErrorDeDominio("ejercicio_no_encontrado", "No existe ese ejercicio.");
    const { nombre, descripcion } = validarPropuesta(s);
    const alias = [...new Set(s.alias.map((a) => a.trim()).filter((a) => a.length >= 2 && a !== nombre))].slice(0, 10);
    await this.d.repositorio.formalizar(actor.gimnasioId, id, {
      nombre,
      descripcion,
      ejecucion: s.ejecucion.trim() || null,
      errores: s.errores.trim() || null,
      nivel: ["inicial", "intermedio", "avanzado"].includes(s.nivel) ? s.nivel : null,
      categoria: s.categoria,
      visibilidad: s.visibilidad,
      alias,
      por: actor.usuarioId,
      en: this.d.reloj.ahora(),
    });
    await registrar(this.d, actor, "biblioteca.ejercicio_formalizado", "ejercicio", id, { nombre, alias, visibilidad: s.visibilidad });
  }
}

export class FusionarEjercicio {
  constructor(private readonly d: DependenciasBiblioteca) {}

  async ejecutar(actor: Actor, origenId: string, destinoId: string) {
    await exigir(this.d, actor, PERMISO_FORMALIZAR);
    if (origenId === destinoId) throw new ErrorDeDominio("fusion_misma", "Elige otro ejercicio para fusionar.");
    const [origen, destino] = await Promise.all([this.d.repositorio.ejercicio(actor.gimnasioId, origenId), this.d.repositorio.ejercicio(actor.gimnasioId, destinoId)]);
    if (!origen || !destino || origen.estado === "fusionado" || destino.estado === "fusionado") {
      throw new ErrorDeDominio("fusion_invalida", "Alguno de los ejercicios ya no existe.");
    }
    await this.d.repositorio.fusionar(actor.gimnasioId, origenId, destinoId);
    await registrar(this.d, actor, "biblioteca.ejercicio_fusionado", "ejercicio", origenId, { fusionadoEn: destinoId, nombre: origen.nombre });
  }
}

export class DarAccesoBiblioteca {
  constructor(private readonly d: DependenciasBiblioteca) {}

  async ejecutar(actor: Actor, coachId: string, acceso: boolean) {
    await exigir(this.d, actor, PERMISO_FORMALIZAR);
    await this.d.repositorio.darAcceso(actor.gimnasioId, coachId, acceso);
    await registrar(this.d, actor, acceso ? "biblioteca.acceso_otorgado" : "biblioteca.acceso_revocado", "coach", coachId, { acceso });
  }
}

/** El coach arma sus rutinas solo con ejercicios que puede ver y con combinaciones del glosario. */
export class GuardarRutina {
  constructor(private readonly d: DependenciasBiblioteca) {}

  async ejecutar(actor: Actor, rutinaId: string | null, entrada: Rutina) {
    await exigir(this.d, actor, PERMISO_ENVIAR_PLAN);
    const coach = await this.d.repositorio.coachDelUsuario(actor.gimnasioId, actor.usuarioId);
    if (!coach) throw new ErrorDeDominio("no_es_coach", "Solo los coaches arman rutinas.");
    if (rutinaId) {
      const existente = await this.d.repositorio.rutinaDelCoach(actor.gimnasioId, rutinaId);
      if (!existente || existente.coachId !== coach.id) throw new ErrorDeDominio("rutina_ajena", "Esa rutina no es tuya.");
    }
    const rutina = validarRutina(entrada);
    const elementos = rutina.bloques.flatMap((b) => b.elementos);
    const golpes = await this.d.repositorio.golpes(actor.gimnasioId);
    elementos.filter((e) => !e.ejercicioId && e.combinacion).forEach((e) => traducirCombinacion(e.combinacion!, golpes));
    const ids = [...new Set(elementos.flatMap((e) => (e.ejercicioId ? [e.ejercicioId] : [])))];
    const ejercicios = await this.d.repositorio.ejerciciosPorId(actor.gimnasioId, ids);
    const esAdministracion = await this.d.autorizacion.tienePermiso(actor, PERMISO_FORMALIZAR);
    const lector = { esAdministracion, coachId: coach.id, accesoCompartido: coach.accesoBiblioteca };
    if (ids.some((id) => !ejercicios.find((e) => e.id === id && puedeVer(e, lector)))) {
      throw new ErrorDeDominio("ejercicio_no_visible", "Uno de los ejercicios no está disponible para ti.");
    }
    const id = rutinaId ?? this.d.ids.nuevo();
    await this.d.repositorio.guardarRutina(actor.gimnasioId, coach.id, id, rutina, () => this.d.ids.nuevo());
    await registrar(this.d, actor, rutinaId ? "plan.rutina_cambiada" : "plan.rutina_creada", "rutina", id, { nombre: rutina.nombre, bloques: rutina.bloques.length });
    return id;
  }
}

/** Mes actual o siguiente, en la zona del gimnasio. */
function mesesPermitidos(d: DependenciasBiblioteca) {
  const actual = Fecha.hoyEn(d.zonaHoraria, d.reloj.ahora()).mes;
  return [actual, Fecha.de(`${actual}-01`).sumarMeses(1).mes];
}

/**
 * El coach asigna una rutina a cada uno de sus turnos del mes. Puede guardarlo como borrador o enviarlo.
 * Al enviarlo, si no cambió nada contra el plan aprobado del mes anterior y es fijo, se aprueba solo.
 */
export class GuardarPlanDeTrabajo {
  constructor(private readonly d: DependenciasBiblioteca) {}

  async ejecutar(actor: Actor, s: { mes: string; esFijo: boolean; asignaciones: Map<string, string>; enviar: boolean }) {
    await exigir(this.d, actor, PERMISO_ENVIAR_PLAN);
    const coach = await this.d.repositorio.coachDelUsuario(actor.gimnasioId, actor.usuarioId);
    if (!coach) throw new ErrorDeDominio("no_es_coach", "Solo los coaches tienen plan de trabajo.");
    if (!mesesPermitidos(this.d).includes(s.mes)) throw new ErrorDeDominio("plan_mes", "El plan se arma para este mes o el siguiente.");

    const turnos = new Set((await this.d.repositorio.turnosDelCoach(actor.gimnasioId, coach.id)).map((t) => claveTurno(t.dia, t.franjaId)));
    const rutinas = new Set((await this.d.repositorio.rutinasDelCoach(actor.gimnasioId, coach.id)).map((r) => r.id));
    for (const [turno, rutina] of s.asignaciones) {
      if (!turnos.has(turno)) throw new ErrorDeDominio("turno_ajeno", "Uno de los turnos ya no es tuyo en el horario.");
      if (!rutinas.has(rutina)) throw new ErrorDeDominio("rutina_ajena", "Una de las rutinas no es tuya.");
    }
    if (s.enviar && [...turnos].some((t) => !s.asignaciones.has(t))) {
      throw new ErrorDeDominio("plan_incompleto", "Para enviarlo, cada turno debe tener su rutina.");
    }

    const existente = await this.d.repositorio.plan(actor.gimnasioId, coach.id, s.mes);
    if (existente) siguienteEstado(existente.estado, "editar");
    const anterior = await this.d.repositorio.plan(actor.gimnasioId, coach.id, Fecha.de(`${s.mes}-01`).sumarMeses(-1).mes);
    const sinCambios = anterior?.estado === "aprobado" && anterior.esFijo && diferencias(anterior.asignaciones, s.asignaciones).length === 0;
    const estado: EstadoPlan = !s.enviar ? (existente?.estado ?? "borrador") : sinCambios ? "aprobado" : siguienteEstado(existente?.estado ?? "borrador", "enviar");
    const id = existente?.id ?? this.d.ids.nuevo();
    await this.d.repositorio.guardarPlan(actor.gimnasioId, {
      id,
      coachId: coach.id,
      mes: s.mes,
      esFijo: s.esFijo,
      estado,
      asignaciones: s.asignaciones,
      basadoEnId: anterior?.id ?? null,
      enviadoEn: s.enviar ? this.d.reloj.ahora() : null,
    });
    await registrar(this.d, actor, s.enviar ? (estado === "aprobado" ? "plan.mantenido" : "plan.enviado") : "plan.guardado", "plan_trabajo", id, {
      mes: s.mes,
      turnos: s.asignaciones.size,
      estado,
    });
    return { id, estado };
  }
}

/** Mantener el plan fijo para el mes siguiente: misma asignación, aprobado de una vez. */
export class MantenerPlan {
  constructor(private readonly d: DependenciasBiblioteca) {}

  async ejecutar(actor: Actor) {
    await exigir(this.d, actor, PERMISO_ENVIAR_PLAN);
    const coach = await this.d.repositorio.coachDelUsuario(actor.gimnasioId, actor.usuarioId);
    if (!coach) throw new ErrorDeDominio("no_es_coach", "Solo los coaches tienen plan de trabajo.");
    const [actual, siguiente] = mesesPermitidos(this.d);
    const vigente = await this.d.repositorio.plan(actor.gimnasioId, coach.id, actual);
    if (!vigente || vigente.estado !== "aprobado") throw new ErrorDeDominio("sin_plan_aprobado", "Necesitas un plan aprobado este mes para mantenerlo.");
    if (await this.d.repositorio.plan(actor.gimnasioId, coach.id, siguiente)) throw new ErrorDeDominio("plan_ya_existe", "Ya tienes plan para el mes siguiente.");
    // Solo los turnos que sigue teniendo en el horario.
    const turnos = new Set((await this.d.repositorio.turnosDelCoach(actor.gimnasioId, coach.id)).map((t) => claveTurno(t.dia, t.franjaId)));
    const asignaciones = new Map([...vigente.asignaciones].filter(([t]) => turnos.has(t)));
    const completo = [...turnos].every((t) => asignaciones.has(t));
    const id = this.d.ids.nuevo();
    await this.d.repositorio.guardarPlan(actor.gimnasioId, {
      id,
      coachId: coach.id,
      mes: siguiente,
      esFijo: true,
      estado: completo ? "aprobado" : "borrador",
      asignaciones,
      basadoEnId: vigente.id,
      enviadoEn: completo ? this.d.reloj.ahora() : null,
    });
    await registrar(this.d, actor, "plan.mantenido", "plan_trabajo", id, { mes: siguiente, completo });
    return { mes: siguiente, completo };
  }
}

export class RevisarPlan {
  constructor(private readonly d: DependenciasBiblioteca) {}

  async ejecutar(actor: Actor, planId: string, decision: "aprobar" | "pedir_cambios", comentario: string) {
    await exigir(this.d, actor, PERMISO_APROBAR_PLAN);
    const plan = await this.d.repositorio.planPorId(actor.gimnasioId, planId);
    if (!plan) throw new ErrorDeDominio("plan_no_encontrado", "No existe ese plan.");
    const estado = siguienteEstado(plan.estado, decision);
    if (decision === "pedir_cambios" && !comentario.trim()) throw new ErrorDeDominio("comentario_requerido", "Di qué cambios necesita el plan.");
    await this.d.repositorio.revisarPlan(actor.gimnasioId, planId, { estado, comentario: comentario.trim() || null, por: actor.usuarioId, en: this.d.reloj.ahora() });
    await registrar(this.d, actor, decision === "aprobar" ? "plan.aprobado" : "plan.cambios_pedidos", "plan_trabajo", planId, { estado }, comentario.trim() || undefined);
  }
}

export type { Asignaciones };

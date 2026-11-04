import { ErrorDeDominio, SinPermiso } from "@/shared/domain/ErrorDeDominio";
import { Fecha } from "@/shared/domain/Fecha";
import type { Actor, Auditoria, Autorizacion, GeneradorDeIds, Reloj } from "@/shared/application/puertos";
import type { HashDeClaves, RegistroDeIntentos } from "@/modules/acceso/application/puertos";
import { PoliticaDeAcceso } from "@/modules/acceso/domain/PoliticaDeAcceso";
import { divisionPara, validarEstatura, validarPeso, type DivisionPeso, type Sexo } from "../domain/Composicion";
import { esApto, type Captura, type Chequeo, type CriterioRubrica, type DefinicionTest } from "../domain/Indices";
import { calcularSesion, type EstadoSesion, type ResultadoSesion } from "../domain/Sesion";
import { PERMISO_EVALUAR } from "./Pesajes";

export interface Bateria {
  id: string;
  tests: DefinicionTest[];
  criterios: CriterioRubrica[];
}

export interface SesionGuardada {
  id: string;
  clienteId: string;
  coachId: string;
  estado: EstadoSesion;
  tipo: "inicial" | "mensual";
  periodo: string;
  bateriaId: string;
  chequeoHecho: boolean;
}

export interface RepositorioEvaluaciones {
  pinHash(usuarioId: string): Promise<string | null>;
  guardarPin(usuarioId: string, hash: string): Promise<void>;

  clienteParaEvaluar(gimnasioId: string, clienteId: string): Promise<{ clienteId: string; coachId: string; estado: string; sexo: Sexo | null } | null>;
  bateriaVigente(gimnasioId: string): Promise<Bateria | null>;
  bateria(gimnasioId: string, bateriaId: string): Promise<Bateria>;
  divisiones(gimnasioId: string): Promise<DivisionPeso[]>;

  sesionDelMes(gimnasioId: string, clienteId: string, periodo: string): Promise<SesionGuardada | null>;
  /** Si el cliente ya tiene una evaluación cerrada (completa o parcial) antes de esta. */
  tieneEvaluacionPrevia(gimnasioId: string, clienteId: string, exceptoSesionId: string): Promise<boolean>;
  crearSesion(gimnasioId: string, s: Omit<SesionGuardada, "chequeoHecho"> & { evaluadorId: string }): Promise<void>;
  sesion(gimnasioId: string, sesionId: string): Promise<SesionGuardada | null>;

  guardarChequeo(
    gimnasioId: string,
    sesionId: string,
    d: { chequeo: Chequeo; estado: EstadoSesion; pesoKg: number | null; division: string | null; medicion: { id: string; clienteId: string; fecha: string; estaturaCm: number | null; registradoPor: string } | null },
  ): Promise<void>;
  guardarCaptura(gimnasioId: string, sesionId: string, testCodigo: string, captura: Captura): Promise<void>;
  guardarRubrica(gimnasioId: string, sesionId: string, niveles: ReadonlyMap<string, number>, companero: { nombre: string; habitual: boolean }): Promise<void>;

  capturas(gimnasioId: string, sesionId: string): Promise<{ capturas: Map<string, Captura>; rubrica: Map<string, number> }>;
  lineasBase(gimnasioId: string, clienteId: string): Promise<Map<string, number>>;
  /** Valores de la última evaluación cerrada antes de esta, para detectar cambios atípicos. */
  valoresAnteriores(gimnasioId: string, clienteId: string, sesionId: string): Promise<Map<string, number>>;
  guardarResultado(gimnasioId: string, sesionId: string, clienteId: string, r: ResultadoSesion, nuevasBasesIds: string[], en: Date): Promise<void>;
  anular(gimnasioId: string, sesionId: string, motivo: string, en: Date): Promise<void>;
  /** Desde este momento, la siguiente evaluación del cliente vuelve a ser su punto de partida. */
  reiniciar(gimnasioId: string, r: { id: string; clienteId: string; motivo: string; por: string; en: Date }): Promise<void>;
}

export interface DependenciasEvaluacion {
  repositorio: RepositorioEvaluaciones;
  autorizacion: Autorizacion;
  auditoria: Auditoria;
  reloj: Reloj;
  ids: GeneradorDeIds;
  claves: HashDeClaves;
  intentos: RegistroDeIntentos;
  zonaHoraria: string;
}

const FORMATO_PIN = /^\d{4,6}$/;

async function exigirEvaluador(d: DependenciasEvaluacion, actor: Actor) {
  if (!(await d.autorizacion.tienePermiso(actor, PERMISO_EVALUAR))) throw new SinPermiso(PERMISO_EVALUAR);
}

async function sesionAbierta(d: DependenciasEvaluacion, actor: Actor, sesionId: string): Promise<SesionGuardada> {
  await exigirEvaluador(d, actor);
  const s = await d.repositorio.sesion(actor.gimnasioId, sesionId);
  if (!s) throw new ErrorDeDominio("sesion_no_encontrada", "No existe esa evaluación.");
  if (s.estado !== "en_curso" && s.estado !== "parcial") throw new ErrorDeDominio("sesion_cerrada", "Esta evaluación ya está cerrada.");
  return s;
}

/** Cada evaluador define su PIN (4 a 6 dígitos); se guarda como hash, igual que la contraseña. */
export class DefinirPin {
  constructor(private readonly d: DependenciasEvaluacion) {}

  async ejecutar(actor: Actor, pin: string) {
    await exigirEvaluador(this.d, actor);
    if (!FORMATO_PIN.test(pin)) throw new ErrorDeDominio("pin_formato", "El PIN debe tener de 4 a 6 dígitos.");
    if (/^(\d)\1+$/.test(pin) || "0123456789".includes(pin) || "9876543210".includes(pin)) {
      throw new ErrorDeDominio("pin_debil", "Ese PIN es muy fácil de adivinar. Evita números repetidos o seguidos.");
    }
    await this.d.repositorio.guardarPin(actor.usuarioId, await this.d.claves.hash(pin));
    await this.d.auditoria.registrar({ gimnasioId: actor.gimnasioId, usuarioId: actor.usuarioId, accion: "evaluacion.pin_definido", entidad: "usuario", entidadId: actor.usuarioId, antes: null, despues: null });
  }
}

/**
 * Comenzar evaluación: PIN del evaluador y cliente. Coach y tipo (inicial/mensual) se asignan solos.
 * Una por cliente y mes; si ya hay una abierta este mes, se continúa esa.
 */
export class IniciarEvaluacion {
  constructor(private readonly d: DependenciasEvaluacion) {}

  async ejecutar(actor: Actor, clienteId: string, pin: string): Promise<{ sesionId: string; continuada: boolean }> {
    await exigirEvaluador(this.d, actor);
    await this.verificarPin(actor.usuarioId, pin);
    const cliente = await this.d.repositorio.clienteParaEvaluar(actor.gimnasioId, clienteId);
    if (!cliente || cliente.estado !== "activo") throw new ErrorDeDominio("cliente_no_activo", "Solo se evalúa a clientes con registro aprobado.");
    const periodo = Fecha.hoyEn(this.d.zonaHoraria, this.d.reloj.ahora()).mes;
    const delMes = await this.d.repositorio.sesionDelMes(actor.gimnasioId, clienteId, periodo);
    if (delMes && (delMes.estado === "en_curso" || delMes.estado === "parcial")) return { sesionId: delMes.id, continuada: true };
    if (delMes) throw new ErrorDeDominio("ya_evaluado", "Este cliente ya tiene su evaluación de este mes. Para repetirla, anúlala con motivo.");
    const bateria = await this.d.repositorio.bateriaVigente(actor.gimnasioId);
    if (!bateria) throw new ErrorDeDominio("sin_bateria", "No hay una batería de evaluación vigente.");

    const id = this.d.ids.nuevo();
    const tipo = (await this.d.repositorio.tieneEvaluacionPrevia(actor.gimnasioId, clienteId, id)) ? "mensual" : "inicial";
    await this.d.repositorio.crearSesion(actor.gimnasioId, { id, clienteId, coachId: cliente.coachId, estado: "en_curso", tipo, periodo, bateriaId: bateria.id, evaluadorId: actor.usuarioId });
    await this.d.auditoria.registrar({ gimnasioId: actor.gimnasioId, usuarioId: actor.usuarioId, accion: "evaluacion.iniciada", entidad: "sesion_evaluacion", entidadId: id, antes: null, despues: { clienteId, tipo, periodo } });
    return { sesionId: id, continuada: false };
  }

  private async verificarPin(usuarioId: string, pin: string) {
    const clave = `pin:${usuarioId}`;
    const ahora = this.d.reloj.ahora();
    const fallos = await this.d.intentos.fallosDesde(clave, new Date(ahora.getTime() - PoliticaDeAcceso.ventanaFallosMs));
    if (PoliticaDeAcceso.estaBloqueado(fallos)) throw new ErrorDeDominio("pin_bloqueado", "Demasiados intentos de PIN. Espera 15 minutos.");
    const hash = await this.d.repositorio.pinHash(usuarioId);
    if (!hash) throw new ErrorDeDominio("sin_pin", "Primero define tu PIN en Mi perfil.");
    const valido = await this.d.claves.verificar(hash, pin);
    await this.d.intentos.registrar(clave, valido);
    if (!valido) throw new ErrorDeDominio("pin_incorrecto", "PIN incorrecto.");
  }
}

/** Check-in: con lesión o dolor no se evalúa (se reprograma). El peso se toma en la misma báscula. */
export class RegistrarChequeo {
  constructor(private readonly d: DependenciasEvaluacion) {}

  async ejecutar(actor: Actor, sesionId: string, entrada: Chequeo & { pesoKg: number | null; estaturaCm: number | null }) {
    const s = await sesionAbierta(this.d, actor, sesionId);
    const chequeo = { lesionODolor: entrada.lesionODolor, durmioBien: entrada.durmioBien, comio3h: entrada.comio3h };
    if (!esApto(chequeo)) {
      await this.d.repositorio.guardarChequeo(actor.gimnasioId, sesionId, { chequeo, estado: "no_apta", pesoKg: null, division: null, medicion: null });
      await this.d.auditoria.registrar({ gimnasioId: actor.gimnasioId, usuarioId: actor.usuarioId, accion: "evaluacion.no_apta", entidad: "sesion_evaluacion", entidadId: sesionId, antes: null, despues: chequeo });
      return { apto: false };
    }
    if (entrada.pesoKg === null) throw new ErrorDeDominio("peso_requerido", "Registra el peso del día.");
    const pesoKg = validarPeso(entrada.pesoKg);
    const cliente = await this.d.repositorio.clienteParaEvaluar(actor.gimnasioId, s.clienteId);
    const division = cliente?.sexo ? (divisionPara(pesoKg, cliente.sexo, await this.d.repositorio.divisiones(actor.gimnasioId))?.nombre ?? null) : null;
    await this.d.repositorio.guardarChequeo(actor.gimnasioId, sesionId, {
      chequeo,
      estado: s.estado,
      pesoKg,
      division,
      medicion: {
        id: this.d.ids.nuevo(),
        clienteId: s.clienteId,
        fecha: Fecha.hoyEn(this.d.zonaHoraria, this.d.reloj.ahora()).valor,
        estaturaCm: entrada.estaturaCm === null ? null : validarEstatura(entrada.estaturaCm),
        registradoPor: actor.usuarioId,
      },
    });
    return { apto: true, division };
  }
}

export class GuardarCaptura {
  constructor(private readonly d: DependenciasEvaluacion) {}

  async ejecutar(actor: Actor, sesionId: string, testCodigo: string, captura: Captura) {
    const s = await sesionAbierta(this.d, actor, sesionId);
    if (!s.chequeoHecho) throw new ErrorDeDominio("sin_chequeo", "Primero haz el check-in y el pesaje.");
    const test = (await this.d.repositorio.bateria(actor.gimnasioId, s.bateriaId)).tests.find((t) => t.codigo === testCodigo);
    if (!test || test.formula === "rubrica") throw new ErrorDeDominio("test_no_valido", "Ese test no es de esta batería.");
    const limpia = captura.slice(0, test.intentos).map((intento) => {
      if (!intento) return null;
      const valores = Object.fromEntries(
        test.campos.map((c) => {
          const v = intento[c];
          if (v === null || v === undefined) return [c, null];
          if (!Number.isFinite(v) || v < 0 || v > 9999) throw new ErrorDeDominio("valor_invalido", "Revisa los valores capturados.");
          return [c, v];
        }),
      );
      return Object.values(valores).every((v) => v === null) ? null : valores;
    });
    await this.d.repositorio.guardarCaptura(actor.gimnasioId, sesionId, testCodigo, limpia);
  }
}

export class GuardarRubrica {
  constructor(private readonly d: DependenciasEvaluacion) {}

  async ejecutar(actor: Actor, sesionId: string, niveles: Map<string, number>, companero: { nombre: string; habitual: boolean }) {
    const s = await sesionAbierta(this.d, actor, sesionId);
    if (!s.chequeoHecho) throw new ErrorDeDominio("sin_chequeo", "Primero haz el check-in y el pesaje.");
    if (!companero.nombre.trim()) throw new ErrorDeDominio("sin_companero", "Indica quién fue el compañero de sparring.");
    const criterios = (await this.d.repositorio.bateria(actor.gimnasioId, s.bateriaId)).criterios;
    for (const [codigo, nivel] of niveles) {
      if (!criterios.some((c) => c.codigo === codigo) || ![0, 1, 2].includes(nivel)) throw new ErrorDeDominio("rubrica_invalida", "Revisa la rúbrica.");
    }
    await this.d.repositorio.guardarRubrica(actor.gimnasioId, sesionId, niveles, { nombre: companero.nombre.trim(), habitual: companero.habitual });
  }
}

/** Calcula, guarda la foto fija de los puntajes y publica. Una parcial se puede volver a cerrar al completar Estrategia. */
export class CerrarEvaluacion {
  constructor(private readonly d: DependenciasEvaluacion) {}

  async ejecutar(actor: Actor, sesionId: string): Promise<ResultadoSesion> {
    const s = await sesionAbierta(this.d, actor, sesionId);
    if (!s.chequeoHecho) throw new ErrorDeDominio("sin_chequeo", "Primero haz el check-in y el pesaje.");
    const r = this.d.repositorio;
    const [bateria, { capturas, rubrica }, bases, anteriores, previa] = await Promise.all([
      r.bateria(actor.gimnasioId, s.bateriaId),
      r.capturas(actor.gimnasioId, sesionId),
      r.lineasBase(actor.gimnasioId, s.clienteId),
      r.valoresAnteriores(actor.gimnasioId, s.clienteId, sesionId),
      r.tieneEvaluacionPrevia(actor.gimnasioId, s.clienteId, sesionId),
    ]);
    const resultado = calcularSesion({ tests: bateria.tests, criterios: bateria.criterios, capturas, rubrica, bases, anteriores, tieneEvaluacionPrevia: previa });
    if (resultado.pilares.every((p) => p.indice === null)) throw new ErrorDeDominio("sin_datos", "Captura al menos un pilar completo antes de cerrar.");
    await r.guardarResultado(actor.gimnasioId, sesionId, s.clienteId, resultado, resultado.nuevasBases.map(() => this.d.ids.nuevo()), this.d.reloj.ahora());
    await this.d.auditoria.registrar({
      gimnasioId: actor.gimnasioId,
      usuarioId: actor.usuarioId,
      accion: "evaluacion.cerrada",
      entidad: "sesion_evaluacion",
      entidadId: sesionId,
      antes: { estado: s.estado },
      despues: { estado: resultado.estado, pilares: Object.fromEntries(resultado.pilares.map((p) => [p.pilar, p.indice])) },
    });
    return resultado;
  }
}

/** Anular siempre con motivo (queda en la auditoría); así se puede repetir la del mes. */
export class AnularEvaluacion {
  constructor(private readonly d: DependenciasEvaluacion) {}

  async ejecutar(actor: Actor, sesionId: string, motivo: string) {
    await exigirEvaluador(this.d, actor);
    if (!motivo.trim()) throw new ErrorDeDominio("motivo_requerido", "Indica el motivo de la anulación.");
    const s = await this.d.repositorio.sesion(actor.gimnasioId, sesionId);
    if (!s) throw new ErrorDeDominio("sesion_no_encontrada", "No existe esa evaluación.");
    if (s.estado === "anulada") throw new ErrorDeDominio("ya_anulada", "Ya estaba anulada.");
    await this.d.repositorio.anular(actor.gimnasioId, sesionId, motivo.trim(), this.d.reloj.ahora());
    await this.d.auditoria.registrar({ gimnasioId: actor.gimnasioId, usuarioId: actor.usuarioId, accion: "evaluacion.anulada", entidad: "sesion_evaluacion", entidadId: sesionId, antes: { estado: s.estado }, despues: { estado: "anulada" }, motivo: motivo.trim() });
  }
}

/**
 * Reiniciar el punto de partida (regreso tras 3+ meses o una lesión): la siguiente evaluación vuelve a ser la inicial
 * y vale 100. Las evaluaciones anteriores se conservan en el historial.
 */
export class ReiniciarPuntoDePartida {
  constructor(private readonly d: DependenciasEvaluacion) {}

  async ejecutar(actor: Actor, clienteId: string, motivo: string) {
    await exigirEvaluador(this.d, actor);
    if (!motivo.trim()) throw new ErrorDeDominio("motivo_requerido", "Indica el motivo (ej. regreso tras lesión).");
    const cliente = await this.d.repositorio.clienteParaEvaluar(actor.gimnasioId, clienteId);
    if (!cliente) throw new ErrorDeDominio("cliente_no_encontrado", "No existe ese cliente.");
    const periodo = Fecha.hoyEn(this.d.zonaHoraria, this.d.reloj.ahora()).mes;
    const abierta = await this.d.repositorio.sesionDelMes(actor.gimnasioId, clienteId, periodo);
    if (abierta && (abierta.estado === "en_curso" || abierta.estado === "parcial")) {
      throw new ErrorDeDominio("sesion_abierta", "Tiene una evaluación abierta este mes. Ciérrala o anúlala antes de reiniciar.");
    }
    const id = this.d.ids.nuevo();
    await this.d.repositorio.reiniciar(actor.gimnasioId, { id, clienteId, motivo: motivo.trim(), por: actor.usuarioId, en: this.d.reloj.ahora() });
    await this.d.auditoria.registrar({
      gimnasioId: actor.gimnasioId,
      usuarioId: actor.usuarioId,
      accion: "evaluacion.punto_de_partida_reiniciado",
      entidad: "cliente",
      entidadId: clienteId,
      antes: null,
      despues: null,
      motivo: motivo.trim(),
    });
  }
}

import { ErrorDeDominio, SinPermiso } from "@/shared/domain/ErrorDeDominio";
import { Fecha } from "@/shared/domain/Fecha";
import type { Actor, Auditoria, Autorizacion, Cifrador, GeneradorDeIds, Reloj } from "@/shared/application/puertos";
import { listaDeDias, NOMBRE_DIA } from "../domain/Horario";
import { perfilCliente, perfilCoach } from "../domain/Perfiles";
import type { RepositorioOperacion } from "./puertos";

export const PERMISO_HORARIO = "horario.asignar";
export const PERMISO_ASIGNAR_CLIENTE = "cliente.asignar";
export const PERMISO_VER_CLIENTES = "cliente.ver_todos";

interface Dependencias {
  repositorio: RepositorioOperacion;
  autorizacion: Autorizacion;
  auditoria: Auditoria;
  reloj: Reloj;
  ids: GeneradorDeIds;
}

async function exigir(autorizacion: Autorizacion, actor: Actor, permiso: string) {
  if (!(await autorizacion.tienePermiso(actor, permiso))) throw new SinPermiso(permiso);
}

/** La administración pone a un coach en un día y franja. Puede haber varios coaches en la misma celda. */
export class AsignarTurno {
  constructor(private readonly d: Dependencias) {}

  async ejecutar(actor: Actor, solicitud: { coachId: string; franjaId: string; diaSemana: number; cupoMax: number | null }) {
    await exigir(this.d.autorizacion, actor, PERMISO_HORARIO);
    const coach = await this.d.repositorio.coach(actor.gimnasioId, solicitud.coachId);
    if (!coach) throw new ErrorDeDominio("coach_no_encontrado", "Ese coach no existe o no está aprobado.");
    const horario = await this.d.repositorio.horario(actor.gimnasioId);
    horario.validarNueva(solicitud);
    const turno = { id: this.d.ids.nuevo(), ...solicitud };
    await this.d.repositorio.agregarTurno(actor.gimnasioId, turno, actor.usuarioId);
    const franja = horario.franja(solicitud.franjaId)!;
    await this.d.auditoria.registrar({
      gimnasioId: actor.gimnasioId,
      usuarioId: actor.usuarioId,
      accion: "horario.turno_asignado",
      entidad: "asignacion_horario",
      entidadId: turno.id,
      antes: null,
      despues: { coach: coach.apodo, dia: NOMBRE_DIA[solicitud.diaSemana], franja: `${franja.inicio}–${franja.fin}`, cupoMax: solicitud.cupoMax },
    });
    return turno;
  }
}

export class QuitarTurno {
  constructor(private readonly d: Dependencias) {}

  async ejecutar(actor: Actor, asignacionId: string) {
    await exigir(this.d.autorizacion, actor, PERMISO_HORARIO);
    const cerrado = await this.d.repositorio.terminarTurno(actor.gimnasioId, asignacionId, this.d.reloj.ahora());
    if (!cerrado) throw new ErrorDeDominio("turno_no_encontrado", "Ese turno ya no está en el horario.");
    await this.d.auditoria.registrar({
      gimnasioId: actor.gimnasioId,
      usuarioId: actor.usuarioId,
      accion: "horario.turno_quitado",
      entidad: "asignacion_horario",
      entidadId: asignacionId,
      antes: cerrado,
      despues: null,
    });
  }
}

/**
 * Cambia el coach y la franja de un cliente. La franja es opcional; si se indica,
 * el coach debe dar clase en ella al menos un día. El cambio anterior queda en el historial.
 */
export class AsignarCliente {
  constructor(private readonly d: Dependencias) {}

  async ejecutar(actor: Actor, solicitud: { clienteId: string; coachId: string; franjaId: string | null; motivo: string }) {
    await exigir(this.d.autorizacion, actor, PERMISO_ASIGNAR_CLIENTE);
    const motivo = solicitud.motivo.trim();
    if (!motivo) throw new ErrorDeDominio("motivo_requerido", "Indica el motivo del cambio.");
    const actual = await this.d.repositorio.asignacionDeCliente(actor.gimnasioId, solicitud.clienteId);
    if (!actual) throw new ErrorDeDominio("cliente_no_encontrado", "No existe ese cliente.");
    const coach = await this.d.repositorio.coach(actor.gimnasioId, solicitud.coachId);
    if (!coach) throw new ErrorDeDominio("coach_no_encontrado", "Ese coach no existe o no está aprobado.");
    let dias: number[] = [];
    if (solicitud.franjaId) {
      const horario = await this.d.repositorio.horario(actor.gimnasioId);
      dias = horario.diasDe(solicitud.coachId, solicitud.franjaId);
      if (dias.length === 0) {
        throw new ErrorDeDominio("sin_turno", `Coach ${coach.apodo} no da clase en esa franja. Asígnale el turno primero en Horario.`);
      }
    }
    if (actual.coachId === solicitud.coachId && actual.franjaId === solicitud.franjaId) {
      throw new ErrorDeDominio("sin_cambios", "El cliente ya tiene ese coach y esa franja.");
    }
    const id = this.d.ids.nuevo();
    await this.d.repositorio.reasignarCliente(actor.gimnasioId, { id, ...solicitud, motivo, creadoPor: actor.usuarioId, en: this.d.reloj.ahora() });
    await this.d.auditoria.registrar({
      gimnasioId: actor.gimnasioId,
      usuarioId: actor.usuarioId,
      accion: "cliente.reasignado",
      entidad: "cliente",
      entidadId: solicitud.clienteId,
      antes: { coachId: actual.coachId, franjaId: actual.franjaId },
      despues: { coachId: solicitud.coachId, franjaId: solicitud.franjaId, dias: listaDeDias(dias) },
      motivo,
    });
  }
}

/** El cliente edita su perfil; la administración también puede. Lo sensible se guarda cifrado. */
export class ActualizarPerfilCliente {
  constructor(
    private readonly d: Dependencias,
    private readonly cifrador: Cifrador,
    private readonly zonaHoraria: string,
  ) {}

  async ejecutar(
    actor: Actor,
    clienteId: string,
    entrada: { fechaNacimiento: string; contactoEmergencia: string; notasMedicas: string; sexo?: "F" | "M" | "" },
  ) {
    const asignacion = await this.d.repositorio.asignacionDeCliente(actor.gimnasioId, clienteId);
    if (!asignacion) throw new ErrorDeDominio("cliente_no_encontrado", "No existe ese cliente.");
    const esElCliente = asignacion.usuarioClienteId === actor.usuarioId;
    if (!esElCliente) await exigir(this.d.autorizacion, actor, PERMISO_VER_CLIENTES);

    const perfil = perfilCliente(entrada, Fecha.hoyEn(this.zonaHoraria, this.d.reloj.ahora()));
    await this.d.repositorio.guardarPerfilCliente(
      actor.gimnasioId,
      clienteId,
      {
        fechaNacimiento: perfil.fechaNacimiento?.valor ?? null,
        contactoCifrado: perfil.contactoEmergencia && this.cifrador.cifrar(perfil.contactoEmergencia),
        notasCifradas: perfil.notasMedicas && this.cifrador.cifrar(perfil.notasMedicas),
        sexo: entrada.sexo === "F" || entrada.sexo === "M" ? entrada.sexo : null,
      },
      actor.usuarioId,
    );
    // En la auditoría solo va qué se llenó, nunca los datos médicos.
    await this.d.auditoria.registrar({
      gimnasioId: actor.gimnasioId,
      usuarioId: actor.usuarioId,
      accion: "cliente.perfil_actualizado",
      entidad: "cliente",
      entidadId: clienteId,
      antes: null,
      despues: {
        fechaNacimiento: perfil.fechaNacimiento !== null,
        contactoEmergencia: perfil.contactoEmergencia !== null,
        notasMedicas: perfil.notasMedicas !== null,
        porElCliente: esElCliente,
      },
    });
  }
}

export class ActualizarPerfilCoach {
  constructor(private readonly d: Dependencias) {}

  async ejecutar(actor: Actor, entrada: { bio: string; especialidad: string }) {
    const coach = await this.d.repositorio.coachDelUsuario(actor.gimnasioId, actor.usuarioId);
    if (!coach) throw new ErrorDeDominio("no_es_coach", "Solo los coaches tienen este perfil.");
    const perfil = perfilCoach(entrada);
    await this.d.repositorio.guardarPerfilCoach(actor.gimnasioId, coach.id, perfil);
    await this.d.auditoria.registrar({
      gimnasioId: actor.gimnasioId,
      usuarioId: actor.usuarioId,
      accion: "coach.perfil_actualizado",
      entidad: "coach",
      entidadId: coach.id,
      antes: null,
      despues: perfil,
    });
  }
}

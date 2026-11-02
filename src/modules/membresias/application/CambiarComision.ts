import { ErrorDeDominio, SinPermiso } from "@/shared/domain/ErrorDeDominio";
import { Fecha } from "@/shared/domain/Fecha";
import { Porcentaje } from "@/shared/domain/Porcentaje";
import type { Actor, Auditoria, Autorizacion, GeneradorDeIds, Reloj } from "@/shared/application/puertos";
import { AcuerdoComision } from "../domain/AcuerdoComision";
import type { RepositorioAcuerdosComision } from "./puertos";

export const PERMISO_CAMBIAR_COMISION = "comision.cambiar";

export interface SolicitudCambioComision {
  /** null = comisión general del gimnasio. */
  coachId: string | null;
  porcentaje: number;
  vigenteDesde: string;
  motivo: string;
}

/**
 * La administración mueve la comisión general o la de un coach.
 * Nunca es retroactiva: aplica a pagos confirmados desde la fecha indicada (hoy o después),
 * y el acuerdo anterior queda en el historial.
 */
export class CambiarComision {
  constructor(
    private readonly repositorio: RepositorioAcuerdosComision,
    private readonly autorizacion: Autorizacion,
    private readonly auditoria: Auditoria,
    private readonly reloj: Reloj,
    private readonly ids: GeneradorDeIds,
    private readonly zonaHoraria: string,
  ) {}

  async ejecutar(actor: Actor, solicitud: SolicitudCambioComision): Promise<AcuerdoComision> {
    if (!(await this.autorizacion.tienePermiso(actor, PERMISO_CAMBIAR_COMISION))) {
      throw new SinPermiso(PERMISO_CAMBIAR_COMISION);
    }

    const desde = Fecha.de(solicitud.vigenteDesde);
    const hoy = Fecha.hoyEn(this.zonaHoraria, this.reloj.ahora());
    if (desde.esAntesDe(hoy)) {
      throw new ErrorDeDominio("comision_retroactiva", "El cambio de comisión aplica desde hoy en adelante, no hacia atrás.");
    }

    const nuevo = AcuerdoComision.crear({
      id: this.ids.nuevo(),
      gimnasioId: actor.gimnasioId,
      coachId: solicitud.coachId,
      porcentaje: Porcentaje.de(solicitud.porcentaje),
      vigenteDesde: desde,
      vigenteHasta: null,
      motivo: solicitud.motivo,
      creadoPor: actor.usuarioId,
    });

    const mismoAlcance = (await this.repositorio.delGimnasio(actor.gimnasioId)).filter(
      (a) => a.coachId === solicitud.coachId,
    );
    const cancelados = mismoAlcance.filter((a) => !a.vigenteDesde.esAntesDe(desde));
    const cerrados = mismoAlcance.filter((a) => a.vigenteDesde.esAntesDe(desde) && a.aplicaEl(desde));
    const anteriores = cerrados.map((a) => a.instantanea());
    cerrados.forEach((a) => a.cerrarAntesDe(desde));

    await this.repositorio.aplicarCambio({ nuevo, cerrados, cancelados });
    await this.auditoria.registrar({
      gimnasioId: actor.gimnasioId,
      usuarioId: actor.usuarioId,
      accion: "comision.cambiada",
      entidad: "acuerdo_comision",
      entidadId: nuevo.id,
      antes: { vigentes: anteriores, cancelados: cancelados.map((a) => a.instantanea()) },
      despues: nuevo.instantanea(),
      motivo: nuevo.motivo,
    });
    return nuevo;
  }
}

import { Dinero } from "@/shared/domain/Dinero";
import { ErrorDeDominio } from "@/shared/domain/ErrorDeDominio";
import { Fecha } from "@/shared/domain/Fecha";
import { AcuerdoComision } from "./AcuerdoComision";

/**
 * Decide qué acuerdo aplica a un pago: primero la excepción del coach, si no la comisión general.
 * Cuenta la fecha en que se confirma el pago, así un cambio nunca altera comisiones ya generadas.
 */
export class PoliticaComision {
  constructor(private readonly acuerdos: readonly AcuerdoComision[]) {}

  acuerdoPara(coachId: string, fechaConfirmacion: Fecha): AcuerdoComision {
    const vigentes = this.acuerdos.filter((a) => a.aplicaEl(fechaConfirmacion));
    const delCoach = vigentes.find((a) => a.coachId === coachId);
    const general = vigentes.find((a) => a.esGeneral());
    const acuerdo = delCoach ?? general;
    if (!acuerdo) {
      throw new ErrorDeDominio("sin_comision", `No hay comisión vigente el ${fechaConfirmacion} para este coach.`);
    }
    return acuerdo;
  }

  calcular(coachId: string, monto: Dinero, fechaConfirmacion: Fecha): { acuerdo: AcuerdoComision; comision: Dinero } {
    const acuerdo = this.acuerdoPara(coachId, fechaConfirmacion);
    return { acuerdo, comision: monto.porPuntosBase(acuerdo.porcentaje.puntosBase) };
  }
}

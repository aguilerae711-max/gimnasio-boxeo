import { ErrorDeDominio } from "@/shared/domain/ErrorDeDominio";
import { Fecha } from "@/shared/domain/Fecha";
import { Porcentaje } from "@/shared/domain/Porcentaje";

/**
 * Porcentaje de comisión vigente en un periodo.
 * Sin coach es la comisión general del gimnasio; con coach, la excepción para ese coach.
 */
export interface DatosAcuerdoComision {
  id: string;
  gimnasioId: string;
  coachId: string | null;
  porcentaje: Porcentaje;
  vigenteDesde: Fecha;
  vigenteHasta: Fecha | null;
  motivo: string;
  creadoPor: string;
}

export class AcuerdoComision {
  private constructor(private datos: DatosAcuerdoComision) {}

  static crear(datos: DatosAcuerdoComision): AcuerdoComision {
    if (datos.motivo.trim().length === 0) {
      throw new ErrorDeDominio("motivo_requerido", "Indica el motivo del cambio de comisión.");
    }
    if (datos.vigenteHasta && datos.vigenteHasta.esAntesDe(datos.vigenteDesde)) {
      throw new ErrorDeDominio("vigencia_invalida", "La vigencia no puede terminar antes de empezar.");
    }
    return new AcuerdoComision({ ...datos, motivo: datos.motivo.trim() });
  }

  get id() { return this.datos.id; }
  get gimnasioId() { return this.datos.gimnasioId; }
  get coachId() { return this.datos.coachId; }
  get porcentaje() { return this.datos.porcentaje; }
  get vigenteDesde() { return this.datos.vigenteDesde; }
  get vigenteHasta() { return this.datos.vigenteHasta; }
  get motivo() { return this.datos.motivo; }
  get creadoPor() { return this.datos.creadoPor; }

  esGeneral(): boolean {
    return this.datos.coachId === null;
  }

  aplicaEl(fecha: Fecha): boolean {
    const despuesDelInicio = !fecha.esAntesDe(this.datos.vigenteDesde);
    const antesDelFin = this.datos.vigenteHasta === null || !this.datos.vigenteHasta.esAntesDe(fecha);
    return despuesDelInicio && antesDelFin;
  }

  /** Cierra la vigencia el día anterior a que empiece el acuerdo que lo reemplaza. */
  cerrarAntesDe(inicioDelSiguiente: Fecha): void {
    this.datos = { ...this.datos, vigenteHasta: inicioDelSiguiente.sumarDias(-1) };
  }

  instantanea(): Readonly<DatosAcuerdoComision> {
    return { ...this.datos };
  }
}

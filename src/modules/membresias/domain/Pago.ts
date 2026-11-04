import { Dinero } from "@/shared/domain/Dinero";
import { ErrorDeDominio } from "@/shared/domain/ErrorDeDominio";
import { Fecha } from "@/shared/domain/Fecha";
import { finDelPeriodo, type DatosPlan } from "./Plan";
import type { PoliticaComision } from "./PoliticaComision";

export type EstadoPago = "reportado" | "confirmado" | "rechazado";
export type MetodoPago = "efectivo" | "transferencia" | "tarjeta";
/** Quién tiene el dinero: la administración o el coach (que luego lo cuadra a fin de mes). */
export type Receptor = "administracion" | "coach";

export interface DatosPago {
  id: string;
  gimnasioId: string;
  clienteId: string;
  /** Coach del cliente al pagar: a él le toca la comisión. */
  coachClienteId: string;
  planId: string;
  monto: Dinero;
  fechaPago: Fecha;
  metodo: MetodoPago;
  recibidoPor: Receptor;
  /** Coach que recibió el dinero, si lo recibió un coach. */
  coachReceptorId: string | null;
  esCargaInicial: boolean;
  estado: EstadoPago;
  periodoDesde: Fecha | null;
  periodoHasta: Fecha | null;
  fechaConfirmacion: Fecha | null;
  comisionPuntosBase: number | null;
  comision: Dinero | null;
  motivoRechazo: string | null;
}

/**
 * Un pago entra reportado (por el coach) o ya confirmado (si lo registra la administración).
 * Al confirmarse se fija el periodo que cubre y la comisión del coach; después ya no cambian.
 */
export class Pago {
  private constructor(private datos: DatosPago) {}

  static nuevo(datos: Omit<DatosPago, "estado" | "periodoDesde" | "periodoHasta" | "fechaConfirmacion" | "comisionPuntosBase" | "comision" | "motivoRechazo">, hoy: Fecha): Pago {
    if (datos.monto.centavos === 0) throw new ErrorDeDominio("monto_cero", "El monto debe ser mayor a cero.");
    if (hoy.esAntesDe(datos.fechaPago)) throw new ErrorDeDominio("pago_futuro", "La fecha del pago no puede ser posterior a hoy.");
    if (!datos.esCargaInicial && datos.fechaPago.diasHasta(hoy) > 60) {
      throw new ErrorDeDominio("pago_antiguo", "Ese pago tiene más de 60 días. Si es el pago vigente de un cliente actual, márcalo como carga inicial.");
    }
    if ((datos.recibidoPor === "coach") !== (datos.coachReceptorId !== null)) {
      throw new ErrorDeDominio("receptor", "Indica qué coach recibió el dinero.");
    }
    return new Pago({
      ...datos,
      estado: "reportado",
      periodoDesde: null,
      periodoHasta: null,
      fechaConfirmacion: null,
      comisionPuntosBase: null,
      comision: null,
      motivoRechazo: null,
    });
  }

  static desde(datos: DatosPago): Pago {
    return new Pago(datos);
  }

  /**
   * El periodo corre desde la fecha del pago; si el cliente aún tenía días pagados, empieza al día siguiente
   * de que terminen (así pagar antes no le quita días). La carga inicial no genera comisión.
   */
  confirmar(hoy: Fecha, plan: Pick<DatosPlan, "unidad" | "cantidad">, finVigente: Fecha | null, politica: PoliticaComision): void {
    if (this.datos.estado !== "reportado") throw new ErrorDeDominio("pago_revisado", "Este pago ya fue revisado.");
    const desde = finVigente && !finVigente.esAntesDe(this.datos.fechaPago) ? finVigente.sumarDias(1) : this.datos.fechaPago;
    const { acuerdo, comision } = this.datos.esCargaInicial
      ? { acuerdo: null, comision: Dinero.deCentavos(0) }
      : politica.calcular(this.datos.coachClienteId, this.datos.monto, hoy);
    this.datos = {
      ...this.datos,
      estado: "confirmado",
      periodoDesde: desde,
      periodoHasta: finDelPeriodo(desde, plan),
      fechaConfirmacion: hoy,
      comisionPuntosBase: acuerdo?.porcentaje.puntosBase ?? 0,
      comision,
    };
  }

  rechazar(motivo: string, hoy: Fecha): void {
    if (this.datos.estado !== "reportado") throw new ErrorDeDominio("pago_revisado", "Este pago ya fue revisado.");
    if (!motivo.trim()) throw new ErrorDeDominio("motivo_requerido", "Indica por qué se rechaza el pago.");
    this.datos = { ...this.datos, estado: "rechazado", motivoRechazo: motivo.trim(), fechaConfirmacion: hoy };
  }

  get id() {
    return this.datos.id;
  }
  get estado() {
    return this.datos.estado;
  }
  instantanea(): Readonly<DatosPago> {
    return { ...this.datos };
  }
}

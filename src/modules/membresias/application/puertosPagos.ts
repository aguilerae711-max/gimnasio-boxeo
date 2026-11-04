import type { Fecha } from "@/shared/domain/Fecha";
import type { CuadreCoach, PagoConfirmado, TarifaSistema } from "../domain/Cuentas";
import type { Pago } from "../domain/Pago";
import type { DatosPlan } from "../domain/Plan";

export interface ClienteParaPago {
  clienteId: string;
  /** Coach actual del cliente: le toca la comisión. */
  coachId: string;
  estado: "pendiente" | "activo" | "rechazado" | "baja";
}

export interface RepositorioPagos {
  planes(gimnasioId: string): Promise<DatosPlan[]>;
  guardarPlan(gimnasioId: string, plan: DatosPlan): Promise<void>;

  clienteParaPago(gimnasioId: string, clienteId: string): Promise<ClienteParaPago | null>;
  coachDelUsuario(gimnasioId: string, usuarioId: string): Promise<{ id: string } | null>;

  pago(gimnasioId: string, pagoId: string): Promise<Pago | null>;
  /** Último día pagado (confirmado) del cliente, o null. */
  finVigente(gimnasioId: string, clienteId: string): Promise<Fecha | null>;
  guardarNuevo(pago: Pago, extra: { comprobanteRuta: string | null; nota: string | null; reportadoPor: string; revisadoPor: string | null }): Promise<void>;
  guardarRevision(pago: Pago, revisadoPor: string): Promise<void>;

  confirmadosDelMes(gimnasioId: string, mes: string): Promise<PagoConfirmado[]>;
  cuadreCerrado(gimnasioId: string, coachId: string, mes: string): Promise<boolean>;
  cerrarCuadre(gimnasioId: string, cierre: { id: string; coachId: string; mes: string; cuadre: CuadreCoach; nota: string | null; cerradoPor: string }): Promise<void>;

  tarifas(gimnasioId: string): Promise<TarifaSistema[]>;
  agregarTarifa(gimnasioId: string, tarifa: TarifaSistema & { id: string; motivo: string; creadoPor: string }): Promise<void>;
}

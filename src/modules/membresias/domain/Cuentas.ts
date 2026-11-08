import { Dinero } from "@/shared/domain/Dinero";
import { ErrorDeDominio } from "@/shared/domain/ErrorDeDominio";
import { Fecha } from "@/shared/domain/Fecha";

/** Lo que importa de un pago confirmado para membresías y cuentas. */
export interface PagoConfirmado {
  coachClienteId: string;
  coachReceptorId: string | null;
  monto: Dinero;
  comision: Dinero;
  esCargaInicial: boolean;
  fechaConfirmacion: Fecha;
  periodoDesde: Fecha;
  periodoHasta: Fecha;
}

export type EstadoMembresia = "activo" | "por_vencer" | "vencido" | "sin_pago";
export const DIAS_AVISO_VENCIMIENTO = 5;

/** Activo, por vencer (5 días o menos), vencido o sin pago, según los periodos ya confirmados. */
export function estadoMembresia(periodos: readonly { periodoDesde: Fecha; periodoHasta: Fecha }[], hoy: Fecha) {
  if (periodos.length === 0) return { estado: "sin_pago" as EstadoMembresia, vence: null, diasRestantes: null };
  const vence = periodos.map((p) => p.periodoHasta).reduce((a, b) => (a.esAntesDe(b) ? b : a));
  const diasRestantes = hoy.diasHasta(vence) + 1;
  const vigente = periodos.some((p) => !hoy.esAntesDe(p.periodoDesde) && !p.periodoHasta.esAntesDe(hoy));
  const estado: EstadoMembresia = !vigente && diasRestantes <= 0 ? "vencido" : diasRestantes <= DIAS_AVISO_VENCIMIENTO ? "por_vencer" : "activo";
  return { estado, vence, diasRestantes: Math.max(diasRestantes, 0) };
}

/** Con cuántos días de anticipación se avisa al coach y a la administración. */
export const DIAS_AVISO_ANTICIPADO = 7;

/**
 * Hasta cuándo tiene pagado y cuántos días le quedan, contando hoy (0 o menos: vencida).
 * Sin pagos: vence y dias en null.
 */
export function situacionDePago(periodos: readonly { periodoHasta: Fecha }[], hoy: Fecha): { vence: Fecha | null; dias: number | null } {
  if (periodos.length === 0) return { vence: null, dias: null };
  const vence = periodos.map((p) => p.periodoHasta).reduce((a, b) => (a.esAntesDe(b) ? b : a));
  return { vence, dias: hoy.diasHasta(vence) + 1 };
}

/**
 * De quienes se les venció la membresía en el mes (ya pasó la fecha), quién renovó y quién no.
 * Renovó si tiene un periodo pagado que termina después del que se le venció.
 */
export function renovacionesDelMes(periodosPorCliente: ReadonlyMap<string, readonly { periodoHasta: Fecha }[]>, mes: string, hoy: Fecha) {
  const renovaron: string[] = [];
  const sinRenovar: string[] = [];
  for (const [clienteId, periodos] of periodosPorCliente) {
    const vencidos = periodos.filter((p) => p.periodoHasta.mes === mes && p.periodoHasta.esAntesDe(hoy));
    if (vencidos.length === 0) continue;
    const ultimoVencido = vencidos.map((p) => p.periodoHasta).reduce((a, b) => (a.esAntesDe(b) ? b : a));
    (periodos.some((p) => ultimoVencido.esAntesDe(p.periodoHasta)) ? renovaron : sinRenovar).push(clienteId);
  }
  return { renovaron, sinRenovar };
}

export interface CuadreCoach {
  /** Comisiones de sus clientes por pagos confirmados en el mes. */
  comisiones: Dinero;
  /** Dinero que cobró él y tiene en su mano. */
  cobrosEnMano: Dinero;
  /** Positivo: la administración le paga. Negativo: él entrega a la administración. En centavos. */
  saldoCentavos: number;
}

/** Cuadre mensual con un coach: cuenta lo confirmado en ese mes (por fecha de confirmación). */
export function cuadreDelMes(pagos: readonly PagoConfirmado[], coachId: string, mes: string): CuadreCoach {
  const delMes = pagos.filter((p) => p.fechaConfirmacion.mes === mes);
  const suma = (lista: readonly PagoConfirmado[], campo: "monto" | "comision") =>
    lista.reduce((t, p) => t.sumar(p[campo]), Dinero.deCentavos(0));
  const comisiones = suma(delMes.filter((p) => p.coachClienteId === coachId && !p.esCargaInicial), "comision");
  // La carga inicial no cuenta: es dinero que se cobró antes de usar el sistema.
  const cobrosEnMano = suma(delMes.filter((p) => p.coachReceptorId === coachId && !p.esCargaInicial), "monto");
  return { comisiones, cobrosEnMano, saldoCentavos: comisiones.centavos - cobrosEnMano.centavos };
}

/** Ingresos del gimnasio en el mes: pagos confirmados, sin la carga inicial. */
export function ingresosDelMes(pagos: readonly PagoConfirmado[], mes: string): Dinero {
  return pagos
    .filter((p) => p.fechaConfirmacion.mes === mes && !p.esCargaInicial)
    .reduce((t, p) => t.sumar(p.monto), Dinero.deCentavos(0));
}

export type TipoTarifa = "porcentaje" | "cuota_fija";

export interface TarifaSistema {
  tipo: TipoTarifa;
  puntosBase: number;
  cuotaFija: Dinero;
  vigenteDesde: Fecha;
}

/** Lo que el gimnasio debe al sistema en el mes: un porcentaje de sus ingresos o una cuota fija. Hoy es 0%. */
export function cargoDelSistema(tarifas: readonly TarifaSistema[], mes: string, ingresos: Dinero): { tarifa: TarifaSistema | null; cargo: Dinero } {
  const finDeMes = Fecha.de(`${mes}-01`).sumarMeses(1).sumarDias(-1);
  const tarifa =
    [...tarifas].filter((t) => !finDeMes.esAntesDe(t.vigenteDesde)).sort((a, b) => a.vigenteDesde.valor.localeCompare(b.vigenteDesde.valor)).at(-1) ??
    null;
  if (!tarifa) return { tarifa: null, cargo: Dinero.deCentavos(0) };
  return { tarifa, cargo: tarifa.tipo === "porcentaje" ? ingresos.porPuntosBase(tarifa.puntosBase) : tarifa.cuotaFija };
}

export function validarTarifa(t: { tipo: TipoTarifa; puntosBase: number; cuotaFija: Dinero }): void {
  if (t.tipo === "porcentaje" && (t.puntosBase < 0 || t.puntosBase > 5_000)) {
    throw new ErrorDeDominio("tarifa_invalida", "El porcentaje del sistema debe estar entre 0% y 50%.");
  }
}

/** Solo se cierran meses que ya terminaron, para no dejar fuera pagos que aún pueden confirmarse. */
export function validarMesCerrable(mes: string, hoy: Fecha): void {
  if (!/^\d{4}-\d{2}$/.test(mes) || mes >= hoy.mes) {
    throw new ErrorDeDominio("mes_abierto", "Solo se pueden cuadrar meses que ya terminaron.");
  }
}

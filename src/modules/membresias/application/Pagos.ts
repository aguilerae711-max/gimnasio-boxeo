import { Dinero } from "@/shared/domain/Dinero";
import { ErrorDeDominio, SinPermiso } from "@/shared/domain/ErrorDeDominio";
import { Fecha } from "@/shared/domain/Fecha";
import type { Actor, Almacenamiento, Auditoria, Autorizacion, GeneradorDeIds, Reloj } from "@/shared/application/puertos";
import { cuadreDelMes, validarMesCerrable, validarTarifa, type TipoTarifa } from "../domain/Cuentas";
import { Pago, type MetodoPago, type Receptor } from "../domain/Pago";
import { crearPlan, type UnidadPlan } from "../domain/Plan";
import { PoliticaComision } from "../domain/PoliticaComision";
import type { RepositorioAcuerdosComision } from "./puertos";
import type { RepositorioPagos } from "./puertosPagos";

export const PERMISO_REPORTAR = "pago.reportar";
export const PERMISO_CONFIRMAR = "pago.confirmar";
export const PERMISO_CONFIGURAR = "gimnasio.configurar";
export const PERMISO_CUADRE = "cuadre.cerrar";
export const PERMISO_SISTEMA = "sistema.administrar";

const TIPOS_COMPROBANTE: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };
export const TAMANO_MAXIMO_COMPROBANTE = 5 * 1024 * 1024;

export interface DependenciasPagos {
  pagos: RepositorioPagos;
  acuerdos: RepositorioAcuerdosComision;
  autorizacion: Autorizacion;
  auditoria: Auditoria;
  reloj: Reloj;
  ids: GeneradorDeIds;
  zonaHoraria: string;
}

const hoyDe = (d: DependenciasPagos) => Fecha.hoyEn(d.zonaHoraria, d.reloj.ahora());
const puede = (d: DependenciasPagos, actor: Actor, permiso: string) => d.autorizacion.tienePermiso(actor, permiso);
async function exigir(d: DependenciasPagos, actor: Actor, permiso: string) {
  if (!(await puede(d, actor, permiso))) throw new SinPermiso(permiso);
}

export class GuardarPlan {
  constructor(private readonly d: DependenciasPagos) {}

  async ejecutar(actor: Actor, s: { id?: string; nombre: string; precioPesos: number; unidad: UnidadPlan; cantidad: number; activo: boolean }) {
    await exigir(this.d, actor, PERMISO_CONFIGURAR);
    const plan = crearPlan({ id: s.id ?? this.d.ids.nuevo(), nombre: s.nombre, precio: Dinero.dePesos(s.precioPesos), unidad: s.unidad, cantidad: s.cantidad, activo: s.activo });
    await this.d.pagos.guardarPlan(actor.gimnasioId, plan);
    await this.d.auditoria.registrar({
      gimnasioId: actor.gimnasioId,
      usuarioId: actor.usuarioId,
      accion: s.id ? "plan.cambiado" : "plan.creado",
      entidad: "plan_membresia",
      entidadId: plan.id,
      antes: null,
      despues: { nombre: plan.nombre, precio: plan.precio.centavos, unidad: plan.unidad, cantidad: plan.cantidad, activo: plan.activo },
    });
    return plan;
  }
}

export interface SolicitudPago {
  clienteId: string;
  planId: string;
  montoPesos: number;
  fechaPago: string;
  metodo: MetodoPago;
  recibidoPor: Receptor;
  /** Solo la administración lo indica; si reporta un coach, es él mismo. */
  coachReceptorId?: string | null;
  esCargaInicial?: boolean;
  nota?: string;
  comprobante?: { contenido: Uint8Array; tipo: string } | null;
}

/**
 * Dos caminos: el coach reporta un pago de su cliente (queda por confirmar), o la administración
 * lo registra y queda confirmado de una vez. Si lo cobró un coach, el dinero se cuadra a fin de mes.
 */
export class RegistrarPago {
  constructor(
    private readonly d: DependenciasPagos,
    private readonly archivos: Almacenamiento,
  ) {}

  async ejecutar(actor: Actor, s: SolicitudPago) {
    const esAdministracion = await puede(this.d, actor, PERMISO_CONFIRMAR);
    if (!esAdministracion) await exigir(this.d, actor, PERMISO_REPORTAR);

    const cliente = await this.d.pagos.clienteParaPago(actor.gimnasioId, s.clienteId);
    if (!cliente || cliente.estado === "rechazado" || cliente.estado === "baja") {
      throw new ErrorDeDominio("cliente_no_valido", "Ese cliente no existe o no está activo.");
    }
    let coachReceptorId = s.recibidoPor === "coach" ? (s.coachReceptorId ?? null) : null;
    if (!esAdministracion) {
      const yo = await this.d.pagos.coachDelUsuario(actor.gimnasioId, actor.usuarioId);
      if (!yo || yo.id !== cliente.coachId) throw new ErrorDeDominio("no_es_tu_cliente", "Solo puedes reportar pagos de tus clientes.");
      if (s.esCargaInicial) throw new ErrorDeDominio("carga_inicial", "La carga inicial la registra la administración.");
      if (s.recibidoPor === "coach") coachReceptorId = yo.id;
    }
    const plan = (await this.d.pagos.planes(actor.gimnasioId)).find((p) => p.id === s.planId && p.activo);
    if (!plan) throw new ErrorDeDominio("plan_no_valido", "Elige un plan vigente.");

    const hoy = hoyDe(this.d);
    const pago = Pago.nuevo(
      {
        id: this.d.ids.nuevo(),
        gimnasioId: actor.gimnasioId,
        clienteId: cliente.clienteId,
        coachClienteId: cliente.coachId,
        planId: plan.id,
        monto: Dinero.dePesos(s.montoPesos),
        fechaPago: Fecha.de(s.fechaPago),
        metodo: s.metodo,
        recibidoPor: s.recibidoPor,
        coachReceptorId,
        esCargaInicial: Boolean(s.esCargaInicial),
      },
      hoy,
    );
    if (esAdministracion) {
      const politica = new PoliticaComision(await this.d.acuerdos.delGimnasio(actor.gimnasioId));
      pago.confirmar(hoy, plan, await this.d.pagos.finVigente(actor.gimnasioId, cliente.clienteId), politica);
    }

    let comprobanteRuta: string | null = null;
    if (s.comprobante && s.comprobante.contenido.byteLength > 0) {
      const extension = TIPOS_COMPROBANTE[s.comprobante.tipo];
      if (!extension) throw new ErrorDeDominio("comprobante_tipo", "El comprobante debe ser foto (JPG, PNG, WEBP) o PDF.");
      if (s.comprobante.contenido.byteLength > TAMANO_MAXIMO_COMPROBANTE) throw new ErrorDeDominio("comprobante_grande", "El comprobante pesa más de 5 MB.");
      comprobanteRuta = `comprobantes/${actor.gimnasioId}/${pago.id}.${extension}`;
      await this.archivos.guardar(comprobanteRuta, s.comprobante.contenido, s.comprobante.tipo);
    }

    await this.d.pagos.guardarNuevo(pago, {
      comprobanteRuta,
      nota: s.nota?.trim() || null,
      reportadoPor: actor.usuarioId,
      revisadoPor: esAdministracion ? actor.usuarioId : null,
    });
    const p = pago.instantanea();
    await this.d.auditoria.registrar({
      gimnasioId: actor.gimnasioId,
      usuarioId: actor.usuarioId,
      accion: esAdministracion ? "pago.registrado" : "pago.reportado",
      entidad: "pago",
      entidadId: p.id,
      antes: null,
      despues: {
        cliente: p.clienteId,
        monto: p.monto.centavos,
        fechaPago: p.fechaPago.valor,
        recibidoPor: p.recibidoPor,
        cargaInicial: p.esCargaInicial,
        periodo: p.periodoDesde ? `${p.periodoDesde.valor}/${p.periodoHasta?.valor}` : null,
        comision: p.comision?.centavos ?? null,
      },
    });
    return pago;
  }
}

export class RevisarPago {
  constructor(private readonly d: DependenciasPagos) {}

  async ejecutar(actor: Actor, pagoId: string, decision: "confirmar" | "rechazar", motivo = "") {
    await exigir(this.d, actor, PERMISO_CONFIRMAR);
    const pago = await this.d.pagos.pago(actor.gimnasioId, pagoId);
    if (!pago) throw new ErrorDeDominio("pago_no_encontrado", "No existe ese pago.");
    const hoy = hoyDe(this.d);
    const datos = pago.instantanea();
    if (decision === "confirmar") {
      const plan = (await this.d.pagos.planes(actor.gimnasioId)).find((p) => p.id === datos.planId);
      if (!plan) throw new ErrorDeDominio("plan_no_valido", "El plan de este pago ya no existe.");
      const politica = new PoliticaComision(await this.d.acuerdos.delGimnasio(actor.gimnasioId));
      pago.confirmar(hoy, plan, await this.d.pagos.finVigente(actor.gimnasioId, datos.clienteId), politica);
    } else {
      pago.rechazar(motivo, hoy);
    }
    await this.d.pagos.guardarRevision(pago, actor.usuarioId);
    const p = pago.instantanea();
    await this.d.auditoria.registrar({
      gimnasioId: actor.gimnasioId,
      usuarioId: actor.usuarioId,
      accion: decision === "confirmar" ? "pago.confirmado" : "pago.rechazado",
      entidad: "pago",
      entidadId: p.id,
      antes: { estado: "reportado" },
      despues: { estado: p.estado, periodo: p.periodoDesde ? `${p.periodoDesde.valor}/${p.periodoHasta?.valor}` : null, comision: p.comision?.centavos ?? null },
      motivo: p.motivoRechazo ?? undefined,
    });
    return pago;
  }
}

/** Cierra el mes con un coach: se guarda la foto del cuadre y ya no se recalcula. */
export class CerrarCuadre {
  constructor(private readonly d: DependenciasPagos) {}

  async ejecutar(actor: Actor, coachId: string, mes: string, nota = "") {
    await exigir(this.d, actor, PERMISO_CUADRE);
    validarMesCerrable(mes, hoyDe(this.d));
    if (await this.d.pagos.cuadreCerrado(actor.gimnasioId, coachId, mes)) {
      throw new ErrorDeDominio("cuadre_cerrado", "Ese mes ya está cuadrado con este coach.");
    }
    const cuadre = cuadreDelMes(await this.d.pagos.confirmadosDelMes(actor.gimnasioId, mes), coachId, mes);
    const id = this.d.ids.nuevo();
    await this.d.pagos.cerrarCuadre(actor.gimnasioId, { id, coachId, mes, cuadre, nota: nota.trim() || null, cerradoPor: actor.usuarioId });
    await this.d.auditoria.registrar({
      gimnasioId: actor.gimnasioId,
      usuarioId: actor.usuarioId,
      accion: "cuadre.cerrado",
      entidad: "cuadre_coach",
      entidadId: id,
      antes: null,
      despues: { coachId, mes, comisiones: cuadre.comisiones.centavos, cobros: cuadre.cobrosEnMano.centavos, saldo: cuadre.saldoCentavos },
      motivo: nota.trim() || undefined,
    });
    return cuadre;
  }
}

/** Solo el superadmin cambia la cuota del sistema, y siempre desde el primer día de un mes futuro. */
export class CambiarTarifaSistema {
  constructor(private readonly d: DependenciasPagos) {}

  async ejecutar(actor: Actor, s: { tipo: TipoTarifa; porcentaje: number; cuotaPesos: number; desdeMes: string; motivo: string }) {
    await exigir(this.d, actor, PERMISO_SISTEMA);
    if (!s.motivo.trim()) throw new ErrorDeDominio("motivo_requerido", "Indica el motivo del cambio.");
    if (!/^\d{4}-\d{2}$/.test(s.desdeMes) || s.desdeMes <= hoyDe(this.d).mes) {
      throw new ErrorDeDominio("tarifa_retroactiva", "La cuota del sistema cambia a partir de un mes futuro, nunca hacia atrás.");
    }
    const tarifa = {
      tipo: s.tipo,
      puntosBase: s.tipo === "porcentaje" ? Math.round(s.porcentaje * 100) : 0,
      cuotaFija: Dinero.dePesos(s.tipo === "cuota_fija" ? s.cuotaPesos : 0),
      vigenteDesde: Fecha.de(`${s.desdeMes}-01`),
    };
    validarTarifa(tarifa);
    const id = this.d.ids.nuevo();
    await this.d.pagos.agregarTarifa(actor.gimnasioId, { ...tarifa, id, motivo: s.motivo.trim(), creadoPor: actor.usuarioId });
    await this.d.auditoria.registrar({
      gimnasioId: actor.gimnasioId,
      usuarioId: actor.usuarioId,
      accion: "sistema.tarifa_cambiada",
      entidad: "tarifa_sistema",
      entidadId: id,
      antes: null,
      despues: { tipo: tarifa.tipo, puntosBase: tarifa.puntosBase, cuota: tarifa.cuotaFija.centavos, desde: tarifa.vigenteDesde.valor },
      motivo: s.motivo.trim(),
    });
  }
}

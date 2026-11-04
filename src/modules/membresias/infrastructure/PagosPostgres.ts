import type postgres from "postgres";
import { Dinero } from "@/shared/domain/Dinero";
import { Fecha } from "@/shared/domain/Fecha";
import { enGimnasio } from "@/shared/infrastructure/baseDeDatos";
import type { ClienteParaPago, RepositorioPagos } from "../application/puertosPagos";
import type { CuadreCoach, PagoConfirmado, TarifaSistema } from "../domain/Cuentas";
import { Pago, type DatosPago } from "../domain/Pago";
import type { DatosPlan } from "../domain/Plan";

type FilaPlan = { id: string; nombre: string; precio_centavos: number; unidad: DatosPlan["unidad"]; cantidad: number; activo: boolean };
const aPlan = (f: FilaPlan): DatosPlan => ({
  id: f.id,
  nombre: f.nombre,
  precio: Dinero.deCentavos(f.precio_centavos),
  unidad: f.unidad,
  cantidad: f.cantidad,
  activo: f.activo,
});

type FilaPago = {
  id: string;
  gimnasio_id: string;
  cliente_id: string;
  coach_cliente_id: string;
  plan_id: string;
  monto_centavos: number;
  fecha_pago: string;
  metodo: DatosPago["metodo"];
  recibido_por: DatosPago["recibidoPor"];
  coach_receptor_id: string | null;
  es_carga_inicial: boolean;
  estado: DatosPago["estado"];
  periodo_desde: string | null;
  periodo_hasta: string | null;
  fecha_confirmacion: string | null;
  comision_pb: number | null;
  comision_centavos: number | null;
  motivo_rechazo: string | null;
};
const COLUMNAS_PAGO = `id, gimnasio_id, cliente_id, coach_cliente_id, plan_id, monto_centavos, fecha_pago::text, metodo, recibido_por,
  coach_receptor_id, es_carga_inicial, estado, periodo_desde::text, periodo_hasta::text, fecha_confirmacion::text,
  comision_pb, comision_centavos, motivo_rechazo`;
const fecha = (v: string | null) => (v ? Fecha.de(v) : null);
const aPago = (f: FilaPago) =>
  Pago.desde({
    id: f.id,
    gimnasioId: f.gimnasio_id,
    clienteId: f.cliente_id,
    coachClienteId: f.coach_cliente_id,
    planId: f.plan_id,
    monto: Dinero.deCentavos(f.monto_centavos),
    fechaPago: Fecha.de(f.fecha_pago),
    metodo: f.metodo,
    recibidoPor: f.recibido_por,
    coachReceptorId: f.coach_receptor_id,
    esCargaInicial: f.es_carga_inicial,
    estado: f.estado,
    periodoDesde: fecha(f.periodo_desde),
    periodoHasta: fecha(f.periodo_hasta),
    fechaConfirmacion: fecha(f.fecha_confirmacion),
    comisionPuntosBase: f.comision_pb,
    comision: f.comision_centavos === null ? null : Dinero.deCentavos(f.comision_centavos),
    motivoRechazo: f.motivo_rechazo,
  });

export class PagosPostgres implements RepositorioPagos {
  constructor(private readonly sql: postgres.Sql) {}

  async planes(gimnasioId: string) {
    const filas = await enGimnasio(this.sql, gimnasioId, (tx) => tx<FilaPlan[]>`
      SELECT id, nombre, precio_centavos, unidad, cantidad, activo FROM plan_membresia
      WHERE gimnasio_id = ${gimnasioId} ORDER BY activo DESC, precio_centavos`);
    return filas.map(aPlan);
  }

  async guardarPlan(gimnasioId: string, p: DatosPlan) {
    await enGimnasio(this.sql, gimnasioId, (tx) => tx`
      INSERT INTO plan_membresia (id, gimnasio_id, nombre, precio_centavos, unidad, cantidad, activo)
      VALUES (${p.id}, ${gimnasioId}, ${p.nombre}, ${p.precio.centavos}, ${p.unidad}, ${p.cantidad}, ${p.activo})
      ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, precio_centavos = EXCLUDED.precio_centavos,
        unidad = EXCLUDED.unidad, cantidad = EXCLUDED.cantidad, activo = EXCLUDED.activo`);
  }

  async clienteParaPago(gimnasioId: string, clienteId: string) {
    const [f] = await enGimnasio(this.sql, gimnasioId, (tx) => tx<ClienteParaPago[]>`
      SELECT id AS "clienteId", coach_id AS "coachId", estado FROM cliente WHERE id = ${clienteId} AND gimnasio_id = ${gimnasioId}`);
    return f ?? null;
  }

  async coachDelUsuario(gimnasioId: string, usuarioId: string) {
    const [f] = await enGimnasio(this.sql, gimnasioId, (tx) => tx<{ id: string }[]>`
      SELECT id FROM coach WHERE usuario_id = ${usuarioId} AND gimnasio_id = ${gimnasioId} AND estado = 'aprobado'`);
    return f ?? null;
  }

  async pago(gimnasioId: string, pagoId: string) {
    const [f] = await enGimnasio(this.sql, gimnasioId, (tx) => tx<FilaPago[]>`
      SELECT ${tx.unsafe(COLUMNAS_PAGO)} FROM pago WHERE id = ${pagoId} AND gimnasio_id = ${gimnasioId}`);
    return f ? aPago(f) : null;
  }

  async finVigente(gimnasioId: string, clienteId: string) {
    const [f] = await enGimnasio(this.sql, gimnasioId, (tx) => tx<{ fin: string | null }[]>`
      SELECT max(periodo_hasta)::text AS fin FROM pago WHERE cliente_id = ${clienteId} AND estado = 'confirmado'`);
    return fecha(f?.fin ?? null);
  }

  async guardarNuevo(pago: Pago, extra: { comprobanteRuta: string | null; nota: string | null; reportadoPor: string; revisadoPor: string | null }) {
    const p = pago.instantanea();
    await enGimnasio(this.sql, p.gimnasioId, (tx) => tx`
      INSERT INTO pago (id, gimnasio_id, cliente_id, coach_cliente_id, plan_id, monto_centavos, fecha_pago, metodo, recibido_por,
        coach_receptor_id, es_carga_inicial, estado, periodo_desde, periodo_hasta, fecha_confirmacion, comision_pb, comision_centavos,
        comprobante_ruta, nota, reportado_por, revisado_por)
      VALUES (${p.id}, ${p.gimnasioId}, ${p.clienteId}, ${p.coachClienteId}, ${p.planId}, ${p.monto.centavos}, ${p.fechaPago.valor},
        ${p.metodo}, ${p.recibidoPor}, ${p.coachReceptorId}, ${p.esCargaInicial}, ${p.estado}, ${p.periodoDesde?.valor ?? null},
        ${p.periodoHasta?.valor ?? null}, ${p.fechaConfirmacion?.valor ?? null}, ${p.comisionPuntosBase}, ${p.comision?.centavos ?? null},
        ${extra.comprobanteRuta}, ${extra.nota}, ${extra.reportadoPor}, ${extra.revisadoPor})`);
  }

  async guardarRevision(pago: Pago, revisadoPor: string) {
    const p = pago.instantanea();
    await enGimnasio(this.sql, p.gimnasioId, (tx) => tx`
      UPDATE pago SET estado = ${p.estado}, periodo_desde = ${p.periodoDesde?.valor ?? null}, periodo_hasta = ${p.periodoHasta?.valor ?? null},
        fecha_confirmacion = ${p.fechaConfirmacion?.valor ?? null}, comision_pb = ${p.comisionPuntosBase},
        comision_centavos = ${p.comision?.centavos ?? null}, motivo_rechazo = ${p.motivoRechazo}, revisado_por = ${revisadoPor}
      WHERE id = ${p.id} AND estado = 'reportado'`);
  }

  async confirmadosDelMes(gimnasioId: string, mes: string): Promise<PagoConfirmado[]> {
    const filas = await enGimnasio(this.sql, gimnasioId, (tx) => tx<FilaPago[]>`
      SELECT ${tx.unsafe(COLUMNAS_PAGO)} FROM pago
      WHERE gimnasio_id = ${gimnasioId} AND estado = 'confirmado' AND to_char(fecha_confirmacion, 'YYYY-MM') = ${mes}`);
    return filas.map((f) => {
      const p = aPago(f).instantanea();
      return {
        coachClienteId: p.coachClienteId,
        coachReceptorId: p.coachReceptorId,
        monto: p.monto,
        comision: p.comision!,
        esCargaInicial: p.esCargaInicial,
        fechaConfirmacion: p.fechaConfirmacion!,
        periodoDesde: p.periodoDesde!,
        periodoHasta: p.periodoHasta!,
      };
    });
  }

  async cuadreCerrado(gimnasioId: string, coachId: string, mes: string) {
    const [f] = await enGimnasio(this.sql, gimnasioId, (tx) => tx`SELECT 1 FROM cuadre_coach WHERE coach_id = ${coachId} AND mes = ${mes}`);
    return Boolean(f);
  }

  async cerrarCuadre(gimnasioId: string, c: { id: string; coachId: string; mes: string; cuadre: CuadreCoach; nota: string | null; cerradoPor: string }) {
    await enGimnasio(this.sql, gimnasioId, (tx) => tx`
      INSERT INTO cuadre_coach (id, gimnasio_id, coach_id, mes, comisiones_centavos, cobros_centavos, saldo_centavos, nota, cerrado_por)
      VALUES (${c.id}, ${gimnasioId}, ${c.coachId}, ${c.mes}, ${c.cuadre.comisiones.centavos}, ${c.cuadre.cobrosEnMano.centavos},
              ${c.cuadre.saldoCentavos}, ${c.nota}, ${c.cerradoPor})`);
  }

  async tarifas(gimnasioId: string): Promise<TarifaSistema[]> {
    const filas = await enGimnasio(this.sql, gimnasioId, (tx) => tx<
      { tipo: TarifaSistema["tipo"]; porcentaje_pb: number; cuota_centavos: number; vigente_desde: string }[]
    >`SELECT tipo, porcentaje_pb, cuota_centavos, vigente_desde::text FROM tarifa_sistema WHERE gimnasio_id = ${gimnasioId} ORDER BY vigente_desde`);
    return filas.map((f) => ({ tipo: f.tipo, puntosBase: f.porcentaje_pb, cuotaFija: Dinero.deCentavos(f.cuota_centavos), vigenteDesde: Fecha.de(f.vigente_desde) }));
  }

  async agregarTarifa(gimnasioId: string, t: TarifaSistema & { id: string; motivo: string; creadoPor: string }) {
    await enGimnasio(this.sql, gimnasioId, (tx) => tx`
      INSERT INTO tarifa_sistema (id, gimnasio_id, tipo, porcentaje_pb, cuota_centavos, vigente_desde, motivo, creado_por)
      VALUES (${t.id}, ${gimnasioId}, ${t.tipo}, ${t.puntosBase}, ${t.cuotaFija.centavos}, ${t.vigenteDesde.valor}, ${t.motivo}, ${t.creadoPor})
      ON CONFLICT (gimnasio_id, vigente_desde) DO UPDATE SET tipo = EXCLUDED.tipo, porcentaje_pb = EXCLUDED.porcentaje_pb,
        cuota_centavos = EXCLUDED.cuota_centavos, motivo = EXCLUDED.motivo, creado_por = EXCLUDED.creado_por`);
  }
}

export interface PagoEnLista {
  id: string;
  cliente: string;
  clienteId: string;
  coachCliente: string;
  receptor: string | null;
  recibidoPor: "administracion" | "coach";
  plan: string;
  montoCentavos: number;
  fechaPago: string;
  metodo: string;
  estado: "reportado" | "confirmado" | "rechazado";
  esCargaInicial: boolean;
  periodoDesde: string | null;
  periodoHasta: string | null;
  comisionCentavos: number | null;
  motivoRechazo: string | null;
  tieneComprobante: boolean;
  reportadoPor: string;
}

/** Listas para las pantallas de pagos y cuadre (solo lectura). */
export class ConsultasPagos {
  constructor(private readonly sql: postgres.Sql) {}

  private lista(gimnasioId: string, filtro: (tx: postgres.TransactionSql) => postgres.PendingQuery<postgres.Row[]>) {
    return enGimnasio(this.sql, gimnasioId, (tx) => tx<PagoEnLista[]>`
      SELECT p.id, uc.nombre AS cliente, p.cliente_id AS "clienteId", cc.apodo AS "coachCliente", cr.apodo AS receptor,
             p.recibido_por AS "recibidoPor", pl.nombre AS plan, p.monto_centavos AS "montoCentavos", p.fecha_pago::text AS "fechaPago",
             p.metodo, p.estado, p.es_carga_inicial AS "esCargaInicial", p.periodo_desde::text AS "periodoDesde",
             p.periodo_hasta::text AS "periodoHasta", p.comision_centavos AS "comisionCentavos", p.motivo_rechazo AS "motivoRechazo",
             p.comprobante_ruta IS NOT NULL AS "tieneComprobante", ur.nombre AS "reportadoPor"
      FROM pago p
      JOIN cliente cl ON cl.id = p.cliente_id JOIN usuario uc ON uc.id = cl.usuario_id
      JOIN coach cc ON cc.id = p.coach_cliente_id LEFT JOIN coach cr ON cr.id = p.coach_receptor_id
      JOIN plan_membresia pl ON pl.id = p.plan_id JOIN usuario ur ON ur.id = p.reportado_por
      WHERE p.gimnasio_id = ${gimnasioId} AND ${filtro(tx)}
      ORDER BY p.creado_en DESC`);
  }

  porRevisar(gimnasioId: string) {
    return this.lista(gimnasioId, (tx) => tx`p.estado = 'reportado'`);
  }

  recientes(gimnasioId: string, dias = 45) {
    return this.lista(gimnasioId, (tx) => tx`p.creado_en > now() - make_interval(days => ${dias})`);
  }

  delCliente(gimnasioId: string, clienteId: string) {
    return this.lista(gimnasioId, (tx) => tx`p.cliente_id = ${clienteId}`);
  }

  /** Pagos de los clientes de un coach o que cobró él. */
  delCoach(gimnasioId: string, coachId: string, dias = 45) {
    return this.lista(gimnasioId, (tx) => tx`(p.coach_cliente_id = ${coachId} OR p.coach_receptor_id = ${coachId}) AND p.creado_en > now() - make_interval(days => ${dias})`);
  }

  /** Periodos pagados (confirmados) de todos los clientes, para saber quién está activo o vencido. */
  async periodos(gimnasioId: string): Promise<Map<string, { periodoDesde: Fecha; periodoHasta: Fecha }[]>> {
    const filas = await enGimnasio(this.sql, gimnasioId, (tx) => tx<{ cliente_id: string; desde: string; hasta: string }[]>`
      SELECT cliente_id, periodo_desde::text AS desde, periodo_hasta::text AS hasta FROM pago
      WHERE gimnasio_id = ${gimnasioId} AND estado = 'confirmado'`);
    const mapa = new Map<string, { periodoDesde: Fecha; periodoHasta: Fecha }[]>();
    filas.forEach((f) => mapa.set(f.cliente_id, [...(mapa.get(f.cliente_id) ?? []), { periodoDesde: Fecha.de(f.desde), periodoHasta: Fecha.de(f.hasta) }]));
    return mapa;
  }

  cuadresDelMes(gimnasioId: string, mes: string) {
    return enGimnasio(this.sql, gimnasioId, (tx) => tx<{ coachId: string; saldoCentavos: number; cerradoEn: Date; cerradoPor: string; nota: string | null }[]>`
      SELECT c.coach_id AS "coachId", c.saldo_centavos AS "saldoCentavos", c.cerrado_en AS "cerradoEn", u.nombre AS "cerradoPor", c.nota
      FROM cuadre_coach c JOIN usuario u ON u.id = c.cerrado_por WHERE c.gimnasio_id = ${gimnasioId} AND c.mes = ${mes}`);
  }

  /** Ruta del comprobante y quién lo reportó, para revisar el permiso antes de mostrarlo. */
  async comprobante(gimnasioId: string, pagoId: string) {
    const [f] = await enGimnasio(this.sql, gimnasioId, (tx) => tx<{ ruta: string | null; reportadoPor: string }[]>`
      SELECT comprobante_ruta AS ruta, reportado_por AS "reportadoPor" FROM pago WHERE id = ${pagoId} AND gimnasio_id = ${gimnasioId}`);
    return f ?? null;
  }
}

import Link from "next/link";
import { estadoMembresia } from "@/modules/membresias/domain/Cuentas";
import { describirDuracion } from "@/modules/membresias/domain/Plan";
import { Fecha } from "@/shared/domain/Fecha";
import { casosDeClientes, casosDeOperacion, casosDePagos } from "../../../_servidor/contenedor";
import { requerirSesion } from "../../../_servidor/sesion";
import { EstadoMembresia, fechaCorta, METODO, pesos } from "../../../_ui/formato";
import { Formulario } from "../../../_ui/Formulario";
import { Campo, Estado, Tarjeta, Titulo } from "../../../_ui/piezas";
import { guardarPlan, revisarPago } from "../../pagos/acciones";
import { FormularioPago } from "../../pagos/FormularioPago";

const selector = "min-h-11 rounded-xl border border-[#2a2d36] bg-[#23262e] px-3 text-sm text-texto";

export default async function PagosAdmin() {
  const sesion = await requerirSesion("pago.confirmar");
  const casos = casosDePagos(sesion.permisos, sesion.zonaHoraria);
  const [porRevisar, recientes, planes, periodos, clientes, coaches] = await Promise.all([
    casos.consultas.porRevisar(sesion.gimnasioId),
    casos.consultas.recientes(sesion.gimnasioId),
    casos.repositorio.planes(sesion.gimnasioId),
    casos.consultas.periodos(sesion.gimnasioId),
    casosDeClientes().consultas.delGimnasio(sesion.gimnasioId),
    casosDeOperacion(sesion.permisos, sesion.zonaHoraria).consultas.coaches(sesion.gimnasioId),
  ]);
  const hoy = Fecha.hoyEn(sesion.zonaHoraria, new Date());
  const vigentes = clientes.filter((c) => c.estado === "activo" || c.estado === "pendiente");
  const conEstado = vigentes
    .map((c) => ({ ...c, membresia: estadoMembresia(periodos.get(c.id) ?? [], hoy) }))
    .sort((a, b) => (a.membresia.diasRestantes ?? -1) - (b.membresia.diasRestantes ?? -1));
  const puedeConfigurar = sesion.permisos.includes("gimnasio.configurar");

  return (
    <>
      <Titulo antetitulo="Membresías">Pagos</Titulo>

      <Tarjeta className={porRevisar.length ? "border-2 border-acento" : ""}>
        <h2 className="font-titulos text-2xl font-bold uppercase">Por confirmar</h2>
        {porRevisar.length === 0 ? (
          <p className="mt-1 text-sm text-texto-suave">No hay pagos reportados por confirmar.</p>
        ) : (
          <ul className="mt-2 divide-y divide-[#2a2d36]">
            {porRevisar.map((p) => (
              <li key={p.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {p.cliente} · {pesos(p.montoCentavos)}
                  </p>
                  <p className="text-sm text-texto-suave">
                    {p.plan} · pagó el {fechaCorta(p.fechaPago)} · {METODO[p.metodo]} · {p.receptor ? `lo tiene Coach ${p.receptor}` : "en administración"} · reportó{" "}
                    {p.reportadoPor}
                  </p>
                  {p.tieneComprobante && (
                    <a href={`/api/comprobantes/${p.id}`} target="_blank" rel="noreferrer" className="text-sm">
                      Ver comprobante
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap items-start gap-2">
                  <Formulario accion={revisarPago} boton="Confirmar" className="gap-2!">
                    <input type="hidden" name="pagoId" value={p.id} />
                    <input type="hidden" name="decision" value="confirmar" />
                  </Formulario>
                  <Formulario accion={revisarPago} boton="Rechazar" variante="secundario" className="gap-2!">
                    <input type="hidden" name="pagoId" value={p.id} />
                    <input type="hidden" name="decision" value="rechazar" />
                    <input name="motivo" required placeholder="Motivo" className={selector} />
                  </Formulario>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      <div className="grid gap-5 md:grid-cols-2">
        <Tarjeta>
          <h2 className="mb-3 font-titulos text-2xl font-bold uppercase">Registrar pago</h2>
          <FormularioPago clientes={vigentes} planes={planes} coaches={coaches} hoy={hoy.valor} esAdministracion />
        </Tarjeta>

        <Tarjeta>
          <h2 className="font-titulos text-2xl font-bold uppercase">Clientes</h2>
          <p className="text-xs text-texto-suave">Primero los que vencen antes.</p>
          {conEstado.length === 0 ? (
            <p className="mt-2 text-sm text-texto-suave">Aún no hay clientes.</p>
          ) : (
            <ul className="mt-2 divide-y divide-[#2a2d36]">
              {conEstado.map((c) => (
                <li key={c.id}>
                  <Link href={`/admin/clientes/${c.id}`} className="flex items-center justify-between gap-3 py-2.5 text-texto no-underline">
                    <span className="min-w-0">
                      <span className="block font-semibold">{c.nombre}</span>
                      <span className="text-xs text-texto-suave">
                        Coach {c.coach}
                        {c.membresia.vence ? ` · vence ${fechaCorta(c.membresia.vence.valor)}` : ""}
                      </span>
                    </span>
                    <EstadoMembresia estado={c.membresia} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>

      <Tarjeta>
        <h2 className="font-titulos text-2xl font-bold uppercase">Últimos pagos</h2>
        {recientes.length === 0 ? (
          <p className="mt-1 text-sm text-texto-suave">Sin pagos en los últimos 45 días.</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-texto-suave">
                <tr>
                  <th className="py-2 font-semibold">Cliente</th>
                  <th className="font-semibold">Monto</th>
                  <th className="font-semibold">Pagó</th>
                  <th className="font-semibold">Cubre</th>
                  <th className="font-semibold">Dinero</th>
                  <th className="font-semibold">Comisión</th>
                  <th className="font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2d36]">
                {recientes.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2">{p.cliente}</td>
                    <td>{pesos(p.montoCentavos)}</td>
                    <td>{fechaCorta(p.fechaPago)}</td>
                    <td>{p.periodoDesde ? `${fechaCorta(p.periodoDesde)} – ${fechaCorta(p.periodoHasta)}` : "—"}</td>
                    <td>{p.receptor ? `Coach ${p.receptor}` : "Administración"}</td>
                    <td>{p.esCargaInicial ? "carga inicial" : p.comisionCentavos !== null ? `${pesos(p.comisionCentavos)} · ${p.coachCliente}` : "—"}</td>
                    <td>
                      <Estado
                        valor={p.estado === "confirmado" ? "activo" : p.estado === "reportado" ? "pendiente" : "rechazado"}
                        texto={p.estado === "reportado" ? "por confirmar" : p.estado}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      {puedeConfigurar && (
        <Tarjeta>
          <h2 className="font-titulos text-2xl font-bold uppercase">Planes</h2>
          <ul className="mt-2 divide-y divide-[#2a2d36]">
            {planes.map((p) => (
              <li key={p.id} className="py-3">
                <Formulario accion={guardarPlan} boton="Guardar" variante="secundario" className="grid! grid-cols-2 items-end gap-2! sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
                  <input type="hidden" name="id" value={p.id} />
                  <Campo etiqueta="Nombre" name="nombre" defaultValue={p.nombre} required />
                  <Campo etiqueta="Precio ($)" name="precio" type="number" min={1} step={0.01} defaultValue={p.precio.centavos / 100} required />
                  <Campo etiqueta="Dura" name="cantidad" type="number" min={1} max={365} defaultValue={p.cantidad} required />
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-[#c9ccd3]">Unidad</span>
                    <select name="unidad" defaultValue={p.unidad} className="min-h-12 rounded-xl border border-[#2a2d36] bg-[#23262e] px-3 text-texto">
                      <option value="dias">días</option>
                      <option value="semanas">semanas</option>
                      <option value="meses">meses</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-[#c9ccd3]">Estado</span>
                    <select name="activo" defaultValue={p.activo ? "si" : "no"} className="min-h-12 rounded-xl border border-[#2a2d36] bg-[#23262e] px-3 text-texto">
                      <option value="si">Se vende</option>
                      <option value="no">Ya no</option>
                    </select>
                  </label>
                </Formulario>
              </li>
            ))}
          </ul>
          <h3 className="mt-4 font-semibold">Nuevo plan</h3>
          <Formulario accion={guardarPlan} boton="Crear plan" className="mt-2 grid! grid-cols-2 items-end gap-2! sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
            <Campo etiqueta="Nombre" name="nombre" placeholder="Mensualidad" required />
            <Campo etiqueta="Precio ($)" name="precio" type="number" min={1} step={0.01} required />
            <Campo etiqueta="Dura" name="cantidad" type="number" min={1} max={365} defaultValue={1} required />
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-[#c9ccd3]">Unidad</span>
              <select name="unidad" defaultValue="meses" className="min-h-12 rounded-xl border border-[#2a2d36] bg-[#23262e] px-3 text-texto">
                <option value="dias">días</option>
                <option value="semanas">semanas</option>
                <option value="meses">meses</option>
              </select>
            </label>
          </Formulario>
          {planes.length > 0 && <p className="mt-2 text-xs text-texto-suave">Vigentes: {planes.filter((p) => p.activo).map((p) => `${p.nombre} (${describirDuracion(p)})`).join(", ")}</p>}
        </Tarjeta>
      )}
    </>
  );
}

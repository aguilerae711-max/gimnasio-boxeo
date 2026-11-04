import { notFound } from "next/navigation";
import { listaDeDias } from "@/modules/operacion/domain/Horario";
import { estadoMembresia } from "@/modules/membresias/domain/Cuentas";
import { Fecha } from "@/shared/domain/Fecha";
import { casosDeClientes, casosDeOperacion, casosDePagos, casosDePesajes } from "../../../../_servidor/contenedor";
import { EstadoMembresia, fechaCorta, pesos } from "../../../../_ui/formato";
import { PanelPeso } from "../../../../_ui/PanelPeso";
import { FormularioPago } from "../../../pagos/FormularioPago";
import { registrarPesaje } from "../../../pagos/acciones";
import { requerirSesion } from "../../../../_servidor/sesion";
import { Formulario } from "../../../../_ui/Formulario";
import { Campo, Estado, Tarjeta, Titulo } from "../../../../_ui/piezas";
import { FormularioPerfilCliente } from "../../../perfil/FormularioPerfilCliente";
import { reasignarCliente } from "./acciones";

const fecha = (d: Date) => new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeZone: "America/Mexico_City" }).format(d);

export default async function FichaCliente({ params }: { params: Promise<{ id: string }> }) {
  const sesion = await requerirSesion("cliente.ver_todos");
  const { id } = await params;
  const operacion = casosDeOperacion(sesion.permisos, sesion.zonaHoraria);
  const [clientes, asignacion, horario, coaches] = await Promise.all([
    casosDeClientes().consultas.delGimnasio(sesion.gimnasioId),
    operacion.repositorio.asignacionDeCliente(sesion.gimnasioId, id),
    operacion.repositorio.horario(sesion.gimnasioId),
    operacion.consultas.coaches(sesion.gimnasioId),
  ]);
  const cliente = clientes.find((c) => c.id === id);
  if (!cliente || !asignacion) notFound();
  const pagosCasos = casosDePagos(sesion.permisos, sesion.zonaHoraria);
  const [perfil, historial, peso, pagos, planes, periodos] = await Promise.all([
    operacion.consultas.perfilCliente(sesion.gimnasioId, id),
    operacion.consultas.historialDeCliente(sesion.gimnasioId, id),
    casosDePesajes(sesion.permisos, sesion.zonaHoraria).consultas.delCliente(sesion.gimnasioId, id),
    pagosCasos.consultas.delCliente(sesion.gimnasioId, id),
    pagosCasos.repositorio.planes(sesion.gimnasioId),
    pagosCasos.consultas.periodos(sesion.gimnasioId),
  ]);
  const hoy = Fecha.hoyEn(sesion.zonaHoraria, new Date());
  const membresia = estadoMembresia(periodos.get(id) ?? [], hoy);
  const franjaActual = asignacion.franjaId ? horario.franja(asignacion.franjaId) : null;
  // En cada franja, qué coaches dan clase y qué días: ayuda a elegir sin equivocarse.
  const quienDa = (franjaId: string) =>
    coaches
      .map((c) => ({ apodo: c.apodo, dias: horario.diasDe(c.id, franjaId) }))
      .filter((c) => c.dias.length > 0)
      .map((c) => `${c.apodo}: ${c.dias.map((d) => listaDeDias([d]).slice(0, 3)).join(" ")}`)
      .join(" · ");

  return (
    <>
      <Titulo antetitulo="Cliente">{cliente.nombre}</Titulo>
      <div className="flex flex-wrap items-center gap-3 text-sm text-texto-suave">
        <Estado valor={cliente.estado} />
        <EstadoMembresia estado={membresia} />
        <span>{cliente.correo}</span>
        {cliente.telefono && <span>{cliente.telefono}</span>}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Tarjeta>
          <h2 className="font-titulos text-2xl font-bold uppercase">Coach y turno</h2>
          <p className="mt-1 text-[15px]">
            Coach {cliente.coach}
            {franjaActual
              ? ` · ${franjaActual.inicio}–${franjaActual.fin} · ${listaDeDias(horario.diasDe(asignacion.coachId, franjaActual.id))}`
              : " · sin franja asignada"}
          </p>
          {sesion.permisos.includes("cliente.asignar") && (
            // La llave renueva el formulario al guardar, para que muestre la asignación nueva.
            <Formulario key={`${asignacion.coachId}-${asignacion.franjaId}`} accion={reasignarCliente} boton="Guardar cambio" className="mt-4">
              <input type="hidden" name="clienteId" value={id} />
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-[#c9ccd3]">Coach</span>
                <select name="coachId" defaultValue={asignacion.coachId} className="min-h-12 rounded-xl border border-[#2a2d36] bg-[#23262e] px-3 text-base text-texto">
                  {coaches.map((c) => (
                    <option key={c.id} value={c.id}>
                      Coach {c.apodo}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-[#c9ccd3]">Franja</span>
                <select name="franjaId" defaultValue={asignacion.franjaId ?? ""} className="min-h-12 rounded-xl border border-[#2a2d36] bg-[#23262e] px-3 text-base text-texto">
                  <option value="">Sin franja</option>
                  {horario.franjas.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.inicio}–{f.fin} {quienDa(f.id) ? `(${quienDa(f.id)})` : "(sin coaches)"}
                    </option>
                  ))}
                </select>
              </label>
              <Campo etiqueta="Motivo" name="motivo" maxLength={200} placeholder="Ej. cambio a horario de la tarde" required />
            </Formulario>
          )}
        </Tarjeta>

        <Tarjeta>
          <h2 className="mb-3 font-titulos text-2xl font-bold uppercase">Perfil</h2>
          <FormularioPerfilCliente clienteId={id} perfil={perfil} />
        </Tarjeta>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <PanelPeso {...peso}>
          {sesion.permisos.includes("evaluacion.realizar") && (
            <Formulario accion={registrarPesaje} boton="Registrar pesaje" variante="secundario" className="mt-4">
              <input type="hidden" name="clienteId" value={id} />
              <div className="grid grid-cols-2 gap-2">
                <Campo etiqueta="Peso (kg)" name="peso" type="number" step={0.1} min={20} max={250} inputMode="decimal" required />
                <Campo etiqueta="Estatura (cm)" name="estatura" type="number" min={100} max={230} inputMode="numeric" placeholder="Si cambió" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Campo etiqueta="Fecha" name="fecha" type="date" max={hoy.valor} defaultValue={hoy.valor} required />
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-[#c9ccd3]">Tipo</span>
                  <select name="origen" className="min-h-12 rounded-xl border border-[#2a2d36] bg-[#23262e] px-3 text-base text-texto">
                    <option value="evaluacion">Evaluación periódica</option>
                    <option value="imprevista">Pesaje imprevisto</option>
                  </select>
                </label>
              </div>
            </Formulario>
          )}
        </PanelPeso>

        <Tarjeta>
          <h2 className="font-titulos text-2xl font-bold uppercase">Pagos</h2>
          <ul className="mt-2 divide-y divide-[#2a2d36] text-sm">
            {pagos.map((p) => (
              <li key={p.id} className="flex justify-between gap-2 py-2">
                <span>
                  {fechaCorta(p.fechaPago)} · {pesos(p.montoCentavos)} · {p.plan}
                  <span className="block text-xs text-texto-suave">
                    {p.periodoDesde
                      ? `cubre ${fechaCorta(p.periodoDesde)} – ${fechaCorta(p.periodoHasta)}`
                      : p.estado === "reportado"
                        ? "por confirmar"
                        : `rechazado: ${p.motivoRechazo}`}
                    {p.esCargaInicial ? " · carga inicial" : ""}
                  </span>
                </span>
                {p.tieneComprobante && (
                  <a href={`/api/comprobantes/${p.id}`} target="_blank" rel="noreferrer">
                    comprobante
                  </a>
                )}
              </li>
            ))}
            {pagos.length === 0 && <li className="py-2 text-texto-suave">Sin pagos.</li>}
          </ul>
          {sesion.permisos.includes("pago.confirmar") && (
            <div className="mt-4">
              <h3 className="mb-2 font-semibold">Registrar pago</h3>
              <FormularioPago clientes={[]} planes={planes} coaches={coaches} hoy={hoy.valor} esAdministracion clienteFijo={id} />
            </div>
          )}
        </Tarjeta>
      </div>

      <Tarjeta>
        <h2 className="font-titulos text-2xl font-bold uppercase">Historial de coach</h2>
        <ul className="mt-2 divide-y divide-[#2a2d36]">
          {historial.map((h, i) => (
            <li key={i} className="py-2.5 text-sm">
              <span className="font-semibold">
                Coach {h.coach}
                {h.inicio ? ` · ${h.inicio}–${h.fin}` : ""}
              </span>
              <span className="text-texto-suave">
                {" "}
                · {fecha(h.desde)} {h.hasta ? `a ${fecha(h.hasta)}` : "a hoy"} · {h.motivo}
              </span>
            </li>
          ))}
        </ul>
      </Tarjeta>
    </>
  );
}

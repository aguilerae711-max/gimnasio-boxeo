import { redirect } from "next/navigation";
import { cuadreDelMes, estadoMembresia } from "@/modules/membresias/domain/Cuentas";
import { Fecha } from "@/shared/domain/Fecha";
import { casosDeOperacion, casosDePagos } from "../../../_servidor/contenedor";
import { requerirSesion } from "../../../_servidor/sesion";
import { EstadoMembresia, fechaCorta, nombreMes, pesos } from "../../../_ui/formato";
import { Desplegable, Estado, Titulo } from "../../../_ui/piezas";
import { FormularioPago } from "../../pagos/FormularioPago";

export default async function PagosCoach() {
  const sesion = await requerirSesion("pago.reportar");
  const casos = casosDePagos(sesion.permisos, sesion.zonaHoraria);
  const yo = await casos.repositorio.coachDelUsuario(sesion.gimnasioId, sesion.usuarioId);
  if (!yo) redirect("/panel");
  const hoy = Fecha.hoyEn(sesion.zonaHoraria, new Date());
  const mesAnterior = Fecha.de(`${hoy.mes}-01`).sumarMeses(-1).mes;
  const [clientes, planes, periodos, delMes, delAnterior, cerradosAnterior, recientes] = await Promise.all([
    casosDeOperacion(sesion.permisos, sesion.zonaHoraria).consultas.clientesDelCoach(sesion.gimnasioId, yo.id),
    casos.repositorio.planes(sesion.gimnasioId),
    casos.consultas.periodos(sesion.gimnasioId),
    casos.repositorio.confirmadosDelMes(sesion.gimnasioId, hoy.mes),
    casos.repositorio.confirmadosDelMes(sesion.gimnasioId, mesAnterior),
    casos.consultas.cuadresDelMes(sesion.gimnasioId, mesAnterior),
    casos.consultas.delCoach(sesion.gimnasioId, yo.id),
  ]);
  const cuenta = (pagos: typeof delMes, mes: string) => cuadreDelMes(pagos, yo.id, mes);
  const meses = [
    { mes: hoy.mes, cuadre: cuenta(delMes, hoy.mes), cerrado: null as null | { cerradoPor: string } },
    { mes: mesAnterior, cuadre: cuenta(delAnterior, mesAnterior), cerrado: cerradosAnterior.find((c) => c.coachId === yo.id) ?? null },
  ];

  const activos = clientes.filter((c) => c.estado === "activo");
  const alCorriente = activos.filter((c) => {
    const e = estadoMembresia(periodos.get(c.clienteId) ?? [], hoy).estado;
    return e === "activo" || e === "por_vencer";
  }).length;

  return (
    <>
      <Titulo antetitulo={`Coach ${sesion.nombre.split(" ")[0]}`}>Mis pagos</Titulo>

      {/* Cuenta del mes, discreta: cuántos clientes pagan y lo que eso deja. */}
      <div className="flex flex-col gap-1 rounded-xl border border-borde px-4 py-3 text-sm text-texto-suave">
        {meses.map(({ mes, cuadre, cerrado }) => (
          <p key={mes} className="cifras">
            <span className="font-semibold capitalize text-[#c9ccd3]">{nombreMes(mes).split(" ")[0]}</span>
            {mes === hoy.mes && (
              <>
                {" "}· <b className="text-texto">{alCorriente}</b> de {activos.length} clientes al corriente
              </>
            )}{" "}
            · comisión <b className="text-texto">{pesos(cuadre.comisiones.centavos)}</b>
            {cuadre.cobrosEnMano.centavos > 0 && <> · cobraste {pesos(cuadre.cobrosEnMano.centavos)}</>}
            {cuadre.saldoCentavos !== 0 && (
              <>
                {" "}
                · {cuadre.saldoCentavos > 0 ? "te pagan" : "entregas"} {pesos(Math.abs(cuadre.saldoCentavos))}
              </>
            )}
            {mes !== hoy.mes && cerrado && <span className="text-[#6fe0a2]"> · cuadrado</span>}
          </p>
        ))}
      </div>

      <Desplegable titulo="Reportar pago" abierto>
        <p className="mb-3 text-sm text-texto-suave">Toma foto del comprobante y envíalo. Cuando la administración lo confirma, se suma tu comisión.</p>
        {clientes.length === 0 ? (
          <p className="text-sm text-texto-suave">Aún no tienes clientes.</p>
        ) : (
          <FormularioPago
            clientes={clientes.map((c) => ({ id: c.clienteId, nombre: c.nombre }))}
            planes={planes}
            coaches={[]}
            hoy={hoy.valor}
            esAdministracion={false}
          />
        )}
      </Desplegable>

      <Desplegable titulo="Mis clientes">
        <ul className="mt-2 divide-y divide-[#2a2d36]">
          {clientes.map((c) => {
            const m = estadoMembresia(periodos.get(c.clienteId) ?? [], hoy);
            return (
              <li key={c.clienteId} className="flex items-center justify-between gap-3 py-2.5">
                <span>
                  <span className="block font-semibold">{c.nombre}</span>
                  {m.vence && <span className="text-xs text-texto-suave">vence {fechaCorta(m.vence.valor)}</span>}
                </span>
                <EstadoMembresia estado={m} />
              </li>
            );
          })}
        </ul>
      </Desplegable>

      <Desplegable titulo="Pagos recientes">
        {recientes.length === 0 ? (
          <p className="mt-1 text-sm text-texto-suave">Sin pagos en los últimos 45 días.</p>
        ) : (
          <ul className="mt-2 divide-y divide-[#2a2d36]">
            {recientes.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span>
                  <span className="block font-semibold">
                    {p.cliente} · {pesos(p.montoCentavos)}
                  </span>
                  <span className="text-xs text-texto-suave">
                    {fechaCorta(p.fechaPago)} · {p.receptor ? `lo cobró ${p.receptor}` : "en administración"}
                    {p.motivoRechazo ? ` · ${p.motivoRechazo}` : ""}
                  </span>
                </span>
                <Estado
                  valor={p.estado === "confirmado" ? "activo" : p.estado === "reportado" ? "pendiente" : "rechazado"}
                  texto={p.estado === "reportado" ? "por confirmar" : p.estado}
                />
              </li>
            ))}
          </ul>
        )}
      </Desplegable>
    </>
  );
}

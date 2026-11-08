import { redirect } from "next/navigation";
import { cuadreDelMes, estadoMembresia } from "@/modules/membresias/domain/Cuentas";
import { Fecha } from "@/shared/domain/Fecha";
import { casosDeOperacion, casosDePagos } from "../../../_servidor/contenedor";
import { requerirSesion } from "../../../_servidor/sesion";
import { EstadoMembresia, fechaCorta, nombreMes, pesos } from "../../../_ui/formato";
import { Desplegable, Estado, Tarjeta, Titulo } from "../../../_ui/piezas";
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

  return (
    <>
      <Titulo antetitulo={`Coach ${sesion.nombre}`}>Pagos</Titulo>

      <div className="grid gap-5 md:grid-cols-2">
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

        <div className="flex flex-col gap-5">
          {meses.map(({ mes, cuadre, cerrado }) => (
            <Tarjeta key={mes}>
              <div className="flex items-baseline justify-between">
                <h2 className="font-titulos text-2xl font-bold uppercase">Mi cuenta · {nombreMes(mes)}</h2>
                {mes === hoy.mes ? <span className="text-xs text-texto-suave">en curso</span> : cerrado && <Estado valor="activo" texto="cuadrado" />}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-texto-suave">Comisión</p>
                  <p className="font-titulos text-2xl font-bold text-[#6fe0a2]">{pesos(cuadre.comisiones.centavos)}</p>
                </div>
                <div>
                  <p className="text-texto-suave">Cobré yo</p>
                  <p className="font-titulos text-2xl font-bold">{pesos(cuadre.cobrosEnMano.centavos)}</p>
                </div>
                <div>
                  <p className="text-texto-suave">{cuadre.saldoCentavos >= 0 ? "Me pagan" : "Entrego"}</p>
                  <p className="font-titulos text-2xl font-bold">{pesos(Math.abs(cuadre.saldoCentavos))}</p>
                </div>
              </div>
            </Tarjeta>
          ))}
        </div>
      </div>

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

import { redirect } from "next/navigation";
import { Fecha } from "@/shared/domain/Fecha";
import { casosDeEvaluacion, casosDeOperacion } from "../../../_servidor/contenedor";
import { requerirSesion } from "../../../_servidor/sesion";
import { nombreMes } from "../../../_ui/formato";
import { Desplegable, Tarjeta, Titulo } from "../../../_ui/piezas";
import { COLOR_PILAR, NOMBRE_PILAR, PILARES } from "../../../_ui/Resultados";

/** El coach ve el resultado por pilar de sus clientes y su resultado general; nunca los tests ni valores crudos. */
export default async function ResultadosCoach() {
  const sesion = await requerirSesion("evaluacion.ver_propios");
  const yo = await casosDeOperacion(sesion.permisos, sesion.zonaHoraria).repositorio.coachDelUsuario(sesion.gimnasioId, sesion.usuarioId);
  if (!yo) redirect("/panel");
  const consultas = casosDeEvaluacion(sesion.permisos, sesion.zonaHoraria).consultas;
  const mes = Fecha.hoyEn(sesion.zonaHoraria, new Date()).mes;
  const anterior = Fecha.de(`${mes}-01`).sumarMeses(-1).mes;
  const [esteMes, mesAnterior, clientes] = await Promise.all([
    consultas.resultadoCoaches(sesion.gimnasioId, mes),
    consultas.resultadoCoaches(sesion.gimnasioId, anterior),
    consultas.ultimosDelCoach(sesion.gimnasioId, yo.id),
  ]);
  const propio = (lista: typeof esteMes) => lista.find((c) => c.coachId === yo.id);

  return (
    <>
      <Titulo antetitulo={`Coach ${sesion.nombre}`}>Resultados</Titulo>
      <div className="grid gap-5 md:grid-cols-2">
        {[
          [mes, propio(esteMes)],
          [anterior, propio(mesAnterior)],
        ].map(([m, r]) => {
          const datos = r as ReturnType<typeof propio>;
          return (
            <Tarjeta key={m as string}>
              <h2 className="font-titulos text-2xl font-bold uppercase">Tu resultado · {nombreMes(m as string)}</h2>
              <p className="text-xs text-texto-suave">
                Cobertura: {datos?.evaluados ?? 0} de {datos?.activos ?? 0} clientes evaluados
              </p>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {PILARES.map((p) => (
                  <div key={p}>
                    <p className="text-xs font-semibold uppercase" style={{ color: COLOR_PILAR[p] }}>
                      {NOMBRE_PILAR[p]}
                    </p>
                    <p className="font-titulos text-3xl font-extrabold">{datos?.[p] ?? "—"}</p>
                  </div>
                ))}
              </div>
            </Tarjeta>
          );
        })}
      </div>

      <Desplegable titulo="Mis clientes" abierto>
        <p className="text-xs text-texto-suave">Última evaluación de cada uno. 100 = su punto de partida.</p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-texto-suave">
              <tr>
                <th className="py-1.5 font-semibold">Cliente</th>
                <th className="font-semibold">Mes · división</th>
                {PILARES.map((p) => (
                  <th key={p} className="font-semibold">
                    {NOMBRE_PILAR[p]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2d36]">
              {clientes.map((c) => (
                <tr key={c.clienteId}>
                  <td className="py-1.5">{c.nombre}</td>
                  <td>{c.periodo ? `${nombreMes(c.periodo)}${c.division ? ` · ${c.division}` : ""}` : "sin evaluar"}</td>
                  {PILARES.map((p) => (
                    <td key={p}>{c[p] ?? "—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Desplegable>
    </>
  );
}

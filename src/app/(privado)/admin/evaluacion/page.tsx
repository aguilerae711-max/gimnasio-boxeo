import Link from "next/link";
import { Fecha } from "@/shared/domain/Fecha";
import { casosDeEvaluacion } from "../../../_servidor/contenedor";
import { requerirSesion } from "../../../_servidor/sesion";
import { nombreMes } from "../../../_ui/formato";
import { Formulario } from "../../../_ui/Formulario";
import { Estado, Tarjeta, Titulo } from "../../../_ui/piezas";
import { NOMBRE_PILAR, PILARES } from "../../../_ui/Resultados";
import { comenzar } from "./acciones";

const ESTADO: Record<string, [string, string]> = {
  en_curso: ["pendiente", "en curso"],
  parcial: ["pendiente", "parcial"],
  completa: ["activo", "evaluado"],
  no_apta: ["rechazado", "no apto: reprogramar"],
};

export default async function Evaluaciones() {
  const sesion = await requerirSesion("evaluacion.realizar");
  const casos = casosDeEvaluacion(sesion.permisos, sesion.zonaHoraria);
  const periodo = Fecha.hoyEn(sesion.zonaHoraria, new Date()).mes;
  const [clientes, coaches, referencias, tienePin] = await Promise.all([
    casos.consultas.delMes(sesion.gimnasioId, periodo),
    casos.consultas.resultadoCoaches(sesion.gimnasioId, periodo),
    casos.consultas.referencias(sesion.gimnasioId),
    casos.consultas.tienePin(sesion.usuarioId),
  ]);
  const evaluados = clientes.filter((c) => c.estado === "completa").length;

  return (
    <>
      <Titulo antetitulo={nombreMes(periodo)}>Evaluación</Titulo>
      {!tienePin && (
        <Tarjeta className="border-2 border-acento">
          <p className="text-sm">
            Para evaluar necesitas un PIN. <Link href="/perfil">Defínelo en Mi perfil</Link>.
          </p>
        </Tarjeta>
      )}

      <Tarjeta>
        <div className="flex items-baseline justify-between">
          <h2 className="font-titulos text-2xl font-bold uppercase">Clientes del mes</h2>
          <span className="text-sm text-texto-suave">
            {evaluados} de {clientes.length} evaluados
          </span>
        </div>
        <p className="text-xs text-texto-suave">Una evaluación por cliente y mes. La primera de cada cliente es la inicial (su punto de partida).</p>
        {clientes.length === 0 ? (
          <p className="mt-2 text-sm text-texto-suave">No hay clientes activos.</p>
        ) : (
          <ul className="mt-2 divide-y divide-[#2a2d36]">
            {clientes.map((c) => {
              const [color, texto] = c.estado ? ESTADO[c.estado] : ["baja", "sin evaluar"];
              const abierta = c.estado === "en_curso" || c.estado === "parcial";
              return (
                <li key={c.clienteId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{c.nombre}</p>
                    <p className="text-sm text-texto-suave">Coach {c.coach}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Estado valor={color} texto={texto} />
                    {c.sesionId && c.estado !== "no_apta" && !abierta ? (
                      <Link href={`/admin/evaluacion/${c.sesionId}`} className="text-sm">
                        Ver
                      </Link>
                    ) : (
                      tienePin && (
                        <Formulario accion={comenzar} boton={abierta ? "Continuar" : "Comenzar"} variante="secundario" className="flex-row! items-start gap-2!">
                          <input type="hidden" name="clienteId" value={c.clienteId} />
                          <input
                            name="pin"
                            type="password"
                            inputMode="numeric"
                            autoComplete="off"
                            pattern="\d{4,6}"
                            required
                            placeholder="PIN"
                            aria-label="PIN"
                            className="min-h-11 w-24 rounded-xl border border-[#2a2d36] bg-[#23262e] px-3 text-base text-texto"
                          />
                        </Formulario>
                      )
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Tarjeta>

      <Tarjeta>
        <h2 className="font-titulos text-2xl font-bold uppercase">Resultado de los coaches</h2>
        <p className="text-xs text-texto-suave">
          Índice promedio por pilar de sus clientes evaluados este mes y cobertura (clientes activos evaluados). Comparar solo con 3 o más evaluados.
        </p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-texto-suave">
              <tr>
                <th className="py-1.5 font-semibold">Coach</th>
                <th className="font-semibold">Cobertura</th>
                {PILARES.map((p) => (
                  <th key={p} className="font-semibold">
                    {NOMBRE_PILAR[p]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2d36]">
              {coaches.map((c) => (
                <tr key={c.coachId}>
                  <td className="py-1.5">
                    <span className="mr-2 inline-block h-3 w-3 rounded" style={{ background: c.color }} />
                    {c.apodo}
                  </td>
                  <td>
                    {c.evaluados}/{c.activos}
                    {c.activos > 0 ? ` (${Math.round((c.evaluados / c.activos) * 100)}%)` : ""}
                  </td>
                  {PILARES.map((p) => (
                    <td key={p}>{c[p] ?? "—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Tarjeta>

      <details className="rounded-2xl bg-tarjeta p-5">
        <summary className="cursor-pointer font-titulos text-xl font-bold uppercase">Referencia de niveles (solo administración)</summary>
        <table className="mt-2 w-full text-left text-sm">
          <thead className="text-texto-suave">
            <tr>
              <th className="py-1.5 font-semibold">Test</th>
              <th className="font-semibold">Inicial</th>
              <th className="font-semibold">Intermedio</th>
              <th className="font-semibold">Avanzado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2d36]">
            {referencias.map((r) => (
              <tr key={r.clave}>
                <td className="py-1.5">{r.nombre}</td>
                <td>{r.inicial}</td>
                <td>{r.intermedio}</td>
                <td>{r.avanzado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  );
}

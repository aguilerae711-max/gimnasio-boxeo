import Link from "next/link";
import { redirect } from "next/navigation";
import { claveTurno } from "@/modules/biblioteca/domain/Planes";
import { NOMBRE_DIA } from "@/modules/operacion/domain/Horario";
import { Fecha } from "@/shared/domain/Fecha";
import { casosDeBiblioteca, casosDeOperacion } from "../../../_servidor/contenedor";
import { requerirSesion } from "../../../_servidor/sesion";
import { ESTADO_PLAN, nombreMes } from "../../../_ui/formato";
import { Formulario } from "../../../_ui/Formulario";
import { Desplegable, Estado, Tarjeta, Titulo } from "../../../_ui/piezas";
import { guardarPlan, mantenerPlan } from "../../biblioteca/acciones";

export default async function MiPlan({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const sesion = await requerirSesion("plan.enviar");
  const casos = casosDeBiblioteca(sesion.permisos, sesion.zonaHoraria);
  const yo = await casos.repositorio.coachDelUsuario(sesion.gimnasioId, sesion.usuarioId);
  if (!yo) redirect("/panel");
  const hoy = Fecha.hoyEn(sesion.zonaHoraria, new Date());
  const siguiente = Fecha.de(`${hoy.mes}-01`).sumarMeses(1).mes;
  const mes = (await searchParams).mes === siguiente ? siguiente : hoy.mes;

  const [horario, rutinas, plan, planSiguiente, detalle] = await Promise.all([
    casosDeOperacion(sesion.permisos, sesion.zonaHoraria).repositorio.horario(sesion.gimnasioId),
    casos.repositorio.rutinasDelCoach(sesion.gimnasioId, yo.id),
    casos.repositorio.plan(sesion.gimnasioId, yo.id, mes),
    casos.repositorio.plan(sesion.gimnasioId, yo.id, siguiente),
    casos.consultas.planesDelCoach(sesion.gimnasioId, yo.id),
  ]);
  const turnos = horario.turnosDe(yo.id);
  const comentario = plan ? (await casos.consultas.detallePlan(sesion.gimnasioId, plan.id))?.comentario : null;
  const editable = !plan || plan.estado === "borrador" || plan.estado === "requiere_cambios";
  const puedeMantener = mes === hoy.mes && plan?.estado === "aprobado" && !planSiguiente && Number(hoy.valor.slice(8)) >= 25;
  const [color, texto] = plan ? ESTADO_PLAN[plan.estado] : ["baja", "sin plan"];

  return (
    <>
      <Titulo antetitulo={`Coach ${sesion.nombre}`}>Mi plan de trabajo</Titulo>
      <div className="flex flex-wrap items-center gap-2">
        {[hoy.mes, siguiente].map((m) => (
          <Link
            key={m}
            href={`/coach/plan?mes=${m}`}
            className={`rounded-full px-4 py-2 text-sm font-semibold no-underline ${m === mes ? "bg-acento text-white" : "bg-tarjeta text-[#c9ccd3]"}`}
          >
            {nombreMes(m)}
          </Link>
        ))}
        <Estado valor={color} texto={texto} />
      </div>

      {puedeMantener && (
        <Tarjeta className="border-2 border-acento">
          <p className="font-semibold">¿Mantienes tu plan para {nombreMes(siguiente)}?</p>
          <p className="text-sm text-texto-suave">Si lo mantienes, queda aprobado con las mismas rutinas. Si quieres cambiar algo, ve al mes siguiente y edítalo.</p>
          <Formulario accion={mantenerPlan} boton="Sí, mantenerlo" className="mt-3" />
        </Tarjeta>
      )}

      {comentario && plan?.estado === "requiere_cambios" && (
        <p className="rounded-xl bg-[#2a2111] px-4 py-3 text-sm text-[#f1d9a8]">La administración pide: {comentario}</p>
      )}

      <Desplegable titulo="¿Qué harás en cada turno?" abierto>
        {turnos.length === 0 ? (
          <p className="mt-1 text-sm text-texto-suave">Aún no tienes turnos en el horario.</p>
        ) : rutinas.length === 0 ? (
          <p className="mt-1 text-sm text-texto-suave">
            Primero <Link href="/coach/rutinas">arma tus rutinas</Link>.
          </p>
        ) : !editable ? (
          <ul className="mt-2 divide-y divide-[#2a2d36]">
            {turnos.map((t) => {
              const franja = horario.franja(t.franjaId)!;
              const rutina = rutinas.find((r) => r.id === plan?.asignaciones.get(claveTurno(t.diaSemana, t.franjaId)));
              return (
                <li key={t.id} className="flex justify-between gap-2 py-2.5">
                  <span className="font-semibold">
                    {NOMBRE_DIA[t.diaSemana]} · {franja.inicio}–{franja.fin}
                  </span>
                  <span>{rutina?.nombre ?? "Sin rutina"}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          // La llave recarga el formulario con lo guardado (los select no toman el valor nuevo por sí solos).
          <Formulario
            key={`${plan?.estado}-${[...(plan?.asignaciones.values() ?? [])].join()}`}
            accion={guardarPlan}
            boton="Guardar borrador"
            variante="secundario"
            className="mt-3"
          >
            <input type="hidden" name="mes" value={mes} />
            <ul className="divide-y divide-[#2a2d36]">
              {turnos.map((t) => {
                const franja = horario.franja(t.franjaId)!;
                const clave = claveTurno(t.diaSemana, t.franjaId);
                return (
                  <li key={clave} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <span className="font-semibold">
                      {NOMBRE_DIA[t.diaSemana]} · {franja.inicio}–{franja.fin}
                    </span>
                    <select
                      name={`t_${clave}`}
                      defaultValue={plan?.asignaciones.get(clave) ?? ""}
                      className="min-h-11 min-w-[220px] rounded-xl border border-[#2a2d36] bg-[#23262e] px-3 text-sm text-texto"
                      aria-label={`Rutina del ${NOMBRE_DIA[t.diaSemana]} ${franja.inicio}`}
                    >
                      <option value="">Sin rutina</option>
                      {rutinas.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nombre}
                        </option>
                      ))}
                    </select>
                  </li>
                );
              })}
            </ul>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="fijo" value="si" defaultChecked={plan?.esFijo ?? true} className="h-5 w-5 accent-[#d7263d]" />
              Plan fijo: cada mes te preguntamos si lo mantienes
            </label>
            <button type="submit" name="accion" value="enviar" className="min-h-12 rounded-xl bg-acento px-5 font-semibold text-white">
              Enviar a la administración
            </button>
          </Formulario>
        )}
        {!editable && <p className="mt-2 text-xs text-texto-suave">{plan?.estado === "enviado" ? "En revisión: no se puede editar." : "Aprobado. Para cambiarlo, arma el plan del mes siguiente."}</p>}
      </Desplegable>

      {detalle.length > 0 && (
        <Desplegable titulo="Historial">
          <ul className="mt-1 text-sm">
            {detalle.map((p) => (
              <li key={p.id} className="flex justify-between py-1">
                <span>{nombreMes(p.mes)}</span>
                <Estado valor={ESTADO_PLAN[p.estado][0]} texto={ESTADO_PLAN[p.estado][1]} />
              </li>
            ))}
          </ul>
        </Desplegable>
      )}
    </>
  );
}

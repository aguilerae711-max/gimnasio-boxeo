import Link from "next/link";
import { notFound } from "next/navigation";
import { diferencias } from "@/modules/biblioteca/domain/Planes";
import { NOMBRE_DIA } from "@/modules/operacion/domain/Horario";
import { Fecha } from "@/shared/domain/Fecha";
import { casosDeBiblioteca, casosDeOperacion } from "../../../../_servidor/contenedor";
import { requerirSesion } from "../../../../_servidor/sesion";
import { ESTADO_PLAN, nombreMes, TIPO_BLOQUE } from "../../../../_ui/formato";
import { Formulario } from "../../../../_ui/Formulario";
import { Campo, Estado, Tarjeta, Titulo } from "../../../../_ui/piezas";
import { revisarPlan } from "../../../biblioteca/acciones";

/** La administración revisa solo lo que cambió contra el plan aprobado del mes anterior. */
export default async function RevisarPlan({ params }: { params: Promise<{ id: string }> }) {
  const sesion = await requerirSesion("plan.aprobar");
  const { id } = await params;
  const casos = casosDeBiblioteca(sesion.permisos, sesion.zonaHoraria);
  const detalle = await casos.consultas.detallePlan(sesion.gimnasioId, id);
  if (!detalle) notFound();
  const mesAnterior = Fecha.de(`${detalle.mes}-01`).sumarMeses(-1).mes;
  const [plan, anterior, nombres, horario, rutinas] = await Promise.all([
    casos.repositorio.planPorId(sesion.gimnasioId, id),
    casos.repositorio.plan(sesion.gimnasioId, detalle.coachId, mesAnterior),
    casos.consultas.nombresDeRutinas(sesion.gimnasioId, detalle.coachId),
    casosDeOperacion(sesion.permisos, sesion.zonaHoraria).repositorio.horario(sesion.gimnasioId),
    casos.consultas.rutinas(sesion.gimnasioId, detalle.coachId),
  ]);
  const base = anterior?.estado === "aprobado" ? anterior.asignaciones : null;
  const cambios = diferencias(base, plan!.asignaciones);
  const turno = (clave: string) => {
    const [dia, franjaId] = clave.split(":");
    const f = horario.franja(franjaId);
    return `${NOMBRE_DIA[Number(dia)]} ${f ? `${f.inicio}–${f.fin}` : ""}`;
  };
  const nombre = (id: string | null) => (id ? (nombres.get(id) ?? "—") : "Sin rutina");
  const usadas = new Set(plan!.asignaciones.values());
  const [color, texto] = ESTADO_PLAN[detalle.estado];

  return (
    <>
      <Link href={`/admin/planes?mes=${detalle.mes}`} className="text-sm">
        ← Planes
      </Link>
      <Titulo antetitulo={`Coach ${detalle.apodo} · ${nombreMes(detalle.mes)}`}>Plan de trabajo</Titulo>
      <div className="flex items-center gap-2">
        <Estado valor={color} texto={texto} />
        {detalle.esFijo && <span className="text-xs text-texto-suave">plan fijo</span>}
      </div>

      <Tarjeta className={detalle.estado === "enviado" ? "border-2 border-acento" : ""}>
        <h2 className="font-titulos text-2xl font-bold uppercase">{base ? `Cambios contra ${nombreMes(mesAnterior)}` : "Primer plan"}</h2>
        {cambios.length === 0 ? (
          <p className="mt-1 text-sm text-texto-suave">Sin cambios.</p>
        ) : (
          <ul className="mt-2 divide-y divide-[#2a2d36] text-sm">
            {cambios.map((c) => (
              <li key={c.turno} className="flex flex-wrap justify-between gap-2 py-2">
                <span className="font-semibold">{turno(c.turno)}</span>
                <span>
                  {base && <span className="text-texto-suave line-through">{nombre(c.antes)}</span>} → <b>{nombre(c.ahora)}</b>
                </span>
              </li>
            ))}
          </ul>
        )}
        {detalle.estado === "enviado" && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Formulario accion={revisarPlan} boton="Aprobar">
              <input type="hidden" name="planId" value={id} />
              <input type="hidden" name="decision" value="aprobar" />
            </Formulario>
            <Formulario accion={revisarPlan} boton="Pedir cambios" variante="secundario">
              <input type="hidden" name="planId" value={id} />
              <input type="hidden" name="decision" value="pedir_cambios" />
              <Campo etiqueta="Qué debe cambiar" name="comentario" required />
            </Formulario>
          </div>
        )}
      </Tarjeta>

      <Tarjeta>
        <h2 className="font-titulos text-2xl font-bold uppercase">Rutinas del plan</h2>
        {rutinas
          .filter((r) => usadas.has(r.id))
          .map((r) => (
            <div key={r.id} className="mt-3">
              <p className="font-semibold">{r.nombre}</p>
              <p className="text-sm text-texto-suave">
                {r.bloques.map((b) => `${b.minutos}′ ${TIPO_BLOQUE[b.tipo] ?? b.tipo}${b.elementos.length ? `: ${b.elementos.map((e) => e.ejercicio ?? e.combinacion).join(", ")}` : ""}`).join(" · ")}
              </p>
            </div>
          ))}
      </Tarjeta>
    </>
  );
}

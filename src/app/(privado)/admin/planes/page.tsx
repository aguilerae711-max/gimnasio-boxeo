import Link from "next/link";
import { Fecha } from "@/shared/domain/Fecha";
import { casosDeBiblioteca } from "../../../_servidor/contenedor";
import { requerirSesion } from "../../../_servidor/sesion";
import { ESTADO_PLAN, nombreMes } from "../../../_ui/formato";
import { Estado, Tarjeta, Titulo } from "../../../_ui/piezas";

export default async function Planes({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const sesion = await requerirSesion("plan.aprobar");
  const hoy = Fecha.hoyEn(sesion.zonaHoraria, new Date());
  const siguiente = Fecha.de(`${hoy.mes}-01`).sumarMeses(1).mes;
  const mes = (await searchParams).mes === siguiente ? siguiente : hoy.mes;
  const planes = await casosDeBiblioteca(sesion.permisos, sesion.zonaHoraria).consultas.planesDelMes(sesion.gimnasioId, mes);

  return (
    <>
      <Titulo antetitulo="Planes de trabajo">¿Qué hará cada coach?</Titulo>
      <div className="flex gap-2">
        {[hoy.mes, siguiente].map((m) => (
          <Link
            key={m}
            href={`/admin/planes?mes=${m}`}
            className={`rounded-full px-4 py-2 text-sm font-semibold no-underline ${m === mes ? "bg-acento text-white" : "bg-tarjeta text-[#c9ccd3]"}`}
          >
            {nombreMes(m)}
          </Link>
        ))}
      </div>
      <Tarjeta>
        <ul className="divide-y divide-[#2a2d36]">
          {planes.map((p) => {
            const [color, texto] = p.estado ? ESTADO_PLAN[p.estado] : ["baja", "sin plan"];
            return (
              <li key={p.coachId} className="flex items-center justify-between gap-3 py-3">
                <span className="flex items-center gap-2 font-semibold">
                  <span className="h-3 w-3 rounded" style={{ background: p.color }} /> Coach {p.apodo}
                  {p.planId && <span className="text-xs font-normal text-texto-suave">{p.turnos} turnos</span>}
                </span>
                <span className="flex items-center gap-3">
                  <Estado valor={color} texto={texto} />
                  {p.planId && (
                    <Link href={`/admin/planes/${p.planId}`} className="text-sm">
                      {p.estado === "enviado" ? "Revisar" : "Ver"}
                    </Link>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </Tarjeta>
    </>
  );
}

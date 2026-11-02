import Link from "next/link";
import { NOMBRE_DIA } from "@/modules/operacion/domain/Horario";
import { casosDeOperacion } from "../../../_servidor/contenedor";
import { requerirSesion } from "../../../_servidor/sesion";
import { Formulario } from "../../../_ui/Formulario";
import { Campo, Tarjeta, Titulo } from "../../../_ui/piezas";
import { asignarTurno, quitarTurno } from "./acciones";

export default async function HorarioAdmin({ searchParams }: { searchParams: Promise<{ dia?: string; franja?: string }> }) {
  const sesion = await requerirSesion("horario.asignar");
  const casos = casosDeOperacion(sesion.permisos, sesion.zonaHoraria);
  const [horario, coaches] = await Promise.all([casos.repositorio.horario(sesion.gimnasioId), casos.consultas.coaches(sesion.gimnasioId)]);
  const coach = (id: string) => coaches.find((c) => c.id === id);
  const enCelda = (dia: number, franjaId: string) =>
    horario.asignaciones
      .filter((a) => a.diaSemana === dia && a.franjaId === franjaId)
      .sort((a, b) => (coach(a.coachId)?.apodo ?? "").localeCompare(coach(b.coachId)?.apodo ?? ""));

  const filtro = await searchParams;
  const dia = Number(filtro.dia);
  const franja = horario.franja(filtro.franja ?? "");
  const seleccion = franja && horario.dias.includes(dia) ? { dia, franja } : null;

  return (
    <>
      <Titulo antetitulo="Operación">Horario</Titulo>
      <p className="-mt-2 text-sm text-texto-suave">Toca una celda para poner o quitar coaches. Puede haber varios coaches en el mismo turno.</p>

      <div className="flex flex-wrap gap-3 text-sm">
        {coaches.map((c) => (
          <span key={c.id} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded" style={{ background: c.color }} /> Coach {c.apodo}
          </span>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="overflow-x-auto rounded-2xl bg-tarjeta p-3">
          <table className="w-full min-w-[560px] table-fixed border-separate border-spacing-1.5 text-sm">
            <thead>
              <tr>
                <th className="w-16" />
                {horario.dias.map((d) => (
                  <th key={d} className="pb-1 text-left font-semibold text-texto-suave">
                    {NOMBRE_DIA[d].slice(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {horario.franjas.map((f) => (
                <tr key={f.id}>
                  <td className="whitespace-nowrap pr-1 align-top font-titulos text-base font-bold">{f.inicio.slice(0, 2)}–{f.fin.slice(0, 2)}</td>
                  {horario.dias.map((d) => {
                    const activa = seleccion?.dia === d && seleccion.franja.id === f.id;
                    return (
                      <td key={d} className="align-top">
                        <Link
                          href={`/admin/horario?dia=${d}&franja=${f.id}`}
                          scroll={false}
                          className={`flex min-h-14 flex-col gap-1 rounded-lg p-1.5 no-underline ${activa ? "outline-2 outline-acento outline" : ""} bg-[#23262e]`}
                          aria-label={`${NOMBRE_DIA[d]} ${f.inicio}`}
                        >
                          {enCelda(d, f.id).map((a) => (
                            <span
                              key={a.id}
                              className="truncate rounded px-1.5 py-0.5 text-xs font-semibold text-[#121317]"
                              style={{ background: coach(a.coachId)?.color }}
                            >
                              {coach(a.coachId)?.apodo}
                            </span>
                          ))}
                        </Link>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Tarjeta className={seleccion ? "border-2 border-acento" : ""}>
          {!seleccion ? (
            <p className="text-sm text-texto-suave">Elige una celda del horario.</p>
          ) : (
            <>
              <h2 className="font-titulos text-2xl font-bold uppercase">
                {NOMBRE_DIA[seleccion.dia]} {seleccion.franja.inicio}–{seleccion.franja.fin}
              </h2>
              <ul className="mt-2 divide-y divide-[#2a2d36]">
                {enCelda(seleccion.dia, seleccion.franja.id).map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 py-2.5">
                    <span className="flex items-center gap-2 font-semibold">
                      <span className="h-3 w-3 rounded" style={{ background: coach(a.coachId)?.color }} />
                      Coach {coach(a.coachId)?.apodo}
                      {a.cupoMax && <span className="text-xs font-normal text-texto-suave">cupo {a.cupoMax}</span>}
                    </span>
                    <form action={quitarTurno}>
                      <input type="hidden" name="asignacionId" value={a.id} />
                      <button className="min-h-9 rounded-lg border border-[#3a3d46] px-3 text-xs font-semibold">Quitar</button>
                    </form>
                  </li>
                ))}
                {enCelda(seleccion.dia, seleccion.franja.id).length === 0 && <li className="py-2 text-sm text-texto-suave">Sin coaches en este turno.</li>}
              </ul>
              <Formulario accion={asignarTurno} boton="Agregar al turno" className="mt-4">
                <input type="hidden" name="dia" value={seleccion.dia} />
                <input type="hidden" name="franjaId" value={seleccion.franja.id} />
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-[#c9ccd3]">Coach</span>
                  <select name="coachId" required className="min-h-12 rounded-xl border border-[#2a2d36] bg-[#23262e] px-3 text-base text-texto">
                    {coaches.map((c) => (
                      <option key={c.id} value={c.id}>
                        Coach {c.apodo}
                      </option>
                    ))}
                  </select>
                </label>
                <Campo etiqueta="Cupo (opcional)" name="cupo" type="number" min={1} max={100} inputMode="numeric" />
              </Formulario>
            </>
          )}
        </Tarjeta>
      </div>
    </>
  );
}

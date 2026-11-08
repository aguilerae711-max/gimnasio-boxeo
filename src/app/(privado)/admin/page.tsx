import Link from "next/link";
import { casosDeAcceso, casosDeClientes, casosDeSolicitudes, casosDeSolicitudesCoach } from "../../_servidor/contenedor";
import { requerirSesion } from "../../_servidor/sesion";
import { Estado, Tarjeta, Titulo } from "../../_ui/piezas";
import { atenderSolicitud, descartarSolicitudCoach, revisarCliente } from "./acciones";
import { AprobarCoach } from "./AprobarCoach";
import { AgregarAlEquipo } from "./AgregarAlEquipo";
import { GenerarEnlace } from "./GenerarEnlace";

const NOMBRE_ROL: Record<string, string> = { admin: "Administración", coach: "Coach" };
const GRUPOS_EQUIPO = [
  { rol: "admin", titulo: "Administración" },
  { rol: "coach", titulo: "Coaches" },
] as const;

export default async function Administracion() {
  const sesion = await requerirSesion("cliente.aprobar");
  const clientes = casosDeClientes().consultas;
  const [pendientes, todos, equipo, solicitudes, aspirantes] = await Promise.all([
    clientes.delGimnasio(sesion.gimnasioId, "pendiente"),
    clientes.delGimnasio(sesion.gimnasioId),
    (await casosDeAcceso()).equipo.delGimnasio(sesion.gimnasioId),
    casosDeSolicitudes(sesion.permisos).repositorio.pendientes(sesion.gimnasioId),
    sesion.permisos.includes("equipo.agregar") ? casosDeSolicitudesCoach(sesion.permisos).repositorio.pendientes(sesion.gimnasioId) : [],
  ]);
  const puedeEnlazar = sesion.permisos.includes("usuario.enlace_acceso");


  return (
    <>
      <Titulo antetitulo={`Hola, ${sesion.nombre}`}>Administración</Titulo>

      <Tarjeta>
        <h2 className="font-titulos text-2xl font-bold uppercase">Registros por aprobar</h2>
        {pendientes.length === 0 ? (
          <p className="mt-2 text-sm text-texto-suave">No hay registros pendientes. Cuando un cliente se registre con su coach, aparece aquí.</p>
        ) : (
          <ul className="mt-2 divide-y divide-[#2a2d36]">
            {pendientes.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold">{c.nombre}</p>
                  <p className="text-sm text-texto-suave">
                    Coach {c.coach} · {c.correo}
                    {c.telefono ? ` · ${c.telefono}` : ""}
                  </p>
                </div>
                <form action={revisarCliente} className="flex gap-2">
                  <input type="hidden" name="clienteId" value={c.id} />
                  <button name="decision" value="aprobar" className="min-h-11 rounded-xl bg-acento px-4 text-sm font-semibold text-white">
                    Aprobar
                  </button>
                  <button name="decision" value="rechazar" className="min-h-11 rounded-xl border border-[#3a3d46] px-4 text-sm font-semibold">
                    Rechazar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      {solicitudes.length > 0 && (
        <Tarjeta className="border-2 border-acento">
          <h2 className="font-titulos text-2xl font-bold uppercase">Clases de prueba por agendar</h2>
          <ul className="mt-2 divide-y divide-[#2a2d36]">
            {solicitudes.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold">{s.nombre}</p>
                  <p className="text-sm text-texto-suave">
                    {s.telefono}
                    {s.franja ? ` · prefiere ${s.franja}` : ""}
                    {s.comentario ? ` · “${s.comentario}”` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`https://wa.me/52${s.telefono.slice(-10)}?text=${encodeURIComponent(`Hola ${s.nombre.split(" ")[0]}, te escribimos del gimnasio por tu clase de prueba.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-11 items-center rounded-xl bg-[#1f7a4d] px-4 text-sm font-semibold text-white no-underline"
                  >
                    WhatsApp
                  </a>
                  <form action={atenderSolicitud} className="flex gap-2">
                    <input type="hidden" name="id" value={s.id} />
                    <button name="estado" value="contactado" className="min-h-11 rounded-xl border border-[#3a3d46] px-3 text-sm font-semibold">
                      Ya la agendé
                    </button>
                    <button name="estado" value="descartado" className="min-h-11 rounded-xl border border-[#3a3d46] px-3 text-sm font-semibold text-texto-suave">
                      Descartar
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}

      {aspirantes.length > 0 && (
        <Tarjeta className="border-2 border-[#4fa3ff]">
          <h2 className="font-titulos text-2xl font-bold uppercase">Quieren ser coach</h2>
          <ul className="mt-2 divide-y divide-[#2a2d36]">
            {aspirantes.map((a) => (
              <li key={a.id} className="flex flex-col gap-2 py-3">
                <div>
                  <p className="font-semibold">{a.nombre}</p>
                  <p className="text-sm text-texto-suave">
                    {a.telefono}
                    {a.disponibilidad ? ` · ${a.disponibilidad}` : ""}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm text-[#c9ccd3]">{a.experiencia}</p>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <a
                    href={`https://wa.me/52${a.telefono.slice(-10)}?text=${encodeURIComponent(`Hola ${a.nombre.split(" ")[0]}, te escribimos del gimnasio por tu solicitud para ser coach.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-11 items-center rounded-xl bg-[#1f7a4d] px-4 text-sm font-semibold text-white no-underline"
                  >
                    WhatsApp
                  </a>
                  <AprobarCoach id={a.id} />
                  <form action={descartarSolicitudCoach}>
                    <input type="hidden" name="id" value={a.id} />
                    <button className="min-h-11 rounded-xl border border-[#3a3d46] px-3 text-sm font-semibold text-texto-suave">Descartar</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <Tarjeta>
          <h2 className="font-titulos text-2xl font-bold uppercase">Equipo</h2>
          <p className="text-sm text-texto-suave">Para que alguien active su cuenta o cambie su contraseña, genera su enlace y mándaselo.</p>
          {GRUPOS_EQUIPO.map(({ rol, titulo }) => {
            const miembros = equipo.filter((m) => m.roles.includes(rol));
            return (
              <details key={rol} open={rol === "admin"} className="mt-3 rounded-xl border border-[#2a2d36] px-4 py-2">
                <summary className="cursor-pointer py-1 font-semibold">
                  {titulo} <span className="font-normal text-texto-suave">({miembros.length})</span>
                </summary>
                {miembros.length === 0 ? (
                  <p className="py-2 text-sm text-texto-suave">Nadie todavía.</p>
                ) : (
                  <ul className="divide-y divide-[#2a2d36]">
                    {miembros.map((m, i) => (
                      <li key={m.usuarioId} className="flex flex-wrap items-start justify-between gap-3 py-3">
                        <div className="flex min-w-0 gap-3">
                          <span className="w-5 shrink-0 pt-0.5 text-sm tabular-nums text-texto-suave">{i + 1}</span>
                          <div className="min-w-0">
                            <p className="font-semibold">
                              {m.nombre} <Estado valor={m.estado} texto={m.estado === "activo" ? "cuenta activa" : "sin activar"} />
                            </p>
                            <p className="text-sm text-texto-suave">
                              {m.roles.length > 1 && <>{m.roles.map((r) => NOMBRE_ROL[r] ?? r).join(" y ")} · </>}
                              {m.usuario ? <>entra como <b className="text-texto">{m.usuario}</b></> : "sin usuario corto"}
                            </p>
                          </div>
                        </div>
                        {puedeEnlazar && m.usuarioId !== sesion.usuarioId && (
                          <div className="w-full sm:w-auto">
                            <GenerarEnlace usuarioId={m.usuarioId} nombre={m.nombre} activa={m.estado === "activo"} />
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            );
          })}
          {sesion.permisos.includes("equipo.agregar") && <AgregarAlEquipo />}
        </Tarjeta>

        <Tarjeta>
          <h2 className="font-titulos text-2xl font-bold uppercase">Clientes</h2>
          {todos.length === 0 ? (
            <p className="mt-2 text-sm text-texto-suave">Aún no hay clientes. Cada coach tiene su enlace de invitación en “Mis clientes”.</p>
          ) : (
            <ul className="mt-2 divide-y divide-[#2a2d36]">
              {todos.map((c) => (
                <li key={c.id}>
                  <Link href={`/admin/clientes/${c.id}`} className="flex items-center justify-between gap-3 py-3 text-texto no-underline">
                    <div className="min-w-0">
                      <p className="font-semibold">{c.nombre}</p>
                      <p className="text-sm text-texto-suave">Coach {c.coach}</p>
                    </div>
                    <Estado valor={c.estado} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>
    </>
  );
}

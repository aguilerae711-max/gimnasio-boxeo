import Link from "next/link";
import { casosDeAcceso, casosDeClientes } from "../../_servidor/contenedor";
import { requerirSesion } from "../../_servidor/sesion";
import { Estado, Tarjeta, Titulo } from "../../_ui/piezas";
import { revisarCliente } from "./acciones";
import { GenerarEnlace } from "./GenerarEnlace";

const NOMBRE_ROL: Record<string, string> = { admin: "Administración", coach: "Coach", superadmin: "Superadmin" };

export default async function Administracion() {
  const sesion = await requerirSesion("cliente.aprobar");
  const clientes = casosDeClientes().consultas;
  const [pendientes, todos, equipo] = await Promise.all([
    clientes.delGimnasio(sesion.gimnasioId, "pendiente"),
    clientes.delGimnasio(sesion.gimnasioId),
    (await casosDeAcceso()).equipo.delGimnasio(sesion.gimnasioId),
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

      <div className="grid gap-5 md:grid-cols-2">
        <Tarjeta>
          <h2 className="font-titulos text-2xl font-bold uppercase">Equipo</h2>
          <p className="text-sm text-texto-suave">Para que alguien active su cuenta o cambie su contraseña, genera su enlace y mándaselo.</p>
          <ul className="mt-2 divide-y divide-[#2a2d36]">
            {equipo.map((m) => (
              <li key={m.usuarioId} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {m.nombre} <Estado valor={m.estado} texto={m.estado === "activo" ? "cuenta activa" : "sin activar"} />
                  </p>
                  <p className="text-sm text-texto-suave">{m.roles.map((r) => NOMBRE_ROL[r] ?? r).join(" · ")}</p>
                </div>
                {puedeEnlazar && m.usuarioId !== sesion.usuarioId && (
                  <div className="w-full sm:w-auto">
                    <GenerarEnlace usuarioId={m.usuarioId} nombre={m.nombre} activa={m.estado === "activo"} />
                  </div>
                )}
              </li>
            ))}
          </ul>
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

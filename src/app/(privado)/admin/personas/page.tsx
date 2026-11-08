import Link from "next/link";
import { casosDeAcceso, casosDeClientes } from "../../../_servidor/contenedor";
import { requerirSesion } from "../../../_servidor/sesion";
import { Desplegable, Estado, Filas, Titulo, Vacio } from "../../../_ui/piezas";
import { AgregarAlEquipo } from "../AgregarAlEquipo";
import { GenerarEnlace } from "../GenerarEnlace";

const NOMBRE_ROL: Record<string, string> = { admin: "Administración", coach: "Coach" };
const ESTADO_CLIENTE: Record<string, string> = { activo: "activo", pendiente: "por aprobar", rechazado: "rechazado", baja: "baja" };

/** Personas de la administración: clientes agrupados por coach y el equipo (administración y coaches). */
export default async function Personas() {
  const sesion = await requerirSesion("cliente.aprobar");
  const [clientes, equipo] = await Promise.all([
    casosDeClientes().consultas.delGimnasio(sesion.gimnasioId),
    (await casosDeAcceso()).equipo.delGimnasio(sesion.gimnasioId),
  ]);
  const puedeEnlazar = sesion.permisos.includes("usuario.enlace_acceso");
  const vigentes = clientes.filter((c) => c.estado === "activo" || c.estado === "pendiente");
  const anteriores = clientes.filter((c) => c.estado !== "activo" && c.estado !== "pendiente");
  const porCoach = [...new Set(vigentes.map((c) => c.coach))].sort().map((coach) => ({ coach, clientes: vigentes.filter((c) => c.coach === coach) }));

  const filaCliente = (c: (typeof clientes)[number]) => (
    <li key={c.id}>
      <Link href={`/admin/clientes/${c.id}`} className="flex items-center justify-between gap-3 py-2.5 text-texto no-underline hover:text-white">
        <span className="truncate font-medium">{c.nombre}</span>
        {c.estado !== "activo" && <Estado valor={c.estado} texto={ESTADO_CLIENTE[c.estado]} />}
      </Link>
    </li>
  );

  return (
    <>
      <Titulo antetitulo="Personas">Equipo</Titulo>

      <Desplegable titulo="Clientes" cuenta={vigentes.length} abierto>
        {porCoach.length === 0 ? (
          <Vacio>Aún no hay clientes. Cada coach tiene su invitación en su pantalla Hoy.</Vacio>
        ) : (
          <div className="flex flex-col gap-2">
            {porCoach.map((g) => (
              <details key={g.coach} className="rounded-xl border border-borde px-4" open={porCoach.length === 1}>
                <summary className="flex min-h-12 cursor-pointer items-center gap-2 font-semibold">
                  <span aria-hidden className="flecha text-[10px] text-texto-suave transition-transform">
                    ▶
                  </span>
                  Coach {g.coach}
                  <span className="cifras text-sm font-normal text-texto-suave">({g.clientes.length})</span>
                </summary>
                <Filas>{g.clientes.map(filaCliente)}</Filas>
              </details>
            ))}
          </div>
        )}
        {anteriores.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-semibold text-texto-suave">Bajas y rechazados ({anteriores.length})</summary>
            <Filas>{anteriores.map(filaCliente)}</Filas>
          </details>
        )}
      </Desplegable>

      {(["admin", "coach"] as const).map((rol) => {
        const miembros = equipo.filter((m) => m.roles.includes(rol));
        return (
          <Desplegable key={rol} titulo={rol === "admin" ? "Administración" : "Coaches"} cuenta={miembros.length}>
            {miembros.length === 0 ? (
              <Vacio>Nadie todavía.</Vacio>
            ) : (
              <Filas>
                {miembros.map((m, i) => (
                  <li key={m.usuarioId} className="flex flex-wrap items-start justify-between gap-3 py-3">
                    <div className="flex min-w-0 gap-3">
                      <span className="cifras w-5 shrink-0 pt-0.5 text-sm text-texto-suave">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="font-semibold">
                          {m.nombre} {m.estado !== "activo" && <Estado valor="pendiente" texto="sin activar" />}
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
              </Filas>
            )}
          </Desplegable>
        );
      })}

      {sesion.permisos.includes("equipo.agregar") && (
        <Desplegable titulo="Agregar al equipo">
          <AgregarAlEquipo />
        </Desplegable>
      )}
    </>
  );
}

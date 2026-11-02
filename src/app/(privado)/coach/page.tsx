import { redirect } from "next/navigation";
import { NOMBRE_DIA } from "@/modules/operacion/domain/Horario";
import { Fecha } from "@/shared/domain/Fecha";
import { casosDeAcceso, casosDeOperacion } from "../../_servidor/contenedor";
import { direccionPublica, requerirSesion } from "../../_servidor/sesion";
import { CopiarEnlace } from "../../_ui/CopiarEnlace";
import { Estado, Tarjeta, Titulo } from "../../_ui/piezas";

/** Día de la semana (0 = domingo) en la zona del gimnasio. */
const diaDeHoy = (zona: string) => new Date(`${Fecha.hoyEn(zona, new Date()).valor}T12:00:00Z`).getUTCDay();

export default async function MisClientes() {
  const sesion = await requerirSesion();
  if (!sesion.roles.includes("coach")) redirect("/panel");
  const operacion = casosDeOperacion(sesion.permisos, sesion.zonaHoraria);
  const [codigo, yo, horario] = await Promise.all([
    (await casosDeAcceso()).equipo.invitacionDe(sesion.gimnasioId, sesion.usuarioId),
    operacion.repositorio.coachDelUsuario(sesion.gimnasioId, sesion.usuarioId),
    operacion.repositorio.horario(sesion.gimnasioId),
  ]);
  if (!yo) redirect("/panel");
  const clientes = await operacion.consultas.clientesDelCoach(sesion.gimnasioId, yo.id);
  const perfiles = new Map(
    await Promise.all(clientes.map(async (c) => [c.clienteId, await operacion.consultas.perfilCliente(sesion.gimnasioId, c.clienteId)] as const)),
  );
  const turnos = horario.turnosDe(yo.id);
  const hoy = diaDeHoy(sesion.zonaHoraria);
  const activos = clientes.filter((c) => c.estado === "activo").length;
  const sinFranja = clientes.filter((c) => !c.franjaId);

  return (
    <>
      <Titulo antetitulo={`Coach ${sesion.nombre}`}>Mis turnos y clientes</Titulo>

      <Tarjeta>
        <div className="flex items-baseline justify-between">
          <h2 className="font-titulos text-2xl font-bold uppercase">Mis turnos</h2>
          <span className="text-sm text-texto-suave">{activos} clientes activos</span>
        </div>
        {turnos.length === 0 ? (
          <p className="mt-2 text-sm text-texto-suave">Aún no tienes turnos. La administración te los asigna en el horario.</p>
        ) : (
          <ul className="mt-2 divide-y divide-[#2a2d36]">
            {turnos.map((t) => {
              const franja = horario.franja(t.franjaId)!;
              const enTurno = clientes.filter((c) => c.franjaId === t.franjaId);
              return (
                <li key={t.id} className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">
                      {NOMBRE_DIA[t.diaSemana]} · {franja.inicio}–{franja.fin}
                      {t.diaSemana === hoy && <span className="ml-2 rounded-full bg-acento px-2 py-0.5 text-xs text-white">Hoy</span>}
                    </span>
                    <span className="text-sm text-texto-suave">
                      {enTurno.length}
                      {t.cupoMax ? ` / ${t.cupoMax}` : ""} clientes
                    </span>
                  </div>
                  {enTurno.length > 0 && <p className="mt-1 text-sm text-texto-suave">{enTurno.map((c) => c.nombre).join(", ")}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </Tarjeta>

      {codigo && (
        <Tarjeta>
          <h2 className="font-titulos text-2xl font-bold uppercase">Tu invitación</h2>
          <p className="mb-3 text-sm text-texto-suave">
            Mándala a quien vaya a entrenar contigo. Se registra, queda asignado a ti y la administración lo aprueba.
          </p>
          <CopiarEnlace enlace={`${await direccionPublica()}/registro/${codigo}`} mensaje="Regístrate en el gimnasio con este enlace:" />
        </Tarjeta>
      )}

      <Tarjeta>
        <h2 className="font-titulos text-2xl font-bold uppercase">Clientes</h2>
        {clientes.length === 0 ? (
          <p className="mt-2 text-sm text-texto-suave">Aún no tienes clientes: compárteles tu invitación.</p>
        ) : (
          <ul className="mt-2 divide-y divide-[#2a2d36]">
            {clientes.map((c) => {
              const perfil = perfiles.get(c.clienteId);
              const franja = c.franjaId ? horario.franja(c.franjaId) : null;
              return (
                <li key={c.clienteId} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{c.nombre}</p>
                      <p className="text-sm text-texto-suave">{franja ? `${franja.inicio}–${franja.fin}` : "Sin franja asignada"}</p>
                    </div>
                    <Estado valor={c.estado} texto={c.estado === "pendiente" ? "por aprobar" : c.estado} />
                  </div>
                  {(perfil?.contactoEmergencia || perfil?.notasMedicas) && (
                    <details className="mt-2 rounded-lg bg-[#23262e] px-3 py-2 text-sm">
                      <summary className="cursor-pointer font-semibold">Emergencia y salud</summary>
                      {perfil.contactoEmergencia && <p className="mt-1">Contacto: {perfil.contactoEmergencia}</p>}
                      {perfil.notasMedicas && <p className="mt-1">Notas: {perfil.notasMedicas}</p>}
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {sinFranja.length > 0 && (
          <p className="mt-2 text-xs text-texto-suave">Los clientes sin franja aparecen en tus turnos cuando la administración les asigna una.</p>
        )}
      </Tarjeta>
    </>
  );
}

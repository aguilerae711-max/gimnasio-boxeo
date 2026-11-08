import { redirect } from "next/navigation";
import { claveTurno, planVigente } from "@/modules/biblioteca/domain/Planes";
import { NOMBRE_DIA } from "@/modules/operacion/domain/Horario";
import { Fecha } from "@/shared/domain/Fecha";
import { DIAS_AVISO_ANTICIPADO, situacionDePago } from "@/modules/membresias/domain/Cuentas";
import { casosDeAcceso, casosDeBiblioteca, casosDeOperacion, casosDePagos } from "../../_servidor/contenedor";
import { BOTON_WHATSAPP, fechaCorta, textoVencimiento, whatsapp } from "../../_ui/formato";
import { direccionPublica, requerirSesion } from "../../_servidor/sesion";
import { CopiarEnlace } from "../../_ui/CopiarEnlace";
import { Desplegable, Estado, Filas, Tarjeta, Titulo, Vacio } from "../../_ui/piezas";

/** Día de la semana (0 = domingo) en la zona del gimnasio. */
const diaDeHoy = (zona: string) => new Date(`${Fecha.hoyEn(zona, new Date()).valor}T12:00:00Z`).getUTCDay();

/** Días pagados que le quedan a un cliente, con color de semáforo. */
function DiasPagados({ dias }: { dias: number | null }) {
  if (dias === null) return <Estado valor="baja" texto="sin pago" />;
  if (dias <= 0) return <Estado valor="rechazado" texto="vencida" />;
  return <Estado valor={dias <= DIAS_AVISO_ANTICIPADO ? "pendiente" : "activo"} texto={`${dias} ${dias === 1 ? "día" : "días"}`} />;
}

export default async function HoyCoach() {
  const sesion = await requerirSesion();
  if (!sesion.roles.includes("coach")) redirect("/panel");
  const operacion = casosDeOperacion(sesion.permisos, sesion.zonaHoraria);
  const [codigo, yo, horario] = await Promise.all([
    (await casosDeAcceso()).equipo.invitacionDe(sesion.gimnasioId, sesion.usuarioId),
    operacion.repositorio.coachDelUsuario(sesion.gimnasioId, sesion.usuarioId),
    operacion.repositorio.horario(sesion.gimnasioId),
  ]);
  if (!yo) redirect("/panel");
  const [clientes, periodos] = await Promise.all([
    operacion.consultas.clientesDelCoach(sesion.gimnasioId, yo.id),
    casosDePagos(sesion.permisos, sesion.zonaHoraria).consultas.periodos(sesion.gimnasioId),
  ]);
  const fechaHoy = Fecha.hoyEn(sesion.zonaHoraria, new Date());
  const pago = new Map(clientes.map((c) => [c.clienteId, situacionDePago(periodos.get(c.clienteId) ?? [], fechaHoy)]));
  // Aviso una semana antes y seguimiento de quien se le venció en las últimas dos semanas.
  const porVencer = clientes
    .filter((c) => c.estado === "activo")
    .map((c) => ({ ...c, ...pago.get(c.clienteId)! }))
    .filter((c): c is typeof c & { dias: number } => c.dias !== null && c.dias <= DIAS_AVISO_ANTICIPADO && c.dias > -14)
    .sort((a, b) => a.dias - b.dias);
  const perfiles = new Map(
    await Promise.all(clientes.map(async (c) => [c.clienteId, await operacion.consultas.perfilCliente(sesion.gimnasioId, c.clienteId)] as const)),
  );
  const turnos = horario.turnosDe(yo.id);
  // La rutina de cada turno sale del plan vigente (el aprobado; si el nuevo está en revisión, el anterior).
  const biblioteca = casosDeBiblioteca(sesion.permisos, sesion.zonaHoraria);
  const vigente = planVigente(await biblioteca.consultas.planesDelCoach(sesion.gimnasioId, yo.id), Fecha.hoyEn(sesion.zonaHoraria, new Date()).mes);
  const [plan, nombresRutinas] = await Promise.all([
    vigente ? biblioteca.repositorio.planPorId(sesion.gimnasioId, vigente.id) : null,
    biblioteca.consultas.nombresDeRutinas(sesion.gimnasioId, yo.id),
  ]);
  const hoy = diaDeHoy(sesion.zonaHoraria);
  const activos = clientes.filter((c) => c.estado === "activo").length;
  const sinFranja = clientes.filter((c) => !c.franjaId);

  const deHoy = turnos.filter((t) => t.diaSemana === hoy);
  // Si hoy no hay turno, el siguiente de la semana.
  const proximo = deHoy.length === 0 ? [...turnos].sort((a, b) => ((a.diaSemana - hoy + 7) % 7) - ((b.diaSemana - hoy + 7) % 7))[0] : null;
  const rutinaDe = (t: (typeof turnos)[number]) => {
    const id = plan?.asignaciones.get(claveTurno(t.diaSemana, t.franjaId));
    return id ? nombresRutinas.get(id) : null;
  };
  const porAprobar = clientes.filter((c) => c.estado === "pendiente").length;

  return (
    <>
      <Titulo antetitulo={`Coach ${sesion.nombre.split(" ")[0]}`}>Hoy</Titulo>

      <Tarjeta className="border-acento/60 bg-gradient-to-br from-[#2a1418] to-tarjeta">
        {deHoy.length === 0 ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-texto-suave">Hoy no tienes turno</p>
            {proximo ? (
              <p className="mt-1 font-titulos text-3xl font-extrabold uppercase">
                Siguiente: {NOMBRE_DIA[proximo.diaSemana]} · {horario.franja(proximo.franjaId)!.inicio}
              </p>
            ) : (
              <p className="mt-1 text-sm text-texto-suave">La administración te asigna tus turnos en el horario.</p>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-4">
            {deHoy.map((t) => {
              const franja = horario.franja(t.franjaId)!;
              const enTurno = clientes.filter((c) => c.franjaId === t.franjaId && c.estado === "activo");
              const rutina = rutinaDe(t);
              return (
                <div key={t.id}>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ff8f97]">Tu turno de hoy</p>
                  <p className="cifras font-titulos text-5xl font-extrabold leading-none">
                    {franja.inicio}
                    <span className="text-2xl text-texto-suave">–{franja.fin}</span>
                  </p>
                  <p className="mt-2 text-sm">
                    {rutina ? (
                      <>
                        Rutina: <b>{rutina}</b>
                      </>
                    ) : (
                      <span className="text-texto-suave">Sin rutina en tu plan para este turno.</span>
                    )}
                  </p>
                  <p className="mt-3 text-xs text-texto-suave">
                    {enTurno.length}
                    {t.cupoMax ? ` de ${t.cupoMax}` : ""} {enTurno.length === 1 ? "cliente" : "clientes"}
                  </p>
                  {enTurno.length > 0 && (
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {enTurno.map((c) => (
                        <li key={c.clienteId} className="rounded-full bg-white/[0.07] px-3 py-1 text-sm">
                          {c.nombre.split(" ").slice(0, 2).join(" ")}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Tarjeta>

      {porVencer.length > 0 && (
        <Desplegable titulo="Por vencer" cuenta={porVencer.length} alerta abierto nota="Avísales por WhatsApp">
          <Filas>
            {porVencer.map((c) => (
              <li key={c.clienteId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold">{c.nombre}</p>
                  <p className={`text-sm ${c.dias <= 0 ? "text-[#ff8f97]" : "text-[#f1d9a8]"}`}>
                    {textoVencimiento(c.dias)} · {fechaCorta(c.vence!.valor)}
                  </p>
                </div>
                {c.telefono && (
                  <a
                    href={whatsapp(
                      c.telefono,
                      c.dias > 0
                        ? `Hola ${c.nombre.split(" ")[0]}, tu membresía ${textoVencimiento(c.dias)} (${fechaCorta(c.vence!.valor)}). ¿Te la renuevo? — Coach ${yo.apodo}`
                        : `Hola ${c.nombre.split(" ")[0]}, tu membresía venció el ${fechaCorta(c.vence!.valor)}. Te esperamos para renovarla. — Coach ${yo.apodo}`,
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className={BOTON_WHATSAPP}
                  >
                    WhatsApp
                  </a>
                )}
              </li>
            ))}
          </Filas>
        </Desplegable>
      )}

      <Desplegable titulo="Mis turnos de la semana" cuenta={turnos.length}>
        {turnos.length === 0 ? (
          <Vacio>Aún no tienes turnos. La administración te los asigna en el horario.</Vacio>
        ) : (
          <Filas>
            {turnos.map((t) => {
              const franja = horario.franja(t.franjaId)!;
              const enTurno = clientes.filter((c) => c.franjaId === t.franjaId);
              const rutina = rutinaDe(t);
              return (
                <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {NOMBRE_DIA[t.diaSemana]} · {franja.inicio}–{franja.fin}
                      {t.diaSemana === hoy && <span className="ml-2 rounded-full bg-acento px-2 py-0.5 text-xs text-white">Hoy</span>}
                    </p>
                    <p className="truncate text-sm text-texto-suave">{rutina ? `Rutina: ${rutina}` : "Sin rutina asignada"}</p>
                  </div>
                  <span className="cifras whitespace-nowrap text-sm text-texto-suave">
                    {enTurno.length}
                    {t.cupoMax ? ` / ${t.cupoMax}` : ""}
                  </span>
                </li>
              );
            })}
          </Filas>
        )}
      </Desplegable>

      <Desplegable titulo="Mis clientes" cuenta={activos} nota={porAprobar ? `${porAprobar} por aprobar` : undefined}>
        {clientes.length === 0 ? (
          <Vacio>Aún no tienes clientes: compárteles tu invitación.</Vacio>
        ) : (
          <Filas>
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
                    {c.estado !== "activo" ? (
                      <Estado valor={c.estado} texto={c.estado === "pendiente" ? "por aprobar" : c.estado} />
                    ) : (
                      <DiasPagados dias={pago.get(c.clienteId)?.dias ?? null} />
                    )}
                  </div>
                  {(perfil?.contactoEmergencia || perfil?.notasMedicas) && (
                    <details className="mt-2 rounded-lg bg-white/[0.04] px-3 py-2 text-sm">
                      <summary className="cursor-pointer font-semibold text-[#c9ccd3]">Emergencia y salud</summary>
                      {perfil.contactoEmergencia && <p className="mt-1">Contacto: {perfil.contactoEmergencia}</p>}
                      {perfil.notasMedicas && <p className="mt-1">Notas: {perfil.notasMedicas}</p>}
                    </details>
                  )}
                </li>
              );
            })}
          </Filas>
        )}
        {sinFranja.length > 0 && <p className="mt-2 text-xs text-texto-suave">Los clientes sin franja aparecen en tus turnos cuando la administración se las asigna.</p>}
      </Desplegable>

      {codigo && (
        <Desplegable titulo="Invitar a un cliente">
          <p className="mb-3 text-sm text-texto-suave">Se registra con tu enlace, queda contigo y la administración lo aprueba.</p>
          <CopiarEnlace enlace={`${await direccionPublica()}/registro/${codigo}`} mensaje="Regístrate en el gimnasio con este enlace:" />
        </Desplegable>
      )}
    </>
  );
}

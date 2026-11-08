import Link from "next/link";
import { DIAS_AVISO_ANTICIPADO, situacionDePago } from "@/modules/membresias/domain/Cuentas";
import { Fecha } from "@/shared/domain/Fecha";
import { casosDeBiblioteca, casosDeClientes, casosDePagos, casosDePesajes, casosDeSolicitudes, casosDeSolicitudesCoach } from "../../_servidor/contenedor";
import { direccionPublica, requerirSesion } from "../../_servidor/sesion";
import { BOTON_WHATSAPP, fechaCorta, nombreMes, pesos, textoVencimiento, whatsapp } from "../../_ui/formato";
import { BOTON, Desplegable, Filas, Tarjeta, Titulo } from "../../_ui/piezas";
import { atenderSolicitud, descartarSolicitudCoach, revisarCliente } from "./acciones";
import { AprobarCoach } from "./AprobarCoach";

const conSigno = (kg: number) => `${kg > 0 ? "+" : kg < 0 ? "−" : ""}${Math.abs(kg).toFixed(1)} kg`;


/** "Hoy" de la administración: solo lo que hay que atender. Lo que está al día no aparece. */
export default async function Hoy() {
  const sesion = await requerirSesion("cliente.aprobar");
  const tiene = (p: string) => sesion.permisos.includes(p);
  const hoy = Fecha.hoyEn(sesion.zonaHoraria, new Date());
  const siguiente = Fecha.de(`${hoy.mes}-01`).sumarMeses(1).mes;
  const pagos = casosDePagos(sesion.permisos, sesion.zonaHoraria);
  const biblioteca = casosDeBiblioteca(sesion.permisos, sesion.zonaHoraria);
  const [registros, clientes, solicitudes, agendadas, aspirantes, porConfirmar, periodos, planesMes, planesSiguiente, cambiosPeso] = await Promise.all([
    casosDeClientes().consultas.delGimnasio(sesion.gimnasioId, "pendiente"),
    casosDeClientes().consultas.delGimnasio(sesion.gimnasioId, "activo"),
    casosDeSolicitudes(sesion.permisos).repositorio.pendientes(sesion.gimnasioId),
    casosDeSolicitudes(sesion.permisos).repositorio.agendadas(sesion.gimnasioId),
    tiene("equipo.agregar") ? casosDeSolicitudesCoach(sesion.permisos).repositorio.pendientes(sesion.gimnasioId) : [],
    tiene("pago.confirmar") ? pagos.consultas.porRevisar(sesion.gimnasioId) : [],
    pagos.consultas.periodos(sesion.gimnasioId),
    tiene("plan.aprobar") ? biblioteca.consultas.planesDelMes(sesion.gimnasioId, hoy.mes) : [],
    tiene("plan.aprobar") ? biblioteca.consultas.planesDelMes(sesion.gimnasioId, siguiente) : [],
    casosDePesajes(sesion.permisos, sesion.zonaHoraria).cambios(sesion.gimnasioId),
  ]);
  // Avances de peso del último mes que merecen una felicitación (bajar o subir lo deciden con su coach).
  const haceUnMes = hoy.sumarDias(-31);
  const paraFelicitar = cambiosPeso
    .filter((p) => p.pesajes >= 2 && !Fecha.de(p.ultimaFecha).esAntesDe(haceUnMes))
    .map((p) => ({ ...p, total: p.ultimoKg - p.primeroKg, reciente: p.anteriorKg === null ? 0 : p.ultimoKg - p.anteriorKg }))
    .filter((p) => Math.abs(p.total) >= 3 || Math.abs(p.reciente) >= 1.5)
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
  // Una semana antes de vencer y hasta dos semanas después: lo demás vive en Dinero → Seguimiento.
  const porVencer = clientes
    .map((c) => ({ ...c, ...situacionDePago(periodos.get(c.id) ?? [], hoy) }))
    .filter((c): c is typeof c & { dias: number } => c.dias !== null && c.dias <= DIAS_AVISO_ANTICIPADO && c.dias > -14)
    .sort((a, b) => a.dias - b.dias);
  const planesPorRevisar = [
    ...planesMes.filter((p) => p.estado === "enviado").map((p) => ({ ...p, mes: hoy.mes })),
    ...planesSiguiente.filter((p) => p.estado === "enviado").map((p) => ({ ...p, mes: siguiente })),
  ];
  const enlaceRegistro = `${await direccionPublica()}/registro`;
  const total = registros.length + solicitudes.length + agendadas.length + aspirantes.length + porConfirmar.length + planesPorRevisar.length + porVencer.length;

  return (
    <>
      <Titulo antetitulo={`Hola, ${sesion.nombre.split(" ")[0]}`}>Hoy</Titulo>

      {total === 0 && (
        <Tarjeta>
          <p className="font-titulos text-2xl font-bold uppercase">Todo al día</p>
          <p className="mt-1 text-sm text-texto-suave">No hay registros, pagos, planes ni solicitudes pendientes.</p>
        </Tarjeta>
      )}

      {registros.length > 0 && (
        <Desplegable titulo="Registros por aprobar" cuenta={registros.length} alerta abierto>
          <Filas>
            {registros.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold">{c.nombre}</p>
                  <p className="text-sm text-texto-suave">
                    Coach {c.coach}
                    {c.telefono ? ` · ${c.telefono}` : ""}
                  </p>
                </div>
                <form action={revisarCliente} className="flex gap-2">
                  <input type="hidden" name="clienteId" value={c.id} />
                  <button name="decision" value="aprobar" className={BOTON.principal}>
                    Aprobar
                  </button>
                  <button name="decision" value="rechazar" className={BOTON.secundario}>
                    Rechazar
                  </button>
                </form>
              </li>
            ))}
          </Filas>
        </Desplegable>
      )}

      {porConfirmar.length > 0 && (
        <Desplegable titulo="Pagos por confirmar" cuenta={porConfirmar.length} alerta abierto={registros.length === 0}>
          <Filas>
            {porConfirmar.slice(0, 6).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold">{p.cliente}</p>
                  <p className="text-sm text-texto-suave">
                    {p.plan} · {fechaCorta(p.fechaPago)} · reportó {p.reportadoPor}
                  </p>
                </div>
                <span className="cifras font-semibold">{pesos(p.montoCentavos)}</span>
              </li>
            ))}
          </Filas>
          <Link href="/admin/pagos" className={`${BOTON.secundario} mt-3`}>
            Revisar y confirmar
          </Link>
        </Desplegable>
      )}

      {solicitudes.length > 0 && (
        <Desplegable titulo="Clases de prueba" cuenta={solicitudes.length} alerta>
          <Filas>
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
                    href={whatsapp(s.telefono, `Hola ${s.nombre.split(" ")[0]}, te escribimos del gimnasio por tu clase de prueba.`)}
                    target="_blank"
                    rel="noreferrer"
                    className={BOTON_WHATSAPP}
                  >
                    WhatsApp
                  </a>
                  <form action={atenderSolicitud} className="flex gap-2">
                    <input type="hidden" name="id" value={s.id} />
                    <button name="estado" value="contactado" className={BOTON.secundario}>
                      Ya la agendé
                    </button>
                    <button name="estado" value="descartado" className={BOTON.discreto}>
                      Descartar
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </Filas>
        </Desplegable>
      )}

      {agendadas.length > 0 && (
        <Desplegable titulo="Después de su prueba" cuenta={agendadas.length} nota="Mándales su inscripción">
          <Filas>
            {agendadas.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold">{s.nombre}</p>
                  <p className="text-sm text-texto-suave">
                    {s.telefono} · agendada el {fechaCorta(s.agendadaEn.toISOString().slice(0, 10))}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={whatsapp(
                      s.telefono,
                      `Hola ${s.nombre.split(" ")[0]}, ¡gracias por venir a tu clase de prueba! Si quieres quedarte, inscríbete aquí y elige a tu coach: ${enlaceRegistro}`,
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className={BOTON_WHATSAPP}
                  >
                    Mandar inscripción
                  </a>
                  <form action={atenderSolicitud} className="flex gap-2">
                    <input type="hidden" name="id" value={s.id} />
                    <button name="estado" value="inscrito" className={BOTON.secundario}>
                      Ya se inscribió
                    </button>
                    <button name="estado" value="descartado" className={BOTON.discreto}>
                      No se quedó
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </Filas>
        </Desplegable>
      )}

      {aspirantes.length > 0 && (
        <Desplegable titulo="Quieren ser coach" cuenta={aspirantes.length} alerta>
          <Filas>
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
                    href={whatsapp(a.telefono, `Hola ${a.nombre.split(" ")[0]}, te escribimos del gimnasio por tu solicitud para ser coach.`)}
                    target="_blank"
                    rel="noreferrer"
                    className={BOTON_WHATSAPP}
                  >
                    WhatsApp
                  </a>
                  <AprobarCoach id={a.id} />
                  <form action={descartarSolicitudCoach}>
                    <input type="hidden" name="id" value={a.id} />
                    <button className={BOTON.discreto}>Descartar</button>
                  </form>
                </div>
              </li>
            ))}
          </Filas>
        </Desplegable>
      )}

      {planesPorRevisar.length > 0 && (
        <Desplegable titulo="Planes por revisar" cuenta={planesPorRevisar.length} alerta>
          <Filas>
            {planesPorRevisar.map((p) => (
              <li key={`${p.mes}-${p.coachId}`} className="flex items-center justify-between gap-3 py-3">
                <span className="font-semibold">
                  Coach {p.apodo} <span className="font-normal text-texto-suave">· {nombreMes(p.mes)}</span>
                </span>
                <Link href={`/admin/planes/${p.planId}`} className={BOTON.secundario}>
                  Revisar
                </Link>
              </li>
            ))}
          </Filas>
        </Desplegable>
      )}

      {paraFelicitar.length > 0 && (
        <Desplegable titulo="Para felicitar" cuenta={paraFelicitar.length} nota="Avances de peso del último mes">
          <Filas>
            {paraFelicitar.map((p) => (
              <li key={p.clienteId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold">{p.nombre}</p>
                  <p className="cifras text-sm text-texto-suave">
                    {conSigno(p.total)} desde su inicio · {conSigno(p.reciente)} en su último pesaje · hoy {p.ultimoKg.toFixed(1)} kg
                  </p>
                </div>
                <Link
                  href={`/novedades?felicitar=${p.clienteId}&titulo=${encodeURIComponent(`¡Felicidades, ${p.nombre.split(" ")[0]}!`)}`}
                  className={BOTON.secundario}
                >
                  Felicitar
                </Link>
              </li>
            ))}
          </Filas>
        </Desplegable>
      )}

      {porVencer.length > 0 && (
        <Desplegable titulo="Membresías por vencer" cuenta={porVencer.length}>
          <Filas>
            {porVencer.map((c) => (
              <li key={c.id}>
                <Link href={`/admin/clientes/${c.id}`} className="flex items-center justify-between gap-3 py-3 text-texto no-underline">
                  <span className="min-w-0">
                    <span className="block font-semibold">{c.nombre}</span>
                    <span className="text-sm text-texto-suave">Coach {c.coach}</span>
                  </span>
                  <span className={`text-sm font-semibold ${c.dias <= 0 ? "text-[#ff8f97]" : "text-[#f1d9a8]"}`}>{textoVencimiento(c.dias)}</span>
                </Link>
              </li>
            ))}
          </Filas>
          <Link href="/admin/seguimiento" className={`${BOTON.secundario} mt-3`}>
            Ver seguimiento y avisar por WhatsApp
          </Link>
        </Desplegable>
      )}
    </>
  );
}

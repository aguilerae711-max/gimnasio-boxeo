import Link from "next/link";
import { estadoCorporal } from "@/modules/evaluacion/domain/Composicion";
import { estadoMembresia } from "@/modules/membresias/domain/Cuentas";
import { Fecha } from "@/shared/domain/Fecha";
import { casosDeClientes, casosDeEvaluacion, casosDeOperacion, casosDePagos, casosDePesajes } from "../_servidor/contenedor";
import { fechaCorta, textoVencimiento } from "./formato";
import { BOTON, Estado, Tarjeta, Titulo } from "./piezas";
import { PILARES } from "./Resultados";
import { RutinaDeHoy } from "./RutinaDeHoy";
import { AnilloDias, CalendarioMes, GraficaPeso } from "./Visual";

const MENSAJE: Record<string, string> = {
  pendiente: "La administración está revisando tu registro. Te avisamos en el gimnasio cuando quede aprobado.",
  rechazado: "Tu registro no fue aprobado. Habla con la administración en el gimnasio.",
  baja: "Tu cuenta está dada de baja. Si quieres volver, habla con la administración.",
};

const conSigno = (kg: number) => `${kg > 0 ? "+" : kg < 0 ? "−" : ""}${Math.abs(kg).toFixed(1)} kg`;

const COLOR_MEMBRESIA = { activo: "#6fe0a2", por_vencer: "#f1d9a8", vencido: "#ff8f97", sin_pago: "#a3a8b3" } as const;

interface Quien {
  gimnasioId: string;
  zonaHoraria: string;
  permisos: readonly string[];
}

/** "Hoy" del cliente: sus días pagados, la rutina de hoy y un vistazo a su progreso. Con vista=true la administración lo ve tal cual. */
export async function PantallaMiEstado({ sesion, usuarioId, vista = false }: { sesion: Quien; usuarioId: string; vista?: boolean }) {
  const operacion = casosDeOperacion(sesion.permisos, sesion.zonaHoraria);
  const [yo, asignacion, horario] = await Promise.all([
    casosDeClientes().consultas.delUsuario(sesion.gimnasioId, usuarioId),
    operacion.consultas.clienteDelUsuario(sesion.gimnasioId, usuarioId),
    operacion.repositorio.horario(sesion.gimnasioId),
  ]);
  if (!yo || !asignacion) {
    return <Titulo antetitulo="Cliente">Sin registro de cliente</Titulo>;
  }
  const franja = asignacion.franjaId ? horario.franja(asignacion.franjaId) : null;
  const [periodosTodos, peso, historial] = await Promise.all([
    casosDePagos(sesion.permisos, sesion.zonaHoraria).consultas.periodos(sesion.gimnasioId),
    casosDePesajes(sesion.permisos, sesion.zonaHoraria).consultas.delCliente(sesion.gimnasioId, asignacion.clienteId),
    casosDeEvaluacion(sesion.permisos, sesion.zonaHoraria).consultas.historialDeCliente(sesion.gimnasioId, asignacion.clienteId),
  ]);
  const hoy = Fecha.hoyEn(sesion.zonaHoraria, new Date());
  const periodos = periodosTodos.get(asignacion.clienteId) ?? [];
  const membresia = estadoMembresia(periodos, hoy);
  const color = COLOR_MEMBRESIA[membresia.estado];
  // Largo del periodo vigente (o el último) para el anillo.
  const periodo =
    periodos.find((p) => !hoy.esAntesDe(p.periodoDesde) && !p.periodoHasta.esAntesDe(hoy)) ??
    [...periodos].sort((a, b) => (a.periodoHasta.esAntesDe(b.periodoHasta) ? 1 : -1))[0];
  const totalPeriodo = periodo ? periodo.periodoDesde.diasHasta(periodo.periodoHasta) + 1 : 0;
  const dias = franja ? horario.diasDe(asignacion.coachId, franja.id) : [];
  const corporal = estadoCorporal(peso.mediciones, peso.sexo, peso.divisiones);
  const ultima = historial.at(-1);
  const valores = ultima ? PILARES.map((p) => ultima.pilares[p]).filter((v): v is number => v !== null) : [];
  const promedio = valores.length ? Math.round(valores.reduce((a, b) => a + b, 0) / valores.length) : null;

  return (
    <>
      <Titulo antetitulo={`Hola, ${yo.nombre.split(" ")[0]}`}>Hoy</Titulo>

      {membresia.vence && yo.estado === "activo" && (membresia.estado === "vencido" || (membresia.diasRestantes ?? 99) <= 2) && (
        <div
          role="status"
          className={`rounded-2xl border px-5 py-4 ${membresia.estado === "vencido" ? "border-[#6b2a31] bg-[#2a1418] text-[#ff8f97]" : "border-[#6b4d12] bg-[#2a2111] text-[#f1d9a8]"}`}
        >
          <p className="font-titulos text-xl font-bold uppercase">
            {membresia.estado === "vencido" ? "Tu membresía venció" : `Tu membresía ${textoVencimiento(membresia.diasRestantes ?? 0)}`}
          </p>
          <p className="text-sm">
            {membresia.estado === "vencido" ? `Venció el ${fechaCorta(membresia.vence.valor)}.` : `Pagado hasta el ${fechaCorta(membresia.vence.valor)}.`} Renueva con
            tu coach o en la administración para no perder tus días.
          </p>
        </div>
      )}

      {yo.estado !== "activo" && (
        <Tarjeta className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[15px] text-[#c9ccd3]">{MENSAJE[yo.estado]}</p>
          <Estado valor={yo.estado} texto={yo.estado === "pendiente" ? "por aprobar" : yo.estado} />
        </Tarjeta>
      )}

      <Tarjeta className="flex flex-col gap-5">
        <div className="flex items-center gap-5">
          {membresia.vence ? (
            <AnilloDias restantes={membresia.diasRestantes ?? 0} total={totalPeriodo} color={color} />
          ) : (
            <div className="grid h-32 w-32 shrink-0 place-items-center rounded-full border-[10px] border-[#2a2d36] text-center text-xs text-texto-suave">
              sin pago
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-texto-suave">Tu membresía</p>
            <p className="mt-1 font-titulos text-2xl font-bold uppercase leading-tight" style={{ color }}>
              {membresia.estado === "activo" && "Al corriente"}
              {membresia.estado === "por_vencer" && "Por vencer"}
              {membresia.estado === "vencido" && "Vencida"}
              {membresia.estado === "sin_pago" && "Sin pago"}
            </p>
            <p className="mt-1 text-sm text-[#c9ccd3]">
              {membresia.vence
                ? membresia.estado === "vencido"
                  ? `Venció el ${fechaCorta(membresia.vence.valor)}. Renueva con tu coach.`
                  : `Pagado hasta el ${fechaCorta(membresia.vence.valor)}.`
                : "Paga con tu coach o en la administración."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-borde pt-4">
          <p className="font-titulos text-xl font-bold uppercase">Coach {asignacion.coach}</p>
          <p className="cifras text-sm text-texto-suave">{franja ? `${franja.inicio}–${franja.fin}` : "Te asignan tu horario pronto"}</p>
        </div>
      </Tarjeta>

      <Tarjeta>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-texto-suave">Tu peso</p>
            <p className="cifras font-titulos text-6xl font-extrabold leading-none">
              {corporal ? corporal.actual.pesoKg.toFixed(1) : "—"}
              <span className="ml-1 text-2xl text-texto-suave">kg</span>
            </p>
          </div>
          {corporal?.division && (
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-texto-suave">División</p>
              <p className="font-titulos text-2xl font-extrabold text-acento">{corporal.division.nombre}</p>
            </div>
          )}
        </div>
        {corporal ? (
          <>
            {(corporal.cambioTotal !== null || corporal.cambioAnterior !== null) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {corporal.cambioTotal !== null && (
                  <span className="cifras rounded-full bg-white/[0.06] px-3 py-1 text-sm">
                    <b>{conSigno(corporal.cambioTotal)}</b> <span className="text-texto-suave">desde tu inicio</span>
                  </span>
                )}
                {corporal.cambioAnterior !== null && (
                  <span className="cifras rounded-full bg-white/[0.06] px-3 py-1 text-sm">
                    <b>{conSigno(corporal.cambioAnterior)}</b> <span className="text-texto-suave">desde tu último pesaje</span>
                  </span>
                )}
              </div>
            )}
            <div className="mt-3">
              <GraficaPeso mediciones={peso.mediciones.filter((m) => !m.aproximado || peso.mediciones.every((x) => x.aproximado))} />
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-texto-suave">Te pesamos en tu evaluación; aquí verás cómo cambia mes a mes.</p>
        )}
      </Tarjeta>

      {yo.estado === "activo" && (
        <RutinaDeHoy
          gimnasioId={sesion.gimnasioId}
          zonaHoraria={sesion.zonaHoraria}
          coachId={asignacion.coachId}
          franja={franja ?? null}
          diasDelCliente={dias}
          permisos={sesion.permisos}
        />
      )}

      <Tarjeta>
        <CalendarioMes hoy={hoy} periodos={periodos} vence={membresia.vence} />
      </Tarjeta>

      <Tarjeta className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-texto-suave">Tus pilares</p>
          <p className="cifras font-titulos text-4xl font-extrabold leading-none">{promedio ?? "—"}</p>
          <p className="text-xs text-texto-suave">
            {promedio === null ? "Aún sin evaluar" : promedio >= 100 ? `+${promedio - 100}% desde tu inicio` : `${promedio - 100}% desde tu inicio`}
          </p>
        </div>
        {!vista && (
          <Link href="/cliente/resultados" className={BOTON.secundario}>
            Mi progreso
          </Link>
        )}
      </Tarjeta>

      {!vista && (
        <Link href="/perfil" className="text-sm text-texto-suave">
          Completa tus datos de emergencia en Mi cuenta →
        </Link>
      )}
    </>
  );
}

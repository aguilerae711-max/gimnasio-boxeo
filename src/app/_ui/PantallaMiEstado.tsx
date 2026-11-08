import Link from "next/link";
import { estadoCorporal } from "@/modules/evaluacion/domain/Composicion";
import { estadoMembresia } from "@/modules/membresias/domain/Cuentas";
import { Fecha } from "@/shared/domain/Fecha";
import { casosDeClientes, casosDeEvaluacion, casosDeOperacion, casosDePagos, casosDePesajes } from "../_servidor/contenedor";
import { fechaCorta } from "./formato";
import { Estado, Tarjeta, Titulo } from "./piezas";
import { PILARES } from "./Resultados";
import { RutinaDeHoy } from "./RutinaDeHoy";
import { AnilloDias, CalendarioMes } from "./Visual";

const MENSAJE: Record<string, string> = {
  pendiente: "La administración está revisando tu registro. Te avisamos en el gimnasio cuando quede aprobado.",
  rechazado: "Tu registro no fue aprobado. Habla con la administración en el gimnasio.",
  baja: "Tu cuenta está dada de baja. Si quieres volver, habla con la administración.",
};

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

      <Tarjeta>
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-titulos text-xl font-bold uppercase">Tu progreso</p>
          {!vista && (
            <Link href="/cliente/resultados" className="text-sm font-semibold no-underline">
              Ver todo →
            </Link>
          )}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-white/[0.04] p-3">
            <p className="text-[11px] uppercase tracking-wider text-texto-suave">Peso</p>
            <p className="cifras font-titulos text-3xl font-extrabold">{corporal ? corporal.actual.pesoKg.toFixed(1) : "—"}</p>
            <p className="text-xs text-texto-suave">kg</p>
          </div>
          <div className="rounded-xl bg-white/[0.04] p-3">
            <p className="text-[11px] uppercase tracking-wider text-texto-suave">División</p>
            <p className="truncate font-titulos text-xl font-extrabold leading-9 text-acento">{corporal?.division?.nombre ?? "—"}</p>
          </div>
          <div className="rounded-xl bg-white/[0.04] p-3">
            <p className="text-[11px] uppercase tracking-wider text-texto-suave">Pilares</p>
            <p className="cifras font-titulos text-3xl font-extrabold">{promedio ?? "—"}</p>
            <p className="text-xs text-texto-suave">{promedio === null ? "sin evaluar" : promedio >= 100 ? `+${promedio - 100}% desde tu inicio` : `${promedio - 100}%`}</p>
          </div>
        </div>
      </Tarjeta>

      {!vista && (
        <Link href="/perfil" className="text-sm text-texto-suave">
          Completa tus datos de emergencia en Mi cuenta →
        </Link>
      )}
    </>
  );
}

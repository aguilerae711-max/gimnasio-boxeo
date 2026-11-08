import { claveTurno, planVigente } from "@/modules/biblioteca/domain/Planes";
import { Fecha } from "@/shared/domain/Fecha";
import { casosDeBiblioteca } from "../_servidor/contenedor";
import { TIPO_BLOQUE } from "./formato";
import { Tarjeta } from "./piezas";

const MODALIDAD: Record<string, string> = { individual: "", parejas: " en parejas", grupal: " grupal" };

/** Día de la semana (0 = domingo) en la zona del gimnasio. */
export const diaDeHoy = (zona: string) => new Date(`${Fecha.hoyEn(zona, new Date()).valor}T12:00:00Z`).getUTCDay();

/**
 * "Hoy en tu turno": la rutina que el coach del cliente tiene en su plan vigente para el día y franja de hoy.
 */
export async function RutinaDeHoy({
  gimnasioId,
  zonaHoraria,
  coachId,
  franja,
  diasDelCliente,
  permisos,
}: {
  gimnasioId: string;
  zonaHoraria: string;
  coachId: string;
  franja: { id: string; inicio: string; fin: string } | null;
  diasDelCliente: number[];
  permisos: readonly string[];
}) {
  if (!franja || diasDelCliente.length === 0) return null;
  const hoy = diaDeHoy(zonaHoraria);
  // Solo si hoy hay clase en su horario.
  if (!diasDelCliente.includes(hoy)) return null;

  const biblioteca = casosDeBiblioteca(permisos, zonaHoraria);
  const vigente = planVigente(await biblioteca.consultas.planesDelCoach(gimnasioId, coachId), Fecha.hoyEn(zonaHoraria, new Date()).mes);
  const plan = vigente ? await biblioteca.repositorio.planPorId(gimnasioId, vigente.id) : null;
  const rutinaId = plan?.asignaciones.get(claveTurno(hoy, franja.id));
  const rutina = rutinaId ? (await biblioteca.consultas.rutinas(gimnasioId, coachId)).find((r) => r.id === rutinaId) : null;

  return (
    <Tarjeta className="border-acento/60 bg-gradient-to-br from-[#2a1418] to-tarjeta">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ff8f97]">
        La rutina de hoy · {franja.inicio} a {franja.fin}
      </p>
      {!rutina ? (
        <p className="mt-1 text-[15px] text-[#c9ccd3]">Tu coach todavía no publica la rutina de hoy.</p>
      ) : (
        <>
          <p className="font-titulos text-3xl font-extrabold uppercase">{rutina.nombre}</p>
          {rutina.descripcion && <p className="text-sm text-texto-suave">{rutina.descripcion}</p>}
          <ol className="mt-2 flex flex-col gap-1.5 text-sm">
            {rutina.bloques.map((b, i) => (
              <li key={i}>
                <b>
                  {b.rounds ? `${b.rounds} rounds` : `${b.minutos} min`} · {TIPO_BLOQUE[b.tipo] ?? b.tipo}
                </b>
                {b.descripcion && <span className="text-texto-suave"> · {b.descripcion}</span>}
                {b.elementos.length > 0 && (
                  <span className="block text-texto-suave">
                    {b.elementos.map((e) => `${e.ejercicio ?? e.combinacion}${MODALIDAD[e.modalidad] ?? ""}${e.detalle ? ` (${e.detalle})` : ""}`).join(" · ")}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </>
      )}
    </Tarjeta>
  );
}

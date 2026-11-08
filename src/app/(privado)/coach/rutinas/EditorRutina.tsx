"use client";

import { useActionState, useState } from "react";
import { DURACION_TURNO_MIN, TIPOS_BLOQUE, type Bloque, type Rutina } from "@/modules/biblioteca/domain/Planes";
import type { EstadoFormulario } from "../../../_servidor/sesion";
import { BOTON } from "../../../_ui/piezas";
import { guardarRutina } from "../../biblioteca/acciones";

const NOMBRE_TIPO: Record<string, string> = {
  calentamiento: "Calentamiento",
  tecnica: "Técnica",
  implementos: "Implementos",
  sparring: "Sparring",
  acondicionamiento: "Acondicionamiento",
  enfriamiento: "Enfriamiento",
  otro: "Otro",
};

/** Un round de boxeo: 3 minutos de trabajo y 1 de descanso. */
const MIN_POR_ROUND = 4;

const campo = "min-h-11 w-full rounded-lg border border-borde bg-campo px-3 text-sm text-texto outline-none focus:border-acento";
const bloqueVacio = (): Bloque => ({ tipo: "tecnica", minutos: 20, rounds: null, descripcion: "", elementos: [] });

/**
 * Arma la rutina de un turno: bloques que duran cierto tiempo o cierto número de rounds,
 * con ejercicios de la biblioteca y una nota opcional para los clientes.
 */
export function EditorRutina({ id, inicial, ejercicios }: { id: string | null; inicial: Rutina | null; ejercicios: { id: string; nombre: string }[] }) {
  const [rutina, setRutina] = useState<Rutina>(inicial ?? { nombre: "", descripcion: "", bloques: [{ ...bloqueVacio(), tipo: "calentamiento", minutos: 15 }] });
  const [estado, enviar, enviando] = useActionState<EstadoFormulario, FormData>(guardarRutina, {});
  const total = rutina.bloques.reduce((s, b) => s + (Number(b.minutos) || 0), 0);
  const nombreDe = new Map(ejercicios.map((e) => [e.id, e.nombre]));

  const cambiarBloque = (i: number, cambio: Partial<Bloque>) =>
    setRutina((r) => ({ ...r, bloques: r.bloques.map((b, j) => (j === i ? { ...b, ...cambio } : b)) }));
  const moverBloque = (i: number, paso: number) =>
    setRutina((r) => {
      const bloques = [...r.bloques];
      const destino = i + paso;
      if (destino < 0 || destino >= bloques.length) return r;
      [bloques[i], bloques[destino]] = [bloques[destino], bloques[i]];
      return { ...r, bloques };
    });

  return (
    <form action={enviar} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id ?? ""} />
      <input type="hidden" name="rutina" value={JSON.stringify(rutina)} />
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-[#c9ccd3]">Nombre de la rutina</span>
        <input value={rutina.nombre} onChange={(e) => setRutina({ ...rutina, nombre: e.target.value })} placeholder="Ej. Técnica y saco" required className={campo} />
      </label>

      {rutina.bloques.map((b, i) => {
        const porRounds = b.rounds !== null;
        return (
          <section key={i} className="rounded-xl border border-borde bg-white/[0.02] p-4">
            <div className="flex items-center gap-2">
              <span className="cifras w-4 shrink-0 text-center font-titulos text-xl font-extrabold text-texto-suave">{i + 1}</span>
              <select value={b.tipo} onChange={(e) => cambiarBloque(i, { tipo: e.target.value as Bloque["tipo"] })} className={campo} aria-label="Qué se hace">
                {TIPOS_BLOQUE.map((t) => (
                  <option key={t} value={t}>
                    {NOMBRE_TIPO[t]}
                  </option>
                ))}
              </select>
              <span className="flex shrink-0 gap-0.5 text-texto-suave">
                <button type="button" onClick={() => moverBloque(i, -1)} className="h-9 w-6 rounded-lg hover:bg-white/[0.06]" aria-label="Subir">
                  ↑
                </button>
                <button type="button" onClick={() => moverBloque(i, 1)} className="h-9 w-6 rounded-lg hover:bg-white/[0.06]" aria-label="Bajar">
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => setRutina((r) => ({ ...r, bloques: r.bloques.filter((_, j) => j !== i) }))}
                  className="h-9 w-6 rounded-lg text-[#ff8f97] hover:bg-white/[0.06]"
                  aria-label="Quitar bloque"
                >
                  ✕
                </button>
              </span>
            </div>

            {/* Por tiempo o por rounds: uno u otro, nunca los dos. */}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div role="radiogroup" aria-label="Duración" className="inline-flex rounded-lg border border-borde p-0.5 text-[13px] font-semibold">
                {[
                  [false, "Por tiempo"],
                  [true, "Por rounds"],
                ].map(([rounds, texto]) => (
                  <button
                    key={String(rounds)}
                    type="button"
                    role="radio"
                    aria-checked={porRounds === rounds}
                    onClick={() =>
                      cambiarBloque(i, rounds ? { rounds: 3, minutos: 3 * MIN_POR_ROUND } : { rounds: null, minutos: b.minutos })
                    }
                    className={`rounded-md px-3 py-1.5 ${porRounds === rounds ? "bg-[#2a2d36] text-texto" : "text-texto-suave"}`}
                  >
                    {texto as string}
                  </button>
                ))}
              </div>
              {porRounds ? (
                <label className="flex items-center gap-2 text-sm text-[#c9ccd3]">
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={b.rounds ?? 1}
                    onChange={(e) => {
                      const rounds = Math.max(1, Math.min(30, Number(e.target.value) || 1));
                      cambiarBloque(i, { rounds, minutos: rounds * MIN_POR_ROUND });
                    }}
                    className={`${campo} w-20!`}
                    aria-label="Rounds"
                  />
                  rounds <span className="cifras text-texto-suave">= {b.minutos} min</span>
                </label>
              ) : (
                <label className="flex items-center gap-2 text-sm text-[#c9ccd3]">
                  <input
                    type="number"
                    min={1}
                    max={DURACION_TURNO_MIN}
                    value={b.minutos}
                    onChange={(e) => cambiarBloque(i, { minutos: Number(e.target.value) })}
                    className={`${campo} w-20!`}
                    aria-label="Minutos"
                  />
                  minutos
                </label>
              )}
            </div>

            {porRounds && <p className="mt-1.5 text-xs text-texto-suave">Cada round: 3 min de trabajo y 1 de descanso.</p>}

            <ul className="mt-3 flex flex-col gap-2">
              {b.elementos.map((e, k) => (
                <li key={k} className="flex items-center gap-2">
                  {e.ejercicioId ? (
                    <select
                      value={e.ejercicioId}
                      onChange={(ev) => cambiarBloque(i, { elementos: b.elementos.map((x, m) => (m === k ? { ...x, ejercicioId: ev.target.value } : x)) })}
                      className={campo}
                      aria-label="Ejercicio"
                    >
                      {!nombreDe.has(e.ejercicioId) && <option value={e.ejercicioId}>Ejercicio de la biblioteca</option>}
                      {ejercicios.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.nombre}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={`${campo} flex items-center text-texto-suave`}>Combinación {e.combinacion}</span>
                  )}
                  <input
                    value={e.detalle}
                    placeholder="Ej. 3 × 10"
                    onChange={(ev) => cambiarBloque(i, { elementos: b.elementos.map((x, m) => (m === k ? { ...x, detalle: ev.target.value } : x)) })}
                    className={`${campo} max-w-32`}
                    aria-label="Cuánto"
                  />
                  <button
                    type="button"
                    onClick={() => cambiarBloque(i, { elementos: b.elementos.filter((_, m) => m !== k) })}
                    className="h-9 w-8 shrink-0 rounded-lg text-[#ff8f97] hover:bg-white/[0.06]"
                    aria-label="Quitar ejercicio"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            {ejercicios.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  cambiarBloque(i, { elementos: [...b.elementos, { ejercicioId: ejercicios[0].id, combinacion: null, modalidad: "individual", detalle: "" }] })
                }
                className={`${BOTON.discreto} mt-1 px-0! text-[#ff6b76]!`}
              >
                + Agregar ejercicio
              </button>
            )}

            <input
              value={b.descripcion}
              placeholder="Nota para tus clientes (opcional). Ej. guardia alta, respira al soltar"
              onChange={(e) => cambiarBloque(i, { descripcion: e.target.value })}
              className={`${campo} mt-2`}
              aria-label="Nota para tus clientes"
            />
          </section>
        );
      })}

      <button type="button" onClick={() => setRutina((r) => ({ ...r, bloques: [...r.bloques, bloqueVacio()] }))} className={BOTON.secundario}>
        + Agregar bloque
      </button>

      <div>
        <div className="mb-1 flex justify-between text-sm">
          <span className="text-texto-suave">Duración del turno</span>
          <span className={`cifras font-semibold ${total > DURACION_TURNO_MIN ? "text-[#ff8f97]" : "text-texto"}`}>
            {total} de {DURACION_TURNO_MIN} min
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={`h-full rounded-full ${total > DURACION_TURNO_MIN ? "bg-[#ff8f97]" : "bg-acento"}`}
            style={{ width: `${Math.min(100, (total / DURACION_TURNO_MIN) * 100)}%` }}
          />
        </div>
      </div>

      {estado.error && (
        <p role="alert" className="rounded-xl bg-[#2a1418] px-4 py-3 text-sm text-[#ff8f97]">
          {estado.error}
        </p>
      )}
      <button type="submit" disabled={enviando} className={BOTON.principal}>
        {enviando ? "Guardando…" : "Guardar rutina"}
      </button>
    </form>
  );
}

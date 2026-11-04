"use client";

import { useActionState, useState } from "react";
import { DURACION_TURNO_MIN, TIPOS_BLOQUE, type Bloque, type Rutina } from "@/modules/biblioteca/domain/Planes";
import type { EstadoFormulario } from "../../../_servidor/sesion";
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
const campo = "min-h-11 rounded-lg border border-[#2a2d36] bg-[#23262e] px-3 text-sm text-texto";
const bloqueVacio = (): Bloque => ({ tipo: "tecnica", minutos: 20, rounds: null, descripcion: "", elementos: [] });

/** Arma una rutina de un turno: bloques con minutos y, en cada uno, ejercicios de la biblioteca o combinaciones. */
export function EditorRutina({ id, inicial, ejercicios }: { id: string | null; inicial: Rutina | null; ejercicios: { id: string; nombre: string }[] }) {
  const [rutina, setRutina] = useState<Rutina>(inicial ?? { nombre: "", descripcion: "", bloques: [{ ...bloqueVacio(), tipo: "calentamiento", minutos: 15 }] });
  const [estado, enviar, enviando] = useActionState<EstadoFormulario, FormData>(guardarRutina, {});
  const total = rutina.bloques.reduce((s, b) => s + (Number(b.minutos) || 0), 0);

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
      <div className="grid gap-2 sm:grid-cols-[1fr_2fr]">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-[#c9ccd3]">Nombre</span>
          <input value={rutina.nombre} onChange={(e) => setRutina({ ...rutina, nombre: e.target.value })} placeholder="A · Técnica y saco" required className={campo} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-[#c9ccd3]">Descripción (opcional)</span>
          <input value={rutina.descripcion} onChange={(e) => setRutina({ ...rutina, descripcion: e.target.value })} className={campo} />
        </label>
      </div>

      {rutina.bloques.map((b, i) => (
        <fieldset key={i} className="rounded-xl border border-[#2a2d36] p-3">
          <legend className="px-1 text-sm font-semibold">Bloque {i + 1}</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1.5fr_1fr_1fr_3fr_auto]">
            <select value={b.tipo} onChange={(e) => cambiarBloque(i, { tipo: e.target.value as Bloque["tipo"] })} className={campo} aria-label="Tipo de bloque">
              {TIPOS_BLOQUE.map((t) => (
                <option key={t} value={t}>
                  {NOMBRE_TIPO[t]}
                </option>
              ))}
            </select>
            <input type="number" min={1} max={120} value={b.minutos} onChange={(e) => cambiarBloque(i, { minutos: Number(e.target.value) })} className={campo} aria-label="Minutos" title="Minutos" />
            <input
              type="number"
              min={1}
              max={30}
              value={b.rounds ?? ""}
              placeholder="rounds"
              onChange={(e) => cambiarBloque(i, { rounds: e.target.value ? Number(e.target.value) : null })}
              className={campo}
              aria-label="Rounds"
            />
            <input value={b.descripcion} placeholder="Indicaciones" onChange={(e) => cambiarBloque(i, { descripcion: e.target.value })} className={`${campo} col-span-2 sm:col-span-1`} />
            <span className="col-span-2 flex gap-1 sm:col-span-1">
              <button type="button" onClick={() => moverBloque(i, -1)} className={`${campo} px-2`} aria-label="Subir bloque">↑</button>
              <button type="button" onClick={() => moverBloque(i, 1)} className={`${campo} px-2`} aria-label="Bajar bloque">↓</button>
              <button
                type="button"
                onClick={() => setRutina((r) => ({ ...r, bloques: r.bloques.filter((_, j) => j !== i) }))}
                className={`${campo} px-2 text-[#ff8f97]`}
                aria-label="Quitar bloque"
              >
                ✕
              </button>
            </span>
          </div>
          <ul className="mt-2 flex flex-col gap-2">
            {b.elementos.map((e, k) => (
              <li key={k} className="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_1fr_1fr_1.5fr_auto]">
                <select
                  value={e.ejercicioId ?? "combinacion"}
                  onChange={(ev) => {
                    const valor = ev.target.value;
                    const elementos = b.elementos.map((x, m) =>
                      m === k ? { ...x, ejercicioId: valor === "combinacion" ? null : valor, combinacion: valor === "combinacion" ? (x.combinacion ?? "") : null } : x,
                    );
                    cambiarBloque(i, { elementos });
                  }}
                  className={`${campo} col-span-2 sm:col-span-1`}
                  aria-label="Ejercicio"
                >
                  <option value="combinacion">Combinación de golpes…</option>
                  {ejercicios.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.nombre}
                    </option>
                  ))}
                </select>
                {e.ejercicioId ? (
                  <span className="hidden sm:block" />
                ) : (
                  <input
                    value={e.combinacion ?? ""}
                    placeholder="1-2-3"
                    onChange={(ev) => cambiarBloque(i, { elementos: b.elementos.map((x, m) => (m === k ? { ...x, combinacion: ev.target.value } : x)) })}
                    className={campo}
                    aria-label="Combinación"
                  />
                )}
                <select
                  value={e.modalidad}
                  onChange={(ev) => cambiarBloque(i, { elementos: b.elementos.map((x, m) => (m === k ? { ...x, modalidad: ev.target.value as typeof x.modalidad } : x)) })}
                  className={campo}
                  aria-label="Modalidad"
                >
                  <option value="individual">Individual</option>
                  <option value="parejas">Parejas</option>
                  <option value="grupal">Grupal</option>
                </select>
                <input
                  value={e.detalle}
                  placeholder="3 × 3 min"
                  onChange={(ev) => cambiarBloque(i, { elementos: b.elementos.map((x, m) => (m === k ? { ...x, detalle: ev.target.value } : x)) })}
                  className={campo}
                  aria-label="Series, rounds o tiempo"
                />
                <button
                  type="button"
                  onClick={() => cambiarBloque(i, { elementos: b.elementos.filter((_, m) => m !== k) })}
                  className={`${campo} px-2 text-[#ff8f97]`}
                  aria-label="Quitar renglón"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => cambiarBloque(i, { elementos: [...b.elementos, { ejercicioId: ejercicios[0]?.id ?? null, combinacion: ejercicios[0] ? null : "", modalidad: "individual", detalle: "" }] })}
            className="mt-2 text-sm font-semibold text-[#ff6b76]"
          >
            + Ejercicio o combinación
          </button>
        </fieldset>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setRutina((r) => ({ ...r, bloques: [...r.bloques, bloqueVacio()] }))} className="min-h-11 rounded-xl border border-[#3a3d46] px-4 text-sm font-semibold">
          + Bloque
        </button>
        <span className={`text-sm ${total > DURACION_TURNO_MIN ? "text-[#ff8f97]" : "text-texto-suave"}`}>
          {total} de {DURACION_TURNO_MIN} minutos
        </span>
      </div>
      {estado.error && <p role="alert" className="rounded-xl bg-[#2a1418] px-4 py-3 text-sm text-[#ff8f97]">{estado.error}</p>}
      <button type="submit" disabled={enviando} className="min-h-12 rounded-xl bg-acento px-5 font-semibold text-white disabled:opacity-60">
        {enviando ? "Guardando…" : "Guardar rutina"}
      </button>
    </form>
  );
}

"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { EstadoFormulario } from "../../../_servidor/sesion";
import { guardarCaptura } from "./acciones";

interface Props {
  sesionId: string;
  test: { codigo: string; campos: string[]; etiquetas: string[]; intentos: number; duracionSeg: number | null; contador: boolean };
  /** Lo ya capturado: valores[intento][campo]. */
  valores: (Record<string, number> | null)[];
}

/**
 * Captura de un test: un renglón por intento. Si el test lleva tiempo, cronómetro en pantalla;
 * si lleva contador, un botón grande cuenta toques en el primer campo del intento elegido.
 */
export function CapturaTest({ sesionId, test, valores }: Props) {
  const [estado, enviar, enviando] = useActionState<EstadoFormulario, FormData>(guardarCaptura, {});
  const [activo, setActivo] = useState(0);
  const [restante, setRestante] = useState(test.duracionSeg ?? 0);
  const [corriendo, setCorriendo] = useState(false);
  const formulario = useRef<HTMLFormElement>(null);
  const reloj = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (reloj.current) clearInterval(reloj.current);
  }, []);

  const iniciar = () => {
    if (corriendo || !test.duracionSeg) return;
    setRestante(test.duracionSeg);
    setCorriendo(true);
    const fin = Date.now() + test.duracionSeg * 1000;
    reloj.current = setInterval(() => {
      const r = Math.max(0, (fin - Date.now()) / 1000);
      setRestante(r);
      if (r === 0) {
        clearInterval(reloj.current!);
        setCorriendo(false);
        navigator.vibrate?.(300);
      }
    }, 100);
  };

  const campoContador = () => formulario.current?.elements.namedItem(`i${activo + 1}_${test.campos[0]}`) as HTMLInputElement | null;
  const tocar = () => {
    const campo = campoContador();
    if (campo) campo.value = String(Number(campo.value || 0) + 1);
  };

  return (
    <form ref={formulario} action={enviar} className="flex flex-col gap-3">
      <input type="hidden" name="sesionId" value={sesionId} />
      <input type="hidden" name="test" value={test.codigo} />
      <input type="hidden" name="campos" value={test.campos.join(",")} />
      <input type="hidden" name="intentos" value={test.intentos} />

      {(test.duracionSeg || test.contador) && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-[#23262e] p-3">
          {test.duracionSeg && (
            <>
              <span className={`w-20 font-titulos text-4xl font-extrabold tabular-nums ${corriendo ? "text-[#ff6b76]" : ""}`}>{restante.toFixed(1)}</span>
              <button type="button" onClick={iniciar} disabled={corriendo} className="min-h-11 rounded-xl border border-[#3a3d46] px-4 text-sm font-semibold disabled:opacity-60">
                {corriendo ? "En curso…" : `Iniciar ${test.duracionSeg} s`}
              </button>
            </>
          )}
          {test.contador && (
            <button
              type="button"
              onClick={tocar}
              className="min-h-16 flex-1 rounded-2xl bg-acento px-4 text-lg font-bold text-white active:scale-[0.98]"
              aria-label={`Sumar uno a ${test.etiquetas[0]}, intento ${activo + 1}`}
            >
              +1 · {test.etiquetas[0]} (intento {activo + 1})
            </button>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-texto-suave">
            <tr>
              <th className="w-20 pb-1 font-semibold">Intento</th>
              {test.etiquetas.map((e) => (
                <th key={e} className="pb-1 font-semibold">
                  {e}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: test.intentos }, (_, i) => (
              <tr key={i} onClick={() => setActivo(i)} className={i === activo && test.contador ? "outline-2 outline-acento outline" : ""}>
                <td className="py-1 font-semibold">{i + 1}</td>
                {test.campos.map((c) => (
                  <td key={c} className="py-1 pr-2">
                    <input
                      name={`i${i + 1}_${c}`}
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min={0}
                      defaultValue={valores[i]?.[c] ?? ""}
                      onFocus={() => setActivo(i)}
                      className="min-h-11 w-full rounded-lg border border-[#2a2d36] bg-[#23262e] px-3 text-base text-texto"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={enviando} className="min-h-11 rounded-xl bg-acento px-5 text-sm font-semibold text-white disabled:opacity-60">
          {enviando ? "Guardando…" : "Guardar"}
        </button>
        {estado.error && <span className="text-sm text-[#ff8f97]">{estado.error}</span>}
        {estado.ok && <span className="text-sm text-[#6fe0a2]">{estado.ok}</span>}
        <span className="text-xs text-texto-suave">Deja vacío un intento nulo o no realizado.</span>
      </div>
    </form>
  );
}

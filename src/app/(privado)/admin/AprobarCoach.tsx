"use client";

import { useActionState } from "react";
import { CopiarEnlace } from "../../_ui/CopiarEnlace";
import { aprobarSolicitudCoach, type EstadoEnlace } from "./acciones";

/** Aprueba la solicitud: lo da de alta como coach y muestra su enlace de activación. */
export function AprobarCoach({ id }: { id: string }) {
  const [estado, enviar, enviando] = useActionState<EstadoEnlace, FormData>(aprobarSolicitudCoach, {});
  if (estado.enlace) {
    return (
      <div className="flex w-full flex-col gap-2">
        <p className="text-sm text-[#6fe0a2]">Aprobado. Mándale a {estado.nombre} su enlace (sirve una vez, vence en 72 horas):</p>
        <CopiarEnlace enlace={estado.enlace} mensaje={`${estado.nombre}, con este enlace activas tu cuenta de coach:`} />
      </div>
    );
  }
  return (
    <form action={enviar} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <input
        name="usuario"
        placeholder="Usuario (opcional)"
        autoCapitalize="none"
        spellCheck={false}
        defaultValue={estado.valores?.usuario}
        className="min-h-11 w-40 rounded-xl border border-[#2a2d36] bg-[#23262e] px-3 text-sm text-texto"
      />
      <button type="submit" disabled={enviando} className="min-h-11 rounded-xl bg-acento px-4 text-sm font-semibold text-white disabled:opacity-60">
        {enviando ? "Aprobando…" : "Aprobar como coach"}
      </button>
      {estado.error && (
        <p role="alert" className="w-full text-sm text-[#ff8f97]">
          {estado.error}
        </p>
      )}
    </form>
  );
}

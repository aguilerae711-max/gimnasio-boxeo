"use client";

import { useActionState } from "react";
import { CopiarEnlace } from "../../_ui/CopiarEnlace";
import { generarEnlace, type EstadoEnlace } from "./acciones";

/** Botón que genera el enlace de activación (o de nueva contraseña) y lo deja listo para compartir. */
export function GenerarEnlace({ usuarioId, nombre, activa }: { usuarioId: string; nombre: string; activa: boolean }) {
  const [estado, enviar, enviando] = useActionState<EstadoEnlace, FormData>(generarEnlace, {});
  if (estado.enlace) {
    return (
      <div className="mt-3 flex flex-col gap-2">
        <p className="text-xs text-texto-suave">Sirve una vez y vence en 72 horas. Mándaselo solo a {nombre}.</p>
        <CopiarEnlace enlace={estado.enlace} mensaje={`${nombre}, con este enlace ${activa ? "cambias tu contraseña" : "activas tu cuenta"} del gimnasio:`} />
      </div>
    );
  }
  return (
    <form action={enviar} className="flex flex-col items-end gap-1">
      <input type="hidden" name="usuarioId" value={usuarioId} />
      <input type="hidden" name="nombre" value={nombre} />
      <button type="submit" disabled={enviando} className="min-h-10 rounded-lg border border-[#3a3d46] px-3 text-sm font-semibold disabled:opacity-60">
        {enviando ? "Generando…" : activa ? "Enlace para nueva contraseña" : "Enlace de activación"}
      </button>
      {estado.error && <span className="text-xs text-[#ff8f97]">{estado.error}</span>}
    </form>
  );
}

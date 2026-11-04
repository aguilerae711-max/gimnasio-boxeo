"use client";

import { useActionState } from "react";
import { CopiarEnlace } from "../../_ui/CopiarEnlace";
import { Campo } from "../../_ui/piezas";
import { agregarAlEquipo, type EstadoEnlace } from "./acciones";

/** Alta de administración o coach: al guardar muestra su enlace de activación listo para mandar. */
export function AgregarAlEquipo() {
  const [estado, enviar, enviando] = useActionState<EstadoEnlace, FormData>(agregarAlEquipo, {});
  return (
    <div className="mt-4 border-t border-[#2a2d36] pt-4">
      <h3 className="font-semibold">Agregar al equipo</h3>
      {estado.enlace ? (
        <div className="mt-2 flex flex-col gap-2">
          <p className="text-sm text-[#6fe0a2]">Listo. Mándale a {estado.nombre} su enlace (sirve una vez, vence en 72 horas):</p>
          <CopiarEnlace enlace={estado.enlace} mensaje={`${estado.nombre}, con este enlace activas tu cuenta del gimnasio:`} />
          <a href="/admin" className="text-sm">
            Agregar a otra persona
          </a>
        </div>
      ) : (
        <form action={enviar} className="mt-2 flex flex-col gap-3">
          <Campo etiqueta="Nombre" name="nombre" defaultValue={estado.valores?.nombre} required />
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-[#c9ccd3]">Rol</span>
              <select name="rol" className="min-h-12 rounded-xl border border-[#2a2d36] bg-[#23262e] px-3 text-base text-texto">
                <option value="admin">Administración</option>
                <option value="coach">Coach</option>
              </select>
            </label>
            <Campo etiqueta="Usuario (opcional)" name="usuario" placeholder="ej. admin2" autoCapitalize="none" spellCheck={false} defaultValue={estado.valores?.usuario} />
          </div>
          {estado.error && (
            <p role="alert" className="rounded-xl bg-[#2a1418] px-4 py-3 text-sm text-[#ff8f97]">
              {estado.error}
            </p>
          )}
          <button type="submit" disabled={enviando} className="min-h-11 rounded-xl border border-[#3a3d46] px-4 text-sm font-semibold disabled:opacity-60">
            {enviando ? "Agregando…" : "Agregar"}
          </button>
        </form>
      )}
    </div>
  );
}

"use client";

import { useActionState, useEffect, useRef } from "react";
import type { EstadoFormulario } from "../_servidor/sesion";

type Accion = (estado: EstadoFormulario, datos: FormData) => Promise<EstadoFormulario>;

/** Formulario con acción de servidor: muestra el error o la confirmación y bloquea el botón mientras envía. */
export function Formulario({
  accion,
  boton,
  children,
  className = "",
  variante = "principal",
}: {
  accion: Accion;
  boton: string;
  children?: React.ReactNode;
  className?: string;
  variante?: "principal" | "secundario";
}) {
  const [estado, enviar, enviando] = useActionState(accion, {});
  const formulario = useRef<HTMLFormElement>(null);
  // React limpia el formulario al enviarlo; si hubo error, se devuelven los datos escritos (nunca contraseñas).
  useEffect(() => {
    Object.entries(estado.valores ?? {}).forEach(([nombre, valor]) => {
      const campo = formulario.current?.elements.namedItem(nombre);
      if (campo instanceof HTMLInputElement) campo.value = valor;
    });
  }, [estado]);
  return (
    <form ref={formulario} action={enviar} className={`flex flex-col gap-4 ${className}`}>
      {children}
      {estado.error && (
        <p role="alert" className="rounded-xl bg-[#2a1418] px-4 py-3 text-sm text-[#ff8f97]">
          {estado.error}
        </p>
      )}
      {estado.ok && (
        <p role="status" className="rounded-xl bg-[#132a1f] px-4 py-3 text-sm text-[#6fe0a2]">
          {estado.ok}
        </p>
      )}
      <button
        type="submit"
        disabled={enviando}
        className={
          variante === "principal"
            ? "min-h-12 rounded-xl bg-acento px-5 font-semibold text-white disabled:opacity-60"
            : "min-h-11 rounded-xl border border-[#3a3d46] px-4 text-sm font-semibold disabled:opacity-60"
        }
      >
        {enviando ? "Un momento…" : boton}
      </button>
    </form>
  );
}

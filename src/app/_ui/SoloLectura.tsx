"use client";

import { useEffect, useState } from "react";

/**
 * En "Ver como" frena cualquier formulario antes de enviarlo y avisa que es solo lectura.
 * Es solo comodidad: el bloqueo real está en el middleware, que rechaza toda escritura.
 */
export function SoloLectura() {
  const [aviso, setAviso] = useState(false);

  useEffect(() => {
    const frenar = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement;
      if (form.getAttribute("action") === "/ver-como/terminar") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      setAviso(true);
    };
    document.addEventListener("submit", frenar, true);
    return () => document.removeEventListener("submit", frenar, true);
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(false), 3500);
    return () => clearTimeout(t);
  }, [aviso]);

  return aviso ? (
    <div role="alert" className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-xl bg-[#f1d9a8] px-4 py-3 text-sm font-semibold text-[#2a2111] shadow-xl">
      Vista de solo lectura: aquí no se guarda nada. Toca «Terminar vista» para volver a tu cuenta.
    </div>
  ) : null;
}

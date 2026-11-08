"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/** Tu nombre arriba a la derecha: al tocarlo, Mi cuenta, Ayuda y Salir. Se cierra al cambiar de pantalla o tocar fuera. */
export function CuentaMenu({ nombre, children }: { nombre: string; children?: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const ruta = usePathname();
  useEffect(() => {
    ref.current?.removeAttribute("open");
  }, [ruta]);
  useEffect(() => {
    const fuera = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) ref.current.removeAttribute("open");
    };
    document.addEventListener("click", fuera);
    return () => document.removeEventListener("click", fuera);
  }, []);
  const inicial = nombre.trim().charAt(0).toUpperCase();
  return (
    <details ref={ref} className="relative">
      <summary
        aria-label={`Mi cuenta (${nombre})`}
        className="grid h-7 w-7 cursor-pointer select-none place-items-center rounded-full bg-white/[0.06] text-xs font-semibold text-texto-suave hover:bg-white/[0.1] hover:text-texto"
      >
        {inicial}
      </summary>
      <div className="absolute right-0 z-30 mt-2 flex w-48 flex-col gap-0.5 rounded-xl border border-borde bg-[#1e2028] p-1.5 shadow-2xl">
        <p className="truncate px-3 pb-1.5 pt-1 text-xs text-texto-suave">{nombre}</p>
        <Link href="/perfil" className="rounded-lg px-3 py-2 text-sm font-semibold text-texto no-underline hover:bg-white/[0.05]">
          Mi cuenta
        </Link>
        <Link href="/ayuda" className="rounded-lg px-3 py-2 text-sm font-semibold text-texto no-underline hover:bg-white/[0.05]">
          Ayuda
        </Link>
        {children}
      </div>
    </details>
  );
}

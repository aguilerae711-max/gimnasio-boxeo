"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { cambiarCuenta, salir, salirDeTodas } from "../(publico)/acciones";
import type { OtraCuenta } from "../_servidor/sesion";

const fila = "w-full rounded-lg px-3 py-2 text-left text-sm font-semibold no-underline hover:bg-white/[0.05]";

/**
 * Tu inicial arriba a la derecha. Al tocarla: tu cuenta, las otras abiertas en este dispositivo
 * (cambias con un toque, sin contraseña), agregar otra, Mi cuenta, Ayuda y Salir.
 */
export function CuentaMenu({
  nombre,
  usuario,
  otras = [],
  conCuenta = true,
  sinAcciones = false,
}: {
  nombre: string;
  usuario?: string | null;
  otras?: OtraCuenta[];
  /** Mi cuenta y Ayuda (no aplican en el panel del sistema). */
  conCuenta?: boolean;
  /** En "Ver como" no se cambia de cuenta ni se sale: se termina la vista. */
  sinAcciones?: boolean;
}) {
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
  const inicial = (n: string) => n.trim().charAt(0).toUpperCase();
  return (
    <details ref={ref} className="relative">
      <summary
        aria-label={`Mi cuenta (${nombre})`}
        className="grid h-7 w-7 cursor-pointer select-none place-items-center rounded-full bg-white/[0.06] text-xs font-semibold text-texto-suave hover:bg-white/[0.1] hover:text-texto"
      >
        {inicial(nombre)}
      </summary>
      <div className="absolute right-0 z-30 mt-2 flex w-60 flex-col gap-0.5 rounded-xl border border-borde bg-[#1e2028] p-1.5 shadow-2xl">
        <div className="px-3 pb-2 pt-1">
          <p className="truncate text-sm font-semibold text-texto">{nombre}</p>
          {usuario && <p className="truncate text-xs text-texto-suave">{usuario}</p>}
        </div>

        {!sinAcciones && otras.length > 0 && (
          <div className="border-t border-borde pt-1">
            <p className="px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-texto-suave">Cambiar a</p>
            {otras.map((o) => (
              <form key={o.indice} action={cambiarCuenta}>
                <input type="hidden" name="indice" value={o.indice} />
                <button type="submit" className={`${fila} flex items-center gap-2.5 text-texto`}>
                  <span aria-hidden className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/[0.08] text-[11px]">
                    {inicial(o.nombre)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate">{o.nombre}</span>
                    {o.usuario && <span className="block truncate text-xs font-normal text-texto-suave">{o.usuario}</span>}
                  </span>
                </button>
              </form>
            ))}
          </div>
        )}

        {!sinAcciones && (
          <Link href="/entrar?agregar=1" className={`${fila} text-texto-suave`}>
            + Agregar otra cuenta
          </Link>
        )}

        {conCuenta && (
          <div className="border-t border-borde pt-1">
            <Link href="/perfil" className={`${fila} block text-texto`}>
              Mi cuenta
            </Link>
            <Link href="/ayuda" className={`${fila} block text-texto`}>
              Ayuda
            </Link>
          </div>
        )}

        {!sinAcciones && (
          <div className="border-t border-borde pt-1">
            <form action={salir}>
              <button type="submit" className={`${fila} text-[#ff8f97]`}>
                {otras.length > 0 ? "Salir de esta cuenta" : "Salir"}
              </button>
            </form>
            {otras.length > 0 && (
              <form action={salirDeTodas}>
                <button type="submit" className={`${fila} text-texto-suave`}>
                  Salir de todas
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </details>
  );
}

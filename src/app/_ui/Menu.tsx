"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export interface Enlace {
  href: string;
  texto: string;
  aviso?: number;
}

/** Una opción del menú; si tiene varias pantallas, se muestran como subpestañas. */
export interface Opcion {
  texto: string;
  paginas: Enlace[];
  aviso?: number;
}

export interface Rol {
  clave: string;
  titulo: string;
  opciones: Opcion[];
}

const GUARDADO = "rol_en_uso";

/** La página actual es la de la ruta más específica que coincide (así /admin/pagos no marca también /admin). */
function masEspecifica(ruta: string, enlaces: Enlace[]): string | null {
  const candidatos = enlaces.filter((e) => ruta === e.href || ruta.startsWith(`${e.href}/`));
  return candidatos.sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
}

const paginasDe = (rol: Rol) => rol.opciones.flatMap((o) => o.paginas);

/**
 * Menú por rol: arriba se elige el rol (Administro · Doy clases · Entreno) y abajo va su menú corto.
 * Las opciones con varias pantallas muestran subpestañas. Se recuerda el último rol usado.
 */
export function Menu({ roles }: { roles: Rol[] }) {
  const ruta = usePathname();
  const [guardado, setGuardado] = useState<string | null>(null);
  useEffect(() => {
    try {
      setGuardado(localStorage.getItem(GUARDADO));
    } catch {
      /* sin almacenamiento: se elige por la ruta */
    }
  }, []);

  const conRuta = roles.filter((r) => masEspecifica(ruta, paginasDe(r)));
  // En pantallas compartidas (Novedades, Biblioteca) se queda el rol que venías usando.
  const rol =
    conRuta.find((r) => r.clave === guardado) ??
    conRuta.sort((a, b) => (masEspecifica(ruta, paginasDe(b))?.length ?? 0) - (masEspecifica(ruta, paginasDe(a))?.length ?? 0))[0] ??
    roles.find((r) => r.clave === guardado) ??
    roles[0];

  useEffect(() => {
    if (!rol) return;
    try {
      localStorage.setItem(GUARDADO, rol.clave);
    } catch {
      /* nada */
    }
  }, [rol]);

  if (!rol) return null;
  const actual = masEspecifica(ruta, paginasDe(rol));
  const opcionActual = rol.opciones.find((o) => o.paginas.some((p) => p.href === actual));

  return (
    <nav aria-label="Menú" className="mt-5 flex flex-col gap-3">
      {roles.length > 1 && (
        <div role="tablist" aria-label="Rol" className="inline-flex w-fit gap-1 rounded-xl border border-borde bg-[#16181d] p-1">
          {roles.map((r) => (
            <Link
              key={r.clave}
              href={r.opciones[0].paginas[0].href}
              role="tab"
              aria-selected={r === rol}
              onClick={() => setGuardado(r.clave)}
              className={`rounded-lg px-3.5 py-1.5 text-[13px] font-semibold no-underline ${
                r === rol ? "bg-[#2a2d36] text-texto shadow-sm" : "text-texto-suave hover:text-texto"
              }`}
            >
              {r.titulo}
            </Link>
          ))}
        </div>
      )}
      <div className="sin-barra -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {rol.opciones.map((o) => {
          const activa = o === opcionActual;
          return (
            <Link
              key={o.texto}
              href={o.paginas[0].href}
              aria-current={activa ? "page" : undefined}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold no-underline ${
                activa ? "bg-acento text-white" : "text-[#c9ccd3] hover:bg-white/[0.05]"
              }`}
            >
              {o.texto}
              {o.aviso ? <span className="cifras ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-xs text-white">{o.aviso}</span> : null}
            </Link>
          );
        })}
      </div>
      {opcionActual && opcionActual.paginas.length > 1 && (
        <div className="sin-barra -mx-1 flex gap-5 overflow-x-auto border-b border-borde px-1">
          {opcionActual.paginas.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              aria-current={p.href === actual ? "page" : undefined}
              className={`-mb-px whitespace-nowrap border-b-2 pb-2 text-sm font-semibold no-underline ${
                p.href === actual ? "border-acento text-texto" : "border-transparent text-texto-suave hover:text-texto"
              }`}
            >
              {p.texto}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}

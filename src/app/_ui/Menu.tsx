"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface Enlace {
  href: string;
  texto: string;
  aviso?: number;
}

export interface Grupo {
  titulo: string;
  enlaces: Enlace[];
}

const pastilla = (activa: boolean) =>
  `whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold no-underline ${activa ? "bg-acento text-white" : "bg-tarjeta text-[#c9ccd3]"}`;

/** La página actual es la de la ruta más específica que coincide (así /admin/pagos no marca también /admin). */
function activa(ruta: string, todos: Enlace[]): string | null {
  const candidatos = todos.filter((e) => ruta === e.href || ruta.startsWith(`${e.href}/`));
  return candidatos.sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
}

/**
 * Menú en dos niveles: arriba los grupos (Gimnasio, Coach, Cliente) y lo suelto (Novedades, Mi perfil, Ayuda);
 * abajo, las páginas del grupo en el que estás. Si la persona solo tiene un grupo, todo va en una fila.
 */
export function Menu({ grupos, sueltos }: { grupos: Grupo[]; sueltos: { antes: Enlace[]; despues: Enlace[] } }) {
  const ruta = usePathname();
  const conEnlaces = grupos.filter((g) => g.enlaces.length > 0);
  const todos = [...sueltos.antes, ...sueltos.despues, ...conEnlaces.flatMap((g) => g.enlaces)];
  const actual = activa(ruta, todos);
  const contenido = (e: Enlace) => (
    <>
      {e.texto}
      {e.aviso ? <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-xs text-white">{e.aviso}</span> : null}
    </>
  );
  const fila = (enlaces: Enlace[]) =>
    enlaces.map((e) => (
      <Link key={e.href} href={e.href} className={pastilla(actual === e.href)} aria-current={actual === e.href ? "page" : undefined}>
        {contenido(e)}
      </Link>
    ));

  if (conEnlaces.length <= 1) {
    return <nav className="-mx-1 mt-4 flex gap-2 overflow-x-auto pb-1">{fila([...sueltos.antes, ...(conEnlaces[0]?.enlaces ?? []), ...sueltos.despues])}</nav>;
  }

  const grupoActual = conEnlaces.find((g) => g.enlaces.some((e) => e.href === actual));
  return (
    <nav className="mt-4 flex flex-col gap-2">
      <div className="-mx-1 flex gap-2 overflow-x-auto pb-1">
        {fila(sueltos.antes)}
        {conEnlaces.map((g) => (
          <Link key={g.titulo} href={g.enlaces[0].href} className={pastilla(g === grupoActual)}>
            {g.titulo} ▾
          </Link>
        ))}
        {fila(sueltos.despues)}
      </div>
      {grupoActual && (
        <div className="-mx-1 flex gap-2 overflow-x-auto border-l-2 border-acento pb-1 pl-2">
          {grupoActual.enlaces.map((e) => (
            <Link
              key={e.href}
              href={e.href}
              aria-current={actual === e.href ? "page" : undefined}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold no-underline ${actual === e.href ? "bg-[#2a1418] text-[#ff8f97]" : "text-[#c9ccd3]"}`}
            >
              {contenido(e)}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}

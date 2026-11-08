import type { CSSProperties } from "react";
import { requerirSistema } from "../_servidor/sesion";
import { salir } from "../(publico)/acciones";

export const dynamic = "force-dynamic";
export const metadata = { title: { absolute: "Panel del sistema" } };

/** Colores propios del sistema: neutros, sin la marca de ningún gimnasio. */
const TEMA = { "--acento": "#4f8cff", "--color-acento": "#4f8cff" } as CSSProperties;

/**
 * Interfaz del superadministrador: no pertenece a ningún gimnasio, así que no lleva su logotipo,
 * su nombre en letras góticas ni su menú. A un gimnasio se entra desde el panel.
 */
export default async function LayoutSistema({ children }: { children: React.ReactNode }) {
  const sesion = await requerirSistema();
  return (
    <div style={TEMA} className="min-h-screen">
      <header className="border-b border-[#262932] bg-[#0f1116]">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-3">
            <span aria-hidden className="grid h-9 w-9 place-items-center rounded-lg bg-[#4f8cff] text-sm font-black text-white">
              SG
            </span>
            <div className="leading-tight">
              <p className="text-sm font-bold tracking-tight">Sistema de gestión de gimnasios</p>
              <p className="text-xs text-texto-suave">Superadministrador</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-texto-suave">
            <span>{sesion.nombre}</span>
            <form action={salir}>
              <button type="submit" className="min-h-9 rounded-lg border border-[#3a3d46] px-3 font-semibold text-texto">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-6">{children}</main>
    </div>
  );
}

import type { CSSProperties } from "react";
import { otrasCuentas, requerirSistema } from "../_servidor/sesion";
import { casosDeAcceso } from "../_servidor/contenedor";
import { CuentaMenu } from "../_ui/CuentaMenu";

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
  const [otras, cuenta] = await Promise.all([otrasCuentas(), casosDeAcceso().then((a) => a.cuenta(sesion.usuarioId))]);
  return (
    <div style={TEMA} className="min-h-screen">
      <header className="border-b border-[#262932] bg-[#0f1116]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden className="grid h-9 w-9 place-items-center shrink-0 rounded-lg bg-[#4f8cff] text-sm font-black text-white">
              SG
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-bold tracking-tight">Sistema de gestión de gimnasios</p>
              <p className="text-xs text-texto-suave">Administración del sistema</p>
            </div>
          </div>
          <CuentaMenu nombre={sesion.nombre} usuario={cuenta?.usuario ?? null} otras={otras} conCuenta={false} />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-5 [&>*]:min-w-0">{children}</main>
    </div>
  );
}

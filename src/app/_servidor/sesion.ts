import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { ContextoDeSesion } from "@/modules/acceso/infrastructure/AccesoPostgres";
import { ErrorDeDominio } from "@/shared/domain/ErrorDeDominio";
import { casosDeAcceso, huellaDe } from "./contenedor";

const COOKIE = "sesion";

export type Sesion = ContextoDeSesion & { gimnasioId: string };

/** La sesión de quien hace la petición; se consulta una vez por petición. */
export const sesionActual = cache(async (): Promise<ContextoDeSesion | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  return (await casosDeAcceso()).sesiones.contexto(huellaDe(token));
});

/** Para páginas y acciones privadas: sin sesión manda a Entrar; sin el permiso, al panel. */
export async function requerirSesion(permiso?: string): Promise<Sesion> {
  const sesion = await sesionActual();
  if (!sesion || !sesion.gimnasioId) redirect("/entrar");
  if (permiso && !sesion.permisos.includes(permiso)) redirect("/panel");
  return sesion as Sesion;
}

/** Cómo lee las novedades: la administración todo; si no, como coach o como cliente. */
export function lectorDe(sesion: { permisos: readonly string[]; roles: readonly string[] }): "administracion" | "coach" | "cliente" {
  if (sesion.permisos.includes("novedades.publicar")) return "administracion";
  return sesion.roles.includes("coach") ? "coach" : "cliente";
}

export async function guardarSesion(token: string, expiraEn: Date) {
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiraEn,
  });
}

export async function tokenDeSesion(): Promise<string | undefined> {
  return (await cookies()).get(COOKIE)?.value;
}

export async function borrarSesion() {
  (await cookies()).delete(COOKIE);
}

/** Dirección pública de la app (Cloud Run o local), para armar enlaces que se comparten. */
export async function direccionPublica(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocolo = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocolo}://${host}`;
}

export interface EstadoFormulario {
  error?: string;
  ok?: string;
  /** Valores para volver a llenar el formulario si hubo error. */
  valores?: Record<string, string>;
}

/** Los errores de reglas se muestran tal cual; cualquier otro se registra y se muestra genérico. */
export function mensajeDeError(e: unknown): string {
  if (e instanceof ErrorDeDominio) return e.message;
  console.error(e);
  return "Algo salió mal. Intenta de nuevo en un momento.";
}

import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { ContextoDeSesion } from "@/modules/acceso/infrastructure/AccesoPostgres";
import { ErrorDeDominio } from "@/shared/domain/ErrorDeDominio";
import { casosDeAcceso, huellaDe } from "./contenedor";

const COOKIE = "sesion";
/** Cookie de "Ver como": el id de la cuenta que el superadministrador está viendo. El middleware bloquea toda escritura mientras exista. */
export const COOKIE_VER_COMO = "ver_como";
/** Cookie del gimnasio al que entró el superadministrador desde su panel. */
export const COOKIE_GIMNASIO = "gimnasio_activo";
const PERMISO_SISTEMA = "sistema.administrar";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Quién está viendo de verdad cuando el superadministrador usa "Ver como". */
export interface VistaComo {
  usuarioId: string;
  nombre: string;
}

export type ContextoActual = ContextoDeSesion & { vistaComo?: VistaComo };
export type Sesion = ContextoActual & { gimnasioId: string };

/** La sesión real de quien hace la petición (sin "Ver como"); se consulta una vez por petición. */
export const sesionReal = cache(async (): Promise<ContextoDeSesion | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  return (await casosDeAcceso()).sesiones.contexto(huellaDe(token));
});

/**
 * La cuenta que puede verse "como" dentro de un gimnasio: activa, con algún rol en ese gimnasio
 * y que no sea superadministrador. Su pantalla es la de ese gimnasio, con su marca.
 */
export async function contextoParaVerComo(usuarioId: string, gimnasioId: string): Promise<ContextoDeSesion | null> {
  if (!UUID.test(usuarioId) || !UUID.test(gimnasioId)) return null;
  const ctx = await (await casosDeAcceso()).sesiones.contextoEnGimnasio(usuarioId, gimnasioId);
  return ctx && ctx.roles.length > 0 && !ctx.permisos.includes(PERMISO_SISTEMA) ? ctx : null;
}

/** La cookie de "Ver como" guarda "usuarioId:gimnasioId". */
export const valorVerComo = (usuarioId: string, gimnasioId: string) => `${usuarioId}:${gimnasioId}`;
export function leerVerComo(valor: string | undefined): { usuarioId: string; gimnasioId: string } | null {
  const [usuarioId = "", gimnasioId = ""] = (valor ?? "").split(":");
  return UUID.test(usuarioId) && UUID.test(gimnasioId) ? { usuarioId, gimnasioId } : null;
}

/**
 * La sesión con la que se arma la pantalla. Si el superadministrador activó "Ver como", es la de la otra persona
 * (con `vistaComo` marcando quién mira de verdad); cualquier otra persona con esa cookie la ignora.
 */
export const sesionActual = cache(async (): Promise<ContextoActual | null> => {
  const real = await sesionReal();
  if (!real || !real.permisos.includes(PERMISO_SISTEMA)) return real;
  const galletas = await cookies();
  const objetivo = leerVerComo(galletas.get(COOKIE_VER_COMO)?.value);
  if (objetivo) {
    const ctx = await contextoParaVerComo(objetivo.usuarioId, objetivo.gimnasioId);
    if (ctx) return { ...ctx, vistaComo: { usuarioId: real.usuarioId, nombre: real.nombre } };
  }
  // El superadministrador no pertenece a ningún gimnasio: entra al que elige desde el panel del sistema.
  const elegido = galletas.get(COOKIE_GIMNASIO)?.value;
  const enGimnasio = elegido && UUID.test(elegido) ? await (await casosDeAcceso()).sesiones.contextoEnGimnasio(real.usuarioId, elegido) : null;
  return enGimnasio ?? { ...real, gimnasioId: null };
});

export const esSuperadministrador = (s: { permisos: readonly string[]; vistaComo?: VistaComo }) =>
  s.permisos.includes(PERMISO_SISTEMA) && !s.vistaComo;

/** Para páginas y acciones privadas de un gimnasio: sin sesión manda a Entrar; sin el permiso, al panel. */
export async function requerirSesion(permiso?: string): Promise<Sesion> {
  const sesion = await sesionActual();
  if (!sesion) redirect("/entrar");
  // El superadministrador sin gimnasio elegido regresa a su panel.
  if (!sesion.gimnasioId) redirect(esSuperadministrador(sesion) ? "/sistema" : "/entrar");
  if (permiso && !sesion.permisos.includes(permiso)) redirect("/panel");
  return sesion as Sesion;
}

/** Para el panel del sistema: solo el superadministrador, con o sin gimnasio elegido, y nunca durante "Ver como". */
export async function requerirSistema(): Promise<ContextoActual> {
  const sesion = await sesionActual();
  if (!sesion) redirect("/entrar");
  if (!esSuperadministrador(sesion)) redirect("/panel");
  return sesion;
}

/** Cómo lee las novedades: la administración todo; si no, como coach o como cliente. */
export function lectorDe(sesion: { permisos: readonly string[]; roles: readonly string[] }): "administracion" | "coach" | "cliente" {
  if (sesion.permisos.includes("novedades.publicar")) return "administracion";
  return sesion.roles.includes("coach") ? "coach" : "cliente";
}

/** Otras cuentas con sesión abierta en este dispositivo (para cambiar de cuenta sin volver a entrar). */
const COOKIE_CUENTAS = "cuentas";
const MAX_CUENTAS = 4;
const TOKEN = /^[A-Za-z0-9_-]{20,200}$/;

async function leerCuentas(): Promise<string[]> {
  try {
    const lista = JSON.parse((await cookies()).get(COOKIE_CUENTAS)?.value ?? "[]");
    return Array.isArray(lista) ? lista.filter((t): t is string => typeof t === "string" && TOKEN.test(t)).slice(0, MAX_CUENTAS) : [];
  } catch {
    return [];
  }
}

async function escribirCuentas(lista: string[]) {
  const c = await cookies();
  if (lista.length === 0) return void c.delete(COOKIE_CUENTAS);
  c.set(COOKIE_CUENTAS, JSON.stringify(lista.slice(0, MAX_CUENTAS)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 3600,
  });
}

/**
 * Deja activa la sesión de este token. Con conservarActual (al "agregar otra cuenta"),
 * la sesión que estaba activa se guarda en la lista de cuentas de este dispositivo.
 */
export async function guardarSesion(token: string, expiraEn: Date, { conservarActual = false } = {}) {
  const c = await cookies();
  const actual = c.get(COOKIE)?.value;
  let otras = (await leerCuentas()).filter((t) => t !== token);
  if (conservarActual && actual && actual !== token) otras = [actual, ...otras.filter((t) => t !== actual)];
  await escribirCuentas(otras);
  c.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiraEn,
  });
  // Al cambiar de cuenta no se arrastra la vista ni la administración elegida por la otra.
  c.delete(COOKIE_VER_COMO);
  c.delete(COOKIE_GIMNASIO);
}

export interface OtraCuenta {
  indice: number;
  nombre: string;
  usuario: string | null;
}

/** Las otras cuentas abiertas en este dispositivo que siguen vigentes (sin la actual). */
export async function otrasCuentas(): Promise<OtraCuenta[]> {
  const acceso = await casosDeAcceso();
  const actual = await sesionReal();
  const lista = await leerCuentas();
  const cuentas = await Promise.all(
    lista.map(async (token, indice) => {
      const ctx = await acceso.sesiones.contexto(huellaDe(token));
      if (!ctx || ctx.usuarioId === actual?.usuarioId) return null;
      return { indice, nombre: ctx.nombre, usuario: (await acceso.cuenta(ctx.usuarioId))?.usuario ?? null };
    }),
  );
  return cuentas.filter((c): c is OtraCuenta => c !== null);
}

/** Cambia a la cuenta guardada en esa posición; la actual pasa a la lista. False si ya no es válida. */
export async function cambiarACuenta(indice: number): Promise<boolean> {
  const lista = await leerCuentas();
  const token = lista[indice];
  if (!token || !(await (await casosDeAcceso()).sesiones.contexto(huellaDe(token)))) {
    await escribirCuentas(lista.filter((_, i) => i !== indice));
    return false;
  }
  await guardarSesion(token, new Date(Date.now() + 30 * 24 * 3600 * 1000), { conservarActual: true });
  return true;
}

/** Al salir de una cuenta, pasa a la siguiente que siga abierta; si no hay, false. */
export async function pasarASiguienteCuenta(): Promise<boolean> {
  const lista = await leerCuentas();
  const acceso = await casosDeAcceso();
  for (const [i, token] of lista.entries()) {
    if (await acceso.sesiones.contexto(huellaDe(token))) {
      await escribirCuentas(lista.filter((_, j) => j !== i));
      const c = await cookies();
      c.set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 30 * 24 * 3600 });
      c.delete(COOKIE_VER_COMO);
      c.delete(COOKIE_GIMNASIO);
      return true;
    }
  }
  await escribirCuentas([]);
  return false;
}

/** Todos los tokens abiertos en este dispositivo (la actual y las guardadas), para salir de todas. */
export async function todasLasSesiones(): Promise<string[]> {
  const actual = (await cookies()).get(COOKIE)?.value;
  return [...(actual ? [actual] : []), ...(await leerCuentas())];
}

export async function tokenDeSesion(): Promise<string | undefined> {
  return (await cookies()).get(COOKIE)?.value;
}

export async function borrarSesion() {
  const c = await cookies();
  c.delete(COOKIE);
  c.delete(COOKIE_CUENTAS);
  c.delete(COOKIE_VER_COMO);
  c.delete(COOKIE_GIMNASIO);
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

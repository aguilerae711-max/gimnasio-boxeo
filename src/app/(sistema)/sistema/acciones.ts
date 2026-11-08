"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuditoriaPostgres } from "@/shared/infrastructure/comunes";
import { baseDeDatos } from "@/shared/infrastructure/baseDeDatos";
import { revalidatePath } from "next/cache";
import type { TipoTarifa } from "@/modules/membresias/domain/Cuentas";
import { casosDePagos } from "../../_servidor/contenedor";
import {
  COOKIE_GIMNASIO,
  COOKIE_VER_COMO,
  contextoParaVerComo,
  mensajeDeError,
  requerirSistema,
  valorVerComo,
  type EstadoFormulario,
} from "../../_servidor/sesion";

/** Pantalla de entrada de cada interfaz al empezar a ver como otra persona. */
const INTERFACES = {
  administracion: "/admin",
  coach: "/coach",
  cliente: "/cliente",
} as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const segura = process.env.NODE_ENV === "production";

/**
 * Entrar a un gimnasio desde el panel del sistema: a partir de ahí se ve su administración con su marca.
 * El superadministrador no pertenece a ningún gimnasio; cada entrada queda en la auditoría de ese gimnasio.
 */
export async function entrarAGimnasio(datos: FormData) {
  const sesion = await requerirSistema();
  const gimnasioId = String(datos.get("gimnasioId") ?? "");
  if (!UUID.test(gimnasioId)) redirect("/sistema");
  const [g] = await baseDeDatos()<{ id: string }[]>`SELECT id FROM gimnasio WHERE id = ${gimnasioId} AND eliminado_en IS NULL`;
  if (!g) redirect("/sistema");
  await new AuditoriaPostgres(baseDeDatos()).registrar({
    gimnasioId,
    usuarioId: sesion.usuarioId,
    accion: "sistema.entro_al_gimnasio",
    entidad: "gimnasio",
    entidadId: gimnasioId,
    antes: null,
    despues: null,
  });
  (await cookies()).set(COOKIE_GIMNASIO, gimnasioId, { httpOnly: true, secure: segura, sameSite: "lax", path: "/", maxAge: 30 * 24 * 60 * 60 });
  redirect("/admin");
}

/**
 * Empieza "Ver como": solo el superadministrador. Queda en la auditoría del gimnasio de esa persona;
 * dura 2 horas o hasta tocar «Terminar vista», y mientras dure nada se puede guardar.
 */
export async function verComo(datos: FormData) {
  const sesion = await requerirSistema();
  // La opción elegida viene como "interfaz:usuarioId", desde la página del gimnasio.
  const [pedidaTexto, usuarioId = ""] = String(datos.get("eleccion") ?? "").split(":");
  const gimnasioId = String(datos.get("gimnasioId") ?? "");
  const deVuelta = UUID.test(gimnasioId) ? `/sistema/administraciones/${gimnasioId}?vercomo=no` : "/sistema";
  // Solo personas de la administración elegida: Sistema → Administración → Interfaz → Persona.
  const objetivo = await contextoParaVerComo(usuarioId, gimnasioId);
  if (!objetivo) redirect(deVuelta);

  const pedida = pedidaTexto as keyof typeof INTERFACES;
  const disponible = (i: keyof typeof INTERFACES) =>
    i === "administracion" ? objetivo.permisos.includes("cliente.aprobar") : objetivo.roles.includes(i);
  const interfaz = pedida in INTERFACES && disponible(pedida)
    ? pedida
    : (["administracion", "coach", "cliente"] as const).find(disponible);
  if (!interfaz) redirect(deVuelta);

  await new AuditoriaPostgres(baseDeDatos()).registrar({
    gimnasioId,
    usuarioId: sesion.usuarioId,
    accion: "sistema.ver_como",
    entidad: "usuario",
    entidadId: objetivo.usuarioId,
    antes: null,
    despues: { interfaz },
  });
  (await cookies()).set(COOKIE_VER_COMO, valorVerComo(objetivo.usuarioId, gimnasioId), { httpOnly: true, secure: segura, sameSite: "strict", path: "/", maxAge: 2 * 60 * 60 });
  redirect(INTERFACES[interfaz]);
}

/** La cuota del servicio es entre cada administración y el sistema: solo se programa desde aquí. */
export async function programarCuota(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const sesion = await requerirSistema();
  const gimnasioId = String(datos.get("gimnasioId") ?? "");
  if (!UUID.test(gimnasioId)) return { error: "Administración no válida." };
  const numero = (campo: string) => Number(String(datos.get(campo) ?? "").replace(",", ".")) || 0;
  try {
    await casosDePagos(sesion.permisos, sesion.zonaHoraria).cambiarTarifa.ejecutar(
      { usuarioId: sesion.usuarioId, gimnasioId },
      {
        tipo: String(datos.get("tipo") ?? "") as TipoTarifa,
        porcentaje: numero("porcentaje"),
        cuotaPesos: numero("cuota"),
        desdeMes: String(datos.get("desde") ?? ""),
        motivo: String(datos.get("motivo") ?? ""),
      },
    );
  } catch (e) {
    return { error: mensajeDeError(e) };
  }
  revalidatePath("/sistema", "layout");
  return { ok: "Cuota programada." };
}

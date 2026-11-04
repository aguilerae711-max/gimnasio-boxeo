"use server";

import { revalidatePath } from "next/cache";
import type { Audiencia, TipoPublicacion } from "@/modules/novedades/domain/Novedades";
import { casosDeNovedades } from "../../_servidor/contenedor";
import { lectorDe, mensajeDeError, requerirSesion, type EstadoFormulario } from "../../_servidor/sesion";

const texto = (datos: FormData, campo: string) => String(datos.get(campo) ?? "").trim();

/** "2026-11-28T10:00" (hora local del gimnasio, México sin horario de verano) → Date. */
const fechaLocal = (valor: string) => (valor ? new Date(`${valor}:00-06:00`) : null);

function refrescar() {
  revalidatePath("/novedades");
  revalidatePath("/", "layout");
}

export async function publicar(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const sesion = await requerirSesion("novedades.publicar");
  const valores = { titulo: texto(datos, "titulo"), cuerpo: texto(datos, "cuerpo"), lugar: texto(datos, "lugar") };
  try {
    await casosDeNovedades(sesion.permisos).publicar.ejecutar(sesion, {
      tipo: texto(datos, "tipo") as TipoPublicacion,
      titulo: valores.titulo,
      cuerpo: valores.cuerpo,
      audiencia: texto(datos, "audiencia") as Audiencia,
      fijada: datos.get("fijada") === "si",
      expiraEn: fechaLocal(texto(datos, "expira")),
      inicio: fechaLocal(texto(datos, "inicio")),
      fin: fechaLocal(texto(datos, "fin")),
      lugar: valores.lugar,
      cupo: texto(datos, "cupo") ? Number(texto(datos, "cupo")) : null,
      requiereInscripcion: datos.get("inscripcion") === "si",
      menciones: datos.getAll("menciones").map(String).filter(Boolean),
    });
  } catch (e) {
    return { error: mensajeDeError(e), valores };
  }
  refrescar();
  return { ok: "Publicado." };
}

export async function archivar(datos: FormData) {
  const sesion = await requerirSesion("novedades.publicar");
  await casosDeNovedades(sesion.permisos).archivar.ejecutar(sesion, texto(datos, "id"));
  refrescar();
}

export async function inscribirse(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const sesion = await requerirSesion();
  const casos = casosDeNovedades(sesion.permisos);
  try {
    if (texto(datos, "accion") === "cancelar") await casos.cancelar.ejecutar(sesion, texto(datos, "id"));
    else await casos.inscribirse.ejecutar(sesion, lectorDe(sesion), texto(datos, "id"));
  } catch (e) {
    return { error: mensajeDeError(e) };
  }
  refrescar();
  return { ok: texto(datos, "accion") === "cancelar" ? "Inscripción cancelada." : "¡Listo, estás inscrito!" };
}

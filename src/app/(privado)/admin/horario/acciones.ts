"use server";

import { revalidatePath } from "next/cache";
import { casosDeOperacion } from "../../../_servidor/contenedor";
import { mensajeDeError, requerirSesion, type EstadoFormulario } from "../../../_servidor/sesion";

const texto = (datos: FormData, campo: string) => String(datos.get(campo) ?? "").trim();

export async function asignarTurno(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const sesion = await requerirSesion("horario.asignar");
  const cupo = texto(datos, "cupo");
  try {
    await casosDeOperacion(sesion.permisos, sesion.zonaHoraria).asignarTurno.ejecutar(sesion, {
      coachId: texto(datos, "coachId"),
      franjaId: texto(datos, "franjaId"),
      diaSemana: Number(texto(datos, "dia")),
      cupoMax: cupo ? Number(cupo) : null,
    });
  } catch (e) {
    return { error: mensajeDeError(e) };
  }
  revalidatePath("/admin/horario");
  return { ok: "Turno agregado." };
}

export async function quitarTurno(datos: FormData) {
  const sesion = await requerirSesion("horario.asignar");
  await casosDeOperacion(sesion.permisos, sesion.zonaHoraria).quitarTurno.ejecutar(sesion, texto(datos, "asignacionId"));
  revalidatePath("/admin/horario");
}

"use server";

import { revalidatePath } from "next/cache";
import { casosDeOperacion } from "../../_servidor/contenedor";
import { mensajeDeError, requerirSesion, type EstadoFormulario } from "../../_servidor/sesion";

const texto = (datos: FormData, campo: string) => String(datos.get(campo) ?? "");

/** Lo usa el cliente para su perfil y la administración desde la ficha del cliente. */
export async function guardarPerfilCliente(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const sesion = await requerirSesion();
  try {
    await casosDeOperacion(sesion.permisos, sesion.zonaHoraria)
      .perfilCliente()
      .ejecutar(sesion, texto(datos, "clienteId"), {
        fechaNacimiento: texto(datos, "fechaNacimiento"),
        contactoEmergencia: texto(datos, "contactoEmergencia"),
        notasMedicas: texto(datos, "notasMedicas"),
      });
  } catch (e) {
    return { error: mensajeDeError(e) };
  }
  revalidatePath("/perfil");
  revalidatePath("/admin/clientes/[id]", "page");
  return { ok: "Perfil guardado." };
}

export async function guardarPerfilCoach(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const sesion = await requerirSesion();
  try {
    await casosDeOperacion(sesion.permisos, sesion.zonaHoraria).perfilCoach.ejecutar(sesion, {
      bio: texto(datos, "bio"),
      especialidad: texto(datos, "especialidad"),
    });
  } catch (e) {
    return { error: mensajeDeError(e) };
  }
  revalidatePath("/perfil");
  return { ok: "Perfil guardado. Así apareces en la página pública." };
}

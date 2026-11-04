"use server";

import { revalidatePath } from "next/cache";
import { casosDeAcceso, casosDeClientes, casosDeOperacion } from "../../_servidor/contenedor";
import { mensajeDeError, requerirSesion, type EstadoFormulario } from "../../_servidor/sesion";

const texto = (datos: FormData, campo: string) => String(datos.get(campo) ?? "");

export async function inscribirmeComoCliente(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const sesion = await requerirSesion();
  try {
    const r = await casosDeClientes()
      .inscribirme(sesion.permisos)
      .ejecutar(sesion, { coachId: texto(datos, "coachId"), sexo: texto(datos, "sexo") as "F" | "M" | "", aceptaReglamento: datos.get("reglamento") === "si" });
    revalidatePath("/", "layout");
    return {
      ok:
        r.estado === "activo"
          ? "Listo: ya tienes el grupo Cliente en el menú. Asígnate tu horario desde tu ficha en Administración → Clientes."
          : "Listo: tu inscripción quedó por aprobar en la administración.",
    };
  } catch (e) {
    return { error: mensajeDeError(e) };
  }
}

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
        sexo: texto(datos, "sexo") as "F" | "M" | "",
      });
  } catch (e) {
    return { error: mensajeDeError(e) };
  }
  revalidatePath("/perfil");
  revalidatePath("/admin/clientes/[id]", "page");
  return { ok: "Perfil guardado." };
}

export async function cambiarMiUsuario(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const sesion = await requerirSesion();
  try {
    const usuario = await (await casosDeAcceso()).cambiarUsuario.ejecutar(sesion, texto(datos, "usuario"));
    revalidatePath("/perfil");
    return { ok: usuario ? `Listo: ya puedes entrar como ${usuario}.` : "Quitaste tu usuario; entras con tu correo." };
  } catch (e) {
    return { error: mensajeDeError(e) };
  }
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

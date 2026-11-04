"use server";

import { revalidatePath } from "next/cache";
import { casosDeAcceso, casosDeClientes, casosDeComisiones, casosDeSolicitudes } from "../../_servidor/contenedor";
import { direccionPublica, mensajeDeError, requerirSesion, type EstadoFormulario } from "../../_servidor/sesion";

const texto = (datos: FormData, campo: string) => String(datos.get(campo) ?? "");
const actor = (s: { usuarioId: string; gimnasioId: string }) => ({ usuarioId: s.usuarioId, gimnasioId: s.gimnasioId });

export async function revisarCliente(datos: FormData) {
  const sesion = await requerirSesion("cliente.aprobar");
  const decision = texto(datos, "decision") === "aprobar" ? "aprobar" : "rechazar";
  await casosDeClientes().revisar(sesion.permisos).ejecutar(actor(sesion), texto(datos, "clienteId"), decision);
  revalidatePath("/admin");
}

export interface EstadoEnlace extends EstadoFormulario {
  enlace?: string;
  nombre?: string;
}

export async function generarEnlace(_: EstadoEnlace, datos: FormData): Promise<EstadoEnlace> {
  const sesion = await requerirSesion("usuario.enlace_acceso");
  try {
    const { token } = await (await casosDeAcceso()).generarEnlace(sesion.permisos).ejecutar(actor(sesion), texto(datos, "usuarioId"));
    return { enlace: `${await direccionPublica()}/activar/${token}`, nombre: texto(datos, "nombre") };
  } catch (e) {
    return { error: mensajeDeError(e) };
  }
}

/** Alta de alguien de administración o coach, y de una vez su enlace de activación para mandárselo. */
export async function agregarAlEquipo(_: EstadoEnlace, datos: FormData): Promise<EstadoEnlace> {
  const sesion = await requerirSesion("equipo.agregar");
  const nombre = texto(datos, "nombre");
  try {
    const acceso = await casosDeAcceso();
    const id = await acceso.agregarMiembro(sesion.permisos).ejecutar(actor(sesion), {
      nombre,
      usuario: texto(datos, "usuario"),
      rol: texto(datos, "rol") === "coach" ? "coach" : "admin",
    });
    const { token } = await acceso.generarEnlace(sesion.permisos).ejecutar(actor(sesion), id);
    revalidatePath("/admin");
    return { enlace: `${await direccionPublica()}/activar/${token}`, nombre };
  } catch (e) {
    return { error: mensajeDeError(e), valores: { nombre, usuario: texto(datos, "usuario") } };
  }
}

export async function atenderSolicitud(datos: FormData) {
  const sesion = await requerirSesion("cliente.aprobar");
  await casosDeSolicitudes(sesion.permisos).atender.ejecutar(actor(sesion), texto(datos, "id"), texto(datos, "estado") === "descartado" ? "descartado" : "contactado");
  revalidatePath("/admin");
}

export async function cambiarComision(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const sesion = await requerirSesion("comision.cambiar");
  const alcance = texto(datos, "alcance");
  try {
    const acuerdo = await casosDeComisiones()
      .cambiar(sesion.permisos, sesion.zonaHoraria)
      .ejecutar(actor(sesion), {
        coachId: alcance === "general" ? null : alcance,
        porcentaje: Number(texto(datos, "porcentaje").replace(",", ".")),
        vigenteDesde: texto(datos, "desde"),
        motivo: texto(datos, "motivo"),
      });
    revalidatePath("/admin/comisiones");
    return { ok: `Listo: ${acuerdo.porcentaje.valor}% desde el ${acuerdo.vigenteDesde.valor}.` };
  } catch (e) {
    return { error: mensajeDeError(e) };
  }
}

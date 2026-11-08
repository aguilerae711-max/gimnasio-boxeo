"use server";

import { revalidatePath } from "next/cache";
import { casosDeAcceso, casosDeClientes, casosDeComisiones, casosDeSolicitudes, casosDeSolicitudesCoach } from "../../_servidor/contenedor";
import { direccionPublica, mensajeDeError, requerirSesion, type EstadoFormulario } from "../../_servidor/sesion";

const texto = (datos: FormData, campo: string) => String(datos.get(campo) ?? "");
const actor = (s: { usuarioId: string; gimnasioId: string }) => ({ usuarioId: s.usuarioId, gimnasioId: s.gimnasioId });

export async function revisarCliente(datos: FormData) {
  const sesion = await requerirSesion("cliente.aprobar");
  const decision = texto(datos, "decision") === "aprobar" ? "aprobar" : "rechazar";
  await casosDeClientes().revisar(sesion.permisos).ejecutar(actor(sesion), texto(datos, "clienteId"), decision);
  revalidatePath("/admin", "layout");
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
    revalidatePath("/admin", "layout");
    return { enlace: `${await direccionPublica()}/activar/${token}`, nombre };
  } catch (e) {
    return { error: mensajeDeError(e), valores: { nombre, usuario: texto(datos, "usuario") } };
  }
}

export async function aprobarSolicitudCoach(_: EstadoEnlace, datos: FormData): Promise<EstadoEnlace> {
  const sesion = await requerirSesion("equipo.agregar");
  const usuario = texto(datos, "usuario");
  try {
    const { usuarioId, nombre } = await casosDeSolicitudesCoach(sesion.permisos).atender.aprobar(actor(sesion), texto(datos, "id"), usuario);
    const { token } = await (await casosDeAcceso()).generarEnlace(sesion.permisos).ejecutar(actor(sesion), usuarioId);
    // Sin recargar la página: si se recargara, la solicitud desaparecería de la lista junto con el enlace.
    return { enlace: `${await direccionPublica()}/activar/${token}`, nombre };
  } catch (e) {
    return { error: mensajeDeError(e), valores: { nombre: "", usuario } };
  }
}

export async function descartarSolicitudCoach(datos: FormData) {
  const sesion = await requerirSesion("equipo.agregar");
  await casosDeSolicitudesCoach(sesion.permisos).atender.descartar(actor(sesion), texto(datos, "id"));
  revalidatePath("/admin", "layout");
}

export async function atenderSolicitud(datos: FormData) {
  const sesion = await requerirSesion("cliente.aprobar");
  const pedido = texto(datos, "estado");
  const estado = pedido === "descartado" || pedido === "inscrito" ? pedido : "contactado";
  await casosDeSolicitudes(sesion.permisos).atender.ejecutar(actor(sesion), texto(datos, "id"), estado);
  revalidatePath("/admin", "layout");
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

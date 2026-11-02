"use server";

import { revalidatePath } from "next/cache";
import { casosDeOperacion } from "../../../../_servidor/contenedor";
import { mensajeDeError, requerirSesion, type EstadoFormulario } from "../../../../_servidor/sesion";

const texto = (datos: FormData, campo: string) => String(datos.get(campo) ?? "").trim();

export async function reasignarCliente(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const sesion = await requerirSesion("cliente.asignar");
  const clienteId = texto(datos, "clienteId");
  try {
    await casosDeOperacion(sesion.permisos, sesion.zonaHoraria).asignarCliente.ejecutar(sesion, {
      clienteId,
      coachId: texto(datos, "coachId"),
      franjaId: texto(datos, "franjaId") || null,
      motivo: texto(datos, "motivo"),
    });
  } catch (e) {
    return { error: mensajeDeError(e) };
  }
  revalidatePath(`/admin/clientes/${clienteId}`);
  revalidatePath("/admin");
  return { ok: "Cambio guardado." };
}

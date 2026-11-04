"use server";

import { revalidatePath } from "next/cache";
import type { MetodoPago, Receptor } from "@/modules/membresias/domain/Pago";
import type { TipoTarifa } from "@/modules/membresias/domain/Cuentas";
import type { UnidadPlan } from "@/modules/membresias/domain/Plan";
import { casosDePagos, casosDePesajes } from "../../_servidor/contenedor";
import { mensajeDeError, requerirSesion, type EstadoFormulario } from "../../_servidor/sesion";

const texto = (datos: FormData, campo: string) => String(datos.get(campo) ?? "").trim();
const numero = (datos: FormData, campo: string) => Number(texto(datos, campo).replace(",", "."));

function refrescar() {
  ["/admin/pagos", "/admin/cuadre", "/coach/pagos", "/cliente"].forEach((r) => revalidatePath(r));
  revalidatePath("/admin/clientes/[id]", "page");
}

/** La usan el coach (queda por confirmar) y la administración (queda confirmado). */
export async function registrarPago(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const sesion = await requerirSesion("pago.reportar");
  const archivo = datos.get("comprobante");
  const recibidoPor = texto(datos, "recibidoPor");
  try {
    const pago = await casosDePagos(sesion.permisos, sesion.zonaHoraria).registrar.ejecutar(sesion, {
      clienteId: texto(datos, "clienteId"),
      planId: texto(datos, "planId"),
      montoPesos: numero(datos, "monto"),
      fechaPago: texto(datos, "fechaPago"),
      metodo: texto(datos, "metodo") as MetodoPago,
      // "coach:<id>" cuando la administración indica qué coach recibió el dinero.
      recibidoPor: (recibidoPor.startsWith("coach") ? "coach" : "administracion") as Receptor,
      coachReceptorId: recibidoPor.startsWith("coach:") ? recibidoPor.slice(6) : null,
      esCargaInicial: datos.get("cargaInicial") === "si",
      nota: texto(datos, "nota"),
      comprobante:
        archivo instanceof File && archivo.size > 0 ? { contenido: new Uint8Array(await archivo.arrayBuffer()), tipo: archivo.type } : null,
    });
    refrescar();
    return { ok: pago.estado === "confirmado" ? "Pago registrado y confirmado." : "Pago reportado. La administración lo confirmará." };
  } catch (e) {
    return { error: mensajeDeError(e), valores: { monto: texto(datos, "monto"), nota: texto(datos, "nota") } };
  }
}

export async function revisarPago(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const sesion = await requerirSesion("pago.confirmar");
  const decision = texto(datos, "decision") === "confirmar" ? "confirmar" : "rechazar";
  try {
    await casosDePagos(sesion.permisos, sesion.zonaHoraria).revisar.ejecutar(sesion, texto(datos, "pagoId"), decision, texto(datos, "motivo"));
  } catch (e) {
    return { error: mensajeDeError(e) };
  }
  refrescar();
  return { ok: decision === "confirmar" ? "Confirmado." : "Rechazado." };
}

export async function guardarPlan(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const sesion = await requerirSesion("gimnasio.configurar");
  try {
    await casosDePagos(sesion.permisos, sesion.zonaHoraria).guardarPlan.ejecutar(sesion, {
      id: texto(datos, "id") || undefined,
      nombre: texto(datos, "nombre"),
      precioPesos: numero(datos, "precio"),
      unidad: texto(datos, "unidad") as UnidadPlan,
      cantidad: numero(datos, "cantidad"),
      activo: datos.get("activo") !== "no",
    });
  } catch (e) {
    return { error: mensajeDeError(e) };
  }
  refrescar();
  return { ok: "Plan guardado." };
}

export async function cerrarCuadre(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const sesion = await requerirSesion("cuadre.cerrar");
  try {
    await casosDePagos(sesion.permisos, sesion.zonaHoraria).cerrarCuadre.ejecutar(sesion, texto(datos, "coachId"), texto(datos, "mes"), texto(datos, "nota"));
  } catch (e) {
    return { error: mensajeDeError(e) };
  }
  refrescar();
  return { ok: "Mes cuadrado." };
}

export async function cambiarTarifa(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const sesion = await requerirSesion("sistema.administrar");
  try {
    await casosDePagos(sesion.permisos, sesion.zonaHoraria).cambiarTarifa.ejecutar(sesion, {
      tipo: texto(datos, "tipo") as TipoTarifa,
      porcentaje: numero(datos, "porcentaje") || 0,
      cuotaPesos: numero(datos, "cuota") || 0,
      desdeMes: texto(datos, "desde"),
      motivo: texto(datos, "motivo"),
    });
  } catch (e) {
    return { error: mensajeDeError(e) };
  }
  refrescar();
  return { ok: "Cuota del sistema programada." };
}

export async function registrarPesaje(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const sesion = await requerirSesion("evaluacion.realizar");
  const estatura = texto(datos, "estatura");
  try {
    await casosDePesajes(sesion.permisos, sesion.zonaHoraria).registrar.ejecutar(sesion, {
      clienteId: texto(datos, "clienteId"),
      fecha: texto(datos, "fecha"),
      pesoKg: numero(datos, "peso"),
      estaturaCm: estatura ? Number(estatura) : null,
      origen: texto(datos, "origen") === "imprevista" ? "imprevista" : "evaluacion",
    });
  } catch (e) {
    return { error: mensajeDeError(e) };
  }
  refrescar();
  return { ok: "Pesaje registrado." };
}

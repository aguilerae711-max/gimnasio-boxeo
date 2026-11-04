"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Visibilidad } from "@/modules/biblioteca/domain/Biblioteca";
import type { Rutina } from "@/modules/biblioteca/domain/Planes";
import { casosDeBiblioteca } from "../../_servidor/contenedor";
import { mensajeDeError, requerirSesion, type EstadoFormulario } from "../../_servidor/sesion";

const texto = (datos: FormData, campo: string) => String(datos.get(campo) ?? "").trim();

async function casos(permiso: string) {
  const sesion = await requerirSesion(permiso);
  return { sesion, c: casosDeBiblioteca(sesion.permisos, sesion.zonaHoraria) };
}

function refrescar() {
  ["/biblioteca", "/coach/rutinas", "/coach/plan", "/coach", "/admin/planes"].forEach((r) => revalidatePath(r));
  revalidatePath("/admin/planes/[id]", "page");
}

export async function proponerEjercicio(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const { sesion, c } = await casos("biblioteca.proponer");
  const valores = { nombre: texto(datos, "nombre"), descripcion: texto(datos, "descripcion") };
  try {
    await c.proponer.ejecutar(sesion, { ...valores, categoria: texto(datos, "categoria"), esDistinto: datos.get("distinto") === "si" });
  } catch (e) {
    return { error: mensajeDeError(e), valores };
  }
  refrescar();
  return { ok: "Ejercicio guardado. Ya lo puedes usar en tus rutinas." };
}

export async function formalizarEjercicio(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const { sesion, c } = await casos("biblioteca.formalizar");
  try {
    await c.formalizar.ejecutar(sesion, texto(datos, "id"), {
      nombre: texto(datos, "nombre"),
      descripcion: texto(datos, "descripcion"),
      ejecucion: texto(datos, "ejecucion"),
      errores: texto(datos, "errores"),
      nivel: texto(datos, "nivel"),
      categoria: texto(datos, "categoria"),
      visibilidad: (texto(datos, "visibilidad") || "compartido") as Visibilidad,
      alias: texto(datos, "alias").split(","),
    });
  } catch (e) {
    return { error: mensajeDeError(e) };
  }
  refrescar();
  return { ok: "Formalizado." };
}

export async function fusionarEjercicio(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const { sesion, c } = await casos("biblioteca.formalizar");
  try {
    await c.fusionar.ejecutar(sesion, texto(datos, "id"), texto(datos, "destino"));
  } catch (e) {
    return { error: mensajeDeError(e) };
  }
  refrescar();
  return { ok: "Fusionado: su nombre quedó como alterno y las rutinas se actualizaron." };
}

export async function cambiarAcceso(datos: FormData) {
  const { sesion, c } = await casos("biblioteca.formalizar");
  await c.darAcceso.ejecutar(sesion, texto(datos, "coachId"), datos.get("acceso") === "si");
  refrescar();
}

/** La rutina llega como JSON desde el editor (bloques con sus renglones). */
export async function guardarRutina(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const { sesion, c } = await casos("plan.enviar");
  let destino: string;
  try {
    const rutina = JSON.parse(texto(datos, "rutina")) as Rutina;
    const id = await c.guardarRutina.ejecutar(sesion, texto(datos, "id") || null, rutina);
    destino = `/coach/rutinas?guardada=${id}`;
  } catch (e) {
    return { error: e instanceof SyntaxError ? "No se pudo leer la rutina." : mensajeDeError(e) };
  }
  refrescar();
  redirect(destino);
}

export async function guardarPlan(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const { sesion, c } = await casos("plan.enviar");
  const asignaciones = new Map<string, string>();
  for (const [clave, valor] of datos.entries()) {
    if (clave.startsWith("t_") && valor) asignaciones.set(clave.slice(2), String(valor));
  }
  try {
    const r = await c.guardarPlan.ejecutar(sesion, {
      mes: texto(datos, "mes"),
      esFijo: datos.get("fijo") === "si",
      asignaciones,
      enviar: texto(datos, "accion") === "enviar",
    });
    refrescar();
    return {
      ok:
        r.estado === "aprobado"
          ? "Sin cambios contra tu plan aprobado: quedó aprobado."
          : r.estado === "enviado"
            ? "Enviado. La administración lo revisa."
            : "Borrador guardado.",
    };
  } catch (e) {
    return { error: mensajeDeError(e) };
  }
}

export async function mantenerPlan(): Promise<EstadoFormulario> {
  const { sesion, c } = await casos("plan.enviar");
  try {
    const r = await c.mantenerPlan.ejecutar(sesion);
    refrescar();
    return { ok: r.completo ? "Listo: el próximo mes tienes el mismo plan, ya aprobado." : "Copiado como borrador: tienes turnos nuevos sin rutina." };
  } catch (e) {
    return { error: mensajeDeError(e) };
  }
}

export async function revisarPlan(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const { sesion, c } = await casos("plan.aprobar");
  const decision = texto(datos, "decision") === "aprobar" ? "aprobar" : "pedir_cambios";
  try {
    await c.revisarPlan.ejecutar(sesion, texto(datos, "planId"), decision, texto(datos, "comentario"));
  } catch (e) {
    return { error: mensajeDeError(e) };
  }
  refrescar();
  return { ok: decision === "aprobar" ? "Plan aprobado." : "Se pidieron cambios al coach." };
}

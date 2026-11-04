"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Captura } from "@/modules/evaluacion/domain/Indices";
import { casosDeEvaluacion } from "../../../_servidor/contenedor";
import { mensajeDeError, requerirSesion, type EstadoFormulario } from "../../../_servidor/sesion";

const texto = (datos: FormData, campo: string) => String(datos.get(campo) ?? "").trim();
const numero = (v: string) => (v === "" ? null : Number(v.replace(",", ".")));

async function casos() {
  const sesion = await requerirSesion("evaluacion.realizar");
  return { sesion, casos: casosDeEvaluacion(sesion.permisos, sesion.zonaHoraria) };
}

function refrescar(sesionId?: string) {
  revalidatePath("/admin/evaluacion");
  if (sesionId) revalidatePath(`/admin/evaluacion/${sesionId}`);
  ["/cliente/resultados", "/coach/resultados"].forEach((r) => revalidatePath(r));
  revalidatePath("/admin/clientes/[id]", "page");
}

export async function definirPin(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const { sesion, casos: c } = await casos();
  if (texto(datos, "pin") !== texto(datos, "confirmacion")) return { error: "Los PIN no coinciden." };
  try {
    await c.definirPin.ejecutar(sesion, texto(datos, "pin"));
  } catch (e) {
    return { error: mensajeDeError(e) };
  }
  return { ok: "PIN guardado. Lo pedirá cada vez que comiences una evaluación." };
}

export async function comenzar(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const { sesion, casos: c } = await casos();
  let destino: string;
  try {
    const { sesionId } = await c.iniciar.ejecutar(sesion, texto(datos, "clienteId"), texto(datos, "pin"));
    destino = `/admin/evaluacion/${sesionId}`;
  } catch (e) {
    return { error: mensajeDeError(e) };
  }
  refrescar();
  redirect(destino);
}

export async function registrarChequeo(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const { sesion, casos: c } = await casos();
  const sesionId = texto(datos, "sesionId");
  try {
    const r = await c.chequeo.ejecutar(sesion, sesionId, {
      lesionODolor: datos.get("lesion") === "si",
      durmioBien: datos.get("durmio") === "si",
      comio3h: datos.get("comio") === "si",
      pesoKg: numero(texto(datos, "peso")),
      estaturaCm: numero(texto(datos, "estatura")),
    });
    refrescar(sesionId);
    return r.apto ? { ok: "Check-in listo." } : { ok: "No apto: se reprograma. La evaluación quedó registrada como no apta." };
  } catch (e) {
    return { error: mensajeDeError(e) };
  }
}

export async function guardarCaptura(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const { sesion, casos: c } = await casos();
  const sesionId = texto(datos, "sesionId");
  const campos = texto(datos, "campos").split(",");
  const intentos = Number(texto(datos, "intentos"));
  // Cada intento: i1_cm, i2_cm...; todo vacío = nulo o no realizado.
  const captura: Captura = Array.from({ length: intentos }, (_, i) => {
    const valores = Object.fromEntries(campos.map((campo) => [campo, numero(texto(datos, `i${i + 1}_${campo}`))]));
    return Object.values(valores).every((v) => v === null) ? null : valores;
  });
  try {
    await c.captura.ejecutar(sesion, sesionId, texto(datos, "test"), captura);
  } catch (e) {
    return { error: mensajeDeError(e) };
  }
  refrescar(sesionId);
  return { ok: "Guardado." };
}

export async function guardarRubrica(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const { sesion, casos: c } = await casos();
  const sesionId = texto(datos, "sesionId");
  const niveles = new Map<string, number>();
  for (const [clave, valor] of datos.entries()) {
    if (clave.startsWith("c_") && valor !== "") niveles.set(clave.slice(2), Number(valor));
  }
  try {
    await c.rubrica.ejecutar(sesion, sesionId, niveles, { nombre: texto(datos, "companero"), habitual: datos.get("habitual") === "si" });
  } catch (e) {
    return { error: mensajeDeError(e) };
  }
  refrescar(sesionId);
  return { ok: "Rúbrica guardada." };
}

export async function cerrarEvaluacion(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const { sesion, casos: c } = await casos();
  const sesionId = texto(datos, "sesionId");
  try {
    const r = await c.cerrar.ejecutar(sesion, sesionId);
    refrescar(sesionId);
    return {
      ok:
        r.estado === "completa"
          ? "Evaluación publicada. El cliente y su coach ya ven sus resultados por pilar."
          : "Publicada como parcial: falta Estrategia. Complétala otro día de este mes y vuelve a cerrar.",
    };
  } catch (e) {
    return { error: mensajeDeError(e) };
  }
}

export async function anularEvaluacion(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const { sesion, casos: c } = await casos();
  const sesionId = texto(datos, "sesionId");
  try {
    await c.anular.ejecutar(sesion, sesionId, texto(datos, "motivo"));
  } catch (e) {
    return { error: mensajeDeError(e) };
  }
  refrescar(sesionId);
  return { ok: "Evaluación anulada." };
}

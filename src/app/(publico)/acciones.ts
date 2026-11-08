"use server";

import { redirect } from "next/navigation";
import { casosDeAcceso, casosDeClientes, casosDeSolicitudes, casosDeSolicitudesCoach } from "../_servidor/contenedor";
import {
  borrarSesion,
  cambiarACuenta,
  guardarSesion,
  mensajeDeError,
  pasarASiguienteCuenta,
  todasLasSesiones,
  tokenDeSesion,
  type EstadoFormulario,
} from "../_servidor/sesion";

const texto = (datos: FormData, campo: string) => String(datos.get(campo) ?? "");

export async function entrar(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const correo = texto(datos, "correo");
  try {
    const sesion = await (await casosDeAcceso()).iniciarSesion.ejecutar(correo, texto(datos, "clave"));
    // "Agregar otra cuenta": la que estaba abierta se queda guardada para cambiar con un toque.
    await guardarSesion(sesion.token, sesion.expiraEn, { conservarActual: texto(datos, "agregar") === "1" });
  } catch (e) {
    return { error: mensajeDeError(e), valores: { correo } };
  }
  redirect("/panel");
}

/** Cambia a otra cuenta abierta en este dispositivo, sin volver a escribir la contraseña. */
export async function cambiarCuenta(datos: FormData) {
  await cambiarACuenta(Number(texto(datos, "indice")));
  redirect("/panel");
}

/** Cierra todas las cuentas abiertas en este dispositivo. */
export async function salirDeTodas() {
  const acceso = await casosDeAcceso();
  for (const token of await todasLasSesiones()) await acceso.cerrarSesion.ejecutar(token);
  await borrarSesion();
  redirect("/entrar");
}

export async function usarEnlace(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const correo = texto(datos, "correo");
  const usuario = texto(datos, "usuario");
  const clave = texto(datos, "clave");
  if (clave !== texto(datos, "confirmacion")) return { error: "Las contraseñas no coinciden.", valores: { correo, usuario } };
  try {
    const acceso = await casosDeAcceso();
    await acceso.usarEnlace.ejecutar(texto(datos, "token"), { correo, usuario, clave });
    const sesion = await acceso.iniciarSesion.ejecutar(usuario.trim() || correo, clave);
    // Si ya había otra cuenta abierta en este dispositivo, se queda para cambiar con un toque.
    await guardarSesion(sesion.token, sesion.expiraEn, { conservarActual: true });
  } catch (e) {
    return { error: mensajeDeError(e), valores: { correo, usuario } };
  }
  redirect("/panel");
}

export async function registrarCliente(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const valores = {
    nombre: texto(datos, "nombre"),
    correo: texto(datos, "correo"),
    telefono: texto(datos, "telefono"),
    peso: texto(datos, "peso"),
    estatura: texto(datos, "estatura"),
  };
  const clave = texto(datos, "clave");
  if (clave !== texto(datos, "confirmacion")) return { error: "Las contraseñas no coinciden.", valores };
  try {
    const numero = (v: string) => (v.trim() ? Number(v.replace(",", ".")) : null);
    const { correo } = await casosDeClientes().registrar.ejecutar({
      nombre: valores.nombre,
      correo: valores.correo,
      telefono: valores.telefono,
      sexo: texto(datos, "sexo") as "F" | "M" | "",
      pesoKg: numero(valores.peso),
      estaturaCm: numero(valores.estatura),
      codigoCoach: texto(datos, "codigo"),
      clave,
      aceptaReglamento: datos.get("reglamento") === "si",
    });
    const sesion = await (await casosDeAcceso()).iniciarSesion.ejecutar(correo, clave);
    await guardarSesion(sesion.token, sesion.expiraEn);
  } catch (e) {
    return { error: mensajeDeError(e), valores };
  }
  redirect("/panel");
}

// Por ahora hay un solo gimnasio; cuando haya varios, cada uno tendrá su propia dirección.
const GIMNASIO_PUBLICO = process.env.GIMNASIO_PUBLICO ?? "00000000-0000-4000-8000-000000000101";

/** Clase de prueba desde la portada. El campo "sitio" está oculto: si lo llenan, es un robot y no se guarda nada. */
export async function solicitarPrueba(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const valores = { nombre: texto(datos, "nombre"), telefono: texto(datos, "telefono"), comentario: texto(datos, "comentario") };
  if (texto(datos, "sitio")) return { ok: "¡Gracias! Te escribimos por WhatsApp para agendarte." };
  try {
    const r = await casosDeSolicitudes().solicitar.ejecutar(GIMNASIO_PUBLICO, {
      ...valores,
      franjaId: texto(datos, "franjaId"),
      aceptaContacto: datos.get("contacto") === "si",
    });
    return { ok: r.repetida ? "Ya tenemos tu solicitud; te escribimos pronto por WhatsApp." : "¡Gracias! Te escribimos por WhatsApp para agendarte." };
  } catch (e) {
    return { error: mensajeDeError(e), valores };
  }
}

/** Solicitud para ser coach desde la portada. Mismo cuidado que la clase de prueba: trampa para robots y sin duplicados. */
export async function aplicarComoCoach(_: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const valores = { nombre: texto(datos, "nombre"), telefono: texto(datos, "telefono"), disponibilidad: texto(datos, "disponibilidad") };
  if (texto(datos, "sitio")) return { ok: "gracias" };
  try {
    await casosDeSolicitudesCoach().aplicar.ejecutar(GIMNASIO_PUBLICO, {
      ...valores,
      experiencia: texto(datos, "experiencia"),
      aceptaContacto: datos.get("contacto") === "si",
    });
    return { ok: "gracias" };
  } catch (e) {
    return { error: mensajeDeError(e), valores };
  }
}

/** Sale de la cuenta actual; si hay otra abierta en este dispositivo, pasa a ella. */
export async function salir() {
  const token = await tokenDeSesion();
  if (token) await (await casosDeAcceso()).cerrarSesion.ejecutar(token);
  if (await pasarASiguienteCuenta()) redirect("/panel");
  await borrarSesion();
  redirect("/entrar");
}

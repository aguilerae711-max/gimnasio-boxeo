import { ErrorDeDominio } from "@/shared/domain/ErrorDeDominio";

const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const CLAVE_MINIMA = 10;
const CLAVE_MAXIMA = 128;

/** Correo en minúsculas y sin espacios; es el usuario para entrar. */
export function normalizarCorreo(correo: string): string {
  const limpio = correo.trim().toLowerCase();
  if (!FORMATO_CORREO.test(limpio) || limpio.length > 254) {
    throw new ErrorDeDominio("correo_invalido", "Escribe un correo válido.");
  }
  return limpio;
}

const FORMATO_USUARIO = /^[a-z0-9][a-z0-9._-]{2,29}$/;

/** Usuario corto para entrar (ej. admin1, ivan): minúsculas, números y . _ -, de 3 a 30. */
export function normalizarUsuario(usuario: string): string {
  const limpio = usuario.trim().toLowerCase();
  if (!FORMATO_USUARIO.test(limpio)) {
    throw new ErrorDeDominio("usuario_invalido", "El usuario lleva de 3 a 30 letras o números, sin espacios ni acentos (puede llevar . _ -).");
  }
  return limpio;
}

/** Lo que se escribe para entrar: si lleva @ es correo; si no, usuario corto. */
export function identificar(texto: string): { tipo: "correo" | "usuario"; valor: string } {
  return texto.includes("@") ? { tipo: "correo", valor: normalizarCorreo(texto) } : { tipo: "usuario", valor: normalizarUsuario(texto) };
}

/** Longitud antes que reglas raras: una frase fácil de recordar es más segura que "P@ss1". */
export function validarClaveNueva(clave: string): void {
  if (clave.length < CLAVE_MINIMA) {
    throw new ErrorDeDominio("clave_corta", `La contraseña debe tener al menos ${CLAVE_MINIMA} caracteres.`);
  }
  if (clave.length > CLAVE_MAXIMA) {
    throw new ErrorDeDominio("clave_larga", `La contraseña puede tener máximo ${CLAVE_MAXIMA} caracteres.`);
  }
  if (clave.trim().length === 0) {
    throw new ErrorDeDominio("clave_vacia", "La contraseña no puede ser solo espacios.");
  }
}

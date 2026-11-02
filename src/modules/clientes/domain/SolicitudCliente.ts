import { ErrorDeDominio } from "@/shared/domain/ErrorDeDominio";

/** Versión del reglamento y responsiva (revisados por el abogado) que acepta cada cliente. */
export const REGLAMENTO_VIGENTE = "v1";

export type EstadoCliente = "pendiente" | "activo" | "rechazado" | "baja";
export type Decision = "aprobar" | "rechazar";

/** Un registro nuevo espera a que la administración lo apruebe o lo rechace; una sola vez. */
export function revisarSolicitud(estado: EstadoCliente, decision: Decision): EstadoCliente {
  if (estado !== "pendiente") {
    throw new ErrorDeDominio("ya_revisado", "Este registro ya fue revisado.");
  }
  return decision === "aprobar" ? "activo" : "rechazado";
}

export function validarNombre(nombre: string): string {
  const limpio = nombre.trim().replace(/\s+/g, " ");
  if (limpio.length < 2 || limpio.length > 80) {
    throw new ErrorDeDominio("nombre_invalido", "Escribe tu nombre (de 2 a 80 letras).");
  }
  return limpio;
}

export function validarTelefono(telefono: string): string | null {
  const digitos = telefono.replace(/\D/g, "");
  if (digitos.length === 0) return null;
  if (digitos.length < 10 || digitos.length > 13) {
    throw new ErrorDeDominio("telefono_invalido", "El teléfono debe tener 10 dígitos.");
  }
  return digitos;
}

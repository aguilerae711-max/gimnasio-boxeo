import { ErrorDeDominio } from "@/shared/domain/ErrorDeDominio";
import { Fecha } from "@/shared/domain/Fecha";

const texto = (valor: string, max: number, campo: string): string | null => {
  const limpio = valor.trim();
  if (limpio.length === 0) return null;
  if (limpio.length > max) throw new ErrorDeDominio("texto_largo", `${campo}: máximo ${max} caracteres.`);
  return limpio;
};

export interface DatosPerfilCliente {
  fechaNacimiento: Fecha | null;
  contactoEmergencia: string | null;
  notasMedicas: string | null;
}

/** Valida lo que escribe el cliente (o la administración) sobre su perfil. */
export function perfilCliente(
  entrada: { fechaNacimiento: string; contactoEmergencia: string; notasMedicas: string },
  hoy: Fecha,
): DatosPerfilCliente {
  let fechaNacimiento: Fecha | null = null;
  if (entrada.fechaNacimiento.trim()) {
    fechaNacimiento = Fecha.de(entrada.fechaNacimiento.trim());
    const anos = fechaNacimiento.diasHasta(hoy) / 365.25;
    if (anos < 5 || anos > 100) {
      throw new ErrorDeDominio("fecha_nacimiento", "Revisa la fecha de nacimiento.");
    }
  }
  return {
    fechaNacimiento,
    contactoEmergencia: texto(entrada.contactoEmergencia, 120, "Contacto de emergencia"),
    notasMedicas: texto(entrada.notasMedicas, 500, "Notas médicas"),
  };
}

export function perfilCoach(entrada: { bio: string; especialidad: string }): { bio: string | null; especialidad: string | null } {
  return { bio: texto(entrada.bio, 400, "Presentación"), especialidad: texto(entrada.especialidad, 80, "Especialidad") };
}

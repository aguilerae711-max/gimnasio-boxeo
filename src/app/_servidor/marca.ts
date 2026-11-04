import "server-only";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { cache } from "react";
import { baseDeDatos } from "@/shared/infrastructure/baseDeDatos";

export interface MarcaDelGimnasio {
  nombre: string;
  eslogan: string | null;
  lema: string | null;
  /** Ruta pública del logotipo, solo si el archivo existe. */
  logo: string | null;
}

// Por ahora hay un solo gimnasio público; cuando haya varios, cada uno tendrá su propia dirección.
export const GIMNASIO_PUBLICO = process.env.GIMNASIO_PUBLICO ?? "00000000-0000-4000-8000-000000000101";

const PREDETERMINADA: MarcaDelGimnasio = { nombre: "Gimnasio de boxeo", eslogan: null, lema: null, logo: null };

/** Nombre, eslogan y logotipo del gimnasio. La tabla gimnasio no lleva datos personales. */
export const marcaDe = cache(async (gimnasioId: string = GIMNASIO_PUBLICO): Promise<MarcaDelGimnasio> => {
  try {
    const [g] = await baseDeDatos()<{ nombre: string; eslogan: string | null; lema: string | null; logo: string | null }[]>`
      SELECT nombre, eslogan, lema, logo FROM gimnasio WHERE id = ${gimnasioId}`;
    if (!g) return PREDETERMINADA;
    const logo = g.logo && existsSync(join(process.cwd(), "public", g.logo)) ? g.logo : null;
    return { ...g, logo };
  } catch (e) {
    console.error(e);
    return PREDETERMINADA;
  }
});

/** Iniciales para cuando todavía no hay logotipo: "Diamante Boxing Club" → "DBC". */
export const iniciales = (nombre: string) =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((p) => p[0]!.toUpperCase())
    .join("");

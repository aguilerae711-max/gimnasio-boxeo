import { ErrorDeDominio } from "@/shared/domain/ErrorDeDominio";

/** Para comparar nombres: minúsculas, sin acentos ni signos, espacios simples. "Gancho al Hígado!" → "gancho al higado". */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, " ")
    .trim();
}

function distancia(a: string, b: string): number {
  const fila = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let previo = fila[0];
    fila[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temporal = fila[j];
      fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, previo + (a[i - 1] === b[j - 1] ? 0 : 1));
      previo = temporal;
    }
  }
  return fila[b.length];
}

export interface NombreConocido {
  id: string;
  nombre: string;
  /** Nombre oficial al que pertenece (si `nombre` es un alias). */
  oficial: string;
  tipo: "ejercicio" | "golpe";
}

/**
 * Nombres parecidos para evitar duplicados: iguales, uno dentro del otro, o casi iguales (1–2 letras).
 * Revisa nombres oficiales y alternos, también los del glosario.
 */
export function parecidos(nombre: string, conocidos: readonly NombreConocido[]): NombreConocido[] {
  const buscado = normalizar(nombre);
  if (buscado.length < 3) return [];
  const tolerancia = buscado.length <= 6 ? 1 : 2;
  const vistos = new Set<string>();
  return conocidos
    .filter((c) => {
      const n = normalizar(c.nombre);
      return n === buscado || (n.length >= 4 && (n.includes(buscado) || buscado.includes(n))) || distancia(n, buscado) <= tolerancia;
    })
    .filter((c) => !vistos.has(c.id) && Boolean(vistos.add(c.id)));
}

export interface Golpe {
  codigo: string;
  nombre: string;
  mano: "adelante" | "atras" | "ambas" | "combinacion";
}

/** "1-2-3c" → Jab, Recto de atrás, Gancho al hígado. Acepta guiones, comas o espacios; avisa del código desconocido. */
export function traducirCombinacion(texto: string, golpes: readonly Golpe[]): Golpe[] {
  const codigos = texto
    .toUpperCase()
    .replace(/C/g, "c")
    .split(/[\s,\-–]+/)
    .filter(Boolean);
  if (codigos.length === 0) throw new ErrorDeDominio("combinacion_vacia", "Escribe una combinación, por ejemplo 1-2-3.");
  return codigos.map((codigo) => {
    const golpe = golpes.find((g) => g.codigo === codigo);
    if (!golpe) throw new ErrorDeDominio("golpe_desconocido", `No hay un golpe con el número ${codigo}.`);
    return golpe;
  });
}

export type EstadoEjercicio = "propuesto" | "formalizado" | "fusionado" | "archivado";
export type Visibilidad = "privado" | "compartido";

export interface EjercicioVisible {
  estado: EstadoEjercicio;
  visibilidad: Visibilidad;
  esBasico: boolean;
  creadoPorCoachId: string | null;
}

/**
 * Quién ve un ejercicio: los básicos todos; uno privado, su autor (y la administración);
 * uno compartido, los coaches con acceso a la biblioteca compartida.
 */
export function puedeVer(e: EjercicioVisible, lector: { esAdministracion: boolean; coachId: string | null; accesoCompartido: boolean }): boolean {
  if (e.estado === "fusionado" || e.estado === "archivado") return lector.esAdministracion;
  if (lector.esAdministracion || e.esBasico) return true;
  if (e.creadoPorCoachId !== null && e.creadoPorCoachId === lector.coachId) return true;
  return e.visibilidad === "compartido" && e.estado === "formalizado" && lector.accesoCompartido;
}

export function validarPropuesta(p: { nombre: string; descripcion: string }) {
  const nombre = p.nombre.trim().replace(/\s+/g, " ");
  const descripcion = p.descripcion.trim();
  if (nombre.length < 3 || nombre.length > 80) throw new ErrorDeDominio("nombre_ejercicio", "El nombre debe tener de 3 a 80 letras.");
  if (descripcion.length < 10 || descripcion.length > 600) throw new ErrorDeDominio("descripcion_ejercicio", "Describe el ejercicio en 10 a 600 letras.");
  return { nombre, descripcion };
}

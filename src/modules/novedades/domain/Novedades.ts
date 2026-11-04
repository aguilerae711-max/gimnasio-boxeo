import { ErrorDeDominio } from "@/shared/domain/ErrorDeDominio";

export const TIPOS = ["anuncio", "evento", "sparring", "felicitacion", "pelea", "reunion", "dia_prueba"] as const;
export type TipoPublicacion = (typeof TIPOS)[number];
export const NOMBRE_TIPO: Record<TipoPublicacion, string> = {
  anuncio: "Anuncio",
  evento: "Evento",
  sparring: "Sparring",
  felicitacion: "Felicitación",
  pelea: "Pelea",
  reunion: "Reunión",
  dia_prueba: "Día de prueba",
};
/** Los tipos que suceden en una fecha (pueden llevar lugar, cupo e inscripción). */
export const CON_FECHA: readonly TipoPublicacion[] = ["evento", "sparring", "pelea", "reunion", "dia_prueba"];

/** todos = cualquiera con cuenta; publico = además en la portada, sin cuenta. */
export type Audiencia = "todos" | "coaches" | "clientes" | "publico";
export type Lector = "administracion" | "coach" | "cliente" | "visitante";

export interface Publicacion {
  tipo: TipoPublicacion;
  titulo: string;
  cuerpo: string;
  audiencia: Audiencia;
  fijada: boolean;
  expiraEn: Date | null;
  inicio: Date | null;
  fin: Date | null;
  lugar: string | null;
  cupo: number | null;
  requiereInscripcion: boolean;
  menciones: string[];
}

export function validarPublicacion(p: Publicacion, ahora: Date): Publicacion {
  const titulo = p.titulo.trim();
  const cuerpo = p.cuerpo.trim();
  if (!TIPOS.includes(p.tipo)) throw new ErrorDeDominio("tipo", "Tipo de publicación no válido.");
  if (titulo.length < 3 || titulo.length > 100) throw new ErrorDeDominio("titulo", "El título debe tener de 3 a 100 letras.");
  if (cuerpo.length > 2000) throw new ErrorDeDominio("cuerpo", "El texto puede tener máximo 2,000 letras.");
  const conFecha = CON_FECHA.includes(p.tipo);
  if (conFecha && !p.inicio) throw new ErrorDeDominio("inicio", `Indica la fecha y hora de ${NOMBRE_TIPO[p.tipo].toLowerCase()}.`);
  if (p.inicio && p.fin && p.fin <= p.inicio) throw new ErrorDeDominio("fin", "La hora de fin debe ser después del inicio.");
  if (p.cupo !== null && (!Number.isInteger(p.cupo) || p.cupo < 1 || p.cupo > 500)) throw new ErrorDeDominio("cupo", "El cupo va de 1 a 500.");
  if (p.requiereInscripcion && !conFecha) throw new ErrorDeDominio("inscripcion", "Solo los eventos con fecha llevan inscripción.");
  if (p.tipo === "felicitacion" && p.menciones.length === 0) throw new ErrorDeDominio("menciones", "Menciona al menos a un cliente para felicitarlo.");
  if (p.expiraEn && p.expiraEn <= ahora) throw new ErrorDeDominio("expira", "La fecha en que deja de mostrarse debe ser futura.");
  if (p.audiencia === "publico" && p.menciones.length > 0) {
    throw new ErrorDeDominio("publico_menciones", "Las publicaciones públicas no pueden mencionar clientes (protege sus datos).");
  }
  return { ...p, titulo, cuerpo, lugar: p.lugar?.trim() || null, cupo: p.requiereInscripcion ? p.cupo : null, menciones: [...new Set(p.menciones)] };
}

/** Quién ve qué: la administración todo; coaches y clientes lo de todos, lo público y lo suyo; sin cuenta solo lo público. */
export function audienciasPara(lector: Lector): Audiencia[] {
  switch (lector) {
    case "administracion":
      return ["todos", "coaches", "clientes", "publico"];
    case "coach":
      return ["todos", "coaches", "publico"];
    case "cliente":
      return ["todos", "clientes", "publico"];
    case "visitante":
      return ["publico"];
  }
}

/** Se muestra mientras no expire; un evento, hasta que termina (o un día después de empezar si no tiene fin). */
export function estaVigente(p: { expiraEn: Date | null; inicio: Date | null; fin: Date | null }, ahora: Date): boolean {
  if (p.expiraEn && p.expiraEn <= ahora) return false;
  const terminaEn = p.fin ?? (p.inicio ? new Date(p.inicio.getTime() + 86_400_000) : null);
  return !terminaEn || terminaEn > ahora;
}

/** Inscribirse: solo eventos con inscripción, antes de que empiecen y con lugar disponible. */
export function validarInscripcion(p: { requiereInscripcion: boolean; inicio: Date | null; cupo: number | null }, inscritos: number, yaInscrito: boolean, ahora: Date) {
  if (!p.requiereInscripcion) throw new ErrorDeDominio("sin_inscripcion", "Este evento no lleva inscripción.");
  if (yaInscrito) throw new ErrorDeDominio("ya_inscrito", "Ya estás inscrito.");
  if (p.inicio && p.inicio <= ahora) throw new ErrorDeDominio("ya_empezo", "El evento ya empezó.");
  if (p.cupo !== null && inscritos >= p.cupo) throw new ErrorDeDominio("sin_cupo", "Ya no hay lugares.");
}

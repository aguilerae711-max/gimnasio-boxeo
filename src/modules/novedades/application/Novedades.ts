import { ErrorDeDominio, SinPermiso } from "@/shared/domain/ErrorDeDominio";
import type { Actor, Auditoria, Autorizacion, GeneradorDeIds, Reloj } from "@/shared/application/puertos";
import { audienciasPara, estaVigente, validarInscripcion, validarPublicacion, type Audiencia, type Lector, type Publicacion } from "../domain/Novedades";

export const PERMISO_PUBLICAR = "novedades.publicar";

export interface PublicacionGuardada {
  id: string;
  audiencia: Audiencia;
  requiereInscripcion: boolean;
  inicio: Date | null;
  fin: Date | null;
  expiraEn: Date | null;
  cupo: number | null;
  archivada: boolean;
}

export interface RepositorioNovedades {
  /** Cuántos de esos clientes existen en el gimnasio (para validar las menciones). */
  contarClientes(gimnasioId: string, ids: string[]): Promise<number>;
  crear(gimnasioId: string, id: string, p: Publicacion, autorId: string): Promise<void>;
  publicacion(gimnasioId: string, id: string): Promise<PublicacionGuardada | null>;
  archivar(gimnasioId: string, id: string, en: Date): Promise<void>;
  inscritos(gimnasioId: string, publicacionId: string): Promise<number>;
  estaInscrito(gimnasioId: string, publicacionId: string, usuarioId: string): Promise<boolean>;
  inscribir(gimnasioId: string, publicacionId: string, usuarioId: string): Promise<void>;
  cancelar(gimnasioId: string, publicacionId: string, usuarioId: string, en: Date): Promise<void>;
}

interface Dependencias {
  repositorio: RepositorioNovedades;
  autorizacion: Autorizacion;
  auditoria: Auditoria;
  reloj: Reloj;
  ids: GeneradorDeIds;
}

export class Publicar {
  constructor(private readonly d: Dependencias) {}

  async ejecutar(actor: Actor, entrada: Publicacion) {
    if (!(await this.d.autorizacion.tienePermiso(actor, PERMISO_PUBLICAR))) throw new SinPermiso(PERMISO_PUBLICAR);
    const p = validarPublicacion(entrada, this.d.reloj.ahora());
    if (p.menciones.length > 0 && (await this.d.repositorio.contarClientes(actor.gimnasioId, p.menciones)) !== p.menciones.length) {
      throw new ErrorDeDominio("mencion_invalida", "Uno de los clientes mencionados no existe.");
    }
    const id = this.d.ids.nuevo();
    await this.d.repositorio.crear(actor.gimnasioId, id, p, actor.usuarioId);
    await this.d.auditoria.registrar({
      gimnasioId: actor.gimnasioId,
      usuarioId: actor.usuarioId,
      accion: "novedades.publicada",
      entidad: "publicacion",
      entidadId: id,
      antes: null,
      despues: { tipo: p.tipo, titulo: p.titulo, audiencia: p.audiencia, menciones: p.menciones.length },
    });
    return id;
  }
}

export class Archivar {
  constructor(private readonly d: Dependencias) {}

  async ejecutar(actor: Actor, id: string) {
    if (!(await this.d.autorizacion.tienePermiso(actor, PERMISO_PUBLICAR))) throw new SinPermiso(PERMISO_PUBLICAR);
    const p = await this.d.repositorio.publicacion(actor.gimnasioId, id);
    if (!p || p.archivada) throw new ErrorDeDominio("no_encontrada", "Esa publicación ya no está.");
    await this.d.repositorio.archivar(actor.gimnasioId, id, this.d.reloj.ahora());
    await this.d.auditoria.registrar({ gimnasioId: actor.gimnasioId, usuarioId: actor.usuarioId, accion: "novedades.archivada", entidad: "publicacion", entidadId: id, antes: null, despues: null });
  }
}

/** Inscribirse a un evento que la persona puede ver, vigente, con cupo y antes de que empiece. */
export class Inscribirse {
  constructor(private readonly d: Dependencias) {}

  async ejecutar(actor: Actor, lector: Lector, publicacionId: string) {
    const p = await this.d.repositorio.publicacion(actor.gimnasioId, publicacionId);
    const ahora = this.d.reloj.ahora();
    if (!p || p.archivada || !audienciasPara(lector).includes(p.audiencia) || !estaVigente(p, ahora)) {
      throw new ErrorDeDominio("no_encontrada", "Ese evento ya no está disponible.");
    }
    const [inscritos, ya] = await Promise.all([
      this.d.repositorio.inscritos(actor.gimnasioId, publicacionId),
      this.d.repositorio.estaInscrito(actor.gimnasioId, publicacionId, actor.usuarioId),
    ]);
    validarInscripcion(p, inscritos, ya, ahora);
    await this.d.repositorio.inscribir(actor.gimnasioId, publicacionId, actor.usuarioId);
  }
}

export class CancelarInscripcion {
  constructor(private readonly d: Dependencias) {}

  async ejecutar(actor: Actor, publicacionId: string) {
    const p = await this.d.repositorio.publicacion(actor.gimnasioId, publicacionId);
    if (!p || !(await this.d.repositorio.estaInscrito(actor.gimnasioId, publicacionId, actor.usuarioId))) {
      throw new ErrorDeDominio("no_inscrito", "No estabas inscrito.");
    }
    if (p.inicio && p.inicio <= this.d.reloj.ahora()) throw new ErrorDeDominio("ya_empezo", "El evento ya empezó.");
    await this.d.repositorio.cancelar(actor.gimnasioId, publicacionId, actor.usuarioId, this.d.reloj.ahora());
  }
}

import { ErrorDeDominio, SinPermiso } from "@/shared/domain/ErrorDeDominio";
import type { Actor, Auditoria, Autorizacion, GeneradorDeIds, Reloj } from "@/shared/application/puertos";
import { validarNombre, validarTelefono } from "@/modules/clientes/domain/SolicitudCliente";
import { PERMISO_AGREGAR_EQUIPO, type AgregarMiembro } from "./Equipo";

const VENTANA_REPETIDA_MS = 24 * 3_600_000;

export interface RepositorioSolicitudesCoach {
  recientesDelTelefono(gimnasioId: string, telefono: string, desde: Date): Promise<number>;
  crear(
    gimnasioId: string,
    s: { id: string; nombre: string; telefono: string; experiencia: string; disponibilidad: string | null; en: Date },
  ): Promise<void>;
  pendiente(gimnasioId: string, id: string): Promise<{ nombre: string } | null>;
  /** Solo cierra una pendiente; devuelve si la cerró. */
  cerrar(gimnasioId: string, id: string, c: { estado: "aprobada" | "descartada"; por: string; en: Date; usuarioId: string | null }): Promise<boolean>;
}

/** Alguien aplica para dar clases desde la portada. Un mismo teléfono no se duplica en 24 horas. */
export class AplicarComoCoach {
  constructor(private readonly d: { repositorio: RepositorioSolicitudesCoach; reloj: Reloj; ids: GeneradorDeIds }) {}

  async ejecutar(
    gimnasioId: string,
    s: { nombre: string; telefono: string; experiencia: string; disponibilidad: string; aceptaContacto: boolean },
  ) {
    const nombre = validarNombre(s.nombre);
    const telefono = validarTelefono(s.telefono);
    if (!telefono) throw new ErrorDeDominio("telefono_requerido", "Déjanos tu WhatsApp para contactarte.");
    const experiencia = s.experiencia.trim().slice(0, 600);
    if (!experiencia) throw new ErrorDeDominio("experiencia", "Cuéntanos tu experiencia en boxeo.");
    if (!s.aceptaContacto) throw new ErrorDeDominio("contacto", "Necesitamos tu permiso para escribirte por WhatsApp.");
    const disponibilidad = s.disponibilidad.trim().slice(0, 200) || null;
    const ahora = this.d.reloj.ahora();
    if ((await this.d.repositorio.recientesDelTelefono(gimnasioId, telefono, new Date(ahora.getTime() - VENTANA_REPETIDA_MS))) > 0) {
      return { repetida: true };
    }
    await this.d.repositorio.crear(gimnasioId, { id: this.d.ids.nuevo(), nombre, telefono, experiencia, disponibilidad, en: ahora });
    return { repetida: false };
  }
}

/** La administración aprueba (lo da de alta como coach) o descarta una solicitud. */
export class AtenderSolicitudCoach {
  constructor(
    private readonly d: { repositorio: RepositorioSolicitudesCoach; agregar: AgregarMiembro; autorizacion: Autorizacion; auditoria: Auditoria; reloj: Reloj },
  ) {}

  async aprobar(actor: Actor, id: string, usuario: string) {
    if (!(await this.d.autorizacion.tienePermiso(actor, PERMISO_AGREGAR_EQUIPO))) throw new SinPermiso(PERMISO_AGREGAR_EQUIPO);
    const solicitud = await this.d.repositorio.pendiente(actor.gimnasioId, id);
    if (!solicitud) throw new ErrorDeDominio("ya_atendida", "Esa solicitud ya fue atendida.");
    const usuarioId = await this.d.agregar.ejecutar(actor, { nombre: solicitud.nombre, usuario, rol: "coach" });
    await this.d.repositorio.cerrar(actor.gimnasioId, id, { estado: "aprobada", por: actor.usuarioId, en: this.d.reloj.ahora(), usuarioId });
    await this.registrar(actor, id, "aprobada", usuarioId);
    return { usuarioId, nombre: solicitud.nombre };
  }

  async descartar(actor: Actor, id: string) {
    if (!(await this.d.autorizacion.tienePermiso(actor, PERMISO_AGREGAR_EQUIPO))) throw new SinPermiso(PERMISO_AGREGAR_EQUIPO);
    const cerrada = await this.d.repositorio.cerrar(actor.gimnasioId, id, { estado: "descartada", por: actor.usuarioId, en: this.d.reloj.ahora(), usuarioId: null });
    if (!cerrada) throw new ErrorDeDominio("ya_atendida", "Esa solicitud ya fue atendida.");
    await this.registrar(actor, id, "descartada", null);
  }

  private registrar(actor: Actor, id: string, estado: string, usuarioId: string | null) {
    return this.d.auditoria.registrar({
      gimnasioId: actor.gimnasioId,
      usuarioId: actor.usuarioId,
      accion: `coach.solicitud_${estado}`,
      entidad: "solicitud_coach",
      entidadId: id,
      antes: { estado: "pendiente" },
      despues: { estado, usuarioId },
    });
  }
}

import { ErrorDeDominio, SinPermiso } from "@/shared/domain/ErrorDeDominio";
import type { Actor, Auditoria, Autorizacion, GeneradorDeIds, Reloj } from "@/shared/application/puertos";
import { validarNombre, validarTelefono } from "../domain/SolicitudCliente";

export const PERMISO_ATENDER = "cliente.aprobar";
const VENTANA_REPETIDA_MS = 24 * 3_600_000;

export interface RepositorioSolicitudes {
  franjaExiste(gimnasioId: string, franjaId: string): Promise<boolean>;
  /** Cuántas solicitudes dejó ese teléfono desde cierta fecha (para no duplicar). */
  recientesDelTelefono(gimnasioId: string, telefono: string, desde: Date): Promise<number>;
  crear(gimnasioId: string, s: { id: string; nombre: string; telefono: string; franjaId: string | null; comentario: string | null; en: Date }): Promise<void>;
  atender(gimnasioId: string, id: string, estado: "contactado" | "descartado", por: string, en: Date): Promise<boolean>;
}

/**
 * Un visitante pide una clase de prueba desde la portada: nombre, WhatsApp y su horario preferido.
 * Un mismo teléfono no genera otra solicitud en 24 horas (le decimos que ya la tenemos).
 */
export class SolicitarClaseDePrueba {
  constructor(private readonly d: { repositorio: RepositorioSolicitudes; reloj: Reloj; ids: GeneradorDeIds }) {}

  async ejecutar(gimnasioId: string, s: { nombre: string; telefono: string; franjaId: string; comentario: string; aceptaContacto: boolean }) {
    const nombre = validarNombre(s.nombre);
    const telefono = validarTelefono(s.telefono);
    if (!telefono) throw new ErrorDeDominio("telefono_requerido", "Déjanos tu WhatsApp para confirmarte la clase.");
    if (!s.aceptaContacto) throw new ErrorDeDominio("contacto", "Para agendarte necesitamos tu permiso para escribirte por WhatsApp.");
    const comentario = s.comentario.trim().slice(0, 300) || null;
    const franjaId = s.franjaId && (await this.d.repositorio.franjaExiste(gimnasioId, s.franjaId)) ? s.franjaId : null;
    const ahora = this.d.reloj.ahora();
    const desde = new Date(ahora.getTime() - VENTANA_REPETIDA_MS);
    if ((await this.d.repositorio.recientesDelTelefono(gimnasioId, telefono, desde)) > 0) {
      return { repetida: true };
    }
    await this.d.repositorio.crear(gimnasioId, { id: this.d.ids.nuevo(), nombre, telefono, franjaId, comentario, en: ahora });
    return { repetida: false };
  }
}

export class AtenderSolicitud {
  constructor(private readonly d: { repositorio: RepositorioSolicitudes; autorizacion: Autorizacion; auditoria: Auditoria; reloj: Reloj }) {}

  async ejecutar(actor: Actor, id: string, estado: "contactado" | "descartado") {
    if (!(await this.d.autorizacion.tienePermiso(actor, PERMISO_ATENDER))) throw new SinPermiso(PERMISO_ATENDER);
    if (!(await this.d.repositorio.atender(actor.gimnasioId, id, estado, actor.usuarioId, this.d.reloj.ahora()))) {
      throw new ErrorDeDominio("ya_atendida", "Esa solicitud ya fue atendida.");
    }
    await this.d.auditoria.registrar({ gimnasioId: actor.gimnasioId, usuarioId: actor.usuarioId, accion: `prueba.${estado}`, entidad: "solicitud_prueba", entidadId: id, antes: null, despues: { estado } });
  }
}

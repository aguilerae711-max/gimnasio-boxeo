import { ErrorDeDominio, SinPermiso } from "@/shared/domain/ErrorDeDominio";
import { Fecha } from "@/shared/domain/Fecha";
import type { Actor, Auditoria, Autorizacion, GeneradorDeIds, Reloj } from "@/shared/application/puertos";
import { validarEstatura, validarPeso, type OrigenMedicion } from "../domain/Composicion";

export const PERMISO_EVALUAR = "evaluacion.realizar";

export interface RepositorioPesajes {
  existeCliente(gimnasioId: string, clienteId: string): Promise<boolean>;
  guardar(
    gimnasioId: string,
    m: { id: string; clienteId: string; fecha: string; pesoKg: number; estaturaCm: number | null; origen: OrigenMedicion; aproximado: boolean; registradoPor: string },
  ): Promise<void>;
}

/** La administración pesa al cliente en su evaluación periódica o en un pesaje imprevisto. */
export class RegistrarPesaje {
  constructor(
    private readonly d: { repositorio: RepositorioPesajes; autorizacion: Autorizacion; auditoria: Auditoria; reloj: Reloj; ids: GeneradorDeIds },
    private readonly zonaHoraria: string,
  ) {}

  async ejecutar(actor: Actor, s: { clienteId: string; fecha: string; pesoKg: number; estaturaCm: number | null; origen: Exclude<OrigenMedicion, "registro"> }) {
    if (!(await this.d.autorizacion.tienePermiso(actor, PERMISO_EVALUAR))) throw new SinPermiso(PERMISO_EVALUAR);
    if (!(await this.d.repositorio.existeCliente(actor.gimnasioId, s.clienteId))) {
      throw new ErrorDeDominio("cliente_no_encontrado", "No existe ese cliente.");
    }
    const fecha = Fecha.de(s.fecha);
    if (Fecha.hoyEn(this.zonaHoraria, this.d.reloj.ahora()).esAntesDe(fecha)) {
      throw new ErrorDeDominio("fecha_futura", "La fecha del pesaje no puede ser posterior a hoy.");
    }
    const medicion = {
      id: this.d.ids.nuevo(),
      clienteId: s.clienteId,
      fecha: fecha.valor,
      pesoKg: validarPeso(s.pesoKg),
      estaturaCm: s.estaturaCm === null ? null : validarEstatura(s.estaturaCm),
      origen: s.origen,
      aproximado: false,
      registradoPor: actor.usuarioId,
    };
    await this.d.repositorio.guardar(actor.gimnasioId, medicion);
    await this.d.auditoria.registrar({
      gimnasioId: actor.gimnasioId,
      usuarioId: actor.usuarioId,
      accion: "evaluacion.pesaje",
      entidad: "cliente",
      entidadId: s.clienteId,
      antes: null,
      despues: { fecha: medicion.fecha, pesoKg: medicion.pesoKg, estaturaCm: medicion.estaturaCm, origen: medicion.origen },
    });
    return medicion;
  }
}

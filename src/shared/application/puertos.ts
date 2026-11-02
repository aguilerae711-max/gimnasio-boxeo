/** Puertos comunes a todos los casos de uso. La infraestructura los implementa. */

export interface Actor {
  usuarioId: string;
  gimnasioId: string;
}

export interface Autorizacion {
  tienePermiso(actor: Actor, permiso: string): Promise<boolean>;
}

export interface EntradaAuditoria {
  gimnasioId: string;
  usuarioId: string;
  accion: string;
  entidad: string;
  entidadId: string;
  antes: unknown;
  despues: unknown;
  motivo?: string;
}

/** Bitácora de solo inserción: nunca se edita ni se borra. */
export interface Auditoria {
  registrar(entrada: EntradaAuditoria): Promise<void>;
}

export interface Reloj {
  ahora(): Date;
}

export interface GeneradorDeIds {
  nuevo(): string;
}

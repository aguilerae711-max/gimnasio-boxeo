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

/** Cifra datos sensibles (contacto de emergencia, notas médicas) antes de guardarlos. */
export interface Cifrador {
  cifrar(texto: string): string;
  descifrar(cifrado: string): string;
}

/** Archivos privados (comprobantes de pago). Solo se sirven a través de la app, tras revisar permisos. */
export interface Almacenamiento {
  guardar(ruta: string, contenido: Uint8Array, tipo: string): Promise<void>;
  leer(ruta: string): Promise<{ contenido: Uint8Array; tipo: string } | null>;
}

export interface GeneradorDeIds {
  nuevo(): string;
}

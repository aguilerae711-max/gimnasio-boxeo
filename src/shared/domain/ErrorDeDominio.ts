/** Regla de negocio violada. El mensaje se puede mostrar al usuario. */
export class ErrorDeDominio extends Error {
  constructor(
    readonly codigo: string,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = "ErrorDeDominio";
  }
}

/** El actor no tiene el permiso que exige la operación. */
export class SinPermiso extends ErrorDeDominio {
  constructor(permiso: string) {
    super("sin_permiso", `No tienes permiso para esta acción (${permiso}).`);
    this.name = "SinPermiso";
  }
}

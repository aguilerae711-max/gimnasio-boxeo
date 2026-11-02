/** Reglas de tiempo del acceso. */
export const PoliticaDeAcceso = {
  /** Intentos fallidos permitidos por correo dentro de la ventana antes de frenar. */
  maxFallos: 5,
  ventanaFallosMs: 15 * 60_000,
  duracionSesionMs: 30 * 86_400_000,
  duracionEnlaceMs: 72 * 3_600_000,

  estaBloqueado(fallosRecientes: number): boolean {
    return fallosRecientes >= this.maxFallos;
  },
} as const;

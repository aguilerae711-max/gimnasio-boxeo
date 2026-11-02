import { ErrorDeDominio } from "./ErrorDeDominio";

/** Porcentaje entre 0 y 100 con hasta dos decimales, guardado en puntos base (50% = 5000). */
export class Porcentaje {
  private constructor(readonly puntosBase: number) {}

  static de(valor: number): Porcentaje {
    const puntosBase = Math.round(valor * 100);
    if (!Number.isFinite(valor) || valor < 0 || valor > 100 || Math.abs(puntosBase - valor * 100) > 1e-6) {
      throw new ErrorDeDominio("porcentaje_invalido", "El porcentaje debe estar entre 0 y 100, con máximo dos decimales.");
    }
    return new Porcentaje(puntosBase);
  }

  static dePuntosBase(puntosBase: number): Porcentaje {
    return Porcentaje.de(puntosBase / 100);
  }

  get valor(): number {
    return this.puntosBase / 100;
  }

  esIgualA(otro: Porcentaje): boolean {
    return this.puntosBase === otro.puntosBase;
  }

  toString(): string {
    return `${this.valor}%`;
  }
}

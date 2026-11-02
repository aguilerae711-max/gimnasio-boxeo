import { ErrorDeDominio } from "./ErrorDeDominio";

export type Moneda = "MXN";

/** Cantidad de dinero en centavos enteros: nunca se usan decimales de punto flotante. */
export class Dinero {
  private constructor(
    readonly centavos: number,
    readonly moneda: Moneda,
  ) {}

  static deCentavos(centavos: number, moneda: Moneda = "MXN"): Dinero {
    if (!Number.isSafeInteger(centavos) || centavos < 0) {
      throw new ErrorDeDominio("monto_invalido", "El monto debe ser un número entero de centavos, sin negativos.");
    }
    return new Dinero(centavos, moneda);
  }

  static dePesos(pesos: number, moneda: Moneda = "MXN"): Dinero {
    return Dinero.deCentavos(Math.round(pesos * 100), moneda);
  }

  sumar(otro: Dinero): Dinero {
    this.mismaMoneda(otro);
    return new Dinero(this.centavos + otro.centavos, this.moneda);
  }

  /** Multiplica por una fracción expresada en puntos base (1% = 100). Redondea al centavo, mitad hacia arriba. */
  porPuntosBase(puntosBase: number): Dinero {
    return new Dinero(Math.round((this.centavos * puntosBase) / 10_000), this.moneda);
  }

  esIgualA(otro: Dinero): boolean {
    return this.moneda === otro.moneda && this.centavos === otro.centavos;
  }

  formato(): string {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: this.moneda }).format(this.centavos / 100);
  }

  private mismaMoneda(otro: Dinero): void {
    if (otro.moneda !== this.moneda) {
      throw new ErrorDeDominio("moneda_distinta", "No se pueden combinar montos de monedas distintas.");
    }
  }
}

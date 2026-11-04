import { ErrorDeDominio } from "./ErrorDeDominio";

const FORMATO = /^\d{4}-\d{2}-\d{2}$/;
const MS_POR_DIA = 86_400_000;

/**
 * Día de calendario sin hora ni zona (YYYY-MM-DD), en la zona del gimnasio.
 * Evita errores de un día por diferencias de zona horaria.
 */
export class Fecha {
  private constructor(readonly valor: string) {}

  static de(valor: string): Fecha {
    if (!FORMATO.test(valor) || Fecha.aUtc(valor).toISOString().slice(0, 10) !== valor) {
      throw new ErrorDeDominio("fecha_invalida", `Fecha inválida: ${valor}`);
    }
    return new Fecha(valor);
  }

  /** Día actual en la zona horaria indicada (ej. America/Mexico_City). */
  static hoyEn(zonaHoraria: string, ahora: Date): Fecha {
    const partes = new Intl.DateTimeFormat("en-CA", {
      timeZone: zonaHoraria,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(ahora);
    return Fecha.de(partes);
  }

  sumarDias(dias: number): Fecha {
    const d = new Date(Fecha.aUtc(this.valor).getTime() + dias * MS_POR_DIA);
    return new Fecha(d.toISOString().slice(0, 10));
  }

  /** Mismo día N meses después; si ese mes es más corto, el último día (31 ene + 1 mes = 28 o 29 feb). */
  sumarMeses(meses: number): Fecha {
    const [a, m, d] = this.valor.split("-").map(Number);
    const total = a * 12 + (m - 1) + meses;
    const anio = Math.floor(total / 12);
    const mes = (total % 12) + 1;
    const ultimo = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
    return Fecha.de(`${anio}-${String(mes).padStart(2, "0")}-${String(Math.min(d, ultimo)).padStart(2, "0")}`);
  }

  /** "AAAA-MM": el mes calendario al que pertenece. */
  get mes(): string {
    return this.valor.slice(0, 7);
  }

  diasHasta(otra: Fecha): number {
    return Math.round((Fecha.aUtc(otra.valor).getTime() - Fecha.aUtc(this.valor).getTime()) / MS_POR_DIA);
  }

  esAntesDe(otra: Fecha): boolean {
    return this.valor < otra.valor;
  }

  esIgualA(otra: Fecha): boolean {
    return this.valor === otra.valor;
  }

  toString(): string {
    return this.valor;
  }

  private static aUtc(valor: string): Date {
    return new Date(`${valor}T00:00:00Z`);
  }
}

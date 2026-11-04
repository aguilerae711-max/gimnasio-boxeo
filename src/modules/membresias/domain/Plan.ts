import { Dinero } from "@/shared/domain/Dinero";
import { ErrorDeDominio } from "@/shared/domain/ErrorDeDominio";
import { Fecha } from "@/shared/domain/Fecha";

export type UnidadPlan = "dias" | "semanas" | "meses";

export interface DatosPlan {
  id: string;
  nombre: string;
  precio: Dinero;
  unidad: UnidadPlan;
  cantidad: number;
  activo: boolean;
}

/** Lo que se vende: "Mensualidad, 1 mes, $600". El precio sugiere el monto; el pago guarda lo que realmente se cobró. */
export function crearPlan(datos: DatosPlan): DatosPlan {
  const nombre = datos.nombre.trim();
  if (nombre.length < 2 || nombre.length > 60) throw new ErrorDeDominio("plan_nombre", "El nombre del plan debe tener de 2 a 60 letras.");
  if (!Number.isInteger(datos.cantidad) || datos.cantidad < 1 || datos.cantidad > 365) {
    throw new ErrorDeDominio("plan_duracion", "La duración debe ser un número entero entre 1 y 365.");
  }
  if (datos.precio.centavos === 0) throw new ErrorDeDominio("plan_precio", "El precio debe ser mayor a cero.");
  return { ...datos, nombre };
}

/** Último día cubierto por el plan si empieza en `desde` (incluido). Un mes desde el 15 cubre hasta el 14. */
export function finDelPeriodo(desde: Fecha, plan: Pick<DatosPlan, "unidad" | "cantidad">): Fecha {
  const siguiente =
    plan.unidad === "meses" ? desde.sumarMeses(plan.cantidad) : desde.sumarDias(plan.unidad === "semanas" ? plan.cantidad * 7 : plan.cantidad);
  return siguiente.sumarDias(-1);
}

export function describirDuracion(plan: Pick<DatosPlan, "unidad" | "cantidad">): string {
  const nombres = { dias: ["día", "días"], semanas: ["semana", "semanas"], meses: ["mes", "meses"] } as const;
  return `${plan.cantidad} ${nombres[plan.unidad][plan.cantidad === 1 ? 0 : 1]}`;
}

import { estadoMembresia } from "@/modules/membresias/domain/Cuentas";
import { Estado } from "./piezas";

export const pesos = (centavos: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: centavos % 100 === 0 ? 0 : 2 }).format(centavos / 100);

export const fechaCorta = (valor: string | null) =>
  valor ? new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${valor}T00:00:00Z`)) : "—";

export const nombreMes = (mes: string) =>
  new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${mes}-01T00:00:00Z`));

/** Estado del plan de trabajo: [color del semáforo, texto]. */
export const ESTADO_PLAN: Record<string, [string, string]> = {
  borrador: ["baja", "borrador"],
  enviado: ["pendiente", "en revisión"],
  aprobado: ["activo", "aprobado"],
  requiere_cambios: ["rechazado", "pide cambios"],
};

export const TIPO_BLOQUE: Record<string, string> = {
  calentamiento: "calentamiento",
  tecnica: "técnica",
  implementos: "implementos",
  sparring: "sparring",
  acondicionamiento: "acondicionamiento",
  enfriamiento: "enfriamiento",
  otro: "otro",
};

export const METODO: Record<string, string> = { efectivo: "Efectivo", transferencia: "Transferencia", tarjeta: "Tarjeta" };

/** Semáforo de la membresía: activo, por vencer, vencido o sin pago. */
export function EstadoMembresia({ estado }: { estado: ReturnType<typeof estadoMembresia> }) {
  const textos = {
    activo: ["activo", `activo · ${estado.diasRestantes} días`],
    por_vencer: ["pendiente", `vence en ${estado.diasRestantes} días`],
    vencido: ["rechazado", "vencido"],
    sin_pago: ["baja", "sin pago"],
  } as const;
  const [color, texto] = textos[estado.estado];
  return <Estado valor={color} texto={texto} />;
}

/** Línea pequeña de la evolución del peso. */
export function LineaDePeso({ pesos: valores }: { pesos: number[] }) {
  if (valores.length < 2) return null;
  const min = Math.min(...valores) - 0.5;
  const max = Math.max(...valores) + 0.5;
  const x = (i: number) => 6 + (i * 188) / (valores.length - 1);
  const y = (v: number) => 54 - ((v - min) / (max - min)) * 48;
  const puntos = valores.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  return (
    <svg viewBox="0 0 200 60" className="mt-3 h-16 w-full" role="img" aria-label={`Peso de ${valores[0]} a ${valores.at(-1)} kg`}>
      <polyline points={puntos} fill="none" stroke="#d7263d" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {valores.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r="3" fill="#f2f3f5" />
      ))}
    </svg>
  );
}

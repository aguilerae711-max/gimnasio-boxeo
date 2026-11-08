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

/** Enlace de WhatsApp con el mensaje listo (números de México de 10 dígitos). */
export const whatsapp = (telefono: string, texto: string) => `https://wa.me/52${telefono.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(texto)}`;

export const BOTON_WHATSAPP =
  "inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#1f7a4d] px-3.5 text-sm font-semibold text-white no-underline hover:brightness-110";

/** "vence hoy", "vence mañana", "vence en 5 días", "vencida hace 3 días". */
export function textoVencimiento(dias: number) {
  if (dias === 1) return "vence hoy";
  if (dias === 2) return "vence mañana";
  if (dias > 2) return `vence en ${dias - 1} días`;
  const atras = 1 - dias;
  return `vencida hace ${atras} ${atras === 1 ? "día" : "días"}`;
}

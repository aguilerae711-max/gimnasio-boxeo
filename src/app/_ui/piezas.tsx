import Link from "next/link";

/** Clases de botón: un solo estilo principal por sección; lo demás, secundario o discreto. */
export const BOTON = {
  principal:
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-acento px-5 font-semibold text-white no-underline shadow-[0_6px_20px_-8px_var(--acento)] hover:brightness-110 disabled:opacity-60",
  secundario:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#3a3d46] px-4 text-sm font-semibold text-texto no-underline hover:border-[#565b68] hover:bg-white/[0.03] disabled:opacity-60",
  discreto: "inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-texto-suave no-underline hover:text-texto",
} as const;

export function Campo({
  etiqueta,
  ayuda,
  ...props
}: { etiqueta: string; ayuda?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-[#c9ccd3]">{etiqueta}</span>
      <input
        {...props}
        className="min-h-12 rounded-xl border border-borde bg-campo px-4 text-base text-texto outline-none placeholder:text-[#6b7080] focus:border-acento"
      />
      {ayuda && <span className="text-xs text-texto-suave">{ayuda}</span>}
    </label>
  );
}

export function Tarjeta({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-borde bg-tarjeta p-5 ${className}`}>{children}</section>;
}

export function Titulo({ antetitulo, children, accion }: { antetitulo?: string; children: React.ReactNode; accion?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        {antetitulo && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-texto-suave">{antetitulo}</p>}
        <h1 className="font-titulos text-4xl font-extrabold uppercase leading-none tracking-tight">{children}</h1>
      </div>
      {accion}
    </div>
  );
}

/** Título de sección dentro de una tarjeta. */
export function Subtitulo({ children }: { children: React.ReactNode }) {
  return <h2 className="font-titulos text-2xl font-bold uppercase tracking-tight">{children}</h2>;
}

/**
 * Sección desplegable (acordeón): el título con su número a la vista y el detalle al abrirla.
 * La más usada se abre sola; las demás quedan cerradas.
 */
export function Desplegable({
  titulo,
  cuenta,
  nota,
  abierto = false,
  alerta = false,
  children,
}: {
  titulo: string;
  cuenta?: number;
  nota?: string;
  abierto?: boolean;
  alerta?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={abierto} className="group rounded-2xl border border-borde bg-tarjeta open:bg-[#1e2028]">
      <summary className="flex min-h-14 cursor-pointer select-none items-center gap-3 px-5 py-3">
        <span aria-hidden className="flecha text-xs text-texto-suave transition-transform">
          ▶
        </span>
        <span className="font-titulos text-xl font-bold uppercase tracking-tight">{titulo}</span>
        {cuenta !== undefined && (
          <span
            className={`cifras rounded-full px-2 py-0.5 text-xs font-bold ${alerta && cuenta > 0 ? "bg-acento text-white" : "bg-white/[0.07] text-texto-suave"}`}
          >
            {cuenta}
          </span>
        )}
        {nota && <span className="ml-auto hidden text-xs text-texto-suave sm:inline">{nota}</span>}
      </summary>
      <div className="border-t border-borde px-5 pb-5 pt-4">{children}</div>
    </details>
  );
}

/** Lista con separadores, para filas dentro de una sección. */
export function Filas({ children }: { children: React.ReactNode }) {
  return <ul className="divide-y divide-borde">{children}</ul>;
}

/** Aviso tranquilo cuando no hay nada pendiente. */
export function Vacio({ children }: { children: React.ReactNode }) {
  return <p className="py-2 text-sm text-texto-suave">{children}</p>;
}

/** Enlace con flecha para ir a otra pantalla. */
export function Ir({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={BOTON.discreto}>
      {children} <span aria-hidden>→</span>
    </Link>
  );
}

const COLORES_ESTADO: Record<string, string> = {
  activo: "bg-[#132a1f] text-[#6fe0a2]",
  pendiente: "bg-[#2a2111] text-[#f1d9a8]",
  rechazado: "bg-[#2a1418] text-[#ff8f97]",
  suspendido: "bg-[#2a1418] text-[#ff8f97]",
  baja: "bg-[#23262e] text-texto-suave",
};

export function Estado({ valor, texto }: { valor: string; texto?: string }) {
  return (
    <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${COLORES_ESTADO[valor] ?? COLORES_ESTADO.baja}`}>
      {texto ?? valor}
    </span>
  );
}

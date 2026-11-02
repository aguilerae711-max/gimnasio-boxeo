import Link from "next/link";

export function Marca() {
  return (
    <Link href="/" className="flex items-center gap-3 text-texto no-underline">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-acento font-titulos text-lg font-extrabold">GB</span>
      <span className="font-titulos text-xl font-bold tracking-wide">GIMNASIO DE BOXEO</span>
    </Link>
  );
}

export function Campo({
  etiqueta,
  ayuda,
  ...props
}: { etiqueta: string; ayuda?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-[#c9ccd3]">{etiqueta}</span>
      <input
        {...props}
        className="min-h-12 rounded-xl border border-[#2a2d36] bg-[#23262e] px-4 text-base text-texto outline-none placeholder:text-[#6b7080] focus:border-acento"
      />
      {ayuda && <span className="text-xs text-texto-suave">{ayuda}</span>}
    </label>
  );
}

export function Tarjeta({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-tarjeta p-5 ${className}`}>{children}</section>;
}

export function Titulo({ antetitulo, children }: { antetitulo?: string; children: React.ReactNode }) {
  return (
    <div>
      {antetitulo && <p className="text-sm text-texto-suave">{antetitulo}</p>}
      <h1 className="font-titulos text-4xl font-extrabold uppercase leading-none">{children}</h1>
    </div>
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
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${COLORES_ESTADO[valor] ?? COLORES_ESTADO.baja}`}>
      {texto ?? valor}
    </span>
  );
}

/** Página centrada y angosta, para entrar, activar y registrarse. */
export function PaginaCorta({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 px-5 py-6">
      <header>
        <Marca />
      </header>
      {children}
    </main>
  );
}

import Link from "next/link";
import { iniciales, marcaDe, type MarcaDelGimnasio } from "../_servidor/marca";

/** Logotipo (o iniciales) y nombre del gimnasio, para el encabezado. */
export function Logotipo({ marca, tamano = 36 }: { marca: MarcaDelGimnasio; tamano?: number }) {
  return marca.logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={marca.logo} alt="" width={tamano} height={tamano} className={`shrink-0 bg-white object-cover ${tamano > 64 ? "rounded-3xl ring-4 ring-white/10" : "rounded-lg"}`} style={{ width: tamano, height: tamano }} />
  ) : (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-lg bg-acento font-titulos font-extrabold"
      style={{ width: tamano, height: tamano, fontSize: tamano * 0.42 }}
    >
      {iniciales(marca.nombre)}
    </span>
  );
}

export function MarcaGimnasio({ marca }: { marca: MarcaDelGimnasio }) {
  return (
    <Link href="/" className="flex items-center gap-3 text-texto no-underline">
      <Logotipo marca={marca} />
      <span className="font-titulos text-xl font-bold uppercase tracking-wide">{marca.nombre}</span>
    </Link>
  );
}

/** Página centrada y angosta, para entrar, activar y registrarse. */
export async function PaginaCorta({ children }: { children: React.ReactNode }) {
  const marca = await marcaDe();
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 px-5 py-6">
      <header>
        <MarcaGimnasio marca={marca} />
      </header>
      {children}
    </main>
  );
}

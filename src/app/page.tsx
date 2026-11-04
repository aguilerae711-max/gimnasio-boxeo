import Link from "next/link";
import { NOMBRE_TIPO } from "@/modules/novedades/domain/Novedades";
import { ConsultasNovedades } from "@/modules/novedades/infrastructure/NovedadesPostgres";
import { baseDeDatos } from "@/shared/infrastructure/baseDeDatos";
import { casosDeSolicitudes } from "./_servidor/contenedor";
import { GIMNASIO_PUBLICO as GIMNASIO, marcaDe } from "./_servidor/marca";
import { Logotipo } from "./_ui/MarcaGimnasio";
import { versionVisible } from "./version";
import { solicitarPrueba } from "./(publico)/acciones";
import { Formulario } from "./_ui/Formulario";
import { Campo } from "./_ui/piezas";

export const dynamic = "force-dynamic";

async function franjasParaPrueba() {
  try {
    return await casosDeSolicitudes().repositorio.franjas(GIMNASIO);
  } catch (e) {
    console.error(e);
    return [];
  }
}

async function novedades() {
  try {
    return await new ConsultasNovedades(baseDeDatos()).publicas(GIMNASIO);
  } catch (e) {
    console.error(e);
    return [];
  }
}

const boton = "flex min-h-13 items-center justify-center rounded-2xl text-base font-semibold no-underline";

export default async function Inicio({ searchParams }: { searchParams: Promise<{ prueba?: string }> }) {
  const [avisos, franjas, marca, { prueba }] = await Promise.all([novedades(), franjasParaPrueba(), marcaDe(GIMNASIO), searchParams]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
      <section className="flex flex-col items-center text-center">
        <Logotipo marca={marca} tamano={112} />
        <h1 className="mt-5 font-gotica text-[2.9rem] font-bold leading-none">{marca.nombre}</h1>
        {marca.eslogan && <p className="mt-3 font-gotica text-3xl text-acento">{marca.eslogan}</p>}
        {marca.lema && <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-[#c9ccd3]">{marca.lema}</p>}
      </section>

      <nav className="mt-8 flex flex-col gap-3" aria-label="Acceso">
        <Link href="/entrar" className={`${boton} bg-acento text-white`}>
          Entrar
        </Link>
        <Link href="/registro" className={`${boton} border border-[#3a3d46] text-texto`}>
          Registrarme como cliente
        </Link>
        <Link href="/quiero-ser-coach" className={`${boton} border border-[#3a3d46] text-texto`}>
          Quiero ser coach
        </Link>
      </nav>

      <details id="prueba" open={prueba === "1"} className="group mt-6 scroll-mt-4 rounded-2xl border border-[#2a2d36]">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-center gap-2 px-4 text-center text-sm font-semibold text-[#c9ccd3]">
          ¿Nunca has entrenado aquí? Pide tu clase de prueba gratis
          <span aria-hidden className="transition group-open:rotate-180">
            ▾
          </span>
        </summary>
        <div className="border-t border-[#2a2d36] p-5">
          <p className="mb-3 text-sm text-[#c9ccd3]">Déjanos tus datos y te escribimos por WhatsApp para agendarte.</p>
          <Formulario accion={solicitarPrueba} boton="Pedir mi clase de prueba">
            <Campo etiqueta="Nombre" name="nombre" autoComplete="name" required />
            <Campo etiqueta="WhatsApp" name="telefono" type="tel" inputMode="tel" autoComplete="tel" placeholder="10 dígitos" required />
            {franjas.length > 0 && (
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-[#c9ccd3]">Horario que prefieres</span>
                <select name="franjaId" className="min-h-12 rounded-xl border border-[#2a2d36] bg-[#23262e] px-3 text-base text-texto">
                  <option value="">Cualquiera</option>
                  {franjas.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.inicio} a {f.fin}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <Campo etiqueta="Algo que debamos saber (opcional)" name="comentario" maxLength={300} />
            {/* Trampa para robots: invisible para personas. */}
            <input type="text" name="sitio" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
            <label className="flex items-start gap-3 text-sm text-[#c9ccd3]">
              <input type="checkbox" name="contacto" value="si" required className="mt-1 h-5 w-5 accent-[#d7263d]" />
              <span>Acepto que el gimnasio me escriba por WhatsApp para agendar mi clase. Solo usamos tus datos para eso.</span>
            </label>
          </Formulario>
        </div>
      </details>

      {avisos.length > 0 && (
        <section className="mt-8 flex flex-col gap-2">
          <h2 className="font-titulos text-xl font-bold uppercase">Novedades</h2>
          {avisos.map((a) => (
            <article key={a.id} className={`rounded-xl bg-tarjeta px-4 py-3 ${a.fijada ? "border border-acento" : ""}`}>
              <p className="text-xs font-semibold uppercase tracking-wider text-acento">{NOMBRE_TIPO[a.tipo]}</p>
              <h3 className="font-titulos text-xl font-bold uppercase">{a.titulo}</h3>
              {a.inicio && (
                <p className="text-sm font-semibold">
                  {new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", timeZone: "America/Mexico_City" }).format(a.inicio)}
                  {a.lugar ? ` · ${a.lugar}` : ""}
                </p>
              )}
              {a.cuerpo && <p className="mt-1 text-sm text-[#c9ccd3]">{a.cuerpo}</p>}
            </article>
          ))}
        </section>
      )}

      <p className="mt-auto pt-10 text-center text-xs text-texto-suave">
        {marca.nombre} · {versionVisible()}
      </p>
    </main>
  );
}

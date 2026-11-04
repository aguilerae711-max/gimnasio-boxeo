import Link from "next/link";
import { NOMBRE_TIPO } from "@/modules/novedades/domain/Novedades";
import { ConsultasNovedades } from "@/modules/novedades/infrastructure/NovedadesPostgres";
import { ConsultasOperacion } from "@/modules/operacion/infrastructure/OperacionPostgres";
import { baseDeDatos } from "@/shared/infrastructure/baseDeDatos";
import { casosDeSolicitudes } from "./_servidor/contenedor";
import { GIMNASIO_PUBLICO as GIMNASIO, marcaDe } from "./_servidor/marca";
import { Logotipo } from "./_ui/MarcaGimnasio";
import { versionVisible } from "./version";
import { solicitarPrueba } from "./(publico)/acciones";
import { Formulario } from "./_ui/Formulario";
import { Campo } from "./_ui/piezas";

export const dynamic = "force-dynamic";


async function horario() {
  try {
    // El horario público no lleva datos personales ni necesita cifrado.
    return await new ConsultasOperacion(baseDeDatos(), () => {
      throw new Error("Sin cifrado en la vista pública");
    }).horarioPublico(GIMNASIO);
  } catch (e) {
    console.error(e);
    return null;
  }
}

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

export default async function Inicio() {
  const [datos, avisos, franjas, marca] = await Promise.all([horario(), novedades(), franjasParaPrueba(), marcaDe(GIMNASIO)]);
  const coaches = [...new Map((datos?.turnos ?? []).map((t) => [t.apodo, t])).values()];

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-6">
      <header className="flex items-center justify-between gap-3">
        <span className="font-titulos text-xl font-bold uppercase tracking-wide">{marca.nombre}</span>
        <Link href="/entrar" className="flex min-h-11 items-center rounded-full border border-[#3a3d46] px-4 text-sm font-semibold text-texto no-underline">
          Entrar
        </Link>
      </header>

      <section className="relative mt-5 overflow-hidden rounded-3xl bg-tarjeta px-6 pb-7 pt-8 text-center">
        <div className="relative mx-auto w-fit">
          <Logotipo marca={marca} tamano={184} />
        </div>
        <h1 className="relative mt-5 font-titulos text-5xl font-extrabold uppercase leading-[0.95]">{marca.eslogan ?? marca.nombre}</h1>
        {marca.lema && <p className="relative mx-auto mt-3 max-w-xs text-[15px] leading-relaxed text-[#c9ccd3]">{marca.lema}</p>}
        <a href="#prueba" className="relative mt-6 flex min-h-13 items-center justify-center rounded-2xl bg-acento text-base font-bold text-white no-underline">
          Quiero mi clase de prueba
        </a>
      </section>

      {avisos.length > 0 && (
        <section className="mt-6 flex flex-col gap-2">
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

      {coaches.length > 0 && (
        <section className="mt-6">
          <h2 className="font-titulos text-xl font-bold uppercase">Coaches</h2>
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {coaches.map((c) => (
              <li key={c.apodo} className="rounded-xl bg-tarjeta px-4 py-3">
                <span className="flex items-center gap-2 font-semibold">
                  <span className="h-3 w-3 rounded" style={{ background: c.color }} /> {c.apodo}
                </span>
                {c.especialidad && <span className="text-xs text-texto-suave">{c.especialidad}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section id="prueba" className="mt-6 scroll-mt-4 rounded-2xl bg-tarjeta p-5">
        <h2 className="font-titulos text-2xl font-bold uppercase">Clase de prueba gratis</h2>
        <p className="mb-3 text-sm text-[#c9ccd3]">Déjanos tus datos y te escribimos por WhatsApp para agendarte.</p>
        <Formulario accion={solicitarPrueba} boton="Quiero mi clase de prueba">
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
      </section>

      <div className="mt-8 flex gap-3">
        <Link href="/registro" className="flex min-h-12 flex-1 items-center justify-center rounded-xl border border-[#3a3d46] font-semibold text-texto no-underline">
          Ya entreno aquí: registrarme
        </Link>
      </div>

      <p className="mt-auto pt-10 text-center text-xs text-texto-suave">{marca.nombre} · {versionVisible()}</p>
    </main>
  );
}

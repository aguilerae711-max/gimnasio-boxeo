import Link from "next/link";
import { ConsultasOperacion } from "@/modules/operacion/infrastructure/OperacionPostgres";
import { NOMBRE_DIA } from "@/modules/operacion/domain/Horario";
import { baseDeDatos } from "@/shared/infrastructure/baseDeDatos";
import { versionVisible } from "./version";

export const dynamic = "force-dynamic";

// Por ahora hay un solo gimnasio; cuando haya varios, cada uno tendrá su propia dirección.
const GIMNASIO = process.env.GIMNASIO_PUBLICO ?? "00000000-0000-4000-8000-000000000101";
const corto = (dia: number) => NOMBRE_DIA[dia].slice(0, 3);

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

export default async function Inicio() {
  const datos = await horario();
  const coaches = [...new Map((datos?.turnos ?? []).map((t) => [t.apodo, t])).values()];

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-6">
      <header className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-acento font-titulos text-lg font-extrabold">GB</span>
        <span className="font-titulos text-xl font-bold tracking-wide">GIMNASIO DE BOXEO</span>
      </header>

      <section className="mt-6 rounded-2xl bg-tarjeta p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-texto-suave">Boxeo · Acondicionamiento</p>
        <h1 className="mt-2 font-titulos text-5xl font-extrabold uppercase leading-none">
          Entrena con método.
          <br />
          Mide tu avance.
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-[#c9ccd3]">
          Coaches asignados, evaluación mensual de fuerza, velocidad, resistencia y estrategia.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="font-titulos text-xl font-bold uppercase">Horarios</h2>
        {datos && datos.franjas.length > 0 ? (
          <>
            <ul className="mt-3 flex flex-col gap-2">
              {datos.franjas.map((f) => {
                const enFranja = datos.turnos.filter((t) => t.inicio === f.inicio);
                const porCoach = [...new Set(enFranja.map((t) => t.apodo))].map((apodo) => ({
                  apodo,
                  color: enFranja.find((t) => t.apodo === apodo)!.color,
                  dias: enFranja.filter((t) => t.apodo === apodo).map((t) => corto(t.dia)),
                }));
                return (
                  <li key={f.inicio} className="flex items-center gap-3 rounded-xl bg-tarjeta px-4 py-2.5">
                    <span className="w-14 shrink-0 font-titulos text-lg font-bold">
                      {f.inicio.slice(0, 2)}–{f.fin.slice(0, 2)}
                    </span>
                    <span className="flex flex-wrap gap-1.5 text-xs">
                      {porCoach.length === 0 && <span className="text-texto-suave">Libre</span>}
                      {porCoach.map((c) => (
                        <span key={c.apodo} className="rounded px-1.5 py-0.5 font-semibold text-[#121317]" style={{ background: c.color }}>
                          {c.apodo} · {c.dias.join(" ")}
                        </span>
                      ))}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-xs text-texto-suave">
              Franjas de 2 horas · {datos.franjas[0].dias.map(corto).join(", ")} · {datos.franjas[0].inicio} a {datos.franjas.at(-1)!.fin}
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-texto-suave">Lunes a viernes de 8:00 a 22:00.</p>
        )}
      </section>

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

      <div className="mt-8 flex gap-3">
        <Link href="/registro" className="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-acento font-semibold text-white no-underline">
          Registrarme
        </Link>
        <Link href="/entrar" className="flex min-h-12 flex-1 items-center justify-center rounded-xl border border-[#3a3d46] font-semibold text-texto no-underline">
          Entrar
        </Link>
      </div>

      <p className="mt-auto pt-10 text-center text-xs text-texto-suave">Versión en construcción · {versionVisible()}</p>
    </main>
  );
}

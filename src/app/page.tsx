// Vista pública. Las franjas vendrán de la base de datos (franja_horaria) al conectar Neon.
const FRANJAS = ["08–10", "10–12", "12–14", "14–16", "16–18", "18–20", "20–22"];

export default function Inicio() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-6">
      <header className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-acento font-titulos text-lg font-extrabold">
          GB
        </span>
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
        <ul className="mt-3 grid grid-cols-4 gap-2">
          {FRANJAS.map((f) => (
            <li key={f} className="rounded-lg bg-tarjeta py-2.5 text-center text-sm font-semibold">
              {f}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-texto-suave">Franjas de 2 horas · 8:00 a 22:00</p>
      </section>

      <p className="mt-auto pt-10 text-center text-xs text-texto-suave">Versión en construcción</p>
    </main>
  );
}

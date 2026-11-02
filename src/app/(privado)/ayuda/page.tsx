import Link from "next/link";
import { casosDeAcceso } from "../../_servidor/contenedor";
import { requerirSesion } from "../../_servidor/sesion";
import { Tarjeta, Titulo } from "../../_ui/piezas";
import { AYUDA } from "./guias";

export default async function Ayuda({ searchParams }: { searchParams: Promise<{ bienvenida?: string }> }) {
  const sesion = await requerirSesion();
  const esBienvenida = (await searchParams).bienvenida === "1";
  if (!sesion.vioBienvenida) await (await casosDeAcceso()).sesiones.marcarBienvenidaVista(sesion.usuarioId);

  const esAdmin = sesion.permisos.includes("cliente.aprobar");
  const secciones = AYUDA.filter((s) => (s.rol === "admin" ? esAdmin : sesion.roles.includes(s.rol)));

  return (
    <>
      <Titulo antetitulo={esBienvenida ? `Bienvenido, ${sesion.nombre}` : "Instructivo"}>
        {esBienvenida ? "Así funciona la app" : "Ayuda"}
      </Titulo>

      {secciones.map((s) => (
        <Tarjeta key={s.rol}>
          {secciones.length > 1 && <p className="text-xs font-bold uppercase tracking-widest text-acento">{s.nombre}</p>}
          <p className="mt-1 text-[15px] leading-relaxed text-[#c9ccd3]">{s.bienvenida}</p>
          <div className="mt-4 flex flex-col gap-2">
            {s.guias.map((g, i) => (
              <details key={g.titulo} open={esBienvenida && i === 0} className="rounded-xl bg-[#23262e] px-4 py-3">
                <summary className="cursor-pointer font-semibold">{g.titulo}</summary>
                <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-[#c9ccd3]">
                  {g.pasos.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ol>
              </details>
            ))}
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-texto-suave">Próximamente</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-texto-suave">
            {s.proximamente.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Tarjeta>
      ))}

      {esBienvenida && (
        <Link href="/panel" className="flex min-h-12 items-center justify-center rounded-xl bg-acento font-semibold text-white no-underline">
          Empezar
        </Link>
      )}
      <p className="text-center text-xs text-texto-suave">Puedes volver a esta guía cuando quieras desde Ayuda.</p>
    </>
  );
}

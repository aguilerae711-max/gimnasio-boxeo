import Link from "next/link";
import { redirect } from "next/navigation";
import { puedeVer } from "@/modules/biblioteca/domain/Biblioteca";
import type { Rutina } from "@/modules/biblioteca/domain/Planes";
import { casosDeBiblioteca } from "../../../_servidor/contenedor";
import { requerirSesion } from "../../../_servidor/sesion";
import { TIPO_BLOQUE } from "../../../_ui/formato";
import { Desplegable, Tarjeta, Titulo } from "../../../_ui/piezas";
import { EditorRutina } from "./EditorRutina";

const MODALIDAD: Record<string, string> = { individual: "", parejas: " en parejas", grupal: " grupal" };

export default async function Rutinas({ searchParams }: { searchParams: Promise<{ editar?: string; guardada?: string }> }) {
  const sesion = await requerirSesion("plan.enviar");
  const casos = casosDeBiblioteca(sesion.permisos, sesion.zonaHoraria);
  const yo = await casos.repositorio.coachDelUsuario(sesion.gimnasioId, sesion.usuarioId);
  if (!yo) redirect("/panel");
  const [rutinas, ejercicios] = await Promise.all([casos.consultas.rutinas(sesion.gimnasioId, yo.id), casos.consultas.ejercicios(sesion.gimnasioId)]);
  const lector = { esAdministracion: sesion.permisos.includes("biblioteca.formalizar"), coachId: yo.id, accesoCompartido: yo.accesoBiblioteca };
  const disponibles = ejercicios.filter((e) => puedeVer(e, lector)).map((e) => ({ id: e.id, nombre: e.nombre, enfoque: e.categoria }));
  const { editar, guardada } = await searchParams;
  const enEdicion = editar ? rutinas.find((r) => r.id === editar) : null;
  const inicial: Rutina | null = enEdicion
    ? {
        nombre: enEdicion.nombre,
        descripcion: enEdicion.descripcion,
        bloques: enEdicion.bloques.map((b) => ({
          tipo: b.tipo as Rutina["bloques"][number]["tipo"],
          minutos: b.minutos,
          rounds: b.rounds,
          descripcion: b.descripcion,
          elementos: b.elementos.map((e) => ({ ejercicioId: e.ejercicioId, combinacion: e.combinacion, modalidad: e.modalidad as "individual", detalle: e.detalle })),
        })),
      }
    : null;

  return (
    <>
      <Titulo antetitulo={`Coach ${sesion.nombre}`}>Mis rutinas</Titulo>
      {guardada && <p className="rounded-xl bg-[#132a1f] px-4 py-3 text-sm text-[#6fe0a2]">Rutina guardada.</p>}

      <Desplegable titulo={enEdicion ? `Editar: ${enEdicion.nombre}` : "Nueva rutina"} abierto={Boolean(enEdicion) || rutinas.length === 0}>
        <p className="mb-3 text-sm text-texto-suave">Lo que harás en un turno de 2 horas. Después la asignas a tus turnos en Mi plan.</p>
        <EditorRutina key={editar ?? "nueva"} id={enEdicion?.id ?? null} inicial={inicial} ejercicios={disponibles} />
        {enEdicion && (
          <Link href="/coach/rutinas" className="mt-3 inline-block text-sm">
            Cancelar y crear una nueva
          </Link>
        )}
      </Desplegable>

      {rutinas.length === 0 ? (
        <p className="text-sm text-texto-suave">Aún no tienes rutinas.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rutinas.map((r) => (
            <Tarjeta key={r.id}>
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-titulos text-2xl font-bold uppercase">{r.nombre}</h2>
                <Link href={`/coach/rutinas?editar=${r.id}`} className="text-sm">
                  Editar
                </Link>
              </div>
              {r.descripcion && <p className="text-sm text-texto-suave">{r.descripcion}</p>}
              <ol className="mt-2 flex flex-col gap-1.5 text-sm">
                {r.bloques.map((b, i) => (
                  <li key={i}>
                    <b>
                      {b.rounds ? `${b.rounds} rounds` : `${b.minutos} min`} · {TIPO_BLOQUE[b.tipo] ?? b.tipo}
                    </b>
                    {b.descripcion && <span className="text-texto-suave"> · {b.descripcion}</span>}
                    {b.elementos.length > 0 && (
                      <span className="block text-texto-suave">
                        {b.elementos.map((e) => `${e.ejercicio ?? e.combinacion}${MODALIDAD[e.modalidad]}${e.detalle ? ` (${e.detalle})` : ""}`).join(" · ")}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </Tarjeta>
          ))}
        </div>
      )}
    </>
  );
}

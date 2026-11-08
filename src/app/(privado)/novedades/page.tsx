import { NOMBRE_TIPO, TIPOS } from "@/modules/novedades/domain/Novedades";
import { casosDeNovedades } from "../../_servidor/contenedor";
import { lectorDe, requerirSesion } from "../../_servidor/sesion";
import { Formulario } from "../../_ui/Formulario";
import { Desplegable, Campo, Tarjeta, Titulo } from "../../_ui/piezas";
import { archivar, inscribirse, publicar } from "./acciones";

const COLOR_TIPO: Record<string, string> = {
  anuncio: "#a3a8b3",
  evento: "#4FA3FF",
  sparring: "#d7263d",
  felicitacion: "#6fe0a2",
  pelea: "#ff6b76",
  reunion: "#e8b04b",
  dia_prueba: "#c49bff",
};
const AUDIENCIA: Record<string, string> = { todos: "Todos", coaches: "Coaches", clientes: "Clientes", publico: "Público (portada)" };
const cuando = (d: Date, zona: string) =>
  new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", timeZone: zona }).format(d);
const selector = "min-h-12 rounded-xl border border-[#2a2d36] bg-[#23262e] px-3 text-base text-texto";

export default async function Novedades({ searchParams }: { searchParams: Promise<{ felicitar?: string; titulo?: string }> }) {
  const sesion = await requerirSesion();
  const lector = lectorDe(sesion);
  const casos = casosDeNovedades(sesion.permisos);
  const esAdministracion = lector === "administracion";
  // Desde "Para felicitar" en Hoy: la publicación llega lista para revisar.
  const { felicitar, titulo: tituloSugerido } = await searchParams;
  const [feed, clientes] = await Promise.all([
    casos.consultas.feed(sesion.gimnasioId, lector, sesion.usuarioId),
    esAdministracion ? casos.consultas.clientes(sesion.gimnasioId) : Promise.resolve([]),
  ]);
  const inscritosPorEvento = esAdministracion
    ? new Map(await Promise.all(feed.filter((p) => p.requiereInscripcion).map(async (p) => [p.id, await casos.consultas.inscritos(sesion.gimnasioId, p.id)] as const)))
    : new Map();
  if (!sesion.vistaComo) await casos.consultas.marcarVistas(sesion.usuarioId);

  return (
    <>
      <Titulo antetitulo="Del gimnasio">Novedades</Titulo>

      {esAdministracion && (
        <Desplegable titulo="Publicar" abierto={Boolean(felicitar)}>
          <Formulario accion={publicar} boton="Publicar" className="mt-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-[#c9ccd3]">Tipo</span>
                <select name="tipo" className={selector} defaultValue={felicitar ? "felicitacion" : undefined}>
                  {TIPOS.map((t) => (
                    <option key={t} value={t}>
                      {NOMBRE_TIPO[t]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-[#c9ccd3]">Para</span>
                <select name="audiencia" className={selector}>
                  {Object.entries(AUDIENCIA).map(([v, t]) => (
                    <option key={v} value={v}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <Campo etiqueta="Deja de mostrarse (opcional)" name="expira" type="datetime-local" />
            </div>
            <Campo etiqueta="Título" name="titulo" maxLength={100} required defaultValue={felicitar ? tituloSugerido?.slice(0, 100) : undefined} />
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-[#c9ccd3]">Texto</span>
              <textarea name="cuerpo" rows={3} maxLength={2000} className="rounded-xl border border-[#2a2d36] bg-[#23262e] px-4 py-3 text-base text-texto" />
            </label>
            <fieldset className="rounded-xl border border-[#2a2d36] p-3">
              <legend className="px-1 text-sm font-semibold">Si es evento, sparring, pelea, reunión o día de prueba</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                <Campo etiqueta="Empieza" name="inicio" type="datetime-local" />
                <Campo etiqueta="Termina (opcional)" name="fin" type="datetime-local" />
                <Campo etiqueta="Lugar" name="lugar" />
                <Campo etiqueta="Cupo (si lleva inscripción)" name="cupo" type="number" min={1} max={500} />
              </div>
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input type="checkbox" name="inscripcion" value="si" className="h-5 w-5 accent-[#d7263d]" /> Lleva inscripción
              </label>
            </fieldset>
            {clientes.length > 0 && (
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-[#c9ccd3]">Mencionar clientes (felicitaciones) · Ctrl o Cmd para elegir varios</span>
                <select name="menciones" multiple size={Math.min(6, clientes.length)} defaultValue={felicitar ? [felicitar] : undefined} className="rounded-xl border border-[#2a2d36] bg-[#23262e] px-3 py-2 text-base text-texto">
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="fijada" value="si" className="h-5 w-5 accent-[#d7263d]" /> Fijar arriba
            </label>
          </Formulario>
        </Desplegable>
      )}

      {feed.length === 0 && <p className="text-sm text-texto-suave">No hay novedades por ahora.</p>}
      {feed.map((p) => (
        <Tarjeta key={p.id} className={p.meMenciona ? "border-2 border-[#6fe0a2]" : p.fijada ? "border-2 border-acento" : ""}>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider">
            <span style={{ color: COLOR_TIPO[p.tipo] }}>{NOMBRE_TIPO[p.tipo]}</span>
            {p.fijada && <span className="text-acento">· fijada</span>}
            {esAdministracion && <span className="text-texto-suave">· {AUDIENCIA[p.audiencia]}</span>}
          </div>
          {p.meMenciona && <p className="mt-1 font-titulos text-xl font-bold text-[#6fe0a2]">¡Te mencionan!</p>}
          <h2 className="mt-1 font-titulos text-3xl font-extrabold uppercase leading-tight">{p.titulo}</h2>
          {p.inicio && (
            <p className="mt-1 text-sm font-semibold">
              {cuando(p.inicio, sesion.zonaHoraria)}
              {p.lugar ? ` · ${p.lugar}` : ""}
            </p>
          )}
          {p.cuerpo && <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-[#c9ccd3]">{p.cuerpo}</p>}
          {p.mencionados.length > 0 && <p className="mt-2 text-sm text-[#6fe0a2]">🥊 {p.mencionados.join(", ")}</p>}

          {p.requiereInscripcion && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="text-sm text-texto-suave">
                {p.inscritos}
                {p.cupo ? ` de ${p.cupo}` : ""} inscritos
              </span>
              {!esAdministracion && (
                <Formulario accion={inscribirse} boton={p.estoyInscrito ? "Cancelar mi inscripción" : "Inscribirme"} variante={p.estoyInscrito ? "secundario" : "principal"}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="accion" value={p.estoyInscrito ? "cancelar" : "inscribir"} />
                </Formulario>
              )}
            </div>
          )}
          {esAdministracion && inscritosPorEvento.get(p.id)?.length ? (
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer text-texto-suave">Ver inscritos</summary>
              <ol className="mt-1 list-decimal pl-5">
                {inscritosPorEvento.get(p.id)!.map((i: { nombre: string; telefono: string | null }) => (
                  <li key={i.nombre}>
                    {i.nombre}
                    {i.telefono ? ` · ${i.telefono}` : ""}
                  </li>
                ))}
              </ol>
            </details>
          ) : null}

          <div className="mt-3 flex items-center justify-between text-xs text-texto-suave">
            <span>
              {p.autor} · {new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: sesion.zonaHoraria }).format(p.publicadaEn)}
            </span>
            {esAdministracion && (
              <form action={archivar}>
                <input type="hidden" name="id" value={p.id} />
                <button className="rounded-lg border border-[#3a3d46] px-3 py-1.5 font-semibold text-texto">Archivar</button>
              </form>
            )}
          </div>
        </Tarjeta>
      ))}
    </>
  );
}

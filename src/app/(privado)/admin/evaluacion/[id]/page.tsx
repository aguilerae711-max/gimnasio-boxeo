import Link from "next/link";
import { notFound } from "next/navigation";
import { casosDeEvaluacion } from "../../../../_servidor/contenedor";
import { requerirSesion } from "../../../../_servidor/sesion";
import { Formulario } from "../../../../_ui/Formulario";
import { Campo, Estado, Tarjeta, Titulo } from "../../../../_ui/piezas";
import { anularEvaluacion, cerrarEvaluacion, guardarRubrica, registrarChequeo } from "../acciones";
import { CapturaTest } from "../CapturaTest";
import { calificacion, colorCalificacion, COLOR_PILAR, NOMBRE_PILAR } from "../../../../_ui/Resultados";

/** "18.00" → "18"; "82.50" → "82.5". */
const numero = (v: string | null | undefined) => (v === null || v === undefined ? "—" : String(Number(v)));

const ESTADO: Record<string, [string, string]> = {
  en_curso: ["pendiente", "en curso"],
  parcial: ["pendiente", "parcial: falta estrategia"],
  completa: ["activo", "publicada"],
  no_apta: ["rechazado", "no apta"],
  anulada: ["baja", "anulada"],
};

export default async function SesionEvaluacion({ params }: { params: Promise<{ id: string }> }) {
  const sesion = await requerirSesion("evaluacion.realizar");
  const { id } = await params;
  const casos = casosDeEvaluacion(sesion.permisos, sesion.zonaHoraria);
  const [s, crudos] = await Promise.all([casos.consultas.detalle(sesion.gimnasioId, id), casos.repositorio.capturas(sesion.gimnasioId, id)]);
  if (!s) notFound();
  const abierta = s.estado === "en_curso" || s.estado === "parcial";
  const chequeoHecho = s.pesoKg !== null;
  const rubricas = s.tests.filter((t) => t.formula === "rubrica");
  const puntaje = (clave: string) => s.puntajes.find((p) => p.clave === clave);
  const [color, texto] = ESTADO[s.estado];

  return (
    <>
      <Link href="/admin/evaluacion" className="text-sm">
        ← Evaluaciones
      </Link>
      <Titulo antetitulo={`Evaluación ${s.tipo} · ${s.periodo} · Coach ${s.coach}`}>{s.cliente}</Titulo>
      <div className="flex flex-wrap items-center gap-3 text-sm text-texto-suave">
        <Estado valor={color} texto={texto} />
        {s.pesoKg !== null && <span>{s.pesoKg} kg</span>}
        {s.division && <span className="font-semibold text-acento">División {s.division}</span>}
      </div>

      {abierta && !chequeoHecho && (
        <Tarjeta className="border-2 border-acento">
          <h2 className="font-titulos text-2xl font-bold uppercase">Check-in y pesaje</h2>
          <Formulario accion={registrarChequeo} boton="Continuar" className="mt-3">
            <input type="hidden" name="sesionId" value={id} />
            {[
              ["lesion", "¿Tiene alguna lesión o dolor hoy?", "Si dice que sí, no se evalúa: se reprograma."],
              ["durmio", "¿Durmió bien anoche?", ""],
              ["comio", "¿Comió en las últimas 3 horas?", ""],
            ].map(([nombre, pregunta, nota]) => (
              <fieldset key={nombre} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#23262e] px-4 py-3">
                <legend className="sr-only">{pregunta}</legend>
                <span className="text-sm">
                  {pregunta}
                  {nota && <span className="block text-xs text-texto-suave">{nota}</span>}
                </span>
                <span className="flex gap-2">
                  {["si", "no"].map((v) => (
                    <label key={v} className="flex min-h-10 items-center gap-2 rounded-lg border border-[#3a3d46] px-3 text-sm has-[:checked]:border-acento">
                      <input type="radio" name={nombre} value={v} required className="accent-[#d7263d]" /> {v === "si" ? "Sí" : "No"}
                    </label>
                  ))}
                </span>
              </fieldset>
            ))}
            <div className="grid grid-cols-2 gap-2">
              <Campo etiqueta="Peso (kg), misma báscula" name="peso" type="number" step={0.1} min={20} max={250} inputMode="decimal" />
              <Campo etiqueta="Estatura (cm), si cambió" name="estatura" type="number" min={100} max={230} inputMode="numeric" />
            </div>
          </Formulario>
        </Tarjeta>
      )}

      {chequeoHecho && (
        <div className="flex flex-col gap-4">
          {s.tests
            .filter((t) => t.formula !== "rubrica")
            .map((t, n) => {
              const p = puntaje(t.codigo);
              return (
                <Tarjeta key={t.codigo}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="font-titulos text-2xl font-bold uppercase">
                      {n + 1}. {t.nombre}
                    </h2>
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: COLOR_PILAR[t.pilar] }}>
                      {NOMBRE_PILAR[t.pilar]}
                      {!t.obligatorio && " · opcional"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-[#c9ccd3]">{t.protocolo}</p>
                  {t.equipo && <p className="text-xs text-texto-suave">Equipo: {t.equipo}</p>}
                  {p && (
                    <p className="mt-2 text-sm">
                      Resultado: <b>{numero(p.valor)} {t.unidad}</b> · base {numero(p.base)} · índice <b>{p.indice ?? "—"}</b>
                      {p.atipico && <span className="ml-2 rounded-full bg-[#2a2111] px-2 py-0.5 text-xs text-[#f1d9a8]">cambio de más de 40%: revisa la captura</span>}
                    </p>
                  )}
                  {abierta && (
                    <div className="mt-3">
                      <CapturaTest sesionId={id} test={t} valores={(crudos.capturas.get(t.codigo) ?? []) as (Record<string, number> | null)[]} />
                    </div>
                  )}
                </Tarjeta>
              );
            })}

          {rubricas.length > 0 && (
            <Tarjeta>
              <h2 className="font-titulos text-2xl font-bold uppercase">Estrategia · rúbrica</h2>
              <p className="mt-1 text-sm text-[#c9ccd3]">0 = No · 1 = A veces · 2 = Consistente. Si no hay compañero, se cierra como parcial y se completa otro día del mes.</p>
              {(["tactica", "adaptabilidad"] as const).map((sub) => {
                const p = puntaje(sub);
                return p ? (
                  <p key={sub} className="text-sm">
                    {sub === "tactica" ? "Táctica" : "Adaptabilidad"}: <b>{numero(p.valor)}/10</b> · índice <b>{p.indice ?? "—"}</b>
                  </p>
                ) : null;
              })}
              {abierta && (
                <Formulario accion={guardarRubrica} boton="Guardar rúbrica" variante="secundario" className="mt-3">
                  <input type="hidden" name="sesionId" value={id} />
                  {rubricas.map((t) => (
                    <fieldset key={t.codigo} className="flex flex-col gap-2">
                      <legend className="mb-1 font-semibold">{t.nombre}</legend>
                      <p className="text-xs text-texto-suave">{t.protocolo}</p>
                      {s.criterios
                        .filter((c) => c.testCodigo === t.codigo)
                        .map((c) => (
                          <div key={c.codigo} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#23262e] px-3 py-2">
                            <span className="text-sm">
                              {c.nombre} <span className="text-xs text-texto-suave">· {c.subpilar === "tactica" ? "Táctica" : "Adaptabilidad"}</span>
                            </span>
                            <span className="flex gap-1.5">
                              {[0, 1, 2].map((nivel) => (
                                <label key={nivel} className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#3a3d46] text-sm font-semibold has-[:checked]:border-acento has-[:checked]:bg-acento">
                                  <input type="radio" name={`c_${c.codigo}`} value={nivel} defaultChecked={crudos.rubrica.get(c.codigo) === nivel} className="sr-only" />
                                  {nivel}
                                </label>
                              ))}
                            </span>
                          </div>
                        ))}
                    </fieldset>
                  ))}
                  <div className="grid grid-cols-[2fr_1fr] items-end gap-2">
                    <Campo etiqueta="Compañero de sparring" name="companero" defaultValue={s.companero ?? ""} required />
                    <label className="flex min-h-12 items-center gap-2 text-sm">
                      <input type="checkbox" name="habitual" value="si" defaultChecked={s.companeroHabitual ?? true} className="h-5 w-5 accent-[#d7263d]" /> Es el habitual
                    </label>
                  </div>
                </Formulario>
              )}
            </Tarjeta>
          )}

          <Tarjeta className={abierta ? "border-2 border-acento" : ""}>
            <h2 className="font-titulos text-2xl font-bold uppercase">Resumen por pilar</h2>
            {s.pilares.length === 0 ? (
              <p className="mt-1 text-sm text-texto-suave">Al cerrar se calcula la calificación del 1 al 10 (10 = nivel élite para su rama).</p>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(["fuerza", "velocidad", "resistencia", "estrategia"] as const).map((pilar) => {
                  const p = s.pilares.find((x) => x.pilar === pilar);
                  return (
                    <div key={pilar}>
                      <p className="text-xs font-semibold uppercase" style={{ color: COLOR_PILAR[pilar] }}>
                        {NOMBRE_PILAR[pilar]}
                      </p>
                      <p className="cifras font-titulos text-4xl font-extrabold" style={{ color: colorCalificacion(p?.calificacion ?? null) }}>
                        {calificacion(p?.calificacion ?? null)}
                      </p>
                      {p && !p.completo && <p className="text-xs text-texto-suave">no se publica</p>}
                    </div>
                  );
                })}
              </div>
            )}
            {abierta && (
              <Formulario accion={cerrarEvaluacion} boton={s.estado === "parcial" ? "Volver a cerrar y publicar" : "Cerrar y publicar"} className="mt-4">
                <input type="hidden" name="sesionId" value={id} />
              </Formulario>
            )}
          </Tarjeta>
        </div>
      )}

      {s.estado !== "anulada" && (
        <details className="rounded-2xl bg-tarjeta p-5">
          <summary className="cursor-pointer text-sm font-semibold">Anular esta evaluación</summary>
          <Formulario accion={anularEvaluacion} boton="Anular" variante="secundario" className="mt-3">
            <input type="hidden" name="sesionId" value={id} />
            <Campo etiqueta="Motivo (queda en la auditoría)" name="motivo" required />
          </Formulario>
        </details>
      )}
    </>
  );
}


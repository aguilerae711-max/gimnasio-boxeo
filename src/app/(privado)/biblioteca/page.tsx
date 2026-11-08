import { puedeVer } from "@/modules/biblioteca/domain/Biblioteca";
import { casosDeBiblioteca } from "../../_servidor/contenedor";
import { requerirSesion } from "../../_servidor/sesion";
import { Formulario } from "../../_ui/Formulario";
import { Desplegable, Campo, Estado, Titulo } from "../../_ui/piezas";
import { cambiarAcceso, formalizarEjercicio, fusionarEjercicio, proponerEjercicio } from "./acciones";
import { COLOR_ENFOQUE } from "../../_ui/formato";
import { IlustracionGolpe } from "./IlustracionGolpe";

const MANO: Record<string, string> = { adelante: "Mano de adelante", atras: "Mano de atrás", ambas: "Cualquier mano" };
const COLOR_MANO: Record<string, string> = { adelante: "#ff6b76", atras: "#e8b04b", ambas: "#c9ccd3" };
const selector = "min-h-12 rounded-xl border border-[#2a2d36] bg-[#23262e] px-3 text-base text-texto";

export default async function Biblioteca() {
  const sesion = await requerirSesion("biblioteca.proponer");
  const casos = casosDeBiblioteca(sesion.permisos, sesion.zonaHoraria);
  const [glosario, categorias, ejercicios, yo, coaches] = await Promise.all([
    casos.consultas.glosario(sesion.gimnasioId),
    casos.consultas.categorias(sesion.gimnasioId),
    casos.consultas.ejercicios(sesion.gimnasioId),
    casos.repositorio.coachDelUsuario(sesion.gimnasioId, sesion.usuarioId),
    casos.consultas.coaches(sesion.gimnasioId),
  ]);
  const esAdministracion = sesion.permisos.includes("biblioteca.formalizar");
  const lector = { esAdministracion, coachId: yo?.id ?? null, accesoCompartido: yo?.accesoBiblioteca ?? false };
  // Las combinaciones no van en el glosario: se arman en cada rutina.
  const golpes = glosario.filter((g) => g.mano !== "combinacion");
  const visibles = ejercicios.filter((e) => puedeVer(e, lector));
  const porFormalizar = ejercicios.filter((e) => e.estado === "propuesto");
  const formalizados = ejercicios.filter((e) => e.estado === "formalizado");

  return (
    <>
      <Titulo antetitulo="Biblioteca">Glosario y ejercicios</Titulo>

      <Desplegable titulo="Golpes" cuenta={golpes.length} abierto>
        <p className="mb-3 text-xs text-texto-suave">
          Numeración oficial del gimnasio, en guardia derecha. La c es golpe al cuerpo. Rojo: mano de adelante · ámbar: mano de atrás.
        </p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {golpes.map((g) => (
            <li key={g.codigo} className="flex gap-3 rounded-xl border border-borde p-3">
              <IlustracionGolpe codigo={g.codigo} nombre={g.nombre} />
              <div className="min-w-0">
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-titulos text-2xl font-extrabold leading-none">{g.codigo}</span>
                  <span className="font-semibold">{g.nombre}</span>
                </p>
                <p className="mt-0.5 text-xs">
                  <span className="font-semibold" style={{ color: COLOR_MANO[g.mano] }}>
                    {MANO[g.mano]}
                  </span>
                  {g.alias.length > 0 && <span className="text-texto-suave"> · {g.alias.join(", ")}</span>}
                </p>
                <p className="mt-1 text-sm leading-snug text-[#c9ccd3]">{g.descripcion}</p>
              </div>
            </li>
          ))}
        </ul>
      </Desplegable>

      <Desplegable titulo="Ejercicios">
        <p className="text-xs text-texto-suave">
          {esAdministracion
            ? "Todos los ejercicios del gimnasio."
            : yo?.accesoBiblioteca
              ? "Los básicos, los tuyos y los compartidos."
              : "Los básicos y los tuyos. La administración puede darte acceso a los compartidos."}
        </p>
        {categorias.map((c) => {
          const propios = visibles.filter((e) => e.categoria === c.codigo);
          if (propios.length === 0) return null;
          return (
            <div key={c.codigo} className="mt-3">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-texto-suave">
                <span className="h-2 w-2 rounded-full" style={{ background: COLOR_ENFOQUE[c.codigo] }} />
                {c.nombre}
              </h3>
              <ul className="mt-1 grid gap-2 sm:grid-cols-2">
                {propios.map((e) => (
                  <li key={e.id}>
                    <details className="rounded-xl bg-[#23262e] px-4 py-3">
                      <summary className="cursor-pointer">
                        <span className="font-semibold">{e.nombre}</span>
                        {e.esBasico && <span className="ml-2 text-xs text-[#e8b04b]">básico</span>}
                        {e.estado === "propuesto" && <span className="ml-2 text-xs text-texto-suave">propuesto por {e.autor ?? "—"}</span>}
                      </summary>
                      <p className="mt-2 text-sm text-[#c9ccd3]">{e.descripcion}</p>
                      {e.ejecucion && <p className="mt-1 text-sm"><b>Ejecución:</b> {e.ejecucion}</p>}
                      {e.erroresComunes && <p className="mt-1 text-sm"><b>Errores comunes:</b> {e.erroresComunes}</p>}
                      {e.alias.length > 0 && <p className="mt-1 text-xs text-texto-suave">También: {e.alias.join(", ")}</p>}
                    </details>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </Desplegable>

      <Desplegable titulo={esAdministracion ? "Agregar ejercicio" : "Proponer ejercicio"}>
        <p className="mb-3 text-sm text-texto-suave">
          {esAdministracion
            ? "Queda formalizado y compartido."
            : "Con nombre y descripción basta; lo usas de inmediato en tus rutinas. La administración lo formaliza."}
        </p>
        <Formulario accion={proponerEjercicio} boton={esAdministracion ? "Agregar" : "Proponer"}>
          <div className="grid gap-2 sm:grid-cols-[2fr_1fr]">
            <Campo etiqueta="Nombre" name="nombre" maxLength={80} required />
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-[#c9ccd3]">Pilar que trabaja</span>
              <select name="categoria" className={selector}>
                {categorias.map((c) => (
                  <option key={c.codigo} value={c.codigo}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-[#c9ccd3]">Descripción</span>
            <textarea name="descripcion" rows={3} maxLength={600} required className="rounded-xl border border-[#2a2d36] bg-[#23262e] px-4 py-3 text-base text-texto" />
          </label>
          <label className="flex items-center gap-2 text-sm text-texto-suave">
            <input type="checkbox" name="distinto" value="si" className="h-5 w-5 accent-[#d7263d]" /> Es distinto aunque la app diga que se parece a otro
          </label>
        </Formulario>
      </Desplegable>

      {esAdministracion && (
        <>
          <Desplegable titulo="Por formalizar">
            {porFormalizar.length === 0 && <p className="mt-1 text-sm text-texto-suave">No hay propuestas pendientes.</p>}
            <ul className="mt-2 flex flex-col gap-4">
              {porFormalizar.map((e) => (
                <li key={e.id} className="rounded-xl bg-[#23262e] p-4">
                  <p className="font-semibold">
                    {e.nombre} <span className="text-xs font-normal text-texto-suave">· propuesto por {e.autor}</span>
                  </p>
                  <Formulario accion={formalizarEjercicio} boton="Formalizar" className="mt-3">
                    <input type="hidden" name="id" value={e.id} />
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Campo etiqueta="Nombre oficial" name="nombre" defaultValue={e.nombre} required />
                      <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-semibold text-[#c9ccd3]">Pilar que trabaja</span>
                        <select name="categoria" defaultValue={e.categoria} className={selector}>
                          {categorias.map((c) => (
                            <option key={c.codigo} value={c.codigo}>
                              {c.nombre}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-semibold text-[#c9ccd3]">Nivel</span>
                        <select name="nivel" className={selector}>
                          <option value="">—</option>
                          <option value="inicial">Inicial</option>
                          <option value="intermedio">Intermedio</option>
                          <option value="avanzado">Avanzado</option>
                        </select>
                      </label>
                    </div>
                    <Campo etiqueta="Descripción" name="descripcion" defaultValue={e.descripcion} required />
                    <Campo etiqueta="Ejecución" name="ejecucion" />
                    <Campo etiqueta="Errores comunes" name="errores" />
                    <div className="grid gap-2 sm:grid-cols-[2fr_1fr]">
                      <Campo etiqueta="Nombres alternos (separados por coma)" name="alias" />
                      <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-semibold text-[#c9ccd3]">Quién lo ve</span>
                        <select name="visibilidad" defaultValue="compartido" className={selector}>
                          <option value="compartido">Coaches con acceso</option>
                          <option value="privado">Solo su autor</option>
                        </select>
                      </label>
                    </div>
                  </Formulario>
                  <Formulario accion={fusionarEjercicio} boton="Fusionar" variante="secundario" className="mt-3 grid! items-end gap-2! sm:grid-cols-[1fr_auto]">
                    <input type="hidden" name="id" value={e.id} />
                    <label className="flex flex-col gap-1.5">
                      <span className="text-sm font-semibold text-[#c9ccd3]">O es igual a uno existente:</span>
                      <select name="destino" className={selector}>
                        {formalizados.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.nombre}
                          </option>
                        ))}
                      </select>
                    </label>
                  </Formulario>
                </li>
              ))}
            </ul>
          </Desplegable>

          <Desplegable titulo="Acceso a la biblioteca compartida">
            <ul className="mt-2 divide-y divide-[#2a2d36]">
              {coaches.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="flex items-center gap-2 font-semibold">
                    <span className="h-3 w-3 rounded" style={{ background: c.color }} /> Coach {c.apodo}
                    <Estado valor={c.accesoBiblioteca ? "activo" : "baja"} texto={c.accesoBiblioteca ? "con acceso" : "solo básicos y propios"} />
                  </span>
                  <form action={cambiarAcceso}>
                    <input type="hidden" name="coachId" value={c.id} />
                    <input type="hidden" name="acceso" value={c.accesoBiblioteca ? "no" : "si"} />
                    <button className="min-h-10 rounded-lg border border-[#3a3d46] px-3 text-sm font-semibold">{c.accesoBiblioteca ? "Quitar" : "Dar acceso"}</button>
                  </form>
                </li>
              ))}
            </ul>
          </Desplegable>
        </>
      )}
    </>
  );
}

import { casosDeAcceso, casosDeEvaluacion, casosDeOperacion } from "../../_servidor/contenedor";
import { definirPin } from "../admin/evaluacion/acciones";
import { requerirSesion } from "../../_servidor/sesion";
import { Formulario } from "../../_ui/Formulario";
import { Campo, Tarjeta, Titulo } from "../../_ui/piezas";
import { cambiarMiUsuario, guardarPerfilCoach, inscribirmeComoCliente } from "./acciones";
import { FormularioPerfilCliente } from "./FormularioPerfilCliente";

export default async function Perfil() {
  const sesion = await requerirSesion();
  const consultas = casosDeOperacion(sesion.permisos, sesion.zonaHoraria).consultas;
  const [comoCliente, comoCoach, coaches] = await Promise.all([
    consultas.clienteDelUsuario(sesion.gimnasioId, sesion.usuarioId),
    consultas.perfilCoach(sesion.gimnasioId, sesion.usuarioId),
    consultas.coaches(sesion.gimnasioId),
  ]);
  const perfilCliente = comoCliente && (await consultas.perfilCliente(sesion.gimnasioId, comoCliente.clienteId));
  const evalua = sesion.permisos.includes("evaluacion.realizar");
  const cuenta = await (await casosDeAcceso()).cuenta(sesion.usuarioId);
  const tienePin = evalua && (await casosDeEvaluacion(sesion.permisos, sesion.zonaHoraria).consultas.tienePin(sesion.usuarioId));

  return (
    <>
      <Titulo antetitulo={sesion.nombre}>Mi perfil</Titulo>
      <Tarjeta>
        <h2 className="font-titulos text-2xl font-bold uppercase">Cómo entras</h2>
        <p className="mb-3 text-sm text-texto-suave">
          {cuenta?.correo ? `Correo: ${cuenta.correo}. ` : ""}Con un usuario corto entras más rápido (ej. ivan, admin1). Es solo tuyo.
        </p>
        <Formulario accion={cambiarMiUsuario} boton="Guardar usuario" variante="secundario" className="grid! items-end gap-2! sm:grid-cols-[1fr_auto]">
          <Campo etiqueta="Usuario" name="usuario" autoCapitalize="none" spellCheck={false} defaultValue={cuenta?.usuario ?? ""} placeholder="ej. ivan" />
        </Formulario>
      </Tarjeta>
      {!comoCliente && coaches.length > 0 && (
        <details className="rounded-2xl bg-tarjeta p-5">
          <summary className="cursor-pointer font-titulos text-2xl font-bold uppercase">También entreno aquí</summary>
          <p className="mb-3 mt-2 text-sm text-texto-suave">
            Inscríbete como cliente con tu mismo usuario: tendrás el grupo Cliente en el menú con tu rutina, peso, membresía y evaluaciones.
          </p>
          <Formulario accion={inscribirmeComoCliente} boton="Inscribirme como cliente">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-[#c9ccd3]">Tu coach</span>
              <select name="coachId" required className="min-h-12 rounded-xl border border-[#2a2d36] bg-[#23262e] px-3 text-base text-texto">
                {coaches.map((c) => (
                  <option key={c.id} value={c.id}>
                    Coach {c.apodo}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 text-sm font-semibold text-[#c9ccd3]">Rama (para tu división de peso)</legend>
              <div className="flex gap-5">
                {[
                  ["F", "Femenil"],
                  ["M", "Varonil"],
                ].map(([valor, nombre]) => (
                  <label key={valor} className="flex min-h-11 items-center gap-2">
                    <input type="radio" name="sexo" value={valor} required className="h-4 w-4 accent-[#d7263d]" /> {nombre}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="flex items-start gap-3 text-sm text-[#c9ccd3]">
              <input type="checkbox" name="reglamento" value="si" required className="mt-1 h-5 w-5 accent-[#d7263d]" />
              <span>Leí y acepto el reglamento del gimnasio y la responsiva de riesgos.</span>
            </label>
          </Formulario>
        </details>
      )}
      {evalua && (
        <Tarjeta>
          <h2 className="font-titulos text-2xl font-bold uppercase">PIN de evaluación</h2>
          <p className="mb-3 text-sm text-texto-suave">
            {tienePin ? "Ya tienes PIN. Puedes cambiarlo aquí." : "Se pide cada vez que comienzas una evaluación."} De 4 a 6 dígitos, sin números
            repetidos ni seguidos.
          </p>
          <Formulario accion={definirPin} boton={tienePin ? "Cambiar PIN" : "Guardar PIN"} className="grid! grid-cols-2 items-end gap-2! sm:grid-cols-[1fr_1fr_auto]">
            <Campo etiqueta="PIN" name="pin" type="password" inputMode="numeric" autoComplete="off" pattern="\d{4,6}" required />
            <Campo etiqueta="Repite el PIN" name="confirmacion" type="password" inputMode="numeric" autoComplete="off" pattern="\d{4,6}" required />
          </Formulario>
        </Tarjeta>
      )}
      {comoCoach && (
        <Tarjeta>
          <h2 className="font-titulos text-2xl font-bold uppercase">Como coach</h2>
          <p className="mb-3 text-sm text-texto-suave">Tu especialidad y presentación. Por ahora no se muestran en la portada.</p>
          <Formulario accion={guardarPerfilCoach} boton="Guardar perfil">
            <Campo etiqueta="Especialidad" name="especialidad" maxLength={80} placeholder="Ej. principiantes, técnica" defaultValue={comoCoach.especialidad ?? ""} />
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-[#c9ccd3]">Presentación</span>
              <textarea
                name="bio"
                rows={3}
                maxLength={400}
                defaultValue={comoCoach.bio ?? ""}
                className="rounded-xl border border-[#2a2d36] bg-[#23262e] px-4 py-3 text-base text-texto outline-none focus:border-acento"
              />
            </label>
          </Formulario>
        </Tarjeta>
      )}
      {comoCliente && perfilCliente && (
        <Tarjeta>
          <h2 className="mb-3 font-titulos text-2xl font-bold uppercase">Tus datos</h2>
          <FormularioPerfilCliente clienteId={comoCliente.clienteId} perfil={perfilCliente} />
        </Tarjeta>
      )}

    </>
  );
}

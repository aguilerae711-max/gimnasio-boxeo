import { casosDeOperacion } from "../../_servidor/contenedor";
import { requerirSesion } from "../../_servidor/sesion";
import { Formulario } from "../../_ui/Formulario";
import { Campo, Tarjeta, Titulo } from "../../_ui/piezas";
import { guardarPerfilCoach } from "./acciones";
import { FormularioPerfilCliente } from "./FormularioPerfilCliente";

export default async function Perfil() {
  const sesion = await requerirSesion();
  const consultas = casosDeOperacion(sesion.permisos, sesion.zonaHoraria).consultas;
  const [comoCliente, comoCoach] = await Promise.all([
    consultas.clienteDelUsuario(sesion.gimnasioId, sesion.usuarioId),
    consultas.perfilCoach(sesion.gimnasioId, sesion.usuarioId),
  ]);
  const perfilCliente = comoCliente && (await consultas.perfilCliente(sesion.gimnasioId, comoCliente.clienteId));

  return (
    <>
      <Titulo antetitulo={sesion.nombre}>Mi perfil</Titulo>
      {comoCoach && (
        <Tarjeta>
          <h2 className="font-titulos text-2xl font-bold uppercase">Como coach</h2>
          <p className="mb-3 text-sm text-texto-suave">Tu especialidad aparece junto a tu nombre en el horario público.</p>
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
      {!comoCoach && !comoCliente && <p className="text-sm text-texto-suave">Tu cuenta no tiene perfil de coach ni de cliente.</p>}
    </>
  );
}

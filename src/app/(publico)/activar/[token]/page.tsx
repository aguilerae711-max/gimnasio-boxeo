import { casosDeAcceso } from "../../../_servidor/contenedor";
import { mensajeDeError } from "../../../_servidor/sesion";
import { Formulario } from "../../../_ui/Formulario";
import { Campo, PaginaCorta, Tarjeta, Titulo } from "../../../_ui/piezas";
import { usarEnlace } from "../../acciones";

export const metadata = { title: "Activar cuenta · Gimnasio de boxeo", referrer: "no-referrer" };

export default async function Activar({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let enlace;
  try {
    enlace = await (await casosDeAcceso()).usarEnlace.consultar(token);
  } catch (e) {
    return (
      <PaginaCorta>
        <Titulo>Enlace no válido</Titulo>
        <Tarjeta>
          <p className="text-[15px] leading-relaxed text-[#c9ccd3]">{mensajeDeError(e)}</p>
        </Tarjeta>
      </PaginaCorta>
    );
  }
  const activar = enlace.proposito === "activar";
  return (
    <PaginaCorta>
      <Titulo antetitulo={`Hola, ${enlace.nombre}`}>{activar ? "Activa tu cuenta" : "Nueva contraseña"}</Titulo>
      <p className="text-[15px] leading-relaxed text-[#c9ccd3]">
        {activar
          ? "Con tu correo y una contraseña entrarás a la app desde cualquier celular."
          : "Al guardarla, se cierran tus sesiones abiertas en otros equipos."}
      </p>
      <Formulario accion={usarEnlace} boton={activar ? "Activar y entrar" : "Guardar y entrar"}>
        <input type="hidden" name="token" value={token} />
        <Campo etiqueta="Correo" name="correo" type="email" autoComplete="email" defaultValue={enlace.correo ?? ""} required />
        <Campo
          etiqueta="Contraseña"
          name="clave"
          type="password"
          autoComplete="new-password"
          minLength={10}
          ayuda="Mínimo 10 caracteres. Una frase fácil de recordar funciona bien."
          required
        />
        <Campo etiqueta="Repite la contraseña" name="confirmacion" type="password" autoComplete="new-password" required />
      </Formulario>
    </PaginaCorta>
  );
}

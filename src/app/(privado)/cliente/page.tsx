import { requerirSesion } from "../../_servidor/sesion";
import { PantallaMiEstado } from "../../_ui/PantallaMiEstado";

export default async function MiEstado() {
  const sesion = await requerirSesion();
  return <PantallaMiEstado sesion={sesion} usuarioId={sesion.usuarioId} />;
}

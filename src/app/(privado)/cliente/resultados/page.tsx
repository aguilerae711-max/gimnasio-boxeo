import { casosDeEvaluacion, casosDeOperacion } from "../../../_servidor/contenedor";
import { requerirSesion } from "../../../_servidor/sesion";
import { Titulo } from "../../../_ui/piezas";
import { ResultadosPorPilar } from "../../../_ui/Resultados";

/** El cliente solo ve resultados por pilar: nunca tests, intentos ni comentarios. */
export default async function MisResultados() {
  const sesion = await requerirSesion();
  const yo = await casosDeOperacion(sesion.permisos, sesion.zonaHoraria).consultas.clienteDelUsuario(sesion.gimnasioId, sesion.usuarioId);
  if (!yo) return <Titulo antetitulo={sesion.nombre}>Sin registro de cliente</Titulo>;
  const historial = await casosDeEvaluacion(sesion.permisos, sesion.zonaHoraria).consultas.historialDeCliente(sesion.gimnasioId, yo.clienteId);
  return (
    <>
      <Titulo antetitulo={sesion.nombre}>Mis resultados</Titulo>
      <ResultadosPorPilar historial={historial} />
    </>
  );
}

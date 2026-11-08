import { casosDeEvaluacion, casosDeOperacion, casosDePesajes } from "../../../_servidor/contenedor";
import { requerirSesion } from "../../../_servidor/sesion";
import { PanelPeso } from "../../../_ui/PanelPeso";
import { Desplegable, Tarjeta, Titulo } from "../../../_ui/piezas";
import { COLOR_PILAR, NOMBRE_PILAR, PILARES, ResultadosPorPilar, TablaHistorial } from "../../../_ui/Resultados";
import { GraficaPilares } from "../../../_ui/Visual";

/** Mi progreso: primero el peso (lo que más siguen), luego pilares mes a mes, la última evaluación y el historial. Nunca tests, intentos ni comentarios. */
export default async function MiProgreso() {
  const sesion = await requerirSesion();
  const yo = await casosDeOperacion(sesion.permisos, sesion.zonaHoraria).consultas.clienteDelUsuario(sesion.gimnasioId, sesion.usuarioId);
  if (!yo) return <Titulo antetitulo={sesion.nombre}>Sin registro de cliente</Titulo>;
  const [historial, peso] = await Promise.all([
    casosDeEvaluacion(sesion.permisos, sesion.zonaHoraria).consultas.historialDeCliente(sesion.gimnasioId, yo.clienteId),
    casosDePesajes(sesion.permisos, sesion.zonaHoraria).consultas.delCliente(sesion.gimnasioId, yo.clienteId),
  ]);
  return (
    <>
      <Titulo antetitulo={sesion.nombre.split(" ")[0]}>Mi progreso</Titulo>
      <PanelPeso {...peso} />
      {historial.length > 1 && (
        <Tarjeta>
          <p className="mb-3 font-titulos text-xl font-bold uppercase">Mes a mes</p>
          <GraficaPilares historial={historial} pilares={PILARES} nombres={NOMBRE_PILAR} colores={COLOR_PILAR} />
        </Tarjeta>
      )}
      <ResultadosPorPilar historial={historial} titulo="Tu última evaluación" conTabla={false} />
      {historial.length > 1 && (
        <Desplegable titulo="Historial" cuenta={historial.length}>
          <TablaHistorial historial={historial} />
        </Desplegable>
      )}
    </>
  );
}

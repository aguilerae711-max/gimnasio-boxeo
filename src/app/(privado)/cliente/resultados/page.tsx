import { casosDeEvaluacion, casosDeOperacion, casosDePesajes } from "../../../_servidor/contenedor";
import { requerirSesion } from "../../../_servidor/sesion";
import { PanelPeso } from "../../../_ui/PanelPeso";
import { Desplegable, Titulo } from "../../../_ui/piezas";
import { COLOR_PILAR, NOMBRE_PILAR, PILARES, ResultadosPorPilar, TablaHistorial, TuMejora } from "../../../_ui/Resultados";
import { GraficaPilares } from "../../../_ui/Visual";

/** Mi progreso: tu mejora (inicio → ahora y mes a mes), tu peso y división, la última evaluación y el historial. Nunca tests, intentos ni comentarios. */
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
      <TuMejora historial={historial}>
        {historial.length > 1 && (
          <div className="mt-4 border-t border-borde pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-texto-suave">Mes a mes</p>
            <GraficaPilares historial={historial} pilares={PILARES} nombres={NOMBRE_PILAR} colores={COLOR_PILAR} />
          </div>
        )}
      </TuMejora>
      <PanelPeso {...peso} paraCliente />
      <ResultadosPorPilar historial={historial} titulo="Tu última evaluación" conTabla={false} />
      {historial.length > 1 && (
        <Desplegable titulo="Historial mes a mes" cuenta={historial.length}>
          <TablaHistorial historial={historial} />
        </Desplegable>
      )}
    </>
  );
}

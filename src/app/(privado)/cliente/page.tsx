import { casosDeClientes } from "../../_servidor/contenedor";
import { requerirSesion } from "../../_servidor/sesion";
import { Estado, Tarjeta, Titulo } from "../../_ui/piezas";

const MENSAJE: Record<string, string> = {
  pendiente: "La administración está revisando tu registro. Te avisamos en el gimnasio cuando quede aprobado.",
  activo: "Tu registro está aprobado. Pronto verás aquí tus días restantes, tu turno y tus resultados por pilar.",
  rechazado: "Tu registro no fue aprobado. Habla con la administración en el gimnasio.",
  baja: "Tu cuenta está dada de baja. Si quieres volver, habla con la administración.",
};

export default async function MiEstado() {
  const sesion = await requerirSesion();
  const yo = await casosDeClientes().consultas.delUsuario(sesion.gimnasioId, sesion.usuarioId);
  if (!yo) {
    return <Titulo antetitulo={sesion.nombre}>Sin registro de cliente</Titulo>;
  }

  return (
    <>
      <Titulo antetitulo={`Hola, ${yo.nombre.split(" ")[0]}`}>Mi estado</Titulo>
      <Tarjeta>
        <div className="flex items-center justify-between">
          <p className="text-sm text-texto-suave">Registro</p>
          <Estado valor={yo.estado} texto={yo.estado === "pendiente" ? "por aprobar" : yo.estado} />
        </div>
        <p className="mt-3 text-[15px] leading-relaxed text-[#c9ccd3]">{MENSAJE[yo.estado]}</p>
      </Tarjeta>
      <Tarjeta>
        <p className="text-sm text-texto-suave">Tu coach</p>
        <p className="font-titulos text-4xl font-extrabold uppercase">Coach {yo.coach}</p>
      </Tarjeta>
    </>
  );
}

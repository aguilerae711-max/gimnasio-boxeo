import Link from "next/link";
import { listaDeDias } from "@/modules/operacion/domain/Horario";
import { casosDeClientes, casosDeOperacion } from "../../_servidor/contenedor";
import { requerirSesion } from "../../_servidor/sesion";
import { Estado, Tarjeta, Titulo } from "../../_ui/piezas";

const MENSAJE: Record<string, string> = {
  pendiente: "La administración está revisando tu registro. Te avisamos en el gimnasio cuando quede aprobado.",
  activo: "Tu registro está aprobado. Pronto verás aquí tus días restantes y tus resultados por pilar.",
  rechazado: "Tu registro no fue aprobado. Habla con la administración en el gimnasio.",
  baja: "Tu cuenta está dada de baja. Si quieres volver, habla con la administración.",
};

export default async function MiEstado() {
  const sesion = await requerirSesion();
  const operacion = casosDeOperacion(sesion.permisos, sesion.zonaHoraria);
  const [yo, asignacion, horario] = await Promise.all([
    casosDeClientes().consultas.delUsuario(sesion.gimnasioId, sesion.usuarioId),
    operacion.consultas.clienteDelUsuario(sesion.gimnasioId, sesion.usuarioId),
    operacion.repositorio.horario(sesion.gimnasioId),
  ]);
  if (!yo || !asignacion) {
    return <Titulo antetitulo={sesion.nombre}>Sin registro de cliente</Titulo>;
  }
  const franja = asignacion.franjaId ? horario.franja(asignacion.franjaId) : null;
  const dias = franja ? horario.diasDe(asignacion.coachId, franja.id) : [];

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
        <p className="text-sm text-texto-suave">Tu coach y tu turno</p>
        <p className="font-titulos text-4xl font-extrabold uppercase">Coach {asignacion.coach}</p>
        <p className="mt-1 text-[15px] text-[#c9ccd3]">
          {franja ? `${listaDeDias(dias)} · ${franja.inicio} a ${franja.fin}` : "La administración te asignará tu horario."}
        </p>
      </Tarjeta>
      <Link href="/perfil" className="text-sm">
        Completa tu perfil: fecha de nacimiento y contacto de emergencia →
      </Link>
    </>
  );
}

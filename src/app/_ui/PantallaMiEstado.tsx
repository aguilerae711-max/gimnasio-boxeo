import Link from "next/link";
import { estadoMembresia } from "@/modules/membresias/domain/Cuentas";
import { listaDeDias } from "@/modules/operacion/domain/Horario";
import { Fecha } from "@/shared/domain/Fecha";
import { casosDeClientes, casosDeOperacion, casosDePagos, casosDePesajes } from "../_servidor/contenedor";
import { fechaCorta } from "./formato";
import { PanelPeso } from "./PanelPeso";
import { RutinaDeHoy } from "./RutinaDeHoy";
import { Estado, Tarjeta, Titulo } from "./piezas";

const MENSAJE: Record<string, string> = {
  pendiente: "La administración está revisando tu registro. Te avisamos en el gimnasio cuando quede aprobado.",
  activo: "Tu registro está aprobado. Pronto verás aquí tus resultados por pilar.",
  rechazado: "Tu registro no fue aprobado. Habla con la administración en el gimnasio.",
  baja: "Tu cuenta está dada de baja. Si quieres volver, habla con la administración.",
};

interface Quien {
  gimnasioId: string;
  zonaHoraria: string;
  permisos: readonly string[];
}

/** "Mi estado" del cliente. Con vista=true la administración lo ve tal como él lo ve, sin enlaces para editar. */
export async function PantallaMiEstado({ sesion, usuarioId, vista = false }: { sesion: Quien; usuarioId: string; vista?: boolean }) {
  const operacion = casosDeOperacion(sesion.permisos, sesion.zonaHoraria);
  const [yo, asignacion, horario] = await Promise.all([
    casosDeClientes().consultas.delUsuario(sesion.gimnasioId, usuarioId),
    operacion.consultas.clienteDelUsuario(sesion.gimnasioId, usuarioId),
    operacion.repositorio.horario(sesion.gimnasioId),
  ]);
  if (!yo || !asignacion) {
    return <Titulo antetitulo="Cliente">Sin registro de cliente</Titulo>;
  }
  const franja = asignacion.franjaId ? horario.franja(asignacion.franjaId) : null;
  const [periodos, peso] = await Promise.all([
    casosDePagos(sesion.permisos, sesion.zonaHoraria).consultas.periodos(sesion.gimnasioId),
    casosDePesajes(sesion.permisos, sesion.zonaHoraria).consultas.delCliente(sesion.gimnasioId, asignacion.clienteId),
  ]);
  const membresia = estadoMembresia(periodos.get(asignacion.clienteId) ?? [], Fecha.hoyEn(sesion.zonaHoraria, new Date()));
  const color = { activo: "#6fe0a2", por_vencer: "#f1d9a8", vencido: "#ff8f97", sin_pago: "#a3a8b3" }[membresia.estado];
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
        <p className="text-sm text-texto-suave">Tu membresía</p>
        {membresia.vence ? (
          <>
            <p className="font-titulos text-6xl font-extrabold leading-none" style={{ color }}>
              {membresia.diasRestantes}
              <span className="ml-2 text-2xl">{membresia.diasRestantes === 1 ? "día" : "días"}</span>
            </p>
            <p className="mt-1 text-sm text-[#c9ccd3]">
              {membresia.estado === "vencido"
                ? `Venció el ${fechaCorta(membresia.vence.valor)}. Renueva con tu coach o en la administración.`
                : `Pagado hasta el ${fechaCorta(membresia.vence.valor)}.`}
            </p>
          </>
        ) : (
          <p className="mt-1 text-[15px] text-[#c9ccd3]">Aún no hay un pago registrado. Paga con tu coach o en la administración.</p>
        )}
      </Tarjeta>
      <Tarjeta>
        <p className="text-sm text-texto-suave">Tu coach y tu turno</p>
        <p className="font-titulos text-4xl font-extrabold uppercase">Coach {asignacion.coach}</p>
        <p className="mt-1 text-[15px] text-[#c9ccd3]">
          {franja ? `${listaDeDias(dias)} · ${franja.inicio} a ${franja.fin}` : "La administración te asignará tu horario."}
        </p>
      </Tarjeta>
      {yo.estado === "activo" && (
        <RutinaDeHoy
          gimnasioId={sesion.gimnasioId}
          zonaHoraria={sesion.zonaHoraria}
          coachId={asignacion.coachId}
          franja={franja ?? null}
          diasDelCliente={dias}
          permisos={sesion.permisos}
        />
      )}
      <PanelPeso {...peso} />
      {!vista && (
        <Link href="/perfil" className="text-sm">
          Completa tu perfil: fecha de nacimiento y contacto de emergencia →
        </Link>
      )}
    </>
  );
}

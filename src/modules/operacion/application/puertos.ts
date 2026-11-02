import type { AsignacionDeTurno, Horario } from "../domain/Horario";

export interface AsignacionDeCliente {
  clienteId: string;
  usuarioClienteId: string;
  coachId: string;
  franjaId: string | null;
}

export interface RepositorioOperacion {
  /** Días, franjas activas y asignaciones vigentes del gimnasio. */
  horario(gimnasioId: string): Promise<Horario>;
  agregarTurno(gimnasioId: string, turno: AsignacionDeTurno, creadoPor: string): Promise<void>;
  /** Cierra el turno (queda en el historial); null si no existía o ya estaba cerrado. */
  terminarTurno(gimnasioId: string, asignacionId: string, en: Date): Promise<AsignacionDeTurno | null>;

  coach(gimnasioId: string, coachId: string): Promise<{ id: string; usuarioId: string; apodo: string } | null>;
  coachDelUsuario(gimnasioId: string, usuarioId: string): Promise<{ id: string; apodo: string } | null>;

  asignacionDeCliente(gimnasioId: string, clienteId: string): Promise<AsignacionDeCliente | null>;
  /** En una transacción: cierra la asignación vigente, crea la nueva y actualiza el coach del cliente. */
  reasignarCliente(
    gimnasioId: string,
    nueva: { id: string; clienteId: string; coachId: string; franjaId: string | null; motivo: string; creadoPor: string; en: Date },
  ): Promise<void>;

  guardarPerfilCliente(
    gimnasioId: string,
    clienteId: string,
    perfil: { fechaNacimiento: string | null; contactoCifrado: string | null; notasCifradas: string | null },
    actualizadoPor: string,
  ): Promise<void>;
  guardarPerfilCoach(gimnasioId: string, coachId: string, perfil: { bio: string | null; especialidad: string | null }): Promise<void>;
}

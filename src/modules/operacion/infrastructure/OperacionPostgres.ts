import type postgres from "postgres";
import type { Cifrador } from "@/shared/application/puertos";
import { enGimnasio } from "@/shared/infrastructure/baseDeDatos";
import { Horario, type AsignacionDeTurno } from "../domain/Horario";
import type { AsignacionDeCliente, RepositorioOperacion } from "../application/puertos";

type FilaTurno = { id: string; coach_id: string; franja_id: string; dia_semana: number; cupo_max: number | null };
const aTurno = (f: FilaTurno): AsignacionDeTurno => ({
  id: f.id,
  coachId: f.coach_id,
  franjaId: f.franja_id,
  diaSemana: f.dia_semana,
  cupoMax: f.cupo_max,
});

async function leerHorario(tx: postgres.TransactionSql, gimnasioId: string): Promise<Horario> {
  const dias = await tx<{ dia_semana: number }[]>`
    SELECT dia_semana FROM dia_operacion WHERE gimnasio_id = ${gimnasioId} ORDER BY dia_semana`;
  const franjas = await tx<{ id: string; inicio: string; fin: string }[]>`
    SELECT id, to_char(hora_inicio, 'HH24:MI') AS inicio, to_char(hora_fin, 'HH24:MI') AS fin
    FROM franja_horaria WHERE gimnasio_id = ${gimnasioId} AND activa ORDER BY orden`;
  const turnos = await tx<FilaTurno[]>`
    SELECT a.id, a.coach_id, a.franja_id, a.dia_semana, a.cupo_max
    FROM asignacion_horario a JOIN coach c ON c.id = a.coach_id
    WHERE a.gimnasio_id = ${gimnasioId} AND a.hasta IS NULL AND c.estado = 'aprobado'`;
  return new Horario(
    dias.map((d) => d.dia_semana),
    franjas,
    turnos.map(aTurno),
  );
}

export class OperacionPostgres implements RepositorioOperacion {
  constructor(private readonly sql: postgres.Sql) {}

  horario(gimnasioId: string) {
    return enGimnasio(this.sql, gimnasioId, (tx) => leerHorario(tx, gimnasioId));
  }

  async agregarTurno(gimnasioId: string, t: AsignacionDeTurno, creadoPor: string) {
    await enGimnasio(this.sql, gimnasioId, (tx) => tx`
      INSERT INTO asignacion_horario (id, gimnasio_id, coach_id, franja_id, dia_semana, cupo_max, creado_por)
      VALUES (${t.id}, ${gimnasioId}, ${t.coachId}, ${t.franjaId}, ${t.diaSemana}, ${t.cupoMax}, ${creadoPor})`);
  }

  async terminarTurno(gimnasioId: string, asignacionId: string, en: Date) {
    const [f] = await enGimnasio(this.sql, gimnasioId, (tx) => tx<FilaTurno[]>`
      UPDATE asignacion_horario SET hasta = ${en}
      WHERE id = ${asignacionId} AND gimnasio_id = ${gimnasioId} AND hasta IS NULL
      RETURNING id, coach_id, franja_id, dia_semana, cupo_max`);
    return f ? aTurno(f) : null;
  }

  async coach(gimnasioId: string, coachId: string) {
    const [f] = await enGimnasio(this.sql, gimnasioId, (tx) => tx<{ id: string; usuarioId: string; apodo: string }[]>`
      SELECT id, usuario_id AS "usuarioId", apodo FROM coach
      WHERE id = ${coachId} AND gimnasio_id = ${gimnasioId} AND estado = 'aprobado'`);
    return f ?? null;
  }

  async coachDelUsuario(gimnasioId: string, usuarioId: string) {
    const [f] = await enGimnasio(this.sql, gimnasioId, (tx) => tx<{ id: string; apodo: string }[]>`
      SELECT id, apodo FROM coach WHERE usuario_id = ${usuarioId} AND gimnasio_id = ${gimnasioId} AND estado = 'aprobado'`);
    return f ?? null;
  }

  async asignacionDeCliente(gimnasioId: string, clienteId: string): Promise<AsignacionDeCliente | null> {
    const [f] = await enGimnasio(this.sql, gimnasioId, (tx) => tx<AsignacionDeCliente[]>`
      SELECT cl.id AS "clienteId", cl.usuario_id AS "usuarioClienteId", cl.coach_id AS "coachId", a.franja_id AS "franjaId"
      FROM cliente cl
      LEFT JOIN asignacion_coach_cliente a ON a.cliente_id = cl.id AND a.hasta IS NULL
      WHERE cl.id = ${clienteId} AND cl.gimnasio_id = ${gimnasioId}`);
    return f ?? null;
  }

  async reasignarCliente(
    gimnasioId: string,
    n: { id: string; clienteId: string; coachId: string; franjaId: string | null; motivo: string; creadoPor: string; en: Date },
  ) {
    await enGimnasio(this.sql, gimnasioId, async (tx) => {
      await tx`UPDATE asignacion_coach_cliente SET hasta = ${n.en} WHERE cliente_id = ${n.clienteId} AND hasta IS NULL`;
      await tx`
        INSERT INTO asignacion_coach_cliente (id, gimnasio_id, cliente_id, coach_id, franja_id, desde, motivo, creado_por)
        VALUES (${n.id}, ${gimnasioId}, ${n.clienteId}, ${n.coachId}, ${n.franjaId}, ${n.en}, ${n.motivo}, ${n.creadoPor})`;
      await tx`UPDATE cliente SET coach_id = ${n.coachId} WHERE id = ${n.clienteId}`;
    });
  }

  async guardarPerfilCliente(
    gimnasioId: string,
    clienteId: string,
    p: { fechaNacimiento: string | null; contactoCifrado: string | null; notasCifradas: string | null; sexo: "F" | "M" | null },
    actualizadoPor: string,
  ) {
    await enGimnasio(this.sql, gimnasioId, (tx) => tx`
      INSERT INTO perfil_cliente (cliente_id, gimnasio_id, fecha_nacimiento, contacto_emergencia_cifrado, notas_medicas_cifrado, sexo, actualizado_por)
      VALUES (${clienteId}, ${gimnasioId}, ${p.fechaNacimiento}, ${p.contactoCifrado}, ${p.notasCifradas}, ${p.sexo}, ${actualizadoPor})
      ON CONFLICT (cliente_id) DO UPDATE SET
        sexo = coalesce(EXCLUDED.sexo, perfil_cliente.sexo),
        fecha_nacimiento = EXCLUDED.fecha_nacimiento,
        contacto_emergencia_cifrado = EXCLUDED.contacto_emergencia_cifrado,
        notas_medicas_cifrado = EXCLUDED.notas_medicas_cifrado,
        actualizado_por = EXCLUDED.actualizado_por,
        actualizado_en = now()`);
  }

  async guardarPerfilCoach(gimnasioId: string, coachId: string, p: { bio: string | null; especialidad: string | null }) {
    await enGimnasio(this.sql, gimnasioId, (tx) => tx`
      UPDATE coach SET bio = ${p.bio}, especialidad = ${p.especialidad} WHERE id = ${coachId} AND gimnasio_id = ${gimnasioId}`);
  }
}

export interface CoachEnHorario {
  id: string;
  apodo: string;
  color: string;
}

export interface ClienteEnTurno {
  clienteId: string;
  nombre: string;
  estado: string;
  franjaId: string | null;
  telefono: string | null;
}

export interface PerfilClienteVisible {
  sexo: "F" | "M" | null;
  fechaNacimiento: string | null;
  contactoEmergencia: string | null;
  notasMedicas: string | null;
}

/** Datos para las pantallas de horario, turnos y perfiles (solo lectura). */
export class ConsultasOperacion {
  constructor(
    private readonly sql: postgres.Sql,
    private readonly cifrador: () => Cifrador,
  ) {}

  coaches(gimnasioId: string): Promise<CoachEnHorario[]> {
    return enGimnasio(this.sql, gimnasioId, (tx) => tx<CoachEnHorario[]>`
      SELECT id, apodo, color FROM coach WHERE gimnasio_id = ${gimnasioId} AND estado = 'aprobado' ORDER BY apodo`);
  }

  /** Clientes vigentes (pendientes o activos) de un coach, con su franja. */
  clientesDelCoach(gimnasioId: string, coachId: string): Promise<ClienteEnTurno[]> {
    return enGimnasio(this.sql, gimnasioId, (tx) => tx<ClienteEnTurno[]>`
      SELECT cl.id AS "clienteId", u.nombre, cl.estado, a.franja_id AS "franjaId", u.telefono
      FROM cliente cl
      JOIN usuario u ON u.id = cl.usuario_id
      LEFT JOIN asignacion_coach_cliente a ON a.cliente_id = cl.id AND a.hasta IS NULL
      WHERE cl.gimnasio_id = ${gimnasioId} AND cl.coach_id = ${coachId} AND cl.estado IN ('pendiente', 'activo')
      ORDER BY u.nombre`);
  }

  clienteDelUsuario(gimnasioId: string, usuarioId: string) {
    return enGimnasio(this.sql, gimnasioId, async (tx) => {
      const [f] = await tx<{ clienteId: string; coachId: string; coach: string; franjaId: string | null }[]>`
        SELECT cl.id AS "clienteId", cl.coach_id AS "coachId", c.apodo AS coach, a.franja_id AS "franjaId"
        FROM cliente cl JOIN coach c ON c.id = cl.coach_id
        LEFT JOIN asignacion_coach_cliente a ON a.cliente_id = cl.id AND a.hasta IS NULL
        WHERE cl.gimnasio_id = ${gimnasioId} AND cl.usuario_id = ${usuarioId}`;
      return f ?? null;
    });
  }

  async perfilCliente(gimnasioId: string, clienteId: string): Promise<PerfilClienteVisible> {
    const [f] = await enGimnasio(this.sql, gimnasioId, (tx) => tx<
      { sexo: "F" | "M" | null; fecha_nacimiento: string | null; contacto: string | null; notas: string | null }[]
    >`
      SELECT sexo, fecha_nacimiento::text, contacto_emergencia_cifrado AS contacto, notas_medicas_cifrado AS notas
      FROM perfil_cliente WHERE cliente_id = ${clienteId}`);
    const descifrar = (v: string | null) => (v ? this.cifrador().descifrar(v) : null);
    return {
      sexo: f?.sexo ?? null,
      fechaNacimiento: f?.fecha_nacimiento ?? null,
      contactoEmergencia: descifrar(f?.contacto ?? null),
      notasMedicas: descifrar(f?.notas ?? null),
    };
  }

  async perfilCoach(gimnasioId: string, usuarioId: string) {
    const [f] = await enGimnasio(this.sql, gimnasioId, (tx) => tx<{ bio: string | null; especialidad: string | null }[]>`
      SELECT bio, especialidad FROM coach WHERE gimnasio_id = ${gimnasioId} AND usuario_id = ${usuarioId}`);
    return f ?? null;
  }

  historialDeCliente(gimnasioId: string, clienteId: string) {
    return enGimnasio(this.sql, gimnasioId, (tx) => tx<
      { coach: string; inicio: string | null; fin: string | null; desde: Date; hasta: Date | null; motivo: string }[]
    >`
      SELECT c.apodo AS coach, to_char(f.hora_inicio, 'HH24:MI') AS inicio, to_char(f.hora_fin, 'HH24:MI') AS fin,
             a.desde, a.hasta, a.motivo
      FROM asignacion_coach_cliente a JOIN coach c ON c.id = a.coach_id LEFT JOIN franja_horaria f ON f.id = a.franja_id
      WHERE a.cliente_id = ${clienteId} ORDER BY a.desde DESC, a.hasta DESC NULLS FIRST`);
  }

  /** Vista pública: horario con coaches, sin gimnasio fijado (funciones SECURITY DEFINER). */
  async horarioPublico(gimnasioId: string) {
    const franjas = await this.sql<{ inicio: string; fin: string; dias: number[] }[]>`
      SELECT to_char(hora_inicio, 'HH24:MI') AS inicio, to_char(hora_fin, 'HH24:MI') AS fin, dias FROM franjas_publicas(${gimnasioId})`;
    const turnos = await this.sql<{ dia: number; inicio: string; apodo: string; color: string; especialidad: string | null }[]>`
      SELECT dia_semana AS dia, to_char(hora_inicio, 'HH24:MI') AS inicio, apodo, color, especialidad FROM horario_publico(${gimnasioId})`;
    return { franjas, turnos };
  }
}

-- Fase 2: operación. Horario con varios coaches por franja, turno de cada cliente y perfiles.
-- Nada se borra: las asignaciones se cierran con "hasta" y queda el historial.

-- Perfil del coach (lo edita él mismo) y su color en el horario.
ALTER TABLE coach
  ADD COLUMN bio          text CHECK (length(bio) <= 400),
  ADD COLUMN especialidad text CHECK (length(especialidad) <= 80),
  ADD COLUMN color        text NOT NULL DEFAULT '#8A8F9C' CHECK (color ~ '^#[0-9A-Fa-f]{6}$');

SELECT set_config('app.gimnasio_id', '00000000-0000-4000-8000-000000000101', true);
UPDATE coach SET color = CASE apodo WHEN 'Iván' THEN '#D7263D' WHEN 'Mike' THEN '#E8B04B' WHEN 'Chato' THEN '#2F80ED' ELSE color END;

-- Qué coach da clase en qué día y franja. Varios coaches pueden compartir la misma celda.
CREATE TABLE asignacion_horario (
  id           uuid PRIMARY KEY,
  gimnasio_id  uuid NOT NULL REFERENCES gimnasio(id),
  coach_id     uuid NOT NULL REFERENCES coach(id),
  franja_id    uuid NOT NULL REFERENCES franja_horaria(id),
  dia_semana   smallint NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  cupo_max     smallint CHECK (cupo_max IS NULL OR cupo_max BETWEEN 1 AND 100),
  desde        timestamptz NOT NULL DEFAULT now(),
  hasta        timestamptz,
  creado_por   uuid NOT NULL REFERENCES usuario(id)
);
CREATE UNIQUE INDEX asignacion_horario_vigente ON asignacion_horario (coach_id, franja_id, dia_semana) WHERE hasta IS NULL;
CREATE INDEX asignacion_horario_gimnasio ON asignacion_horario (gimnasio_id) WHERE hasta IS NULL;

-- Con quién y en qué franja entrena cada cliente. La vigente es la que no tiene "hasta".
CREATE TABLE asignacion_coach_cliente (
  id           uuid PRIMARY KEY,
  gimnasio_id  uuid NOT NULL REFERENCES gimnasio(id),
  cliente_id   uuid NOT NULL REFERENCES cliente(id),
  coach_id     uuid NOT NULL REFERENCES coach(id),
  franja_id    uuid REFERENCES franja_horaria(id),
  desde        timestamptz NOT NULL DEFAULT now(),
  hasta        timestamptz,
  motivo       text NOT NULL CHECK (length(trim(motivo)) > 0),
  creado_por   uuid REFERENCES usuario(id)
);
CREATE UNIQUE INDEX asignacion_cliente_vigente ON asignacion_coach_cliente (cliente_id) WHERE hasta IS NULL;

-- Los clientes que ya existen arrancan con el coach con que se registraron.
INSERT INTO asignacion_coach_cliente (id, gimnasio_id, cliente_id, coach_id, desde, motivo)
SELECT gen_random_uuid(), gimnasio_id, id, coach_id, creado_en, 'Registro con invitación del coach' FROM cliente;

-- Datos sensibles cifrados por la app (AES-256-GCM); la base nunca ve el texto.
CREATE TABLE perfil_cliente (
  cliente_id                  uuid PRIMARY KEY REFERENCES cliente(id),
  gimnasio_id                 uuid NOT NULL REFERENCES gimnasio(id),
  fecha_nacimiento            date,
  fecha_ingreso               date,
  contacto_emergencia_cifrado text,
  notas_medicas_cifrado       text,
  actualizado_en              timestamptz NOT NULL DEFAULT now(),
  actualizado_por             uuid REFERENCES usuario(id)
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['asignacion_horario', 'asignacion_coach_cliente', 'perfil_cliente'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY por_gimnasio ON %I USING (gimnasio_id = gimnasio_actual()) WITH CHECK (gimnasio_id = gimnasio_actual())', t);
  END LOOP;
END $$;

INSERT INTO permiso (codigo, descripcion) VALUES
  ('horario.asignar', 'Asignar coaches a días y franjas'),
  ('cliente.asignar', 'Cambiar el coach y la franja de un cliente');
INSERT INTO rol_permiso (rol_codigo, permiso_codigo) VALUES
  ('superadmin', 'horario.asignar'), ('admin', 'horario.asignar'),
  ('superadmin', 'cliente.asignar'), ('admin', 'cliente.asignar');

-- Vista pública: horario y coaches del gimnasio, sin datos personales.
CREATE FUNCTION horario_publico(p_gimnasio uuid)
RETURNS TABLE (dia_semana smallint, hora_inicio time, hora_fin time, apodo text, color text, especialidad text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.dia_semana, f.hora_inicio, f.hora_fin, c.apodo, c.color, c.especialidad
  FROM asignacion_horario a
  JOIN franja_horaria f ON f.id = a.franja_id
  JOIN coach c ON c.id = a.coach_id
  WHERE a.gimnasio_id = p_gimnasio AND a.hasta IS NULL AND f.activa AND c.estado = 'aprobado'
  ORDER BY a.dia_semana, f.hora_inicio, c.apodo
$$;

CREATE FUNCTION franjas_publicas(p_gimnasio uuid)
RETURNS TABLE (hora_inicio time, hora_fin time, dias smallint[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT f.hora_inicio, f.hora_fin, array(SELECT d.dia_semana FROM dia_operacion d WHERE d.gimnasio_id = p_gimnasio ORDER BY 1)
  FROM franja_horaria f WHERE f.gimnasio_id = p_gimnasio AND f.activa ORDER BY f.orden
$$;

-- Fase 0: cimientos. Multi-gimnasio, roles por permisos, horario, comisiones y auditoría.
-- Cada tabla de un gimnasio lleva gimnasio_id y se protege con RLS (app.gimnasio_id).

CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE disciplina (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo  text NOT NULL UNIQUE,
  nombre  text NOT NULL
);

CREATE TABLE gimnasio (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre         text NOT NULL,
  disciplina_id  uuid NOT NULL REFERENCES disciplina(id),
  pais           char(2) NOT NULL,
  moneda         char(3) NOT NULL,
  zona_horaria   text NOT NULL,
  creado_en      timestamptz NOT NULL DEFAULT now(),
  eliminado_en   timestamptz
);

-- Interruptores de funciones por gimnasio (ej. evaluadores externos).
CREATE TABLE funcion_gimnasio (
  gimnasio_id  uuid NOT NULL REFERENCES gimnasio(id),
  funcion      text NOT NULL,
  activa       boolean NOT NULL DEFAULT false,
  PRIMARY KEY (gimnasio_id, funcion)
);

CREATE TABLE usuario (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correo          citext,
  nombre          text NOT NULL,
  telefono        text,
  hash_clave      text,          -- Argon2id; se llena en la Fase 1
  estado          text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'activo', 'suspendido')),
  creado_en       timestamptz NOT NULL DEFAULT now(),
  eliminado_en    timestamptz
);
CREATE UNIQUE INDEX usuario_correo_unico ON usuario (correo) WHERE eliminado_en IS NULL AND correo IS NOT NULL;

-- Roles por permisos: un rol nuevo (ej. evaluador) es solo datos, sin reprogramar.
CREATE TABLE permiso (
  codigo       text PRIMARY KEY,
  descripcion  text NOT NULL
);

CREATE TABLE rol (
  codigo       text PRIMARY KEY,
  nombre       text NOT NULL,
  es_sistema   boolean NOT NULL DEFAULT false
);

CREATE TABLE rol_permiso (
  rol_codigo      text NOT NULL REFERENCES rol(codigo),
  permiso_codigo  text NOT NULL REFERENCES permiso(codigo),
  PRIMARY KEY (rol_codigo, permiso_codigo)
);

-- gimnasio_id NULL solo para el superadmin (todo el sistema).
CREATE TABLE usuario_rol (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id   uuid NOT NULL REFERENCES usuario(id),
  rol_codigo   text NOT NULL REFERENCES rol(codigo),
  gimnasio_id  uuid REFERENCES gimnasio(id),
  desde        timestamptz NOT NULL DEFAULT now(),
  hasta        timestamptz
);
CREATE UNIQUE INDEX usuario_rol_vigente ON usuario_rol (usuario_id, rol_codigo, coalesce(gimnasio_id, '00000000-0000-0000-0000-000000000000'::uuid)) WHERE hasta IS NULL;

CREATE TABLE coach (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gimnasio_id  uuid NOT NULL REFERENCES gimnasio(id),
  usuario_id   uuid NOT NULL REFERENCES usuario(id),
  apodo        text,
  estado       text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'suspendido')),
  creado_en    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gimnasio_id, usuario_id)
);

-- Días que opera cada gimnasio (0 = domingo ... 6 = sábado).
CREATE TABLE dia_operacion (
  gimnasio_id  uuid NOT NULL REFERENCES gimnasio(id),
  dia_semana   smallint NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  PRIMARY KEY (gimnasio_id, dia_semana)
);

CREATE TABLE franja_horaria (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gimnasio_id  uuid NOT NULL REFERENCES gimnasio(id),
  hora_inicio  time NOT NULL,
  hora_fin     time NOT NULL CHECK (hora_fin > hora_inicio),
  orden        smallint NOT NULL,
  activa       boolean NOT NULL DEFAULT true,
  UNIQUE (gimnasio_id, hora_inicio)
);

-- Comisión movible desde la administración. coach_id NULL = comisión general del gimnasio.
-- Nunca se edita un acuerdo pasado: se cierra su vigencia y se crea uno nuevo.
CREATE TABLE acuerdo_comision (
  id                  uuid PRIMARY KEY,
  gimnasio_id         uuid NOT NULL REFERENCES gimnasio(id),
  coach_id            uuid REFERENCES coach(id),
  porcentaje_pb       integer NOT NULL CHECK (porcentaje_pb BETWEEN 0 AND 10000),  -- puntos base: 50% = 5000
  vigente_desde       date NOT NULL,
  vigente_hasta       date CHECK (vigente_hasta IS NULL OR vigente_hasta >= vigente_desde),
  motivo              text NOT NULL CHECK (length(trim(motivo)) > 0),
  creado_por          uuid NOT NULL REFERENCES usuario(id),
  creado_en           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX acuerdo_comision_busqueda ON acuerdo_comision (gimnasio_id, coach_id, vigente_desde);

-- Bitácora de solo inserción.
CREATE TABLE auditoria (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  gimnasio_id  uuid REFERENCES gimnasio(id),
  usuario_id   uuid REFERENCES usuario(id),
  accion       text NOT NULL,
  entidad      text NOT NULL,
  entidad_id   text NOT NULL,
  antes        jsonb,
  despues      jsonb,
  motivo       text,
  creado_en    timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION auditoria_inmutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'La auditoría no se puede modificar ni borrar';
END $$;
CREATE TRIGGER auditoria_sin_cambios BEFORE UPDATE OR DELETE ON auditoria
  FOR EACH ROW EXECUTE FUNCTION auditoria_inmutable();

-- Aislamiento entre gimnasios. La app fija app.gimnasio_id en cada transacción.
CREATE FUNCTION gimnasio_actual() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.gimnasio_id', true), '')::uuid
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['funcion_gimnasio', 'coach', 'dia_operacion', 'franja_horaria', 'acuerdo_comision', 'auditoria'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY por_gimnasio ON %I USING (gimnasio_id = gimnasio_actual()) WITH CHECK (gimnasio_id = gimnasio_actual())', t);
  END LOOP;
END $$;

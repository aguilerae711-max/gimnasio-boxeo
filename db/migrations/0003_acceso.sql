-- Fase 1: acceso (sesiones, enlaces de activación, intentos) y alta de clientes.
-- Los tokens nunca se guardan en claro: solo su hash SHA-256.

ALTER TABLE usuario ADD COLUMN bienvenida_vista_en timestamptz;

CREATE TABLE sesion (
  token_hash   text PRIMARY KEY,
  usuario_id   uuid NOT NULL REFERENCES usuario(id),
  creada_en    timestamptz NOT NULL DEFAULT now(),
  expira_en    timestamptz NOT NULL,
  revocada_en  timestamptz
);
CREATE INDEX sesion_por_usuario ON sesion (usuario_id) WHERE revocada_en IS NULL;

-- Enlace de un solo uso para activar la cuenta (definir correo y contraseña) o restablecer la contraseña.
CREATE TABLE enlace_acceso (
  token_hash   text PRIMARY KEY,
  usuario_id   uuid NOT NULL REFERENCES usuario(id),
  proposito    text NOT NULL CHECK (proposito IN ('activar', 'restablecer')),
  expira_en    timestamptz NOT NULL,
  usado_en     timestamptz,
  creado_por   uuid REFERENCES usuario(id),
  creado_en    timestamptz NOT NULL DEFAULT now()
);

-- Para frenar intentos de adivinar contraseñas.
CREATE TABLE intento_acceso (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  correo     citext NOT NULL,
  exito      boolean NOT NULL,
  creado_en  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX intento_acceso_reciente ON intento_acceso (correo, creado_en);

-- Código de invitación de cada coach para que sus clientes se registren.
ALTER TABLE coach ADD COLUMN codigo_invitacion text UNIQUE;
UPDATE coach SET codigo_invitacion = translate(lower(apodo), 'áéíóúüñ', 'aeiouun') || '-' || substr(md5(id::text), 1, 4);

-- El registro público aún no tiene gimnasio fijado: estas funciones leen solo lo necesario saltando RLS.
CREATE FUNCTION coaches_para_registro() RETURNS TABLE (coach_id uuid, gimnasio_id uuid, apodo text, codigo text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.gimnasio_id, c.apodo, c.codigo_invitacion
  FROM coach c JOIN gimnasio g ON g.id = c.gimnasio_id
  WHERE c.estado = 'aprobado' AND g.eliminado_en IS NULL
  ORDER BY c.apodo
$$;

CREATE TABLE cliente (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gimnasio_id            uuid NOT NULL REFERENCES gimnasio(id),
  usuario_id             uuid NOT NULL REFERENCES usuario(id),
  coach_id               uuid NOT NULL REFERENCES coach(id),
  estado                 text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'activo', 'rechazado', 'baja')),
  reglamento_version     text NOT NULL,
  reglamento_aceptado_en timestamptz NOT NULL,
  revisado_por           uuid REFERENCES usuario(id),
  revisado_en            timestamptz,
  creado_en              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gimnasio_id, usuario_id)
);
CREATE INDEX cliente_por_coach ON cliente (gimnasio_id, coach_id, estado);

ALTER TABLE cliente ENABLE ROW LEVEL SECURITY;
CREATE POLICY por_gimnasio ON cliente USING (gimnasio_id = gimnasio_actual()) WITH CHECK (gimnasio_id = gimnasio_actual());

INSERT INTO permiso (codigo, descripcion) VALUES
  ('usuario.enlace_acceso', 'Generar enlaces para activar cuentas o restablecer contraseñas');
INSERT INTO rol_permiso (rol_codigo, permiso_codigo) VALUES
  ('superadmin', 'usuario.enlace_acceso'),
  ('admin', 'usuario.enlace_acceso');

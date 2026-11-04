-- Fase 3: pagos, cuadre mensual con coaches y cuenta con el sistema. Además, peso y división del cliente.

-- ───────────── Peso, estatura y división ─────────────

ALTER TABLE perfil_cliente ADD COLUMN sexo char(1) CHECK (sexo IN ('F', 'M'));

-- Catálogo de divisiones por disciplina. Semilla: categorías élite de World Boxing (amateur olímpico).
CREATE TABLE division_peso (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disciplina_id  uuid NOT NULL REFERENCES disciplina(id),
  estandar       text NOT NULL,
  sexo           char(1) NOT NULL CHECK (sexo IN ('F', 'M')),
  nombre         text NOT NULL,
  limite_kg      numeric(5,1),             -- NULL = división abierta (más de ...)
  orden          smallint NOT NULL,
  UNIQUE (disciplina_id, estandar, sexo, orden)
);

INSERT INTO division_peso (disciplina_id, estandar, sexo, nombre, limite_kg, orden)
SELECT '00000000-0000-4000-8000-000000000001', 'world_boxing_elite', 'M', l || ' kg', l, n
FROM unnest(ARRAY[50, 55, 60, 65, 70, 75, 80, 85, 90]) WITH ORDINALITY AS t(l, n);
INSERT INTO division_peso (disciplina_id, estandar, sexo, nombre, limite_kg, orden) VALUES
  ('00000000-0000-4000-8000-000000000001', 'world_boxing_elite', 'M', '+90 kg', NULL, 10);
INSERT INTO division_peso (disciplina_id, estandar, sexo, nombre, limite_kg, orden)
SELECT '00000000-0000-4000-8000-000000000001', 'world_boxing_elite', 'F', l || ' kg', l, n
FROM unnest(ARRAY[48, 51, 54, 57, 60, 65, 70, 75, 80]) WITH ORDINALITY AS t(l, n);
INSERT INTO division_peso (disciplina_id, estandar, sexo, nombre, limite_kg, orden) VALUES
  ('00000000-0000-4000-8000-000000000001', 'world_boxing_elite', 'F', '+80 kg', NULL, 10);

-- Cada pesaje: el aproximado del registro, las evaluaciones periódicas y los imprevistos.
CREATE TABLE medicion_corporal (
  id              uuid PRIMARY KEY,
  gimnasio_id     uuid NOT NULL REFERENCES gimnasio(id),
  cliente_id      uuid NOT NULL REFERENCES cliente(id),
  fecha           date NOT NULL,
  peso_kg         numeric(5,1) NOT NULL CHECK (peso_kg BETWEEN 20 AND 250),
  estatura_cm     numeric(5,1) CHECK (estatura_cm IS NULL OR estatura_cm BETWEEN 100 AND 230),
  origen          text NOT NULL CHECK (origen IN ('registro', 'evaluacion', 'imprevista')),
  aproximado      boolean NOT NULL DEFAULT false,
  registrado_por  uuid REFERENCES usuario(id),
  creado_en       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX medicion_por_cliente ON medicion_corporal (cliente_id, fecha);

-- ───────────── Planes y pagos ─────────────

CREATE TABLE plan_membresia (
  id               uuid PRIMARY KEY,
  gimnasio_id      uuid NOT NULL REFERENCES gimnasio(id),
  nombre           text NOT NULL,
  precio_centavos  integer NOT NULL CHECK (precio_centavos > 0),
  unidad           text NOT NULL CHECK (unidad IN ('dias', 'semanas', 'meses')),
  cantidad         smallint NOT NULL CHECK (cantidad BETWEEN 1 AND 365),
  activo           boolean NOT NULL DEFAULT true,
  creado_en        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pago (
  id                   uuid PRIMARY KEY,
  gimnasio_id          uuid NOT NULL REFERENCES gimnasio(id),
  cliente_id           uuid NOT NULL REFERENCES cliente(id),
  coach_cliente_id     uuid NOT NULL REFERENCES coach(id),      -- a quién le toca la comisión
  plan_id              uuid NOT NULL REFERENCES plan_membresia(id),
  monto_centavos       integer NOT NULL CHECK (monto_centavos > 0),
  fecha_pago           date NOT NULL,
  metodo               text NOT NULL CHECK (metodo IN ('efectivo', 'transferencia', 'tarjeta')),
  recibido_por         text NOT NULL CHECK (recibido_por IN ('administracion', 'coach')),
  coach_receptor_id    uuid REFERENCES coach(id),               -- quién tiene el dinero si fue un coach
  es_carga_inicial     boolean NOT NULL DEFAULT false,
  estado               text NOT NULL CHECK (estado IN ('reportado', 'confirmado', 'rechazado')),
  periodo_desde        date,
  periodo_hasta        date,
  fecha_confirmacion   date,
  comision_pb          integer CHECK (comision_pb BETWEEN 0 AND 10000),
  comision_centavos    integer CHECK (comision_centavos >= 0),
  motivo_rechazo       text,
  comprobante_ruta     text,
  nota                 text,
  reportado_por        uuid NOT NULL REFERENCES usuario(id),
  revisado_por         uuid REFERENCES usuario(id),
  creado_en            timestamptz NOT NULL DEFAULT now(),
  CHECK ((recibido_por = 'coach') = (coach_receptor_id IS NOT NULL)),
  CHECK (estado <> 'confirmado' OR (periodo_desde IS NOT NULL AND periodo_hasta IS NOT NULL AND comision_centavos IS NOT NULL))
);
CREATE INDEX pago_por_cliente ON pago (cliente_id, estado);
CREATE INDEX pago_por_mes ON pago (gimnasio_id, fecha_confirmacion) WHERE estado = 'confirmado';
CREATE INDEX pago_por_revisar ON pago (gimnasio_id) WHERE estado = 'reportado';

-- Cierre mensual con cada coach: foto de lo cuadrado (comisiones contra cobros en su mano).
CREATE TABLE cuadre_coach (
  id                    uuid PRIMARY KEY,
  gimnasio_id           uuid NOT NULL REFERENCES gimnasio(id),
  coach_id              uuid NOT NULL REFERENCES coach(id),
  mes                   char(7) NOT NULL CHECK (mes ~ '^\d{4}-\d{2}$'),
  comisiones_centavos   integer NOT NULL,
  cobros_centavos       integer NOT NULL,
  saldo_centavos        integer NOT NULL,   -- + la administración paga al coach; − el coach entrega
  nota                  text,
  cerrado_por           uuid NOT NULL REFERENCES usuario(id),
  cerrado_en            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coach_id, mes)
);

-- Lo que el gimnasio paga al sistema. Hoy 0%; puede pasar a porcentaje o cuota fija. Nunca retroactivo.
CREATE TABLE tarifa_sistema (
  id                 uuid PRIMARY KEY,
  gimnasio_id        uuid NOT NULL REFERENCES gimnasio(id),
  tipo               text NOT NULL CHECK (tipo IN ('porcentaje', 'cuota_fija')),
  porcentaje_pb      integer NOT NULL DEFAULT 0 CHECK (porcentaje_pb BETWEEN 0 AND 5000),
  cuota_centavos     integer NOT NULL DEFAULT 0 CHECK (cuota_centavos >= 0),
  vigente_desde      date NOT NULL,
  motivo             text NOT NULL CHECK (length(trim(motivo)) > 0),
  creado_por         uuid NOT NULL REFERENCES usuario(id),
  creado_en          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gimnasio_id, vigente_desde)
);

SELECT set_config('app.gimnasio_id', '00000000-0000-4000-8000-000000000101', true);
INSERT INTO tarifa_sistema (id, gimnasio_id, tipo, porcentaje_pb, vigente_desde, motivo, creado_por) VALUES
  (gen_random_uuid(), '00000000-0000-4000-8000-000000000101', 'porcentaje', 0, DATE '2026-11-01',
   'Etapa de prueba: sin cargo', '00000000-0000-4000-8000-000000000201');

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['medicion_corporal', 'plan_membresia', 'pago', 'cuadre_coach', 'tarifa_sistema'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY por_gimnasio ON %I USING (gimnasio_id = gimnasio_actual()) WITH CHECK (gimnasio_id = gimnasio_actual())', t);
  END LOOP;
END $$;

-- Los pagos y cuadres no se borran: se rechazan o se corrigen con otro movimiento.
REVOKE DELETE ON pago, cuadre_coach, tarifa_sistema FROM app_gimnasio;

INSERT INTO permiso (codigo, descripcion) VALUES
  ('cuadre.cerrar', 'Cerrar el cuadre mensual con los coaches');
INSERT INTO rol_permiso (rol_codigo, permiso_codigo) VALUES
  ('superadmin', 'cuadre.cerrar'), ('admin', 'cuadre.cerrar');

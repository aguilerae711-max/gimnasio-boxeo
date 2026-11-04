-- Fase 5: glosario, biblioteca de ejercicios, rutinas y plan de trabajo mensual del coach.

-- ───────────── Glosario (de la disciplina) ─────────────

CREATE TABLE golpe (
  disciplina_id  uuid NOT NULL REFERENCES disciplina(id),
  codigo         text NOT NULL,
  nombre         text NOT NULL,
  mano           text NOT NULL CHECK (mano IN ('adelante', 'atras', 'combinacion')),
  descripcion    text NOT NULL,
  orden          smallint NOT NULL,
  PRIMARY KEY (disciplina_id, codigo)
);

CREATE TABLE golpe_alias (
  disciplina_id  uuid NOT NULL,
  golpe_codigo   text NOT NULL,
  nombre         text NOT NULL,
  PRIMARY KEY (disciplina_id, golpe_codigo, nombre),
  FOREIGN KEY (disciplina_id, golpe_codigo) REFERENCES golpe (disciplina_id, codigo)
);

INSERT INTO golpe (disciplina_id, codigo, nombre, mano, descripcion, orden) VALUES
  ('00000000-0000-4000-8000-000000000001', '1',   'Jab',                               'adelante',    'Golpe recto con la mano de adelante; mide distancia y abre combinaciones.', 1),
  ('00000000-0000-4000-8000-000000000001', '2',   'Recto de atrás',                    'atras',       'Golpe recto con la mano de atrás, girando cadera y pie de atrás.', 2),
  ('00000000-0000-4000-8000-000000000001', '1-2', 'Uno-dos',                           'combinacion', 'Jab seguido de recto de atrás: la combinación básica.', 3),
  ('00000000-0000-4000-8000-000000000001', '3',   'Gancho de adelante',                'adelante',    'Golpe en arco horizontal con la mano de adelante, codo a la altura del puño.', 4),
  ('00000000-0000-4000-8000-000000000001', '4',   'Gancho de atrás',                   'atras',       'Golpe en arco horizontal con la mano de atrás.', 5),
  ('00000000-0000-4000-8000-000000000001', '5',   'Uppercut de adelante',              'adelante',    'Golpe ascendente con la mano de adelante, desde abajo hacia el mentón.', 6),
  ('00000000-0000-4000-8000-000000000001', '6',   'Uppercut de atrás',                 'atras',       'Golpe ascendente con la mano de atrás.', 7),
  ('00000000-0000-4000-8000-000000000001', '1c',  'Jab al cuerpo',                     'adelante',    'Jab dirigido al cuerpo, bajando el nivel con las piernas.', 8),
  ('00000000-0000-4000-8000-000000000001', '3c',  'Gancho al hígado',                  'adelante',    'Gancho de adelante al costado derecho del rival (hígado).', 9),
  ('00000000-0000-4000-8000-000000000001', '4c',  'Gancho al cuerpo (lado contrario)', 'atras',       'Gancho de atrás al costado izquierdo del rival (bazo).', 10),
  ('00000000-0000-4000-8000-000000000001', 'V',   'Volado',                            'atras',       'Golpe de atrás en arco por arriba, que cae sobre la guardia.', 11);

INSERT INTO golpe_alias (disciplina_id, golpe_codigo, nombre)
SELECT '00000000-0000-4000-8000-000000000001', codigo, unnest(alias) FROM (VALUES
  ('1',   ARRAY['Directo de adelante', 'Recto']),
  ('2',   ARRAY['Cross', 'Directo de atrás']),
  ('1-2', ARRAY['Jab-cross']),
  ('3',   ARRAY['Hook de adelante']),
  ('4',   ARRAY['Hook de atrás']),
  ('5',   ARRAY['Gancho ascendente', 'Upper']),
  ('6',   ARRAY['Gancho ascendente de atrás']),
  ('1c',  ARRAY['Directo al cuerpo', 'Jab abajo']),
  ('3c',  ARRAY['Gancho de adelante al cuerpo']),
  ('4c',  ARRAY['Gancho de atrás al cuerpo', 'Gancho al bazo']),
  ('V',   ARRAY['Overhand', 'Golpe en arco por arriba'])
) AS t(codigo, alias);

CREATE TABLE categoria_ejercicio (
  disciplina_id  uuid NOT NULL REFERENCES disciplina(id),
  codigo         text NOT NULL,
  nombre         text NOT NULL,
  orden          smallint NOT NULL,
  PRIMARY KEY (disciplina_id, codigo)
);
INSERT INTO categoria_ejercicio (disciplina_id, codigo, nombre, orden) VALUES
  ('00000000-0000-4000-8000-000000000001', 'tecnica',          'Técnica ofensiva', 1),
  ('00000000-0000-4000-8000-000000000001', 'defensa',          'Defensa', 2),
  ('00000000-0000-4000-8000-000000000001', 'desplazamiento',   'Desplazamiento', 3),
  ('00000000-0000-4000-8000-000000000001', 'implementos',      'Implementos (costal, manoplas, perilla)', 4),
  ('00000000-0000-4000-8000-000000000001', 'acondicionamiento', 'Acondicionamiento', 5),
  ('00000000-0000-4000-8000-000000000001', 'sparring',         'Sparring', 6);

-- ───────────── Biblioteca del gimnasio ─────────────

ALTER TABLE coach ADD COLUMN acceso_biblioteca boolean NOT NULL DEFAULT false;

CREATE TABLE ejercicio (
  id                uuid PRIMARY KEY,
  gimnasio_id       uuid NOT NULL REFERENCES gimnasio(id),
  categoria_codigo  text NOT NULL,
  nombre            text NOT NULL,
  descripcion       text NOT NULL,
  ejecucion         text,
  errores_comunes   text,
  nivel             text CHECK (nivel IN ('inicial', 'intermedio', 'avanzado')),
  es_basico         boolean NOT NULL DEFAULT false,
  estado            text NOT NULL CHECK (estado IN ('propuesto', 'formalizado', 'fusionado', 'archivado')),
  visibilidad       text NOT NULL DEFAULT 'privado' CHECK (visibilidad IN ('privado', 'compartido')),
  creado_por        uuid REFERENCES usuario(id),
  creado_por_coach  uuid REFERENCES coach(id),
  formalizado_por   uuid REFERENCES usuario(id),
  formalizado_en    timestamptz,
  fusionado_en_id   uuid REFERENCES ejercicio(id),
  creado_en         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ejercicio_alias (
  ejercicio_id  uuid NOT NULL REFERENCES ejercicio(id),
  gimnasio_id   uuid NOT NULL REFERENCES gimnasio(id),
  nombre        text NOT NULL,
  PRIMARY KEY (ejercicio_id, nombre)
);

SELECT set_config('app.gimnasio_id', '00000000-0000-4000-8000-000000000101', true);

-- Ejercicios básicos del plan: ya formalizados, los ven todos.
INSERT INTO ejercicio (id, gimnasio_id, categoria_codigo, nombre, descripcion, es_basico, estado, visibilidad, creado_por, formalizado_por, formalizado_en)
SELECT gen_random_uuid(), '00000000-0000-4000-8000-000000000101', cat, nombre, descripcion, true, 'formalizado', 'compartido',
       '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000201', now()
FROM (VALUES
  ('implementos',       'Manopleo',    'Combinaciones y defensa con el coach usando manoplas. Ej.: 6 rounds de manopleo grupal.'),
  ('implementos',       'Gobernadora', 'Golpes fuertes contra la colchoneta. Ej.: 4 rounds de gobernadora en parejas.'),
  ('implementos',       'Perillas',    'Ritmo, coordinación y resistencia de hombros. Ej.: 3 rounds de perilla.'),
  ('implementos',       'Costal',      'Potencia y volumen de golpeo por rounds. Ej.: 6 × 3 min de costal.'),
  ('tecnica',           'Sombra',      'Técnica sin implemento, frente al espejo. Ej.: 3 rounds de sombra.'),
  ('acondicionamiento', 'Cuerda',      'Ritmo de pies y resistencia. Ej.: 3 × 3 min de cuerda.')
) AS t(cat, nombre, descripcion);

INSERT INTO ejercicio_alias (ejercicio_id, gimnasio_id, nombre)
SELECT e.id, e.gimnasio_id, a.alias FROM ejercicio e JOIN (VALUES
  ('Manopleo', 'Manoplas'), ('Manopleo', 'Pads'), ('Costal', 'Saco'), ('Costal', 'Saco pesado'),
  ('Sombra', 'Shadow boxing'), ('Cuerda', 'Brincar la cuerda'), ('Perillas', 'Pera'), ('Perillas', 'Perilla loca')
) AS a(nombre, alias) ON a.nombre = e.nombre;

-- ───────────── Rutinas y plan de trabajo ─────────────

CREATE TABLE rutina (
  id           uuid PRIMARY KEY,
  gimnasio_id  uuid NOT NULL REFERENCES gimnasio(id),
  coach_id     uuid NOT NULL REFERENCES coach(id),
  nombre       text NOT NULL,
  descripcion  text NOT NULL DEFAULT '',
  archivada    boolean NOT NULL DEFAULT false,
  creada_en    timestamptz NOT NULL DEFAULT now(),
  cambiada_en  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE rutina_bloque (
  id           uuid PRIMARY KEY,
  rutina_id    uuid NOT NULL REFERENCES rutina(id),
  gimnasio_id  uuid NOT NULL REFERENCES gimnasio(id),
  orden        smallint NOT NULL,
  tipo         text NOT NULL,
  minutos      smallint NOT NULL CHECK (minutos BETWEEN 1 AND 120),
  rounds       smallint CHECK (rounds IS NULL OR rounds BETWEEN 1 AND 30),
  descripcion  text NOT NULL DEFAULT ''
);

CREATE TABLE bloque_elemento (
  id            uuid PRIMARY KEY,
  bloque_id     uuid NOT NULL REFERENCES rutina_bloque(id),
  gimnasio_id   uuid NOT NULL REFERENCES gimnasio(id),
  orden         smallint NOT NULL,
  ejercicio_id  uuid REFERENCES ejercicio(id),
  combinacion   text,
  modalidad     text NOT NULL DEFAULT 'individual' CHECK (modalidad IN ('individual', 'parejas', 'grupal')),
  detalle       text NOT NULL DEFAULT '',
  CHECK (ejercicio_id IS NOT NULL OR combinacion IS NOT NULL)
);

-- Un plan por coach y mes. Las rutinas se asignan por día y franja (no por asignación, que puede cambiar).
CREATE TABLE plan_trabajo (
  id             uuid PRIMARY KEY,
  gimnasio_id    uuid NOT NULL REFERENCES gimnasio(id),
  coach_id       uuid NOT NULL REFERENCES coach(id),
  mes            char(7) NOT NULL,
  es_fijo        boolean NOT NULL DEFAULT true,
  estado         text NOT NULL CHECK (estado IN ('borrador', 'enviado', 'aprobado', 'requiere_cambios')),
  basado_en_id   uuid REFERENCES plan_trabajo(id),
  enviado_en     timestamptz,
  revisado_por   uuid REFERENCES usuario(id),
  revisado_en    timestamptz,
  comentario     text,
  UNIQUE (coach_id, mes)
);

CREATE TABLE plan_turno (
  plan_id      uuid NOT NULL REFERENCES plan_trabajo(id),
  gimnasio_id  uuid NOT NULL REFERENCES gimnasio(id),
  dia_semana   smallint NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  franja_id    uuid NOT NULL REFERENCES franja_horaria(id),
  rutina_id    uuid NOT NULL REFERENCES rutina(id),
  PRIMARY KEY (plan_id, dia_semana, franja_id)
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ejercicio', 'ejercicio_alias', 'rutina', 'rutina_bloque', 'bloque_elemento', 'plan_trabajo', 'plan_turno'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY por_gimnasio ON %I USING (gimnasio_id = gimnasio_actual()) WITH CHECK (gimnasio_id = gimnasio_actual())', t);
  END LOOP;
END $$;

-- Los ejercicios no se borran (se archivan o se fusionan) ni los planes (quedan como historial).
REVOKE DELETE ON ejercicio, plan_trabajo FROM app_gimnasio;

INSERT INTO rol_permiso (rol_codigo, permiso_codigo) VALUES ('superadmin', 'plan.enviar'), ('admin', 'plan.enviar')
ON CONFLICT DO NOTHING;

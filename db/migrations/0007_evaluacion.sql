-- Fase 4: evaluación por pilares. El catálogo (pilares, tests, rúbrica) es configuración de la disciplina;
-- la batería y las sesiones son de cada gimnasio. Los datos crudos se guardan siempre; los puntajes son foto fija.

-- PIN de quien evalúa (Argon2id), aparte de su contraseña.
ALTER TABLE usuario ADD COLUMN pin_hash text;

-- ───────────── Catálogo de la disciplina ─────────────

CREATE TABLE pilar (
  disciplina_id  uuid NOT NULL REFERENCES disciplina(id),
  codigo         text NOT NULL,
  nombre         text NOT NULL,
  padre_codigo   text,
  peso_en_padre  smallint,
  color          text NOT NULL,
  orden          smallint NOT NULL,
  PRIMARY KEY (disciplina_id, codigo)
);

CREATE TABLE test_def (
  disciplina_id   uuid NOT NULL REFERENCES disciplina(id),
  codigo          text NOT NULL,
  pilar_codigo    text NOT NULL,
  nombre          text NOT NULL,
  protocolo       text NOT NULL,
  equipo          text,
  formula         text NOT NULL CHECK (formula IN ('mejor', 'mejor_x2', 'mejor_resta', 'retencion', 'diferencia', 'rubrica')),
  campos          text[] NOT NULL,      -- códigos de lo que se captura en cada intento
  etiquetas       text[] NOT NULL,      -- cómo se le muestran al evaluador
  unidad          text NOT NULL,        -- unidad del resultado
  intentos        smallint NOT NULL CHECK (intentos BETWEEN 1 AND 5),
  mayor_es_mejor  boolean NOT NULL DEFAULT true,
  duracion_seg    smallint,             -- cronómetro en pantalla (sprint 6 s, cuadrantes 15 s...)
  contador        boolean NOT NULL DEFAULT false,  -- contador táctil para el primer campo
  estado          text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  PRIMARY KEY (disciplina_id, codigo),
  FOREIGN KEY (disciplina_id, pilar_codigo) REFERENCES pilar (disciplina_id, codigo)
);

CREATE TABLE rubrica_criterio (
  disciplina_id  uuid NOT NULL REFERENCES disciplina(id),
  codigo         text NOT NULL,
  test_codigo    text NOT NULL,
  subpilar       text NOT NULL CHECK (subpilar IN ('tactica', 'adaptabilidad')),
  nombre         text NOT NULL,
  orden          smallint NOT NULL,
  PRIMARY KEY (disciplina_id, codigo),
  FOREIGN KEY (disciplina_id, test_codigo) REFERENCES test_def (disciplina_id, codigo)
);

-- Solo referencia para la administración; nunca se muestra al cliente ni al coach.
CREATE TABLE referencia_nivel (
  disciplina_id  uuid NOT NULL REFERENCES disciplina(id),
  clave          text NOT NULL,
  nombre         text NOT NULL,
  inicial        text NOT NULL,
  intermedio     text NOT NULL,
  avanzado       text NOT NULL,
  orden          smallint NOT NULL,
  PRIMARY KEY (disciplina_id, clave)
);

-- ───────────── Semilla: boxeo, batería núcleo v1 ─────────────

INSERT INTO pilar (disciplina_id, codigo, nombre, padre_codigo, peso_en_padre, color, orden) VALUES
  ('00000000-0000-4000-8000-000000000001', 'fuerza',        'Fuerza',        NULL, NULL, '#FF6B76', 1),
  ('00000000-0000-4000-8000-000000000001', 'velocidad',     'Velocidad',     NULL, NULL, '#E8B04B', 2),
  ('00000000-0000-4000-8000-000000000001', 'resistencia',   'Resistencia',   NULL, NULL, '#4FA3FF', 3),
  ('00000000-0000-4000-8000-000000000001', 'estrategia',    'Estrategia',    NULL, NULL, '#6FE0A2', 4),
  ('00000000-0000-4000-8000-000000000001', 'tactica',       'Táctica',       'estrategia', 50, '#6FE0A2', 5),
  ('00000000-0000-4000-8000-000000000001', 'adaptabilidad', 'Adaptabilidad', 'estrategia', 50, '#6FE0A2', 6);

INSERT INTO test_def (disciplina_id, codigo, pilar_codigo, nombre, protocolo, equipo, formula, campos, etiquetas, unidad, intentos, mayor_es_mejor, duracion_seg, contador) VALUES
  ('00000000-0000-4000-8000-000000000001', 'sprint_costal', 'velocidad', 'Sprint en costal 6 s',
   'Golpes rectos alternados lo más rápido posible durante 6 s. Se cuenta solo el cross y se multiplica por 2. 2 intentos con 60 s de descanso.',
   'Costal', 'mejor_x2', ARRAY['cross'], ARRAY['Cross contados'], 'golpes', 2, true, 6, true),
  ('00000000-0000-4000-8000-000000000001', 'cuadrantes', 'velocidad', 'Cuadrantes 15 s',
   'Tocar los cuatro cuadrantes marcados en orden durante 15 s. Se anotan los toques limpios y las pisadas de línea. 2 intentos.',
   'Cinta en el piso', 'mejor_resta', ARRAY['toques', 'pisadas'], ARRAY['Toques limpios', 'Pisadas'], 'toques', 2, true, 15, true),
  ('00000000-0000-4000-8000-000000000001', 'salto_horizontal', 'fuerza', 'Salto horizontal',
   'Salto con los pies juntos desde parado; se mide al talón más atrasado. 3 intentos; los nulos se dejan vacíos.',
   'Cinta métrica', 'mejor', ARRAY['cm'], ARRAY['Distancia (cm)'], 'cm', 3, true, NULL, false),
  ('00000000-0000-4000-8000-000000000001', 'flexiones_despegue', 'fuerza', 'Flexiones con despegue 30 s',
   'Flexiones con despegue de manos; solo cuentan las válidas (pecho al puño y despegue). 30 s.',
   NULL, 'mejor', ARRAY['reps'], ARRAY['Repeticiones válidas'], 'reps', 1, true, 30, true),
  ('00000000-0000-4000-8000-000000000001', 'escenario_a', 'estrategia', 'Escenario A · Presión (2 min)',
   'El compañero camina hacia adelante sin golpear. Careta y guantes de 16 oz. Califica cada conducta: 0 No, 1 A veces, 2 Consistente.',
   'Careta, guantes 16 oz', 'rubrica', ARRAY['rubrica'], ARRAY['Conductas'], 'puntos', 1, true, 120, false),
  ('00000000-0000-4000-8000-000000000001', 'escenario_b', 'estrategia', 'Escenario B · Jab (2 min)',
   'El compañero lanza un jab cada 2–3 s a intensidad controlada. Careta y guantes de 16 oz. Califica cada conducta: 0 No, 1 A veces, 2 Consistente.',
   'Careta, guantes 16 oz', 'rubrica', ARRAY['rubrica'], ARRAY['Conductas'], 'puntos', 1, true, 120, false),
  ('00000000-0000-4000-8000-000000000001', 'dropoff', 'resistencia', 'Drop-off → Retención',
   'Tres asaltos; se cuentan los golpes del sprint del asalto 1 (G1) y del asalto 3 (G3). Resultado: G3 ÷ G1 × 100.',
   'Costal', 'retencion', ARRAY['g1', 'g3'], ARRAY['Golpes asalto 1 (G1)', 'Golpes asalto 3 (G3)'], '%', 1, true, NULL, false),
  ('00000000-0000-4000-8000-000000000001', 'recuperacion_fc', 'resistencia', 'Recuperación cardíaca',
   'FC pico al terminar el asalto 3 y FC a los 60 s, con pulsómetro. Sin pulsómetro se deja vacío (no realizado).',
   'Pulsómetro', 'diferencia', ARRAY['fc_pico', 'fc_60'], ARRAY['FC pico (lpm)', 'FC a los 60 s (lpm)'], 'lpm', 1, true, 60, false);

INSERT INTO rubrica_criterio (disciplina_id, codigo, test_codigo, subpilar, nombre, orden) VALUES
  ('00000000-0000-4000-8000-000000000001', 'c01', 'escenario_a', 'adaptabilidad', 'Salida de cuerdas', 1),
  ('00000000-0000-4000-8000-000000000001', 'c02', 'escenario_a', 'adaptabilidad', 'Eje de retirada', 2),
  ('00000000-0000-4000-8000-000000000001', 'c03', 'escenario_a', 'tactica', 'Anticipación mecánica', 3),
  ('00000000-0000-4000-8000-000000000001', 'c04', 'escenario_a', 'tactica', 'Fintas previas', 4),
  ('00000000-0000-4000-8000-000000000001', 'c08', 'escenario_a', 'tactica', 'Ángulos de salida', 5),
  ('00000000-0000-4000-8000-000000000001', 'c05', 'escenario_b', 'tactica', 'Disciplina de mentón', 1),
  ('00000000-0000-4000-8000-000000000001', 'c06', 'escenario_b', 'adaptabilidad', 'Neutralización del jab', 2),
  ('00000000-0000-4000-8000-000000000001', 'c07', 'escenario_b', 'adaptabilidad', 'Contragolpe en un solo tiempo', 3),
  ('00000000-0000-4000-8000-000000000001', 'c09', 'escenario_b', 'tactica', 'Retorno a guardia', 4),
  ('00000000-0000-4000-8000-000000000001', 'c10', 'escenario_b', 'adaptabilidad', 'Consistencia en fatiga (últimos 30 s)', 5);

INSERT INTO referencia_nivel (disciplina_id, clave, nombre, inicial, intermedio, avanzado, orden) VALUES
  ('00000000-0000-4000-8000-000000000001', 'salto_horizontal', 'Salto horizontal', '< 190 cm', '190–230', '> 230', 1),
  ('00000000-0000-4000-8000-000000000001', 'flexiones_despegue', 'Flexiones con despegue 30 s', '≤ 16', '17–24', '≥ 25', 2),
  ('00000000-0000-4000-8000-000000000001', 'sprint_costal', 'Sprint en costal 6 s', '≤ 28', '29–35', '≥ 36', 3),
  ('00000000-0000-4000-8000-000000000001', 'cuadrantes', 'Cuadrantes 15 s', '≤ 20', '21–27', '≥ 28', 4),
  ('00000000-0000-4000-8000-000000000001', 'dropoff', 'Retención drop-off', '< 77%', '77–87%', '> 87%', 5),
  ('00000000-0000-4000-8000-000000000001', 'recuperacion_fc', 'Recuperación cardíaca', '≤ 25 lpm', '26–40', '> 40', 6),
  ('00000000-0000-4000-8000-000000000001', 'tactica', 'Táctica / Adaptabilidad (0–10)', '0–4', '5–7', '8–10', 7);

-- ───────────── Del gimnasio ─────────────

CREATE TABLE bateria (
  id             uuid PRIMARY KEY,
  gimnasio_id    uuid NOT NULL REFERENCES gimnasio(id),
  nombre         text NOT NULL,
  version        text NOT NULL,
  vigente_desde  date NOT NULL,
  vigente_hasta  date
);

CREATE TABLE bateria_test (
  bateria_id     uuid NOT NULL REFERENCES bateria(id),
  gimnasio_id    uuid NOT NULL REFERENCES gimnasio(id),
  test_codigo    text NOT NULL,
  peso_en_pilar  smallint NOT NULL CHECK (peso_en_pilar BETWEEN 0 AND 100),
  obligatorio    boolean NOT NULL DEFAULT true,
  orden          smallint NOT NULL,
  PRIMARY KEY (bateria_id, test_codigo)
);

SELECT set_config('app.gimnasio_id', '00000000-0000-4000-8000-000000000101', true);
INSERT INTO bateria (id, gimnasio_id, nombre, version, vigente_desde) VALUES
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000101', 'Batería núcleo', 'v1', DATE '2026-11-01');
-- Orden fijo: velocidad, fuerza, estrategia y resistencia siempre al final.
INSERT INTO bateria_test (bateria_id, gimnasio_id, test_codigo, peso_en_pilar, obligatorio, orden) VALUES
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000101', 'sprint_costal', 60, true, 1),
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000101', 'cuadrantes', 40, true, 2),
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000101', 'salto_horizontal', 50, true, 3),
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000101', 'flexiones_despegue', 50, true, 4),
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000101', 'escenario_a', 0, true, 5),
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000101', 'escenario_b', 0, true, 6),
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000101', 'dropoff', 60, true, 7),
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000101', 'recuperacion_fc', 40, false, 8);

CREATE TABLE sesion_evaluacion (
  id                  uuid PRIMARY KEY,
  gimnasio_id         uuid NOT NULL REFERENCES gimnasio(id),
  cliente_id          uuid NOT NULL REFERENCES cliente(id),
  coach_id            uuid NOT NULL REFERENCES coach(id),
  evaluador_id        uuid NOT NULL REFERENCES usuario(id),
  bateria_id          uuid NOT NULL REFERENCES bateria(id),
  tipo                text NOT NULL CHECK (tipo IN ('inicial', 'mensual')),
  periodo             char(7) NOT NULL,
  estado              text NOT NULL CHECK (estado IN ('en_curso', 'parcial', 'completa', 'no_apta', 'anulada')),
  chequeo             jsonb,
  peso_kg             numeric(5,1),
  division            text,
  companero           text,
  companero_habitual  boolean,
  iniciada_en         timestamptz NOT NULL DEFAULT now(),
  finalizada_en       timestamptz,
  motivo_anulacion    text
);
-- Una evaluación por cliente y mes (las anuladas o no aptas no cuentan).
CREATE UNIQUE INDEX sesion_una_por_mes ON sesion_evaluacion (cliente_id, periodo) WHERE estado NOT IN ('anulada', 'no_apta');
CREATE INDEX sesion_por_cliente ON sesion_evaluacion (cliente_id, iniciada_en);

ALTER TABLE medicion_corporal ADD COLUMN sesion_id uuid REFERENCES sesion_evaluacion(id);

CREATE TABLE resultado_intento (
  sesion_id    uuid NOT NULL REFERENCES sesion_evaluacion(id),
  gimnasio_id  uuid NOT NULL REFERENCES gimnasio(id),
  test_codigo  text NOT NULL,
  intento      smallint NOT NULL,
  campo        text NOT NULL,
  valor        numeric(7,2),
  capturado_en timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (sesion_id, test_codigo, intento, campo)
);

CREATE TABLE resultado_rubrica (
  sesion_id        uuid NOT NULL REFERENCES sesion_evaluacion(id),
  gimnasio_id      uuid NOT NULL REFERENCES gimnasio(id),
  criterio_codigo  text NOT NULL,
  nivel            smallint NOT NULL CHECK (nivel BETWEEN 0 AND 2),
  PRIMARY KEY (sesion_id, criterio_codigo)
);

-- Punto de partida de cada cliente por test (o subpilar de estrategia). Se puede reiniciar con motivo.
CREATE TABLE linea_base (
  id             uuid PRIMARY KEY,
  gimnasio_id    uuid NOT NULL REFERENCES gimnasio(id),
  cliente_id     uuid NOT NULL REFERENCES cliente(id),
  clave          text NOT NULL,
  valor          numeric(7,2) NOT NULL,
  sesion_id      uuid NOT NULL REFERENCES sesion_evaluacion(id),
  vigente_desde  timestamptz NOT NULL DEFAULT now(),
  motivo         text
);
CREATE INDEX linea_base_vigente ON linea_base (cliente_id, clave, vigente_desde);

CREATE TABLE puntaje_test (
  sesion_id    uuid NOT NULL REFERENCES sesion_evaluacion(id),
  gimnasio_id  uuid NOT NULL REFERENCES gimnasio(id),
  clave        text NOT NULL,
  valor        numeric(7,2),
  base         numeric(7,2),
  indice       smallint,
  atipico      boolean NOT NULL DEFAULT false,
  PRIMARY KEY (sesion_id, clave)
);

CREATE TABLE puntaje_pilar (
  sesion_id    uuid NOT NULL REFERENCES sesion_evaluacion(id),
  gimnasio_id  uuid NOT NULL REFERENCES gimnasio(id),
  pilar        text NOT NULL,
  indice       smallint,
  completo     boolean NOT NULL,
  PRIMARY KEY (sesion_id, pilar)
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['bateria', 'bateria_test', 'sesion_evaluacion', 'resultado_intento', 'resultado_rubrica',
                           'linea_base', 'puntaje_test', 'puntaje_pilar'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY por_gimnasio ON %I USING (gimnasio_id = gimnasio_actual()) WITH CHECK (gimnasio_id = gimnasio_actual())', t);
  END LOOP;
END $$;

-- Las sesiones y líneas base no se borran: se anulan o se reinician con motivo.
REVOKE DELETE ON sesion_evaluacion, linea_base FROM app_gimnasio;

INSERT INTO permiso (codigo, descripcion) VALUES
  ('evaluacion.ver_todos', 'Ver resultados por pilar de todos los clientes y de todos los coaches');
INSERT INTO rol_permiso (rol_codigo, permiso_codigo) VALUES
  ('superadmin', 'evaluacion.ver_todos'), ('admin', 'evaluacion.ver_todos');

-- Las rutinas parten de los pilares: cada bloque y cada ejercicio tiene un enfoque.
-- Enfoques: calentamiento, los 4 pilares de la evaluación y enfriamiento.
INSERT INTO categoria_ejercicio (disciplina_id, codigo, nombre, orden)
SELECT d.id, x.codigo, x.nombre, x.orden FROM disciplina d CROSS JOIN (VALUES
  ('calentamiento', 'Calentamiento', 11),
  ('fuerza',        'Fuerza',        12),
  ('velocidad',     'Velocidad',     13),
  ('resistencia',   'Resistencia',   14),
  ('estrategia',    'Estrategia',    15),
  ('enfriamiento',  'Enfriamiento',  16)
) AS x(codigo, nombre, orden)
ON CONFLICT DO NOTHING;

-- Como las migraciones anteriores: por si las políticas por gimnasio aplican, se fija el gimnasio piloto.
SELECT set_config('app.gimnasio_id', '00000000-0000-4000-8000-000000000101', true);

-- Ejercicios de la semilla, uno por uno.
UPDATE ejercicio SET categoria_codigo = CASE nombre
    WHEN 'Gobernadora' THEN 'fuerza'
    WHEN 'Costal'      THEN 'resistencia'
    WHEN 'Perillas'    THEN 'velocidad'
    WHEN 'Manopleo'    THEN 'estrategia'
    WHEN 'Sombra'      THEN 'estrategia'
    WHEN 'Cuerda'      THEN 'calentamiento'
  END
WHERE nombre IN ('Gobernadora', 'Costal', 'Perillas', 'Manopleo', 'Sombra', 'Cuerda') AND es_basico;

-- Los demás, por su categoría anterior.
UPDATE ejercicio SET categoria_codigo = CASE categoria_codigo
    WHEN 'tecnica'           THEN 'estrategia'
    WHEN 'defensa'           THEN 'estrategia'
    WHEN 'sparring'          THEN 'estrategia'
    WHEN 'desplazamiento'    THEN 'velocidad'
    WHEN 'implementos'       THEN 'fuerza'
    WHEN 'acondicionamiento' THEN 'resistencia'
    ELSE categoria_codigo
  END
WHERE categoria_codigo IN ('tecnica', 'defensa', 'sparring', 'desplazamiento', 'implementos', 'acondicionamiento');

DELETE FROM categoria_ejercicio WHERE codigo IN ('tecnica', 'defensa', 'sparring', 'desplazamiento', 'implementos', 'acondicionamiento');

-- Bloques de rutinas ya guardadas.
UPDATE rutina_bloque SET tipo = CASE tipo
    WHEN 'tecnica'           THEN 'estrategia'
    WHEN 'sparring'          THEN 'estrategia'
    WHEN 'implementos'       THEN 'fuerza'
    WHEN 'acondicionamiento' THEN 'resistencia'
    WHEN 'otro'              THEN 'estrategia'
    ELSE tipo
  END
WHERE tipo IN ('tecnica', 'sparring', 'implementos', 'acondicionamiento', 'otro');

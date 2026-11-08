-- Calificación del 1 al 10, como en la escuela: 6 aprueba y 10 es nivel élite.
-- Se calcula siempre desde el valor real de cada test, así el historial completo se ve en la misma escala.
-- Anclas por test y rama: inicial = 5, intermedio = 7, avanzado = 8.5, élite = 10.
-- Las de inicial a avanzado salen de la referencia del gimnasio; la élite es aproximada (no hay
-- estudios publicados de boxeadores élite con estos tests exactos) y se puede ajustar sin tocar código.

CREATE TABLE meta_test (
  disciplina_id  uuid NOT NULL REFERENCES disciplina(id),
  test_codigo    text NOT NULL,
  sexo           char(1) NOT NULL CHECK (sexo IN ('F', 'M')),
  ancla_5        numeric(7,2) NOT NULL,
  ancla_7        numeric(7,2) NOT NULL,
  ancla_85       numeric(7,2) NOT NULL,
  elite          numeric(7,2) NOT NULL,
  aproximado     boolean NOT NULL DEFAULT true,
  fuente         text NOT NULL,
  PRIMARY KEY (disciplina_id, test_codigo, sexo),
  FOREIGN KEY (disciplina_id, test_codigo) REFERENCES test_def (disciplina_id, codigo),
  CHECK (0 < ancla_5 AND ancla_5 < ancla_7 AND ancla_7 < ancla_85 AND ancla_85 < elite)
);

INSERT INTO meta_test (disciplina_id, test_codigo, sexo, ancla_5, ancla_7, ancla_85, elite, fuente)
SELECT '00000000-0000-4000-8000-000000000001', t, s, a5, a7, a85, e, f FROM (VALUES
  ('salto_horizontal',   'M', 190, 210, 230, 260, 'Normas de adultos: excelente > 250 cm (hombres) y > 200 cm (mujeres); percentil 95 a los 18 años ≈ 257 / 201 cm (FitBack). Referencia del gimnasio.'),
  ('salto_horizontal',   'F', 150, 170, 190, 210, 'Normas de adultos: excelente > 200 cm en mujeres; percentil 95 a los 18 años ≈ 201 cm (FitBack).'),
  ('flexiones_despegue', 'M',  16,  21,  25,  32, 'Referencia del gimnasio; meta élite aproximada (no hay normas publicadas de flexiones con despegue).'),
  ('flexiones_despegue', 'F',   9,  13,  17,  24, 'Referencia del gimnasio ajustada a rama femenil; meta élite aproximada.'),
  ('sprint_costal',      'M',  28,  32,  36,  48, 'Velocidad de golpeo: élite ≈ 8 golpes por segundo o más (Top End Sports). Referencia del gimnasio.'),
  ('sprint_costal',      'F',  24,  28,  32,  42, 'Referencia del gimnasio ajustada a rama femenil; meta élite aproximada.'),
  ('cuadrantes',         'M',  20,  24,  28,  34, 'Referencia del gimnasio; meta élite aproximada.'),
  ('cuadrantes',         'F',  19,  23,  27,  32, 'Referencia del gimnasio ajustada a rama femenil; meta élite aproximada.'),
  ('dropoff',            'M',  77,  82,  87,  95, 'Referencia del gimnasio; meta élite aproximada (mantener casi todo el ritmo en el tercer asalto).'),
  ('dropoff',            'F',  77,  82,  87,  95, 'Referencia del gimnasio; meta élite aproximada.'),
  ('recuperacion_fc',    'M',  25,  33,  40,  55, 'Atletas de élite: mediana ≈ 26–29 lpm y percentil 95 ≈ 63 lpm de recuperación al minuto. Referencia del gimnasio.'),
  ('recuperacion_fc',    'F',  25,  33,  40,  55, 'Atletas de élite: mediana ≈ 26–29 lpm y percentil 95 ≈ 63 lpm de recuperación al minuto.')
) AS x(t, s, a5, a7, a85, e, f);

-- De valor real a calificación: tramos rectos entre anclas; debajo de inicial baja hasta 1; arriba de élite, 10.
CREATE FUNCTION calificar(valor numeric, a5 numeric, a7 numeric, a85 numeric, elite numeric) RETURNS numeric
LANGUAGE sql IMMUTABLE AS $$
  SELECT round(CASE
    WHEN valor IS NULL THEN NULL
    WHEN valor >= elite THEN 10
    WHEN valor >= a85 THEN 8.5 + 1.5 * (valor - a85) / (elite - a85)
    WHEN valor >= a7 THEN 7 + 1.5 * (valor - a7) / (a85 - a7)
    WHEN valor >= a5 THEN 5 + 2 * (valor - a5) / (a7 - a5)
    ELSE greatest(1, 1 + 4 * (valor - a5 / 2) / (a5 / 2))
  END, 1)
$$;

-- Calificación de cada test de cada evaluación (la rama sale del perfil del cliente; sin rama, varonil).
-- security_invoker: quien consulta sigue sujeto a las políticas por gimnasio.
CREATE VIEW calificacion_test WITH (security_invoker = true) AS
SELECT pt.sesion_id, pt.gimnasio_id, pt.clave, td.pilar_codigo AS pilar,
       calificar(pt.valor, m.ancla_5, m.ancla_7, m.ancla_85, m.elite) AS calificacion
FROM puntaje_test pt
JOIN sesion_evaluacion s ON s.id = pt.sesion_id
JOIN gimnasio g ON g.id = s.gimnasio_id
JOIN test_def td ON td.disciplina_id = g.disciplina_id AND td.codigo = pt.clave
LEFT JOIN perfil_cliente pc ON pc.cliente_id = s.cliente_id
JOIN meta_test m ON m.disciplina_id = g.disciplina_id AND m.test_codigo = pt.clave AND m.sexo = coalesce(pc.sexo, 'M');

-- Calificación por pilar: promedio ponderado de sus tests (pesos de la batería); Estrategia = Táctica y
-- Adaptabilidad (ya de 0 a 10). Solo cuando el pilar quedó completo en la evaluación.
CREATE VIEW calificacion_pilar WITH (security_invoker = true) AS
SELECT pp.sesion_id, pp.gimnasio_id, pp.pilar,
  CASE WHEN NOT pp.completo OR pp.indice IS NULL THEN NULL
       WHEN pp.pilar = 'estrategia' THEN (
         SELECT round(greatest(1, avg(pt.valor)), 1) FROM puntaje_test pt
         WHERE pt.sesion_id = pp.sesion_id AND pt.clave IN ('tactica', 'adaptabilidad') AND pt.valor IS NOT NULL)
       ELSE (
         SELECT round(sum(ct.calificacion * bt.peso_en_pilar) / nullif(sum(bt.peso_en_pilar), 0), 1)
         FROM calificacion_test ct
         JOIN sesion_evaluacion s ON s.id = ct.sesion_id
         JOIN bateria_test bt ON bt.bateria_id = s.bateria_id AND bt.test_codigo = ct.clave
         WHERE ct.sesion_id = pp.sesion_id AND ct.pilar = pp.pilar AND ct.calificacion IS NOT NULL)
  END AS calificacion
FROM puntaje_pilar pp;

GRANT SELECT ON meta_test TO app_gimnasio;
GRANT SELECT ON calificacion_test, calificacion_pilar TO app_gimnasio;

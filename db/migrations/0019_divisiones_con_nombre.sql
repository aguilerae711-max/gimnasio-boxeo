-- Divisiones con nombre: las 17 del boxeo profesional (CMB), de Paja a Pesado, con su límite en kg.
-- Se usan igual en la rama femenil y la varonil. Las de World Boxing (por kg) se quedan guardadas, pero ya no se usan.
INSERT INTO division_peso (disciplina_id, estandar, sexo, nombre, limite_kg, orden)
SELECT '00000000-0000-4000-8000-000000000001', 'profesional', s.sexo, d.nombre, d.limite, d.orden
FROM (VALUES ('F'), ('M')) AS s(sexo)
CROSS JOIN (VALUES
  ('Paja',          47.6,  1),
  ('Minimosca',     49.0,  2),
  ('Mosca',         50.8,  3),
  ('Supermosca',    52.2,  4),
  ('Gallo',         53.5,  5),
  ('Supergallo',    55.3,  6),
  ('Pluma',         57.2,  7),
  ('Superpluma',    59.0,  8),
  ('Ligero',        61.2,  9),
  ('Superligero',   63.5, 10),
  ('Welter',        66.7, 11),
  ('Superwelter',   69.9, 12),
  ('Mediano',       72.6, 13),
  ('Supermediano',  76.2, 14),
  ('Semipesado',    79.4, 15),
  ('Crucero',       90.7, 16),
  ('Pesado',        NULL, 17)
) AS d(nombre, limite, orden);

-- Las evaluaciones ya hechas toman el nombre nuevo según su peso y la rama del cliente.
UPDATE sesion_evaluacion se
SET division = (
  SELECT d.nombre FROM division_peso d
  WHERE d.estandar = 'profesional' AND d.sexo = pc.sexo AND (d.limite_kg IS NULL OR se.peso_kg <= d.limite_kg)
  ORDER BY d.orden LIMIT 1
)
FROM perfil_cliente pc
WHERE pc.cliente_id = se.cliente_id AND pc.sexo IS NOT NULL AND se.peso_kg IS NOT NULL;

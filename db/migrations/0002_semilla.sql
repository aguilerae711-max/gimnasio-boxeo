-- Datos iniciales del gimnasio piloto. Los usuarios se crean sin contraseña:
-- cada quien la define al activar su cuenta en la Fase 1.

INSERT INTO disciplina (id, codigo, nombre) VALUES
  ('00000000-0000-4000-8000-000000000001', 'boxeo', 'Boxeo');

INSERT INTO gimnasio (id, nombre, disciplina_id, pais, moneda, zona_horaria) VALUES
  ('00000000-0000-4000-8000-000000000101', 'Gimnasio de boxeo', '00000000-0000-4000-8000-000000000001', 'MX', 'MXN', 'America/Mexico_City');

INSERT INTO permiso (codigo, descripcion) VALUES
  ('sistema.administrar',   'Panel del sistema: gimnasios, cobros del servicio y métricas generales'),
  ('gimnasio.configurar',   'Días, franjas, planes, cuentas y funciones del gimnasio'),
  ('coach.aprobar',         'Aprobar coaches y asignarles turnos'),
  ('cliente.aprobar',       'Aprobar registros de clientes'),
  ('cliente.ver_todos',     'Ver todos los clientes del gimnasio'),
  ('cliente.ver_propios',   'Ver los clientes asignados'),
  ('pago.reportar',         'Reportar el pago de un cliente'),
  ('pago.confirmar',        'Confirmar pagos reportados'),
  ('comision.cambiar',      'Mover la comisión general o la de un coach'),
  ('comision.ver_propias',  'Ver sus propias comisiones'),
  ('finanzas.ver',          'Relación de ingresos y reportes'),
  ('evaluacion.realizar',   'Aplicar tests de evaluación (con PIN)'),
  ('evaluacion.ver_propios','Ver resultados por pilar de sus clientes'),
  ('plan.enviar',           'Enviar su plan de trabajo'),
  ('plan.aprobar',          'Aprobar planes de trabajo'),
  ('biblioteca.proponer',   'Proponer ejercicios (nombre y descripción)'),
  ('biblioteca.formalizar', 'Formalizar ejercicios y dar permisos'),
  ('novedades.publicar',    'Publicar novedades'),
  ('talentos.ver',          'Módulo de detección de talentos');

INSERT INTO rol (codigo, nombre, es_sistema) VALUES
  ('superadmin', 'Superadministrador', true),
  ('admin',      'Administración',     true),
  ('coach',      'Coach',              true),
  ('cliente',    'Cliente',            true);

INSERT INTO rol_permiso (rol_codigo, permiso_codigo)
SELECT 'superadmin', codigo FROM permiso;

INSERT INTO rol_permiso (rol_codigo, permiso_codigo)
SELECT 'admin', codigo FROM permiso WHERE codigo <> 'sistema.administrar';

INSERT INTO rol_permiso (rol_codigo, permiso_codigo) VALUES
  ('coach', 'cliente.ver_propios'),
  ('coach', 'pago.reportar'),
  ('coach', 'comision.ver_propias'),
  ('coach', 'evaluacion.ver_propios'),
  ('coach', 'plan.enviar'),
  ('coach', 'biblioteca.proponer');

INSERT INTO usuario (id, nombre, estado) VALUES
  ('00000000-0000-4000-8000-000000000201', 'Iván',  'pendiente'),
  ('00000000-0000-4000-8000-000000000202', 'Mike',  'pendiente'),
  ('00000000-0000-4000-8000-000000000203', 'Chato', 'pendiente');

INSERT INTO usuario_rol (usuario_id, rol_codigo, gimnasio_id) VALUES
  ('00000000-0000-4000-8000-000000000201', 'superadmin', NULL),
  ('00000000-0000-4000-8000-000000000201', 'admin', '00000000-0000-4000-8000-000000000101'),
  ('00000000-0000-4000-8000-000000000201', 'coach', '00000000-0000-4000-8000-000000000101'),
  ('00000000-0000-4000-8000-000000000202', 'coach', '00000000-0000-4000-8000-000000000101'),
  ('00000000-0000-4000-8000-000000000203', 'coach', '00000000-0000-4000-8000-000000000101');

SELECT set_config('app.gimnasio_id', '00000000-0000-4000-8000-000000000101', true);

INSERT INTO coach (gimnasio_id, usuario_id, apodo, estado) VALUES
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000201', 'Iván',  'aprobado'),
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000202', 'Mike',  'aprobado'),
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000203', 'Chato', 'aprobado');

INSERT INTO dia_operacion (gimnasio_id, dia_semana)
SELECT '00000000-0000-4000-8000-000000000101', d FROM generate_series(1, 5) AS d;

INSERT INTO franja_horaria (gimnasio_id, hora_inicio, hora_fin, orden)
SELECT '00000000-0000-4000-8000-000000000101',
       make_time(8 + 2 * i, 0, 0), make_time(10 + 2 * i, 0, 0), i + 1
FROM generate_series(0, 6) AS i;

INSERT INTO acuerdo_comision (id, gimnasio_id, coach_id, porcentaje_pb, vigente_desde, motivo, creado_por) VALUES
  (gen_random_uuid(), '00000000-0000-4000-8000-000000000101', NULL, 5000, DATE '2026-11-01',
   'Comisión inicial: 50% de cada pago confirmado', '00000000-0000-4000-8000-000000000201');

INSERT INTO funcion_gimnasio (gimnasio_id, funcion, activa) VALUES
  ('00000000-0000-4000-8000-000000000101', 'evaluadores_externos', false),
  ('00000000-0000-4000-8000-000000000101', 'talentos', false);

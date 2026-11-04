-- Entrar con un usuario corto (ej. admin1, ivan) además del correo. Cada persona tiene su cuenta y su contraseña.

ALTER TABLE usuario ADD COLUMN usuario citext CHECK (usuario IS NULL OR usuario ~ '^[a-z0-9][a-z0-9._-]{2,29}$');
CREATE UNIQUE INDEX usuario_usuario_unico ON usuario (usuario) WHERE eliminado_en IS NULL AND usuario IS NOT NULL;

-- intento_acceso.correo ahora guarda lo que se escribió para entrar (correo o usuario). No se renombra:
-- la versión anterior la sigue usando mientras se publica la nueva.

INSERT INTO permiso (codigo, descripcion) VALUES
  ('equipo.agregar', 'Dar de alta administradores y coaches');
INSERT INTO rol_permiso (rol_codigo, permiso_codigo) VALUES
  ('superadmin', 'equipo.agregar'), ('admin', 'equipo.agregar');

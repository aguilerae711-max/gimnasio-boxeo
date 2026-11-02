-- La app ya no usa al dueño de la base (que se salta RLS): usa app_gimnasio, que sí respeta
-- el aislamiento por gimnasio y no puede alterar la auditoría ni el esquema.
-- La contraseña y el permiso de entrar (LOGIN) los pone scripts/rol-app.mjs, fuera del código.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_gimnasio') THEN
    CREATE ROLE app_gimnasio NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO app_gimnasio;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_gimnasio;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_gimnasio;

-- La bitácora solo crece.
REVOKE UPDATE, DELETE, TRUNCATE ON auditoria FROM app_gimnasio;

-- El control de migraciones solo se lee (lo usa /api/salud).
DO $$
BEGIN
  IF to_regclass('public.schema_migraciones') IS NOT NULL THEN
    REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON schema_migraciones FROM app_gimnasio;
  END IF;
END $$;

-- Tablas futuras: mismos permisos de datos, sin cambios de esquema.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_gimnasio;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_gimnasio;

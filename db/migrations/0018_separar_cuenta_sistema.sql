-- La cuenta del sistema (superadministrador) queda independiente de cualquier administración.
-- Lo que hacía como administración y coach en una administración pasa a otra cuenta suya.
--
-- separar_cuenta_sistema(sistema, destino, gimnasio):
--   1. El destino debe ser una cuenta activa con rol de administración vigente en ese gimnasio.
--   2. Si la cuenta del sistema tiene un coach ahí, ese registro completo (clientes, turnos, planes,
--      comisiones, pagos, evaluaciones) pasa al destino tal cual: solo cambia de dueño, nada se copia ni se borra.
--      Si el destino ya tenía un coach vacío (sin nada que lo use), ese vacío se quita primero;
--      si el destino ya tenía un coach con datos, se detiene sin tocar nada.
--   3. Al sistema se le cierran sus roles de administración y coach en ese gimnasio (con fecha); el de
--      superadministrador se queda. El destino queda con administración y coach.
--   Todo queda en la auditoría.
CREATE FUNCTION separar_cuenta_sistema(sistema uuid, destino uuid, gim uuid) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  coach_sistema uuid;
  coach_destino uuid;
  r record;
  usos bigint;
  total_usos bigint := 0;
  movido boolean := false;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM usuario WHERE id = destino AND estado = 'activo' AND eliminado_en IS NULL) THEN
    RAISE EXCEPTION 'La cuenta destino no existe o no está activa.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM usuario_rol WHERE usuario_id = destino AND gimnasio_id = gim AND rol_codigo = 'admin' AND hasta IS NULL) THEN
    RAISE EXCEPTION 'La cuenta destino no es administración de ese gimnasio.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM usuario_rol WHERE usuario_id = sistema AND rol_codigo = 'superadmin' AND hasta IS NULL) THEN
    RAISE EXCEPTION 'La cuenta de origen no es la del sistema.';
  END IF;

  SELECT id INTO coach_sistema FROM coach WHERE gimnasio_id = gim AND usuario_id = sistema;
  SELECT id INTO coach_destino FROM coach WHERE gimnasio_id = gim AND usuario_id = destino;

  IF coach_sistema IS NOT NULL THEN
    IF coach_destino IS NOT NULL THEN
      -- ¿Algo usa el coach del destino? Se revisan todas las tablas que apuntan a coach.
      FOR r IN
        SELECT c.conrelid::regclass AS tabla, a.attname AS columna
        FROM pg_constraint c JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
        WHERE c.contype = 'f' AND c.confrelid = 'coach'::regclass
      LOOP
        EXECUTE format('SELECT count(*) FROM %s WHERE %I = $1', r.tabla, r.columna) INTO usos USING coach_destino;
        total_usos := total_usos + usos;
      END LOOP;
      IF total_usos > 0 THEN
        RAISE EXCEPTION 'La cuenta destino ya tiene un coach con datos (% registros); hay que unirlos a mano.', total_usos;
      END IF;
      DELETE FROM coach WHERE id = coach_destino;
    END IF;
    UPDATE coach SET usuario_id = destino WHERE id = coach_sistema;
    movido := true;
  END IF;

  -- El destino queda con coach vigente si ya tiene registro de coach.
  IF EXISTS (SELECT 1 FROM coach WHERE gimnasio_id = gim AND usuario_id = destino)
     AND NOT EXISTS (SELECT 1 FROM usuario_rol WHERE usuario_id = destino AND gimnasio_id = gim AND rol_codigo = 'coach' AND hasta IS NULL) THEN
    INSERT INTO usuario_rol (usuario_id, rol_codigo, gimnasio_id) VALUES (destino, 'coach', gim);
  END IF;

  UPDATE usuario_rol SET hasta = now()
  WHERE usuario_id = sistema AND gimnasio_id = gim AND rol_codigo IN ('admin', 'coach') AND hasta IS NULL;

  INSERT INTO auditoria (gimnasio_id, usuario_id, accion, entidad, entidad_id, antes, despues, motivo)
  VALUES (gim, sistema, 'sistema.cuenta_separada', 'usuario', destino::text,
          jsonb_build_object('cuenta_sistema', sistema, 'coach', coach_sistema),
          jsonb_build_object('cuenta_administracion', destino, 'coach_movido', movido),
          'La cuenta del sistema queda independiente; administración y coach pasan a la cuenta de la administración.');
  RETURN CASE WHEN movido THEN 'separada; el coach pasó a la cuenta de la administración' ELSE 'separada; no había coach que mover' END;
END $$;

-- Se ejecuta desde el panel del sistema («Separar mi cuenta»), dentro de la transacción del gimnasio.
GRANT EXECUTE ON FUNCTION separar_cuenta_sistema(uuid, uuid, uuid) TO app_gimnasio;

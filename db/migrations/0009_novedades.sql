-- Fase 6: novedades. Publicaciones con audiencia, eventos con cupo e inscripción, y menciones para felicitar.

CREATE TABLE publicacion (
  id                    uuid PRIMARY KEY,
  gimnasio_id           uuid NOT NULL REFERENCES gimnasio(id),
  tipo                  text NOT NULL CHECK (tipo IN ('anuncio', 'evento', 'sparring', 'felicitacion', 'pelea', 'reunion', 'dia_prueba')),
  titulo                text NOT NULL CHECK (length(titulo) BETWEEN 3 AND 100),
  cuerpo                text NOT NULL DEFAULT '' CHECK (length(cuerpo) <= 2000),
  audiencia             text NOT NULL CHECK (audiencia IN ('todos', 'coaches', 'clientes', 'publico')),
  fijada                boolean NOT NULL DEFAULT false,
  inicio                timestamptz,
  fin                   timestamptz,
  lugar                 text,
  cupo                  smallint CHECK (cupo IS NULL OR cupo BETWEEN 1 AND 500),
  requiere_inscripcion  boolean NOT NULL DEFAULT false,
  autor_id              uuid NOT NULL REFERENCES usuario(id),
  publicada_en          timestamptz NOT NULL DEFAULT now(),
  expira_en             timestamptz,
  archivada_en          timestamptz,
  CHECK (fin IS NULL OR inicio IS NULL OR fin > inicio)
);
CREATE INDEX publicacion_vigente ON publicacion (gimnasio_id, publicada_en DESC) WHERE archivada_en IS NULL;

CREATE TABLE mencion (
  publicacion_id  uuid NOT NULL REFERENCES publicacion(id),
  gimnasio_id     uuid NOT NULL REFERENCES gimnasio(id),
  cliente_id      uuid NOT NULL REFERENCES cliente(id),
  PRIMARY KEY (publicacion_id, cliente_id)
);

CREATE TABLE inscripcion_evento (
  publicacion_id  uuid NOT NULL REFERENCES publicacion(id),
  gimnasio_id     uuid NOT NULL REFERENCES gimnasio(id),
  usuario_id      uuid NOT NULL REFERENCES usuario(id),
  inscrito_en     timestamptz NOT NULL DEFAULT now(),
  cancelada_en    timestamptz,
  PRIMARY KEY (publicacion_id, usuario_id)
);

-- Para el aviso de "novedades sin ver" en el menú.
ALTER TABLE usuario ADD COLUMN novedades_vistas_en timestamptz;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['publicacion', 'mencion', 'inscripcion_evento'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY por_gimnasio ON %I USING (gimnasio_id = gimnasio_actual()) WITH CHECK (gimnasio_id = gimnasio_actual())', t);
  END LOOP;
END $$;

-- Las publicaciones se archivan, no se borran.
REVOKE DELETE ON publicacion FROM app_gimnasio;

-- Portada: lo público vigente, sin datos personales.
CREATE FUNCTION novedades_publicas(p_gimnasio uuid)
RETURNS TABLE (id uuid, tipo text, titulo text, cuerpo text, inicio timestamptz, fin timestamptz, lugar text, fijada boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, tipo, titulo, cuerpo, inicio, fin, lugar, fijada FROM publicacion
  WHERE gimnasio_id = p_gimnasio AND audiencia = 'publico' AND archivada_en IS NULL
    AND (expira_en IS NULL OR expira_en > now())
    AND (coalesce(fin, inicio + interval '1 day') IS NULL OR coalesce(fin, inicio + interval '1 day') > now())
  ORDER BY fijada DESC, publicada_en DESC LIMIT 5
$$;

-- Reiniciar el punto de partida de un cliente (regreso tras lesión o varios meses) y solicitudes de clase de prueba.

-- Al reiniciar, la siguiente evaluación vuelve a ser la inicial (vale 100). El historial anterior se conserva.
CREATE TABLE reinicio_linea_base (
  id           uuid PRIMARY KEY,
  gimnasio_id  uuid NOT NULL REFERENCES gimnasio(id),
  cliente_id   uuid NOT NULL REFERENCES cliente(id),
  en           timestamptz NOT NULL DEFAULT now(),
  motivo       text NOT NULL CHECK (length(trim(motivo)) > 0),
  por          uuid NOT NULL REFERENCES usuario(id)
);
CREATE INDEX reinicio_por_cliente ON reinicio_linea_base (cliente_id, en DESC);

-- Visitantes de la portada que piden una clase de prueba. Solo nombre, WhatsApp y su horario preferido.
CREATE TABLE solicitud_prueba (
  id            uuid PRIMARY KEY,
  gimnasio_id   uuid NOT NULL REFERENCES gimnasio(id),
  nombre        text NOT NULL CHECK (length(nombre) BETWEEN 2 AND 80),
  telefono      text NOT NULL CHECK (telefono ~ '^\d{10,13}$'),
  franja_id     uuid REFERENCES franja_horaria(id),
  comentario    text CHECK (length(comentario) <= 300),
  estado        text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'contactado', 'descartado')),
  atendida_por  uuid REFERENCES usuario(id),
  atendida_en   timestamptz,
  creada_en     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX solicitud_pendiente ON solicitud_prueba (gimnasio_id, creada_en DESC) WHERE estado = 'pendiente';

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['reinicio_linea_base', 'solicitud_prueba'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY por_gimnasio ON %I USING (gimnasio_id = gimnasio_actual()) WITH CHECK (gimnasio_id = gimnasio_actual())', t);
  END LOOP;
END $$;

REVOKE DELETE ON reinicio_linea_base FROM app_gimnasio;

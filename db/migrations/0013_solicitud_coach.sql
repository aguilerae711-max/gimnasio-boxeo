-- Quien quiere dar clases aplica desde la portada; la administración revisa y, si lo aprueba,
-- lo da de alta como coach con su propio usuario y enlace de activación.
CREATE TABLE solicitud_coach (
  id              uuid PRIMARY KEY,
  gimnasio_id     uuid NOT NULL REFERENCES gimnasio(id),
  nombre          text NOT NULL CHECK (length(nombre) BETWEEN 2 AND 80),
  telefono        text NOT NULL CHECK (telefono ~ '^\d{10,13}$'),
  experiencia     text NOT NULL CHECK (length(trim(experiencia)) BETWEEN 1 AND 600),
  disponibilidad  text CHECK (length(disponibilidad) <= 200),
  estado          text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada', 'descartada')),
  usuario_id      uuid REFERENCES usuario(id),
  atendida_por    uuid REFERENCES usuario(id),
  atendida_en     timestamptz,
  creada_en       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX solicitud_coach_pendiente ON solicitud_coach (gimnasio_id, creada_en) WHERE estado = 'pendiente';

ALTER TABLE solicitud_coach ENABLE ROW LEVEL SECURITY;
CREATE POLICY por_gimnasio ON solicitud_coach USING (gimnasio_id = gimnasio_actual()) WITH CHECK (gimnasio_id = gimnasio_actual());
REVOKE DELETE ON solicitud_coach FROM app_gimnasio;

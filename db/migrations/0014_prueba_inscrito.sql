-- Después de su clase de prueba, la persona puede quedar inscrita (o no quedarse).
-- pendiente → contactado (agendada) → inscrito | descartado.
ALTER TABLE solicitud_prueba DROP CONSTRAINT solicitud_prueba_estado_check;
ALTER TABLE solicitud_prueba ADD CONSTRAINT solicitud_prueba_estado_check CHECK (estado IN ('pendiente', 'contactado', 'inscrito', 'descartado'));
CREATE INDEX solicitud_agendada ON solicitud_prueba (gimnasio_id, atendida_en) WHERE estado = 'contactado';

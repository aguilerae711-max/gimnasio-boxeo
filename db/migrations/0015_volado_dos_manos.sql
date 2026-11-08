-- El volado se tira con cualquiera de las dos manos.
ALTER TABLE golpe DROP CONSTRAINT golpe_mano_check;
ALTER TABLE golpe ADD CONSTRAINT golpe_mano_check CHECK (mano IN ('adelante', 'atras', 'ambas', 'combinacion'));
UPDATE golpe SET mano = 'ambas',
  descripcion = 'Golpe en arco por arriba que cae sobre la guardia del rival; se tira con la mano de adelante o con la de atrás.'
WHERE disciplina_id = '00000000-0000-4000-8000-000000000001' AND codigo = 'V';

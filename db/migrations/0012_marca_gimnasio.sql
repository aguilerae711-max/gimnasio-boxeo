-- Cada gimnasio cliente del sistema tiene su propia marca en la portada y en la app:
-- nombre, eslogan, una frase que lo acompaña y su logotipo (archivo en /public/marca).
ALTER TABLE gimnasio
  ADD COLUMN eslogan text CHECK (char_length(eslogan) BETWEEN 1 AND 80),
  ADD COLUMN lema    text CHECK (char_length(lema) BETWEEN 1 AND 200),
  ADD COLUMN logo    text CHECK (logo ~ '^/marca/[a-z0-9-]+\.(png|jpg|webp|svg)$');

-- Gimnasio piloto.
UPDATE gimnasio
SET nombre  = 'Diamante Boxing Club',
    eslogan = 'Forjado bajo presión',
    lema    = 'Mira tu progreso en tu proceso de transformación a un diamante.',
    logo    = '/marca/diamante-boxing-club.png'
WHERE id = '00000000-0000-4000-8000-000000000101';

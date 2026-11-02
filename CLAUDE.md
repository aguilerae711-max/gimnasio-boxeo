# Gimnasio de boxeo

Ver README.md para arquitectura y comandos. Idioma del código, textos y commits: español.

## Versionado (obligatorio desde v0.2.0)

Todo cambio que llegue a producción queda versionado. Al terminar un cambio:

1. Sube la versión en `package.json` (y `npm i --package-lock-only`): Z para arreglos, Y para funciones nuevas o una fase, X solo para cambios mayores.
2. Agrega su sección `## [X.Y.Z] - AAAA-MM-DD` arriba en `CHANGELOG.md` (Agregado / Cambiado / Corregido), en palabras del usuario.
3. Commit con el cambio y la versión, luego `git tag -a vX.Y.Z -m "<resumen>"`.
4. Publica solo con `npm run publicar` (pide confirmación al usuario antes: toca producción). Nunca con `gcloud run deploy` directo.

Cambios de base de datos: siempre una migración nueva en `db/migrations/` (nunca editar una ya aplicada en Neon).
Para regresar a una versión anterior: `gcloud run services update-traffic gimnasio-boxeo --to-revisions=gimnasio-boxeo-vX-Y-Z=100`.

## Seguridad

- La app usa el usuario `app_gimnasio` (RLS). Toda consulta a tablas con `gimnasio_id` va dentro de `enGimnasio(...)`.
- Las pruebas de `db/` corren como `app_gimnasio`: si una consulta olvida fijar el gimnasio, falla ahí.
- Datos sensibles nuevos: cifrarlos con el puerto `Cifrador`; nunca guardarlos ni auditarlos en claro.
- Nunca reemplazar ni destruir el secreto `clave-datos`.

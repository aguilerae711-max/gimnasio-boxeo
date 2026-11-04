# Gimnasio de boxeo

App de gestión para gimnasios de boxeo (replicable a otras disciplinas): roles, horario, pagos y comisiones,
evaluación por pilares, biblioteca, novedades y talentos. El plan completo está en
[docs/Plan_Sistema_Gimnasio.pdf](docs/Plan_Sistema_Gimnasio.pdf) y el prototipo de pantallas en `docs/prototipo/`.

## Arquitectura

Arquitectura limpia por módulos (contextos del plan). La regla de dependencia la revisa ESLint.

```
src/
  shared/
    domain/          Valores comunes: Fecha, Dinero (centavos), Porcentaje, errores
    application/     Puertos comunes: Autorizacion, Auditoria, Reloj, GeneradorDeIds
    infrastructure/  Conexión a Postgres (Neon)
  modules/<módulo>/
    domain/          Entidades y reglas, sin dependencias externas
    application/     Casos de uso y sus puertos
    infrastructure/  Implementaciones (repositorios)
  app/               Next.js: pantallas y API (capa de frameworks)
db/migrations/       SQL versionado, aplicado en orden
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | App local en http://localhost:3000 |
| `npm test` | Pruebas (dominio, casos de uso y migraciones con Postgres embebido) |
| `npm run lint` / `npm run typecheck` | Calidad y tipos |
| `npm run db:migrate` | Aplica migraciones pendientes a Neon (usa `.env.local`) |
| `npm run acceso:enlace -- "Iván"` | Enlace de un solo uso (72 h) para activar una cuenta o cambiar la contraseña |
| `npm run db:local` | Postgres en memoria con las migraciones, para probar sin tocar Neon |
| `npm run seguridad:configurar` | Una vez: usuario de la app con RLS, clave de cifrado y respaldo nocturno en producción |
| `npm run publicar` | Publica la versión de `package.json` (ver Versiones) |

Para probar la app completa sin Neon: `npm run db:local` en una terminal y en otra
`DATABASE_URL=postgres://postgres@127.0.0.1:55433/postgres DATABASE_POOL_MAX=1 CLAVE_DATOS=<32 bytes en base64> npm run dev`.

`.env.local` lo genera `neon env pull` y nunca se sube a Git.

## Acceso

- Contraseñas con Argon2id; sesiones en cookie `httpOnly` (30 días) guardadas como huella SHA-256.
- 5 intentos fallidos en 15 minutos frenan el acceso de ese correo.
- Coaches y administración entran con un **enlace de activación** que genera la administración (o el script, la primera vez).
- Se entra con **correo o usuario corto**; cada persona tiene su cuenta (no hay cuentas compartidas). La administración da de alta al equipo desde Administración → Equipo.
- Clientes se registran con la **invitación de su coach** y quedan pendientes hasta que la administración los aprueba.

## Seguridad y respaldos

- **Usuario de la app**: Cloud Run entra como `app_gimnasio` (secreto `database-url-app`), sin permiso para saltarse RLS,
  borrar la auditoría ni cambiar el esquema. Las migraciones usan al dueño desde `.env.local`.
- **Datos sensibles** (contacto de emergencia y notas médicas) se cifran en la app con AES-256-GCM. La clave está en
  Secret Manager (`clave-datos`, versión 1). **No la borres ni la reemplaces**: sin ella esos datos no se pueden leer.
- **Respaldo nocturno**: Cloud Run Job `respaldo-nocturno`, cada día a las 3:00 (Ciudad de México), guarda
  `gs://gimnasio-boxeo-1656-respaldos/neon/gimnasio_AAAA-MM-DD_HHMM.sql.gz` por 90 días (más 30 de borrado suave).
  Neon además permite volver la base a cualquier momento reciente (restauración instantánea).

Restaurar un respaldo en una rama nueva de Neon (nunca directo sobre producción):

```bash
gcloud storage cp gs://gimnasio-boxeo-1656-respaldos/neon/<archivo>.sql.gz .
gunzip -c <archivo>.sql.gz | psql "<cadena de conexión de la rama nueva>"
```

## Infraestructura (etapa de prueba)

- **App:** Google Cloud Run, proyecto `gimnasio-boxeo-1656`, región `us-central1`.
- **Base de datos:** Neon Postgres, rama `production`. La cadena de conexión vive en Secret Manager (`database-url`).
- **Archivos y respaldos:** Cloud Storage (`gimnasio-boxeo-1656-archivos`, `gimnasio-boxeo-1656-respaldos`).
- **Alerta de presupuesto:** 100 MXN al mes.

## Versiones

Cada cambio publicado tiene número (`package.json`), entrada en [CHANGELOG.md](CHANGELOG.md), etiqueta `vX.Y.Z`
en Git y revisión `gimnasio-boxeo-vX-Y-Z` en Cloud Run. Para publicar:

```bash
npm run publicar
```

El script se niega si hay cambios sin commit, si falta la entrada del CHANGELOG o la etiqueta, o si fallan las pruebas.
Para volver a una versión anterior basta mover el tráfico a su revisión (sin reconstruir):

```bash
gcloud run services update-traffic gimnasio-boxeo --to-revisions=gimnasio-boxeo-v0-2-1=100 --project=gimnasio-boxeo-1656 --region=us-central1
```

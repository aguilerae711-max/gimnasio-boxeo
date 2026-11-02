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

`.env.local` lo genera `neon env pull` y nunca se sube a Git.

## Infraestructura (etapa de prueba)

- **App:** Google Cloud Run, proyecto `gimnasio-boxeo-1656`, región `us-central1`.
- **Base de datos:** Neon Postgres, rama `production`. La cadena de conexión vive en Secret Manager (`database-url`).
- **Archivos y respaldos:** Cloud Storage (`gimnasio-boxeo-1656-archivos`, `gimnasio-boxeo-1656-respaldos`).
- **Alerta de presupuesto:** 100 MXN al mes.

Publicar una versión nueva:

```bash
gcloud run deploy gimnasio-boxeo --source . --project=gimnasio-boxeo-1656 --region=us-central1
```

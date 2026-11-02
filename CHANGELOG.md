# Cambios

Cada versión publicada queda aquí, con su etiqueta en Git (`vX.Y.Z`) y su revisión en Cloud Run
(`gimnasio-boxeo-vX-Y-Z`). Numeración: **X.Y.Z**

- **Z** (corrección): arreglos y ajustes de texto o diseño, sin funciones nuevas.
- **Y** (función): algo nuevo que se puede usar, o una fase del plan.
- **X** (mayor): cambios que obligan a todos a cambiar su forma de usar la app. `1.0.0` será el piloto en uso real.

## [0.2.1] - 2026-11-02

### Agregado
- Versión visible en la portada, en Ayuda y en `/api/salud`.
- `npm run publicar`: revisa, aplica migraciones, publica con la versión en el nombre de la revisión y sube la etiqueta a GitHub.
- Este registro de cambios.

### Cambiado
- El script de enlaces encuentra el nombre sin importar acentos (`ivan` encuentra a Iván).

## [0.2.0] - 2026-11-01 · Fase 1

### Agregado
- Entrar con correo y contraseña (Argon2id); freno tras 5 intentos fallidos en 15 minutos.
- Enlaces de un solo uso (72 h) para activar cuenta o cambiar contraseña.
- Registro de clientes con la invitación de su coach, aceptación del reglamento y aprobación de la administración.
- Pantalla de Comisiones: mover la general o la de un coach, cambios programados e historial.
- Pantallas por rol (administración, coach, cliente) y bienvenida con instructivo en Ayuda.
- Migración `0003_acceso`.

## [0.1.0] - 2026-11-01 · Fase 0

### Agregado
- Base del sistema con arquitectura limpia, migraciones `0001_base` y `0002_semilla` (MX, MXN, lunes a viernes 8–22, coaches Iván, Mike y Chato, comisión 50%).
- Reglas de comisión movible, no retroactiva y auditada.
- Despliegue en Cloud Run conectado a Neon; ruta `/api/salud`.

# Cambios

Cada versión publicada queda aquí, con su etiqueta en Git (`vX.Y.Z`) y su revisión en Cloud Run
(`gimnasio-boxeo-vX-Y-Z`). Numeración: **X.Y.Z**

- **Z** (corrección): arreglos y ajustes de texto o diseño, sin funciones nuevas.
- **Y** (función): algo nuevo que se puede usar, o una fase del plan.
- **X** (mayor): cambios que obligan a todos a cambiar su forma de usar la app. `1.0.0` será el piloto en uso real.

## [0.3.0] - 2026-11-02 · Seguridad y Fase 2 (Operación)

### Agregado
- **Horario**: la administración asigna coaches a cada día y franja; varios coaches por turno, cupo opcional, historial al quitar.
- **Ficha del cliente**: cambiar su coach y franja con motivo (con ayuda de qué coaches dan cada franja), ver y corregir su perfil, historial de coaches.
- **Mis turnos** (coach): turnos de la semana con sus clientes, el de hoy marcado, y contacto de emergencia y notas médicas de sus clientes.
- **Mi estado** (cliente): coach, días y horario de entrenamiento.
- **Mi perfil**: el cliente registra fecha de nacimiento, contacto de emergencia y notas médicas (cifradas con AES-256-GCM); el coach, su especialidad y presentación.
- **Portada pública** con el horario real y los coaches.
- **Respaldo nocturno**: copia completa de la base cada día a las 3:00 a Cloud Storage, conservada 90 días.
- Guías nuevas en Ayuda para horario, ficha del cliente, turnos y perfil.

### Seguridad
- La app entra a la base con su propio usuario (`app_gimnasio`), que respeta el aislamiento por gimnasio y no puede borrar la auditoría ni cambiar el esquema. Antes usaba al dueño de la base, que se salta esas reglas.
- `npm run seguridad:configurar` prepara todo en producción; `npm run publicar` se niega si falta.
- Después de publicar se comprueba que la app responda con la versión nueva; si no, indica cómo regresar a la anterior.

### Corregido
- Los clientes nuevos quedan con su primera entrada en el historial de coach.

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

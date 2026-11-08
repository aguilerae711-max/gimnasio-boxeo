# Cambios

Cada versión publicada queda aquí, con su etiqueta en Git (`vX.Y.Z`) y su revisión en Cloud Run
(`gimnasio-boxeo-vX-Y-Z`). Numeración: **X.Y.Z**

- **Z** (corrección): arreglos y ajustes de texto o diseño, sin funciones nuevas.
- **Y** (función): algo nuevo que se puede usar, o una fase del plan.
- **X** (mayor): cambios que obligan a todos a cambiar su forma de usar la app. `1.0.0` será el piloto en uso real.

## [0.15.0] - 2026-11-07 · Vencimientos, seguimiento, peso y golpes ilustrados

### Agregado

- **Por vencer (coach):** en su Hoy ve a sus clientes que vencen en los próximos 7 días (o se les venció hace poco) con un botón de WhatsApp con el mensaje listo; en Mis clientes ve los días pagados de cada uno.
- **Aviso al cliente:** el día anterior y el día que vence, y si ya venció, su pantalla Hoy se lo dice arriba.
- **Dinero → Seguimiento:** al corriente, por vencer (7 días), vencidas, cuántos renovaron este mes y quién dejó de pagar, con WhatsApp para avisar a cada uno.
- **Después de su prueba:** a quien ya se le agendó la clase de prueba se le manda la inscripción por WhatsApp y se marca «Ya se inscribió» o «No se quedó».
- **Para felicitar:** en Hoy aparecen los clientes con un avance de peso notable en el último mes; «Felicitar» abre Novedades con la felicitación lista para revisar.
- **Golpes ilustrados:** cada golpe de la biblioteca tiene un dibujo de su trayectoria; el volado se tira con cualquiera de las dos manos.

### Cambiado

- El peso va primero: en Hoy del cliente, con el cambio desde su inicio y su gráfica; en Mi progreso, antes que los pilares.
- Equipo en orden: Administración, Coaches, Clientes y Agregar.
- La cuota del servicio se programa solo desde el panel del sistema; la administración ya no la ve.
- Se quitaron las combinaciones de la biblioteca.

## [0.14.0] - 2026-11-07 · Orden por rol, secciones desplegables y cliente visual

### Agregado

- **Menú por rol:** arriba eliges «Administro · Doy clases · Entreno» y abajo va el menú corto de ese rol; las opciones con varias pantallas tienen subpestañas. Tu nombre, arriba a la derecha, abre Mi cuenta, Ayuda y Salir.
- **Hoy (administración):** solo lo pendiente, cada cosa desplegable con su número: registros, pagos por confirmar, clases de prueba, quieren ser coach, planes por revisar y membresías por vencer. Si no hay nada, dice «Todo al día».
- **Personas → Equipo:** clientes agrupados por coach, Administración y Coaches en secciones desplegables; la cuenta del sistema ya no aparece en el equipo.
- **Hoy (coach):** su turno de hoy con la rutina y los clientes; abajo, sus turnos de la semana, sus clientes e invitar.
- **Hoy (cliente):** anillo con los días pagados que le quedan, su coach y horario, la rutina del día, el calendario del mes con lo pagado y cuándo vence, y un resumen de su progreso.
- **Mi progreso (cliente):** gráfica de sus pilares mes a mes, su última evaluación, su peso con gráfica y el historial.

### Cambiado

- Todas las pantallas usan secciones desplegables: la más usada abierta, las demás cerradas.
- Botones, tipografía y tarjetas más finos; logotipo y nombre del gimnasio más pequeños en el encabezado.
- Mi perfil ahora se llama Mi cuenta.

## [0.13.0] - 2026-11-07 · También doy clases

### Agregado

- **También doy clases** (Mi perfil): quien administra el gimnasio se suma como coach con su misma cuenta. Tiene el grupo Coach en el menú y su código para invitar clientes. Así la cuenta del sistema queda independiente y la de la administración hace las dos cosas.

## [0.12.0] - 2026-11-07 · Administración del sistema: árbol de administraciones y Ver como

### Agregado
- **Árbol del sistema**: Administración del sistema (tú) → Administración 1, 2… → sus coaches (1.1, 1.2…) → los clientes de cada coach (1.1.1, 1.1.2…). Cada administración tiene su página con su marca, sus cifras, su estructura y su actividad.
- **Ver como** en cualquier nodo del árbol: abre la app exactamente como la ve esa persona (panel de administración, coach o cliente), con la marca de su administración. Es **solo lectura**: nada se guarda, dura 2 horas, se termina con «Terminar vista» (regresa a esa administración) y queda en la auditoría.
- **Entrar a su panel**: el superadministrador entra al panel de una administración desde su página, con una franja para regresar a la Administración del sistema.
- En la Administración del sistema: **actividad reciente**, **salud del sistema** y la lista de **próximos controles**.

### Cambiado
- La Administración del sistema ya no está atada a ninguna administración: encabezado y colores neutros propios, sin logotipo ni menú de Diamante. Al entrar con la cuenta de superadministrador se llega ahí directo.
- Tu cuenta es la del sistema: no aparece como coach en el árbol ni cuenta en los indicadores.
- Diseño más profesional del panel: indicadores, tabla numerada de administraciones y secciones con descripción.

## [0.11.1] - 2026-11-04 · Manuales y textos de ayuda

### Agregado
- **Manual de uso** por interfaz con su alcance (`docs/Manual_de_uso.pdf`) e **Informe de ingeniería de software** con los fundamentos teóricos (`docs/Informe_de_ingenieria.pdf`).

### Corregido
- Ayuda de Administración: ya no menciona la cuenta con el sistema en el cuadre (solo la ve el superadministrador).
- Ayuda y perfil del coach: la especialidad ya no aparece en la portada; la activación de cuenta menciona el usuario corto.

## [0.11.0] - 2026-11-04 · Portada nueva, quiero ser coach y panel del sistema

### Agregado
- **Panel del sistema** (menú Sistema), solo para el superadministrador: gimnasios, clientes activos, coaches, ingresos del mes y cuota del servicio de cada uno.
- **Quiero ser coach** desde la portada: quien quiere dar clases deja su experiencia y disponibilidad y ve “¡Gracias por aplicar como coach!”. En Administración aparece en **Quieren ser coach**, con WhatsApp, **Aprobar como coach** (lo da de alta y muestra su enlace de activación) o **Descartar**.
- **Registrarme como cliente** pregunta primero “¿Ya entrenas aquí?”: si sí, elige a su coach; si no, lo lleva a pedir su clase de prueba.

### Cambiado
- Portada: logotipo más chico, nombre y eslogan del gimnasio en letras góticas, y botones de Entrar, Registrarme como cliente y Quiero ser coach. La clase de prueba es un botón discreto que despliega el formulario.
- La portada ya no muestra a los coaches.
- El nombre del gimnasio en el encabezado de la app también va en letras góticas.

## [0.10.0] - 2026-11-04 · Diamante Boxing Club

### Agregado
- **Marca de cada gimnasio**: nombre, eslogan, frase y logotipo propios en la portada, el encabezado, la pestaña del navegador y las pantallas de entrar y registrarse. El gimnasio piloto queda como **Diamante Boxing Club** · “Forjado bajo presión”.
- **También entreno aquí** (Mi perfil): quien es de la administración o coach se inscribe como cliente con su mismo usuario y tiene el grupo Cliente en el menú. La administración queda activa de una vez; un coach queda por aprobar.
- **Ver como lo ve el cliente** (ficha del cliente): muestra su Mi estado tal cual, solo para revisar.

### Cambiado
- La portada ya no muestra todos los horarios ni el texto genérico: logotipo, eslogan, la clase de prueba, novedades y coaches.
- El cuadre **Con el sistema** (cuota del servicio) solo lo ve el superadministrador; la administración del gimnasio ve solo el cuadre con sus coaches.

## [0.9.0] - 2026-11-04 · Rutina de hoy, menú agrupado, reinicio y clase de prueba

### Agregado
- **Rutina de hoy para el cliente** (Mi estado): los días que entrena ve la rutina que publicó su coach; si hoy no le toca, le dice cuál es su siguiente día.
- **Clase de prueba desde la portada**: nombre, WhatsApp, horario preferido y un comentario, con permiso explícito para escribirle. Un mismo teléfono no se duplica en 24 horas y hay una trampa contra robots.
- **Clases de prueba por agendar** (Administración): botón de WhatsApp con el mensaje listo, y “Ya la agendé” o “Descartar”.
- **Reiniciar punto de partida** (ficha del cliente): para quien regresa tras 3 meses o más, o de una lesión. Pide motivo; su siguiente evaluación vuelve a ser la inicial (vale 100) y las anteriores se conservan.

### Cambiado
- **Menú agrupado** en Gimnasio, Coach y Cliente: arriba los grupos, abajo las opciones del grupo en el que estás. Quien solo tiene un rol ve su menú de siempre.

## [0.8.0] - 2026-11-03 · Usuarios cortos y alta de equipo

### Agregado
- **Entrar con correo o usuario corto** (ej. ivan, admin2). Cada persona tiene su propia cuenta y contraseña, en lugar de una cuenta general compartida: así la auditoría sabe quién hizo cada cosa y el freno de intentos es por persona.
- Al activar la cuenta (o cambiar la contraseña) se puede elegir usuario; el correo pasa a ser opcional si hay usuario.
- **Agregar al equipo** (Administración → Equipo): alta de administración o coach con su usuario; aparece de una vez su enlace de activación para mandarlo por WhatsApp. Un coach nuevo queda aprobado con su enlace de invitación para clientes.
- **Mi perfil → Cómo entras**: cada quien puede ponerse o cambiar su usuario. Mi perfil ahora está en el menú de todos.

### Cambiado
- El mensaje al fallar la entrada dice “Usuario o contraseña incorrectos.”

## [0.7.0] - 2026-11-03 · Fase 6 (Novedades)

### Agregado
- **Novedades**: anuncios, eventos, sparrings, felicitaciones, peleas, reuniones y días de prueba, para todos, solo coaches, solo clientes o público.
- **Eventos con fecha, lugar, cupo e inscripción**: el cliente o coach se inscribe mientras haya lugares y puede cancelar antes de que empiece; la administración ve quiénes se inscribieron.
- **Felicitaciones** mencionando clientes: a quien mencionan le aparece destacada.
- Fijar arriba, fecha para dejar de mostrarse y archivar; los eventos se ocultan solos cuando terminan.
- **Aviso en el menú** con el número de novedades sin ver.
- **Portada**: las novedades públicas aparecen arriba del horario (nunca con datos de clientes).
- Guías nuevas en Ayuda para publicar y leer novedades.

## [0.6.0] - 2026-11-03 · Fase 5 (Biblioteca y planes de trabajo)

### Agregado
- **Glosario**: los 11 golpes con su número oficial, nombres alternos y mano (incluido el volado), y traductor de combinaciones: “1-2-3c” muestra el nombre de cada golpe.
- **Biblioteca de ejercicios**: los 6 básicos (manopleo, gobernadora, perillas, costal, sombra, cuerda) con sus nombres alternos; el coach propone ejercicios con nombre y descripción y los usa de inmediato; la app avisa si se parecen a uno existente (también contra el glosario).
- **Formalizar o fusionar** (administración): nombre oficial, ejecución, errores comunes, nivel, nombres alternos y quién lo ve; al fusionar, el nombre queda como alterno y las rutinas se actualizan solas.
- **Acceso a la biblioteca compartida** por coach; los básicos y sus propios ejercicios siempre los ve.
- **Rutinas**: el coach arma lo que hará en un turno de 2 horas, por bloques (calentamiento, técnica, implementos...) con minutos, rounds y ejercicios o combinaciones; no puede pasar de 120 minutos.
- **Mi plan** (coach): una rutina para cada uno de sus turnos del mes; se envía a la administración. Plan fijo: desde el día 25 se puede mantener para el mes siguiente con un toque y queda aprobado.
- **Planes** (administración): estado de cada coach; al revisar solo se ven los turnos que cambiaron contra el mes anterior; aprobar o pedir cambios con comentario. Mientras un plan nuevo está en revisión sigue vigente el último aprobado.
- **Mis turnos** muestra la rutina que toca en cada turno.
- Guías nuevas en Ayuda para rutinas, plan, biblioteca y revisión de planes.

## [0.5.0] - 2026-11-03 · Fase 4 (Evaluación por pilares)

### Agregado
- **Batería núcleo v1** del plan: sprint en costal, cuadrantes, salto horizontal, flexiones con despegue, escenarios de estrategia A y B (rúbrica de 10 conductas), drop-off y recuperación cardíaca. Pilares, tests, rúbrica y pesos son configuración en la base, no código.
- **Modo evaluación** (solo administración, con PIN): check-in (con lesión o dolor no se evalúa y se reprograma), pesaje del día con su división, tests en orden con protocolo, cronómetro y contador táctil, y rúbrica 0-1-2 con el compañero de sparring.
- **Índices** contra la evaluación inicial de cada cliente (= 100), con tope de 150; Estrategia = Táctica 50% + Adaptabilidad 50%. Alerta si un test cambia más de 40% contra el mes anterior. Si falta un test obligatorio, ese pilar no se publica.
- **Parcial**: sin compañero de sparring se publican los otros pilares y Estrategia se completa otro día del mes.
- Una evaluación por cliente y mes; para repetirla se anula con motivo. Los datos crudos siempre se conservan.
- **Mis resultados** (cliente): radar contra su inicio, índice por pilar con el cambio contra el mes anterior, Táctica y Adaptabilidad, e historial con peso y división de cada evaluación.
- **Resultados** (coach): último resultado por pilar de cada cliente y su resultado del mes (promedio por pilar y cobertura).
- Administración: lista del mes, resultado de todos los coaches, referencia de niveles (solo administración) y las evaluaciones en la ficha del cliente.
- **PIN de evaluación** en Mi perfil (4 a 6 dígitos, se guarda como hash; 5 intentos fallidos lo bloquean 15 minutos).
- Guías nuevas en Ayuda para aplicar evaluaciones y leer resultados.

### Seguridad
- El cliente y el coach nunca ven tests, intentos ni valores crudos; solo índices por pilar.
- La app no puede borrar sesiones de evaluación ni líneas base.

## [0.4.0] - 2026-11-03 · Fase 3 (Pagos) y peso

### Agregado
- **Planes**: la administración crea y ajusta los planes que vende (ej. Mensualidad, 1 mes, $600).
- **Dos formas de cobro**: el coach reporta el pago de su cliente con foto del comprobante (queda por confirmar), o la administración lo registra y queda confirmado. Siempre se anota quién tiene el dinero.
- **Confirmar o rechazar** pagos reportados, viendo el comprobante; el rechazo pide motivo.
- **Membresía**: corre desde la fecha del pago; si el cliente aún tenía días, sigue al terminar esos. Estados activo, por vencer (5 días), vencido o sin pago, en la lista de clientes, la ficha, la vista del coach y la del cliente (días restantes).
- **Carga inicial** para dar de alta a los clientes actuales con su pago vigente: los deja activos sin generar comisión ni contar como ingreso.
- **Cuadre mensual con cada coach**: su comisión del mes contra el dinero que cobró él; dice quién paga a quién y se marca como cuadrado al terminar el mes.
- **Mis pagos** (coach): reportar, su cuenta del mes y del anterior, el estado de sus clientes y sus pagos recientes.
- **Cuenta con el sistema**: ingresos del mes y cuota del sistema (hoy 0%); el superadmin puede programarla como porcentaje o cuota fija desde un mes futuro.
- **Peso y división**: al registrarse se pide la rama (femenil/varonil) y, opcionales y aproximados, peso y estatura. La administración registra pesajes de evaluación periódica o imprevistos. Se muestran peso, IMC, división amateur (World Boxing) según la rama, cambio contra el pesaje anterior y el primero, y el historial. La división se mantiene hasta el siguiente pesaje.
- Guías nuevas en Ayuda para pagos, carga inicial, cuadre, pesajes y la vista del cliente.

### Seguridad
- Los comprobantes se guardan en un bucket privado y solo los ven la administración y quien reportó el pago.
- La app no puede borrar pagos, cuadres ni cuotas del sistema: se rechazan o se corrigen con otro movimiento.

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

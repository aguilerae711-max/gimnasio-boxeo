"""Ramificación de interfaces (1 sistema > 1.1 administración > 1.1.1 coach > 1.1.1.1 cliente).
Uso: python docs/gen_ramificacion.py docs/Ramificacion_de_interfaces.pdf"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from pdf_comun import Documento  # noqa: E402

VERSION = "v0.13.0"
FECHA = "7 de noviembre de 2026"
d = Documento(sys.argv[1], "Ramificación de interfaces", f"Ramificación de interfaces · Sistema de gestión de gimnasios · {VERSION} · {FECHA}")

ANCHOS = [1.25, 4.75]


def pantalla(numero, nombre, ruta, espacios, textos, funciones, herramientas, nota=None):
    """Una pantalla: dónde está y qué contiene (espacios, textos, funciones y herramientas)."""
    d.h3(f"{numero} · {nombre} <font color='#777777' size='8'>({ruta})</font>")
    d.tabla([
        ["Contiene", "Detalle"],
        ["Espacios", espacios],
        ["Textos", textos],
        ["Funciones", funciones],
        ["Herramientas", herramientas],
    ], ANCHOS)
    if nota:
        d.nota(nota)
    d.sp(4)


d.portada(
    "Ramificación de interfaces",
    "Sistema de gestión de gimnasios · de la administración del sistema hasta el cliente",
    "Qué hay en cada interfaz: espacios, textos, funciones y herramientas",
    ["0. Mapa del árbol y tus cuentas", "1. Superadministración (sistema)", "1.1 Administración 1 · Diamante Boxing Club",
     "1.1.1 Coach 1", "1.1.1.1 Cliente 1", "P. Portada pública de la administración", "R. Resumen de alcances por nivel"],
    f"Versión de la app: {VERSION} · {FECHA}. Cada nivel ve solo lo suyo y lo de las ramas debajo, según su rol.",
)

# 0 -------------------------------------------------------------------------------------------------
d.h1("0. Mapa del árbol y tus cuentas")
d.p("El sistema se ramifica de arriba hacia abajo. Cada número dice de quién depende: <b>1.1.2</b> es el coach 2 de la "
    "administración 1; <b>1.1.2.3</b> es el cliente 3 de ese coach. Una administración nueva que contrates será la "
    "<b>1.2</b>, con su propia marca, colores, coaches y clientes.")
d.codigo(
    "1        Superadministración (sistema)        cuenta: ivan  (solo sistema)\n"
    "+-- 1.1   Administración 1 · Diamante Boxing Club  cuenta: ivan.diamante (administración)\n"
    "   +-- 1.1.1   Coach 1 (Iván)                  la misma cuenta ivan.diamante\n"
    "   |   +-- 1.1.1.1  Cliente 1\n"
    "   |   +-- 1.1.1.2  Cliente 2\n"
    "   +-- 1.1.2   Coach 2\n"
    "       +-- 1.1.2.1  Cliente 1\n"
    "+-- 1.2   Administración 2 (futura)            su marca y su equipo"
)
d.h2("Tus cuentas")
d.tabla([
    ["Cuenta", "Nivel", "Para qué"],
    ["ivan", "1 · Sistema", "Solo superadministrador. No pertenece a ninguna administración. Entra directo al Panel del sistema, "
     "con colores neutros (azul) y sin logotipo de gimnasio. Desde ahí entras a cualquier administración o la ves como cualquiera."],
    ["ivan.diamante", "1.1 y 1.1.1", "Administración de Diamante y, con <b>También doy clases</b>, coach de Diamante. Su menú "
     "tiene los grupos Gimnasio y Coach, con la marca de Diamante."],
], [1.1, 1.0, 3.9])
d.h2("Pasos para separarlas")
d.pasos([
    "Con la cuenta ivan: Panel del sistema → Diamante → <b>Entrar a su panel</b> → Administración → Equipo. Agrega a "
    "«Iván» como <b>Administración</b> con usuario <b>ivan.diamante</b> y abre su enlace de activación.",
    "Entra como ivan.diamante → Mi perfil → <b>También doy clases</b> → Sumarme como coach.",
    "Después, con una migración, a la cuenta ivan se le quitan los roles de administración y coach en Diamante y, si "
    "su coach actual tiene clientes o turnos, pasan al coach nuevo. Antes de publicarla se revisa qué se mueve.",
])

# 1 -------------------------------------------------------------------------------------------------
d.salto()
d.h1("1. Superadministración (sistema)")
d.recuadro("Alcance", "Solo tú. Ve <b>todas las administraciones</b> de forma agregada, sin datos de contacto de clientes. "
           "Es independiente de cualquier gimnasio: su interfaz no lleva marca, logotipo ni menú de ninguno. Es el único "
           "que ve la cuota del servicio y que puede usar <b>Ver como</b>.")
pantalla("1.0", "Cabecera del sistema", "todas las pantallas /sistema",
         "Barra superior oscura con insignia <b>SG</b>; tu nombre y Salir a la derecha.",
         "«Sistema de gestión de gimnasios» · «Administración del sistema». Pestaña del navegador: «Panel del sistema».",
         "Salir (cierra la sesión y borra la vista y la administración elegida).",
         "Tema propio en azul (#4f8cff), igual para todas las administraciones.")
pantalla("1.A", "Centro de control", "/sistema",
         "Encabezado; cuatro indicadores; tabla Administraciones; Actividad reciente; Salud del sistema; Próximos controles.",
         "«Administración del sistema · Centro de control». Indicadores: Administraciones, Clientes activos (y por aprobar), "
         "Coaches, A cobrar este mes.",
         "Tabla numerada (1, 2, ...) con cada administración: clientes, coaches, ingresos del mes, cuota y monto a cobrar; "
         "<b>Abrir →</b> lleva a su rama. Actividad reciente de todas (auditoría). Salud: versión en producción, migraciones "
         "aplicadas y respaldo nocturno.",
         "Lista de <b>Próximos controles</b>: cobro del servicio, alta de administraciones, suspender o reactivar, marca de "
         "cada administración, métricas por pilar, uso y retención, auditoría completa y seguridad de cuentas.")
pantalla("1.B", "Administración N (rama)", "/sistema/administraciones/[id]",
         "Ruta (Administración del sistema / N · nombre); tarjeta con logotipo y eslogan de esa administración; cuatro "
         "indicadores; Estructura y Ver como; Actividad reciente.",
         "«Administración N», nombre y eslogan. Indicadores: Clientes activos (por aprobar), Coaches aprobados, Ingresos del "
         "mes, Cuota del servicio (tarifa vigente).",
         "Árbol numerado: quienes administran → coaches N.1, N.2... → clientes N.1.1, N.1.2... (marca «por aprobar»). "
         "<b>Ver como</b> en cada nodo. <b>Entrar a su panel</b> (arriba a la derecha).",
         "Aviso si la persona ya no está activa («Elige otra»). Enlace a la portada pública para verla en ventana privada. "
         "Actividad reciente de esa administración.")
pantalla("1.C", "Ver como (solo lectura)", "abre /admin, /coach o /cliente",
         "La app completa de esa persona, con la marca de su administración, y arriba una franja ámbar fija.",
         "«Vista de solo lectura · Estás viendo la app como [nombre]. Nada de lo que toques se guarda.» Botón «Terminar vista».",
         "Ver exactamente su menú y sus pantallas. Terminar vista te regresa a la rama de esa administración.",
         "Bloqueo doble: el navegador avisa «solo lectura» si intentas guardar y el servidor rechaza cualquier cambio. Dura "
         "2 horas, queda en la auditoría y no marca novedades como vistas.")
pantalla("1.D", "Entrar a su panel", "/admin de esa administración",
         "La interfaz de administración (1.1) con su marca y una franja azul arriba.",
         "«Superadministrador · en la administración [nombre]» y «← Panel del sistema».",
         "Operar como administración con todos los permisos, incluida la sección <b>Cuadre → Con el sistema</b> "
         "(programar la cuota del servicio: porcentaje o fija, desde un mes futuro y con motivo).",
         "Queda en la auditoría (Entró al panel de la administración). La elección dura 30 días o hasta que salgas.")

# 1.1 -----------------------------------------------------------------------------------------------
d.salto()
d.h1("1.1 Administración 1 · Diamante Boxing Club")
d.recuadro("Alcance", "Maneja <b>todo lo de su gimnasio</b>: equipo, registros, clientes, horario, pagos, cuadre con "
           "coaches, evaluaciones, planes, comisiones, biblioteca y novedades. Es la única que evalúa. No ve otras "
           "administraciones, el panel del sistema ni la cuota del servicio. Todo cambio queda en la auditoría con su nombre.")
pantalla("1.1.0", "Cabecera y menú", "todas las pantallas privadas",
         "Logotipo y nombre del gimnasio; fila de grupos (<b>Gimnasio</b>, <b>Coach</b> si da clases, <b>Cliente</b> si entrena) "
         "más Novedades, Mi perfil, Ayuda y Salir. Al tocar un grupo aparece su segunda fila.",
         "Nombre y eslogan («Forjado bajo presión»); número junto a Novedades = publicaciones sin ver.",
         "Navegar entre grupos; la primera vez que entras te lleva a la bienvenida (Ayuda).",
         "Colores, logotipo y letras propios de la administración (cambian con cada administración).")
pantalla("1.1.A", "Administración (pendientes del día)", "/admin",
         "Registros por aprobar; Clases de prueba por agendar; Quieren ser coach; Equipo; Clientes.",
         "Títulos de cada sección y avisos vacíos («No hay ...»).",
         "Aprobar o rechazar registros. Clase de prueba: WhatsApp con mensaje listo, «Ya la agendé» o «Descartar». Quiere ser "
         "coach: «Aprobar como coach» (con usuario corto) o «Descartar». Equipo: <b>Agregar</b> (nombre, Administración o Coach, "
         "usuario) y su enlace de activación. Clientes: lista con filtro y acceso a su ficha.",
         "Botón WhatsApp y Copiar enlace; generar enlace de activación o de nueva contraseña.")
pantalla("1.1.B", "Ficha del cliente", "/admin/clientes/[id]",
         "Coach y turno; Perfil; Peso; Pagos; Evaluaciones; Reiniciar punto de partida; Historial de coach.",
         "Nombre del cliente y su estado.",
         "Cambiar coach o franja con motivo; corregir perfil; Registrar pesaje (peso, estatura, fecha); Registrar pago; "
         "ver evaluaciones; Reiniciar (con motivo); <b>Ver como lo ve el cliente</b>.",
         "Notas médicas descifradas solo aquí y para su coach; historial completo que no se borra.")
pantalla("1.1.C", "Horario", "/admin/horario",
         "Cuadrícula de días que opera el gimnasio por franja horaria.",
         "«Horario»; nombre de cada coach en su turno.",
         "Agregar al turno (coach, cupo opcional); quitar a un coach de un turno. Puede haber varios coaches por turno.",
         "Cupo opcional por turno.")
pantalla("1.1.D", "Pagos", "/admin/pagos",
         "Por confirmar; Registrar pago; Clientes; Últimos pagos; Planes; Nuevo plan.",
         "Monto, forma de pago, quién lo recibió y comprobante.",
         "Confirmar o Rechazar (con motivo) los que reportan coaches; registrar los que recibe la administración (quedan "
         "confirmados); marcar <i>Carga inicial</i>; editar planes (nombre, precio, duración) y Crear plan.",
         "Vista de la foto del comprobante; la membresía corre desde la fecha del pago.")
pantalla("1.1.E", "Cuadre", "/admin/cuadre",
         "Cuadre mensual · Con cada coach. (Con el sistema: solo la ve el superadministrador.)",
         "Comisión del mes, lo que cobró el coach y el saldo.",
         "<b>Marcar cuadrado</b> al cerrar el mes (queda registrado y ya no cambia).",
         "Selector de mes.")
pantalla("1.1.F", "Evaluación", "/admin/evaluacion y /admin/evaluacion/[id]",
         "Clientes del mes; Resultado de los coaches; Referencia de niveles (solo administración). En la sesión: Check-in y "
         "pesaje, tests por pilar, Estrategia · rúbrica, Resumen por pilar, Anular.",
         "Instrucciones de cada test, intentos y unidades.",
         "Comenzar con PIN; check-in (no apto si hay lesión); capturar tests; rúbrica 0-1-2 con compañero de sparring; "
         "cerrar y publicar; anular con motivo.",
         "Cronómetro y contador; aviso si un valor cambia más de 40%; índice 100 = punto de partida.")
pantalla("1.1.G", "Planes", "/admin/planes y /admin/planes/[id]",
         "«¿Qué hará cada coach?» por coach y mes; detalle con Rutinas del plan.",
         "Estado del plan (borrador, enviado, aprobado, con cambios).",
         "<b>Aprobar</b> o <b>Pedir cambios</b> (qué debe cambiar).",
         "Vista de cada rutina por bloques y minutos.")
pantalla("1.1.H", "Comisiones", "/admin/comisiones",
         "Por coach, hoy; Cambios programados; Mover comisión; Historial.",
         "Porcentaje vigente de cada coach y el general.",
         "Guardar cambio: nuevo porcentaje, desde qué fecha y motivo. Nunca cambia comisiones ya generadas.",
         "Historial con quién y cuándo.")
pantalla("1.1.I", "Biblioteca", "/biblioteca",
         "Glosario y ejercicios: Golpes, Combinaciones, Ejercicios; Por formalizar; Acceso a la biblioteca compartida.",
         "Número oficial de cada golpe y sus nombres alternos.",
         "Formalizar (nombre oficial, descripción, ejecución, errores comunes, alternos) o Fusionar propuestas; decidir qué "
         "coaches ven la biblioteca compartida.",
         "Buscador; traductor de combinaciones (1-2-3c → nombres).")
pantalla("1.1.J", "Novedades", "/novedades",
         "Publicar; lista de publicaciones; Ver inscritos.",
         "Tipo (anuncio, evento, sparring, felicitación, pelea, reunión, día de prueba), título, fechas, lugar.",
         "Publicar para todos, coaches o clientes, o como <i>Público</i> (sale en la portada); cupo con inscripción; "
         "fecha en que deja de mostrarse.",
         "Contador de no vistas en el menú.")
pantalla("1.1.K", "Mi perfil", "/perfil",
         "Cómo entras; <b>También doy clases</b>; También entreno aquí; PIN de evaluación; Como coach (si da clases).",
         "Correo y usuario corto actuales.",
         "Cambiar usuario corto; sumarse como coach con su misma cuenta (apodo); inscribirse como cliente (coach, rama, "
         "reglamento); definir o cambiar PIN (4-6 dígitos).",
         "Nuevo en v0.13.0: También doy clases.")
pantalla("1.1.L", "Ayuda", "/ayuda",
         "Bienvenida (la primera vez) y guías por tema según tu rol.",
         "Pasos cortos de cada tarea.",
         "Consultar cómo se hace cada cosa.", "Las mismas guías del manual de uso.")

# 1.1.1 ---------------------------------------------------------------------------------------------
d.salto()
d.h1("1.1.1 Coach 1")
d.recuadro("Alcance", "Ve <b>sus turnos y sus clientes</b>, arma rutinas y su plan del mes, reporta pagos, ve su comisión y "
           "su cuadre, y consulta la biblioteca. No ve clientes de otros coaches, la comisión de los demás ni las finanzas "
           "del gimnasio. No aplica evaluaciones (solo ve resultados). Si también administra, suma el grupo Gimnasio.")
pantalla("1.1.1.A", "Mis turnos y clientes", "/coach",
         "Mis turnos; Tu invitación; Clientes; Emergencia y salud.",
         "Día y franja de cada turno (hoy marcado); «Aún no tienes turnos...».",
         "Ver la rutina de cada turno; compartir tu invitación por WhatsApp o Copiar; ver a tus clientes (por aprobar o activos).",
         "Contacto de emergencia y notas médicas de tus clientes (descifradas solo para ti).")
pantalla("1.1.1.B", "Mi plan", "/coach/plan",
         "«¿Qué harás en cada turno?»; Historial.",
         "Estado del plan y comentario de la administración si pidió cambios.",
         "Elegir una rutina por turno; Guardar borrador; Enviar a la administración; desde el día 25, «Sí, mantenerlo» para "
         "el mes siguiente.",
         "Mientras corriges, sigue vigente tu plan aprobado anterior.")
pantalla("1.1.1.C", "Rutinas", "/coach/rutinas",
         "Mis rutinas; editor por bloques.",
         "«Aún no tienes rutinas.»; minutos por bloque.",
         "Crear y editar rutinas de hasta 120 minutos: bloques (calentamiento, técnica, implementos...) con ejercicios de "
         "la biblioteca o combinaciones.",
         "Suma automática de minutos.")
pantalla("1.1.1.D", "Biblioteca", "/biblioteca",
         "Golpes, Combinaciones, Ejercicios.", "Número oficial y nombres alternos.",
         "Consultar; proponer un ejercicio nuevo (se usa de inmediato y la administración lo formaliza).",
         "Traductor de combinaciones.", "Solo si la administración le dio acceso a la biblioteca compartida.")
pantalla("1.1.1.E", "Resultados", "/coach/resultados",
         "Tu resultado del mes; Mis clientes.",
         "Promedio por pilar y cobertura (cuántos evaluados).",
         "Ver la última evaluación por pilar de cada cliente tuyo.", "Índices contra el punto de partida (100).")
pantalla("1.1.1.F", "Mis pagos", "/coach/pagos",
         "Reportar pago; Mi cuenta del mes; Mis clientes; Pagos recientes.",
         "Comisión, lo que cobraste y el saldo.",
         "Reportar pago (cliente, plan, monto, forma, quién lo recibió, foto del comprobante); queda por confirmar.",
         "Cámara del celular para el comprobante.")
pantalla("1.1.1.G", "Novedades, Mi perfil y Ayuda", "/novedades · /perfil · /ayuda",
         "Lista de novedades; Cómo entras; Como coach; También entreno aquí.",
         "Especialidad y presentación.",
         "Inscribirse a eventos; cambiar usuario corto; guardar especialidad y presentación; inscribirse como cliente.",
         "Guías de coach en Ayuda.")

# 1.1.1.1 -------------------------------------------------------------------------------------------
d.salto()
d.h1("1.1.1.1 Cliente 1")
d.recuadro("Alcance", "Ve <b>solo su información</b>: registro, membresía, coach y turno, rutina de hoy, peso y división, "
           "resultados, novedades y su perfil. No ve a otros clientes, pagos de otros ni datos del gimnasio.")
pantalla("1.1.1.1.A", "Mi estado", "/cliente",
         "Registro; Tu membresía; Tu coach y tu turno; Hoy en tu turno; Peso y división.",
         "Días que te quedan y hasta cuándo («por vencer» con 5 o menos); «Tu coach todavía no publica la rutina de hoy».",
         "Ver la rutina del día (o tu siguiente día) por bloques y minutos.",
         "Peso, división de World Boxing según tu rama, IMC de referencia y cambio desde el pesaje anterior.")
pantalla("1.1.1.1.B", "Mis resultados", "/cliente/resultados",
         "Radar por pilar; cambio contra el mes anterior; historial.",
         "Fuerza, velocidad, resistencia y estrategia; 100 = cuando empezaste.",
         "Consultar tu avance.", "Gráfica de radar e historial con peso y división.")
pantalla("1.1.1.1.C", "Novedades, Mi perfil y Ayuda", "/novedades · /perfil · /ayuda",
         "Lista de novedades; Cómo entras; Tus datos.",
         "Fecha de nacimiento, contacto de emergencia, notas médicas.",
         "Inscribirte o cancelar en eventos con cupo; cambiar usuario corto; completar tu perfil.",
         "Notas médicas cifradas: solo las ven tu coach y la administración.")

# P -------------------------------------------------------------------------------------------------
d.salto()
d.h1("P. Portada pública de la administración")
d.recuadro("Alcance", "La ve cualquiera, sin cuenta, con la marca de la administración. No muestra horarios completos, "
           "coaches ni datos de clientes.")
pantalla("P.A", "Portada", "/",
         "Logotipo, nombre, eslogan y frase; botones; clase de prueba; Novedades públicas.",
         "«Forjado bajo presión»; «¿Nunca has entrenado aquí? Pide tu clase de prueba gratis».",
         "Entrar; Registrarme como cliente; Quiero ser coach; Pedir mi clase de prueba (nombre, WhatsApp, horario, comentario).",
         "No duplica solicitudes repetidas en 24 horas.")
pantalla("P.B", "Entrar, registro, activación y Quiero ser coach", "/entrar · /registro · /activar · /quiero-ser-coach",
         "Formulario de entrada; ¿Ya entrenas aquí? y ¿Quién es tu coach?; Crea tu cuenta; Activa tu cuenta o Nueva contraseña; "
         "solicitud de coach.",
         "Correo o usuario y contraseña (mínimo 10).",
         "Entrar (te lleva a tu interfaz: sistema, administración, coach o cliente); registrarse con el código del coach; "
         "activar la cuenta con el enlace (una vez, 72 horas); aplicar como coach.",
         "Freno tras 5 intentos fallidos en 15 minutos.")

# R -------------------------------------------------------------------------------------------------
d.h1("R. Resumen de alcances por nivel")
S, N = "Sí", "—"
d.tabla([
    ["Función", "1 Sistema", "1.1 Admin.", "1.1.1 Coach", "1.1.1.1 Cliente"],
    ["Ver todas las administraciones y su árbol", S, N, N, N],
    ["Ver como (solo lectura) y Entrar a su panel", S, N, N, N],
    ["Cuota del servicio (Cuadre → Con el sistema)", S, N, N, N],
    ["Equipo, registros, clientes, horario", S, S, N, N],
    ["Confirmar pagos, cuadre, comisiones, planes", S, S, "Ve el suyo", N],
    ["Aplicar evaluaciones (con PIN)", S, S, N, N],
    ["Biblioteca: formalizar y dar acceso", S, S, "Consulta y propone", N],
    ["Publicar novedades", S, S, N, N],
    ["Sus turnos, rutinas, plan del mes y reportar pagos", N, "Si da clases", S, N],
    ["Su estado, rutina de hoy, peso y resultados", N, "Si entrena", "Si entrena", S],
], [2.6, 0.8, 0.9, 1.0, 0.9])
d.nota("El superadministrador opera dentro de una administración solo al entrar a su panel. Una persona con varios roles "
       "suma los alcances de cada uno. Los permisos se revisan en el servidor y la base de datos aísla cada administración.")

d.construir()
print("ok")

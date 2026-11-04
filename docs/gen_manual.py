"""Manual de uso por interfaz. Uso: python docs/gen_manual.py docs/Manual_de_uso.pdf"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from pdf_comun import Documento  # noqa: E402

VERSION = "v0.11"
FECHA = "4 de noviembre de 2026"
d = Documento(sys.argv[1], "Manual de uso · Diamante Boxing Club", f"Manual de uso · Diamante Boxing Club · {VERSION} · {FECHA}")

d.portada(
    "Manual de uso",
    "Diamante Boxing Club · Sistema de gestión del gimnasio",
    "Qué puede hacer cada quien y cómo, interfaz por interfaz",
    ["1. Antes de empezar: cuentas, entrada y menú", "2. Interfaz pública (portada)", "3. Interfaz de cliente",
     "4. Interfaz de coach", "5. Interfaz de administración", "6. Interfaz de superadministrador (sistema)",
     "7. Resumen de alcances por interfaz", "8. Preguntas frecuentes y buenas prácticas"],
    f"Versión de la app: {VERSION} · {FECHA}. Las mismas guías están dentro de la app, en Ayuda.",
    logo=os.path.join(os.path.dirname(__file__), "..", "public", "marca", "diamante-boxing-club.png"),
)

# 1 -------------------------------------------------------------------------------------------------
d.h1("1. Antes de empezar: cuentas, entrada y menú")
d.p("La app se usa desde el celular o la computadora, en el navegador. Hay cinco interfaces: la <b>portada pública</b> "
    "(sin cuenta) y cuatro privadas según el rol de cada persona: <b>cliente</b>, <b>coach</b>, <b>administración</b> y "
    "<b>superadministrador</b>. Una misma persona puede tener varios roles (por ejemplo, administración y coach) y ve "
    "en su menú un grupo por cada uno.")
d.h2("Cuentas personales")
d.lista([
    "Cada persona tiene su propia cuenta y contraseña. No hay cuentas compartidas: así la auditoría sabe quién hizo cada cosa.",
    "Se entra con <b>usuario corto</b> (por ejemplo, ivan o admin2) <b>o con correo</b>, más la contraseña (mínimo 10 caracteres).",
    "Tras 5 intentos fallidos en 15 minutos, la entrada de esa cuenta se frena un rato.",
    "La sesión dura 30 días en ese dispositivo. Toca <b>Salir</b> si usas un celular prestado.",
])
d.h2("Cómo obtiene cada quien su cuenta")
d.tabla([
    ["Quién", "Cómo entra por primera vez"],
    ["Cliente", "Se registra desde la portada (Registrarme como cliente) o con el enlace de invitación de su coach. Queda <i>por aprobar</i> hasta que la administración lo aprueba."],
    ["Coach", "La administración lo da de alta (o aprueba su solicitud de Quiero ser coach) y le manda un <b>enlace de activación</b> por WhatsApp."],
    ["Administración", "Otra persona de administración la da de alta en Administración → Equipo y le manda su enlace de activación."],
    ["Superadministrador", "Solo el dueño del sistema. Ese rol no se puede dar desde la app."],
], [1.2, 4.8])
d.recuadro("Enlace de activación",
           "Sirve una sola vez y vence en 72 horas. Al abrirlo, la persona elige su usuario corto (o escribe su correo) y su "
           "contraseña, y entra de inmediato. Si alguien olvida su contraseña, la administración genera otro enlace con el "
           "mismo botón.")
d.h2("El menú")
d.p("Arriba están los grupos (<b>Sistema</b>, <b>Gimnasio</b>, <b>Coach</b>, <b>Cliente</b>) más Novedades, Mi perfil y "
    "Ayuda. Al tocar un grupo aparece abajo una segunda fila con sus opciones. Quien tiene un solo rol ve una sola fila. "
    "El número junto a Novedades son las publicaciones que aún no has visto.")

# 2 -------------------------------------------------------------------------------------------------
d.salto()
d.h1("2. Interfaz pública (portada)")
d.recuadro("Alcance", "La ve cualquier persona, sin cuenta. Muestra la marca del gimnasio y permite entrar, registrarse, "
           "pedir una clase de prueba o aplicar como coach. <b>No muestra</b> horarios completos, coaches ni ningún dato de clientes.")
d.h2("Qué hay en la portada")
d.lista([
    "Logotipo, nombre y eslogan del gimnasio (<i>Forjado bajo presión</i>) y su frase.",
    "<b>Entrar</b>: para quien ya tiene cuenta. Reconoce al usuario y lo lleva a su interfaz.",
    "<b>Registrarme como cliente</b>: primero pregunta <i>¿Ya entrenas aquí?</i>.",
    "<b>Quiero ser coach</b>: solicitud para dar clases.",
    "<b>¿Nunca has entrenado aquí? Pide tu clase de prueba gratis</b>: botón discreto que despliega el formulario.",
    "<b>Novedades</b> públicas que publique la administración (eventos, días de prueba, avisos), sin datos de clientes.",
])
d.h2("Registrarme como cliente")
d.pasos([
    "Toca Registrarme como cliente y responde <i>¿Ya entrenas aquí?</i>.",
    "<b>Sí</b>: elige a tu coach (o usa el enlace que te mandó). <b>Todavía no</b>: te lleva a pedir tu clase de prueba.",
    "Escribe nombre, correo, teléfono, tu rama (femenil o varonil) y una contraseña. Peso y estatura son opcionales.",
    "Acepta el reglamento y la responsiva. Puedes entrar de inmediato; tu registro queda <i>por aprobar</i>.",
])
d.h2("Clase de prueba gratis")
d.pasos([
    "Despliega el formulario, escribe tu nombre y WhatsApp y, si quieres, tu horario preferido y un comentario.",
    "Acepta que el gimnasio te escriba por WhatsApp. La administración te contacta para agendarte.",
])
d.nota("Si mandas la misma solicitud dos veces en 24 horas, no se duplica: te dice que ya la tenemos.")
d.h2("Quiero ser coach")
d.pasos([
    "Escribe tu nombre, WhatsApp, tu experiencia en boxeo y tu disponibilidad.",
    "Al enviar verás <b>¡Gracias por aplicar como coach!</b>. La administración revisa tus datos y te escribe.",
    "Si te aprueban, recibes por WhatsApp tu enlace de activación.",
])

# 3 -------------------------------------------------------------------------------------------------
d.salto()
d.h1("3. Interfaz de cliente")
d.recuadro("Alcance", "Cada cliente ve <b>solo su información</b>: su registro, sus días pagados, su coach y turno, su "
           "rutina de hoy, su peso y división, sus resultados por pilar, novedades y su perfil. No ve a otros clientes, "
           "ni pagos, comisiones o datos del gimnasio.")
d.tabla([
    ["Menú", "Qué ves y haces"],
    ["Cliente → Mi estado", "Estado del registro, días que te quedan pagados y hasta cuándo, tu coach y turno, la <b>rutina de hoy</b> (o tu siguiente día) y tu peso y división."],
    ["Cliente → Mis resultados", "Radar por pilar (fuerza, velocidad, resistencia, estrategia), cambio contra el mes anterior e historial con tu peso y división."],
    ["Novedades", "Avisos, eventos, sparrings y felicitaciones. Inscribirte o cancelar en eventos con cupo."],
    ["Mi perfil", "Cómo entras (usuario corto), fecha de nacimiento, contacto de emergencia y notas médicas (cifradas)."],
], [1.5, 4.5])
d.h2("Tu rutina de hoy")
d.p("Los días que entrenas, en Mi estado aparece la rutina que preparó tu coach para tu turno, por bloques y minutos. "
    "Si hoy no te toca, te dice cuál es tu siguiente día. Si tu coach aún no publica la rutina, también te lo indica.")
d.h2("Tus días pagados")
d.p("Ves cuántos días te quedan y hasta qué fecha. Con 5 días o menos se marca <i>por vencer</i>. Pagas con tu coach o en "
    "la administración; ellos registran el pago (efectivo, transferencia o tarjeta) y la membresía corre desde la fecha del pago.")
d.h2("Tus resultados por pilar")
d.lista([
    "Te evaluamos al empezar y una vez al mes en cuatro pilares: fuerza, velocidad, resistencia y estrategia.",
    "Tu primera evaluación vale <b>100</b> en cada pilar. 115 significa 15% mejor que cuando empezaste.",
    "Si regresas tras 3 meses o más, o de una lesión, la administración puede reiniciar tu punto de partida: tu siguiente evaluación vuelve a valer 100. Lo anterior se conserva.",
])
d.h2("Tu peso y división")
d.p("Ves tu peso, tu división de World Boxing según tu rama, tu IMC (solo como referencia) y cuánto has subido o bajado. "
    "La división se mantiene hasta el siguiente pesaje.")
d.h2("Completar tu perfil")
d.pasos([
    "Entra a Mi perfil.",
    "Escribe tu fecha de nacimiento y un contacto de emergencia (nombre y teléfono).",
    "Si tienes una lesión o condición, anótala en Notas médicas. Se guardan cifradas y solo las ven tu coach y la administración.",
])

# 4 -------------------------------------------------------------------------------------------------
d.salto()
d.h1("4. Interfaz de coach")
d.recuadro("Alcance", "El coach ve <b>sus turnos y sus clientes</b>, arma sus rutinas y su plan del mes, reporta pagos, "
           "ve su comisión y el cuadre con la administración, y consulta la biblioteca. No ve clientes de otros coaches, "
           "ni la comisión de los demás, ni las finanzas del gimnasio. No aplica evaluaciones (solo ve resultados).")
d.tabla([
    ["Menú", "Qué ves y haces"],
    ["Coach → Mis turnos", "Cada día y franja que te toca con sus clientes (hoy marcado), la rutina de cada turno y tu enlace de invitación para clientes."],
    ["Coach → Mi plan", "Eliges una rutina para cada turno del mes y lo envías a la administración."],
    ["Coach → Rutinas", "Armas rutinas de 2 horas por bloques, con ejercicios y combinaciones de golpes."],
    ["Coach → Biblioteca", "Glosario de golpes con su número oficial y ejercicios; propones ejercicios nuevos."],
    ["Coach → Resultados", "Última evaluación por pilar de cada cliente tuyo, tu promedio del mes y la cobertura."],
    ["Coach → Mis pagos", "Reportas pagos con foto del comprobante; ves tu comisión y el cuadre del mes."],
], [1.5, 4.5])
d.h2("Invitar a un cliente")
d.pasos(["En Mis turnos, en Tu invitación, toca WhatsApp (o Copiar) y mándala.",
         "Cuando se registre, aparece en tu lista como <i>por aprobar</i> hasta que la administración lo apruebe."])
d.h2("Armar rutinas y tu plan del mes")
d.pasos([
    "En Rutinas crea bloques (calentamiento, técnica, implementos...) con sus minutos; la rutina no pasa de 120 minutos.",
    "En cada bloque agrega ejercicios de la biblioteca o combinaciones (por ejemplo 1-2-3c).",
    "En Mi plan elige una rutina para cada turno y toca <b>Enviar a la administración</b>.",
    "Si te piden cambios verás el comentario; corrige y reenvía. Mientras tanto sigue vigente tu plan aprobado anterior.",
    "Si tu plan es fijo, desde el día 25 te preguntamos si lo mantienes: un toque y el mes siguiente queda aprobado.",
])
d.h2("Reportar un pago")
d.pasos([
    "En Mis pagos elige al cliente y el plan; el monto se llena solo y lo puedes corregir.",
    "Indica la forma de pago (efectivo, transferencia o tarjeta) y si te pagó a ti o en la administración.",
    "Toma foto del comprobante (opcional) y envía. Queda <i>por confirmar</i>; al confirmarlo la administración, se suma tu comisión.",
])
d.h2("Tu cuenta del mes")
d.p("En Mis pagos ves tu comisión y el dinero que cobraste tú. Si cobraste más que tu comisión, entregas la diferencia; si "
    "no, la administración te paga. Al terminar el mes, la administración lo marca como cuadrado.")
d.h2("Biblioteca y glosario")
d.lista([
    "Los golpes tienen número oficial y otros nombres; escribe una combinación y ve el nombre de cada golpe.",
    "Si usas un ejercicio que no está, propónlo con nombre y descripción: lo usas de inmediato y la administración lo formaliza.",
])

# 5 -------------------------------------------------------------------------------------------------
d.salto()
d.h1("5. Interfaz de administración")
d.recuadro("Alcance", "La administración maneja <b>todo lo de su gimnasio</b>: equipo, registros, clientes, horario, pagos, "
           "cuadre con coaches, evaluaciones, planes, comisiones, biblioteca y novedades. Es la única que evalúa. "
           "<b>No ve</b> el cuadre con el sistema (la cuota del servicio) ni el panel del sistema: eso es del superadministrador. "
           "Todo lo que cambia queda en la auditoría con su nombre.")
d.tabla([
    ["Menú Gimnasio", "Para qué sirve"],
    ["Administración", "Pendientes del día: registros por aprobar, clases de prueba por agendar, quienes quieren ser coach, equipo y clientes."],
    ["Horario", "Asignar coaches a cada día y franja (puede haber varios por turno, con cupo opcional)."],
    ["Pagos", "Confirmar o rechazar pagos reportados por coaches y registrar los que recibe la administración."],
    ["Cuadre", "Por coach: comisión del mes contra el dinero que cobró él; marcar el mes como cuadrado."],
    ["Evaluación", "Aplicar evaluaciones con PIN: check-in, tests, rúbrica de estrategia y publicación."],
    ["Planes", "Revisar y aprobar los planes de trabajo de los coaches o pedir cambios."],
    ["Comisiones", "Cambiar la comisión general o la de un coach, desde una fecha y con motivo."],
    ["Biblioteca", "Formalizar o fusionar ejercicios propuestos y decidir qué coaches ven la biblioteca compartida."],
], [1.5, 4.5])
d.h2("Equipo")
d.pasos([
    "En Administración → Equipo, escribe el nombre, elige Administración o Coach y, si quieres, un usuario corto.",
    "Toca Agregar: aparece su enlace de activación; mándaselo por WhatsApp.",
    "Para un coach que olvidó su contraseña, toca <i>Enlace de activación</i> junto a su nombre.",
])
d.h2("Pendientes del día")
d.lista([
    "<b>Registros por aprobar</b>: aprueba si ya entregó su responsiva firmada; si no, rechaza.",
    "<b>Clases de prueba por agendar</b>: toca WhatsApp (el mensaje va listo); luego <i>Ya la agendé</i> o <i>Descartar</i>.",
    "<b>Quieren ser coach</b>: revisa su experiencia, escríbele por WhatsApp y toca <i>Aprobar como coach</i> (puedes darle usuario corto) para que aparezca su enlace de activación, o <i>Descartar</i>.",
])
d.h2("Ficha del cliente")
d.lista([
    "Cambiar su coach o franja con motivo (se guarda el historial).",
    "Ver y corregir su perfil; registrar su peso (evaluación o imprevisto).",
    "Registrar un pago, ver su historial de pagos y comprobantes.",
    "<b>Ver como lo ve el cliente</b>: su Mi estado tal cual, solo para revisar.",
    "<b>Reiniciar punto de partida</b> (con motivo) para quien regresa tras 3 meses o más, o de una lesión.",
])
d.h2("Pagos y cuadre")
d.pasos([
    "En Pagos confirma o rechaza (con motivo) los reportados por coaches, revisando el comprobante.",
    "Lo que recibes tú se registra con Registrar pago y queda confirmado de una vez.",
    "Alta de clientes actuales: registra su pago vigente con su fecha real y marca <i>Carga inicial</i> (no genera comisión ni cuenta como ingreso).",
    "En Cuadre, al terminar el mes, revisa cada coach y toca <i>Marcar cuadrado</i>. Queda registrado y ya no cambia.",
])
d.h2("Aplicar una evaluación")
d.pasos([
    "Define tu PIN en Mi perfil (una sola vez).",
    "En Evaluación, junto al cliente escribe tu PIN y toca Comenzar.",
    "Check-in: si tiene lesión o dolor no se evalúa (queda no apto y se reprograma). Pésalo en la misma báscula.",
    "Sigue los tests en orden con el cronómetro y el contador; deja vacío un intento nulo.",
    "Estrategia: califica cada conducta 0, 1 o 2 y anota al compañero de sparring; sin compañero, ciérrala como parcial y complétala otro día del mes.",
    "Cerrar y publicar calcula los índices y avisa si algún valor cambió más de 40%. Para repetirla, anúlala con motivo.",
])
d.h2("Novedades y comisiones")
d.lista([
    "En Novedades → Publicar: tipo (anuncio, evento, sparring, felicitación, pelea, reunión, día de prueba), para quién y, en eventos, fecha, lugar y cupo. Lo marcado como <i>Público</i> sale en la portada.",
    "En Comisiones cambia la general o la de un coach, con fecha de inicio y motivo. Nunca cambia comisiones ya generadas.",
])
d.h2("Si tú también entrenas")
d.p("En Mi perfil → <b>También entreno aquí</b> te inscribes como cliente con tu mismo usuario (eliges coach y rama). "
    "Te aparece el grupo Cliente en el menú; asígnate tu horario desde tu ficha.")

# 6 -------------------------------------------------------------------------------------------------
d.salto()
d.h1("6. Interfaz de superadministrador (sistema)")
d.recuadro("Alcance", "Solo el dueño del sistema. Ve <b>todos los gimnasios</b> de forma general y agregada, sin datos "
           "personales de clientes, y es el único que ve y programa la <b>cuota del servicio</b> (el cuadre entre la "
           "administración del gimnasio y el sistema). Este rol no se puede otorgar desde la app.")
d.tabla([
    ["Menú", "Qué ves y haces"],
    ["Sistema → Panel del sistema", "Totales: gimnasios, clientes activos (y por aprobar), coaches y lo que toca cobrar este mes. Tabla por gimnasio: clientes, coaches, ingresos del mes, cuota y monto a cobrar. Versión en producción y respaldo nocturno."],
    ["Gimnasio → Cuadre → Con el sistema", "Ingresos del mes, cuota vigente y monto a pagar al sistema; <b>Programar cuota</b> (porcentaje o cuota fija) desde el primer día de un mes futuro, con motivo. La administración no ve esta sección."],
], [1.7, 4.3])
d.h2("Programar la cuota del servicio")
d.pasos([
    "Entra a Gimnasio → Cuadre y baja a <b>Con el sistema</b>.",
    "Elige porcentaje de los ingresos o cuota fija, el monto, desde qué mes (siempre uno futuro) y el motivo.",
    "Toca Programar cuota. Hoy el gimnasio piloto está en 0% (cortesía).",
])
d.nota("Próximamente: cobros del servicio por confirmar, métricas por pilar por gimnasio y alta de gimnasios nuevos desde el panel.")

# 7 -------------------------------------------------------------------------------------------------
d.salto()
d.h1("7. Resumen de alcances por interfaz")
S, N = "Sí", "—"
d.tabla([
    ["Función", "Pública", "Cliente", "Coach", "Admin.", "Superadmin"],
    ["Ver marca, novedades públicas, pedir clase de prueba, aplicar como coach", S, S, S, S, S],
    ["Ver su propio estado, rutina, peso y resultados", N, S, N, N, N],
    ["Ver sus turnos y sus clientes", N, N, S, S, S],
    ["Armar rutinas y enviar plan del mes", N, N, S, N, N],
    ["Reportar pagos", N, N, S, S, S],
    ["Confirmar pagos y registrar pagos confirmados", N, N, N, S, S],
    ["Aprobar clientes, solicitudes de prueba y de coach", N, N, N, S, S],
    ["Dar de alta al equipo y generar enlaces de activación", N, N, N, S, S],
    ["Horario, comisiones, planes, biblioteca, novedades", N, N, N, S, S],
    ["Aplicar evaluaciones (con PIN)", N, N, N, S, S],
    ["Cuadre con coaches", N, N, "Ve el suyo", S, S],
    ["Cuadre con el sistema y cuota del servicio", N, N, N, N, S],
    ["Panel del sistema (todos los gimnasios)", N, N, N, N, S],
], [3.4, 0.8, 0.8, 0.8, 0.8, 1.0])
d.nota("Una persona con varios roles suma los alcances de cada uno. Los permisos se revisan en el servidor y, además, la base "
       "de datos aísla los datos de cada gimnasio.")

# 8 -------------------------------------------------------------------------------------------------
d.h1("8. Preguntas frecuentes y buenas prácticas")
d.tabla([
    ["Pregunta", "Respuesta"],
    ["Olvidé mi contraseña", "Pide en el gimnasio un enlace para cambiarla. Ábrelo, escribe la nueva y entras de inmediato."],
    ["¿Puedo compartir mi cuenta?", "No. Cada persona tiene la suya; lo que hagas queda registrado con tu nombre."],
    ["¿Quién ve mis notas médicas?", "Solo tu coach y la administración. Se guardan cifradas."],
    ["El cliente pagó en efectivo", "Quien recibió el dinero lo registra en la app (coach: Mis pagos; administración: Pagos)."],
    ["¿Se puede borrar un pago o una evaluación?", "No se borran: se rechazan o anulan con motivo, para conservar el historial."],
    ["¿Qué pasa si se cae algo?", "Cada noche se respalda la base de datos; además, cada versión publicada se puede regresar a la anterior."],
], [1.8, 4.2])

d.construir()
print("ok")

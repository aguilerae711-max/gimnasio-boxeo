"""Propuesta de ramificación con sucursales y secciones desplegables.
Uso: python docs/gen_propuesta_orden.py docs/Propuesta_de_orden.pdf"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from pdf_comun import Documento  # noqa: E402

FECHA = "7 de noviembre de 2026"
d = Documento(sys.argv[1], "Propuesta de orden", f"Propuesta de orden · sucursales y secciones desplegables · {FECHA}")


def menu(filas):
    """Tabla de un menú: opción del menú, secciones desplegables (en orden) y qué se quita o se junta."""
    d.tabla([["Menú", "Secciones desplegables, en este orden", "Cambia"]] + filas, [1.15, 3.35, 1.5])
    d.sp(4)


d.portada(
    "Propuesta de orden",
    "Sucursales y secciones desplegables para todo el sistema",
    "Para revisar y marcar antes de construir",
    ["1. Principios", "2. El árbol con sucursales", "3. Decisiones que te tocan", "4. Menú por rol (en vez de grupos)",
     "5. 1 · Sistema", "6. 1.1 · Administración de la marca", "7. 1.1.1 · Sucursal", "8. Coach", "9. Cliente",
     "10. Fases de construcción"],
    f"Propuesta del {FECHA}. Nada de esto está construido todavía, salvo Equipo en desplegables (sin publicar).",
)

# 1 -------------------------------------------------------------------------------------------------
d.h1("1. Principios")
d.p("Al concepto se le llama <b>divulgación progresiva</b>: cada pantalla enseña primero lo esencial y el detalle se abre "
    "solo cuando hace falta. Las secciones desplegables se llaman <b>acordeones</b>. Reglas que seguiremos en cada pantalla:")
d.lista([
    "<b>Pocas opciones a la vista:</b> como máximo 5 opciones en el menú de cada rol.",
    "<b>Lo de hoy primero:</b> arriba lo que hay que atender hoy; abajo, lo que se consulta de vez en cuando.",
    "<b>Una sección abierta:</b> la más usada abre sola; las demás quedan cerradas, con su número al lado (ej. Coaches (4)).",
    "<b>Si no hay nada, no se ve:</b> una sección de pendientes vacía desaparece en lugar de decir «No hay ...».",
    "<b>Menos texto:</b> sin explicaciones largas en pantalla; títulos claros con la voz del gimnasio. Lo demás vive en Ayuda.",
    "<b>Una acción principal por sección:</b> un botón fuerte; lo demás, como enlace o dentro del desplegable.",
])

# 2 -------------------------------------------------------------------------------------------------
d.h1("2. El árbol con sucursales")
d.p("Cada nivel suma un número. Quien administra no es un nivel aparte: son las personas a cargo de una marca o de una "
    "sucursal. Así, con dos administradores, el árbol no se rompe.")
d.codigo(
    "1                Sistema (tú)\n"
    "+-- 1.1          Diamante Boxing Club     marca: logotipo, colores, precios, biblioteca\n"
    "|   |            a cargo: administración de la marca (ve todas sus sucursales)\n"
    "|   +-- 1.1.1    Sucursal Centro          a cargo: administración de la sucursal\n"
    "|   |   +-- 1.1.1.1    Coach 1\n"
    "|   |   |   +-- 1.1.1.1.1  Cliente 1\n"
    "|   |   |   +-- 1.1.1.1.2  Cliente 2\n"
    "|   |   +-- 1.1.1.2    Coach 2\n"
    "|   +-- 1.1.2    Sucursal Norte\n"
    "|       +-- 1.1.2.1    Coach 1 ...\n"
    "+-- 1.2          Otra marca (futura)"
)
d.recuadro("Qué ve cada quien", "<b>Sistema:</b> todo. <b>Administración de la marca:</b> todas sus sucursales, con un "
           "selector arriba (Todas / Centro / Norte). <b>Administración de sucursal:</b> solo la suya. <b>Coach:</b> sus turnos y "
           "clientes en su sucursal. <b>Cliente:</b> solo lo suyo. Mientras haya una sola sucursal, el selector no aparece y "
           "todo se ve como hoy.")

# 3 -------------------------------------------------------------------------------------------------
d.salto()
d.h1("3. Decisiones que te tocan")
d.p("Marca una opción en cada fila. La columna «Recomiendo» es mi sugerencia para que sea sencillo.")
d.tabla([
    ["Tema", "Opciones", "Recomiendo"],
    ["Marca (logotipo, colores, eslogan)", "Una para todas las sucursales / una por sucursal", "Una para todas"],
    ["Planes y precios", "Iguales en todas / cada sucursal los suyos", "Iguales, con opción de cambiar el precio en una sucursal"],
    ["Biblioteca de ejercicios", "Compartida por la marca / por sucursal", "Compartida"],
    ["Comisión de coaches", "Una general de la marca / por sucursal", "General, con excepción por coach (como hoy)"],
    ["Coach en dos sucursales", "No / Sí, con turnos en ambas", "Sí: sus turnos dicen en qué sucursal"],
    ["Cliente en dos sucursales", "No (una base) / Sí, puede entrenar en ambas", "Una sucursal base y puede entrar a la otra"],
    ["Evaluaciones", "Las aplica la marca / cada sucursal", "Cada sucursal, con el mismo método y resultados comparables"],
    ["Cuota del servicio (tu cobro)", "Por marca / por sucursal", "Por marca, con desglose por sucursal"],
    ["Novedades", "De la marca / de la sucursal / ambas", "Ambas: se elige a quién va"],
    ["Portada pública", "Una de la marca / una por sucursal", "Una de la marca, con la lista de sucursales y su dirección"],
], [1.8, 2.3, 1.9])

# 4 -------------------------------------------------------------------------------------------------
d.h1("4. Menú por rol (en vez de grupos)")
d.p("Hoy, quien tiene varios roles ve grupos (Gimnasio, Coach, Cliente) y luego una segunda fila. Propongo un <b>cambio de "
    "rol</b> arriba («Administro · Doy clases · Entreno») y debajo solo el menú corto de ese rol. La app recuerda el último "
    "rol que usaste. Quien tiene un solo rol no ve el cambio de rol.")
d.tabla([
    ["Rol", "Menú (máximo 5)"],
    ["Administro", "Hoy · Personas · Dinero · Entrenamiento · Novedades"],
    ["Doy clases", "Hoy · Mis clientes · Entrenamiento · Mis pagos · Novedades"],
    ["Entreno", "Hoy · Mi progreso · Mi membresía · Novedades"],
    ["Siempre (arriba a la derecha)", "Tu nombre → Mi cuenta, Ayuda, Salir"],
], [1.8, 4.2])

# 5 -------------------------------------------------------------------------------------------------
d.salto()
d.h1("5. 1 · Sistema")
menu([
    ["Inicio", "Cifras del mes (administraciones, clientes, coaches, a cobrar) · <b>Administraciones</b> (abierta) · Actividad "
     "reciente · Salud del sistema", "Próximos controles pasa a Ayuda"],
    ["Administración N", "Cifras · <b>Estructura</b>: Sucursal 1.1.1 › Administración, Coaches › Clientes, cada nivel desplegable "
     "con Ver como · Cuota del servicio · Actividad", "El árbol se pliega por sucursal y por coach"],
    ["Cobros", "Por cobrar este mes · Cobrados · Programar cuota", "Sale de Cuadre de la administración"],
])

# 6 -------------------------------------------------------------------------------------------------
d.h1("6. 1.1 · Administración de la marca")
d.p("Arriba, el selector de sucursal (solo si hay más de una). Todas las pantallas filtran por esa sucursal.")
menu([
    ["Hoy", "Solo lo pendiente, cada uno desplegable con su número: Registros por aprobar · Pagos por confirmar · Clases de "
     "prueba · Quieren ser coach · Planes por revisar · Evaluaciones del mes", "Junta pendientes que hoy están en 4 pantallas"],
    ["Personas", "<b>Clientes</b> (por coach, desplegable; filtros activo, por vencer, por aprobar) · <b>Equipo</b> "
     "(Administración, Coaches) · <b>Horario</b>", "Horario y Equipo dejan de ser pantallas sueltas"],
    ["Dinero", "Pagos (registrar, últimos) · Cuadre con coaches · Comisiones · Planes y precios", "Pagos, Cuadre y Comisiones en una"],
    ["Entrenamiento", "Evaluación · Planes de trabajo · Biblioteca · Resultados por coach", "Junta 3 opciones del menú"],
    ["Novedades", "Publicar (cerrado) · Publicadas · Inscritos por evento", "El formulario queda plegado"],
])
d.h2("Dentro de la ficha del cliente")
d.p("Encabezado con nombre, estado, coach, turno y días pagados. Debajo, desplegables: Pagos · Peso · Evaluaciones · Perfil "
    "y salud · Historial de coach · Acciones (cambiar coach, reiniciar punto de partida, ver como lo ve).")

# 7 -------------------------------------------------------------------------------------------------
d.h1("7. 1.1.1 · Sucursal")
d.p("La administración de sucursal usa el mismo menú que la de la marca, sin selector y sin lo que es de la marca:")
d.tabla([
    ["Ve y maneja", "No ve"],
    ["Hoy, Clientes, Equipo de su sucursal (coaches), Horario, Pagos y cuadre de su sucursal, Evaluación, Planes de trabajo, "
     "Novedades de su sucursal", "Otras sucursales, marca y colores, precios generales, comisión general, cuota del servicio"],
], [3.0, 3.0])

# 8 -------------------------------------------------------------------------------------------------
d.salto()
d.h1("8. Coach (1.1.1.1)")
menu([
    ["Hoy", "<b>Mi turno de hoy</b> (abierto): rutina y clientes que vienen · Siguientes turnos de la semana", "Su pantalla de inicio"],
    ["Mis clientes", "Un desplegable por turno con sus clientes · Por aprobar · Invitar (WhatsApp / copiar)", "La invitación se pliega"],
    ["Entrenamiento", "Rutinas · Mi plan del mes · Biblioteca · Resultados", "Junta 4 opciones del menú"],
    ["Mis pagos", "Reportar pago (cerrado) · Mi cuenta del mes · Pagos recientes", "Igual, más corto"],
    ["Novedades", "Avisos y eventos", "—"],
])

# 9 -------------------------------------------------------------------------------------------------
d.h1("9. Cliente (1.1.1.1.1)")
menu([
    ["Hoy", "<b>Rutina de hoy</b> (abierta) o tu siguiente día · Tu coach y turno", "Lo primero que ve al entrar"],
    ["Mi progreso", "Peso y división · Resultados por pilar · Historial", "Junta Mi estado (peso) y Mis resultados"],
    ["Mi membresía", "Días que te quedan · Pagos", "Sale de Mi estado"],
    ["Novedades", "Avisos y eventos con inscripción", "—"],
])
d.nota("Mi cuenta (para todos): Cómo entras · Mis datos y salud · PIN (administración) · También doy clases / También entreno aquí.")

# 10 ------------------------------------------------------------------------------------------------
d.h1("10. Fases de construcción")
d.tabla([
    ["Fase", "Qué incluye", "Versión"],
    ["A · Orden y desplegables", "Menú por rol, pantallas Hoy, secciones desplegables en todas las pantallas, textos más cortos. "
     "No cambia la base de datos.", "0.14"],
    ["B · Separar tu cuenta", "Quitar a ivan los roles de Diamante y pasar su coach, si tiene clientes, a ivan.diamante.", "0.14.x"],
    ["C · Sucursales", "Nueva tabla de sucursales; horario, coaches, clientes, pagos y evaluaciones ligados a una sucursal; "
     "selector; rol de administración de sucursal. Diamante queda con su sucursal 1.1.1 sin perder nada.", "0.15"],
    ["D · Sistema", "Árbol del sistema por sucursal y cobros por marca con desglose.", "0.15.x"],
], [1.6, 3.6, 0.8])
d.nota("Recomiendo empezar por A: se nota de inmediato, no toca datos y deja listo el lugar donde entrarán las sucursales.")

d.construir()
print("ok")

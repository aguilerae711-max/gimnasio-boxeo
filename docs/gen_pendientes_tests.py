"""Pendientes de los tests de evaluación. Uso: python docs/gen_pendientes_tests.py docs/Pendientes_tests.pdf"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from pdf_comun import Documento  # noqa: E402

FECHA = "7 de noviembre de 2026"
d = Documento(sys.argv[1], "Pendientes de los tests · Diamante Boxing Club", f"Pendientes de los tests de evaluación · {FECHA}")

d.portada(
    "Pendientes de los tests",
    "Diamante Boxing Club · Evaluación por pilares",
    "Lo acordado para mejorar los tests, en el orden recomendado",
    ["1. Instructivo dentro de cada test", "2. Histórico y gráfica de rendimiento",
     "3. Reconocimiento mensual en Novedades", "4. Comparativa general y meta élite",
     "5. Por decidir: simplificar los tests", "6. Orden de trabajo y decisiones abiertas",
     "Anexo. Instructivo de los 8 tests (texto base)"],
    f"Documento de trabajo · {FECHA}. Nada de esto está construido todavía: se retoma al terminar la revisión de interfaces.",
    logo=os.path.join(os.path.dirname(__file__), "..", "public", "marca", "diamante-boxing-club.png"),
)

d.h1("Situación actual")
d.p("La evaluación mensual tiene 8 tests en orden fijo (velocidad, fuerza, estrategia y resistencia al final), con "
    "check-in y pesaje antes de empezar. Cada resultado se compara contra la línea base del cliente (su primera vez vale "
    "100) y se resume en 4 pilares: Fuerza, Velocidad, Resistencia y Estrategia.")
d.lista([
    "Quien evalúa ve el protocolo corto de cada test, pero no un instructivo paso a paso.",
    "El cliente todavía no ve sus resultados por pilar: Mi estado dice “Pronto verás aquí tus resultados”.",
    "No hay histórico ni gráfica, ni comparación contra otros, ni reconocimiento.",
    "La tabla de niveles (inicial / intermedio / avanzado) existe, pero solo la ve la administración.",
])

d.h1("1. Instructivo dentro de cada test")
d.recuadro("Objetivo", "Que cualquier evaluador ejecute cada test igual, sin papeles aparte, para que los resultados sean comparables mes a mes.")
d.lista([
    "En la pantalla de captura, cada test tiene un botón <b>Cómo se hace</b> que despliega: equipo, posición, ejecución, "
    "qué se cuenta, qué es nulo, intentos y descansos, y qué se anota.",
    "Más adelante, un dibujo o video corto (unos 15 segundos) por test.",
    "Recordatorio general antes del primer test: calentamiento de 8 a 10 minutos, mismo equipo y mismo orden; un intento mal hecho se deja vacío, no en 0.",
    "El texto base está en el anexo de este documento.",
])

d.h1("2. Histórico y gráfica de rendimiento")
d.recuadro("Objetivo", "Que el cliente vea su avance de forma clara y motivante, y que su coach y la administración vean lo mismo.")
d.lista([
    "<b>Tarjeta del mes</b> en Mi estado: los 4 pilares con una flecha de cuánto cambió contra el mes anterior.",
    "<b>Gráfica de líneas mes a mes</b> por pilar.",
    "Al tocar un pilar: el detalle de sus tests con el <b>valor real</b> (cm, golpes, %), no solo el índice.",
    "En la gráfica, línea punteada con la <b>meta élite</b> y franja de su nivel actual (ver punto 4).",
    "La misma vista en la ficha del cliente, para su coach y para la administración.",
])

d.h1("3. Reconocimiento mensual en Novedades")
d.recuadro("Objetivo", "Motivar con un reconocimiento periódico, justo y con permiso de cada cliente.")
d.tabla([
    ["Reconocimiento", "Cómo se calcula", "Requisitos"],
    ["Más mejoró del mes", "Mayor avance del índice contra su evaluación anterior (no contra la primera).",
     "Al menos 2 evaluaciones completas."],
    ["Nivel más alto", "Mejor índice promedio del mes, por categoría (sexo y división de peso), para que no ganen siempre los pesados.",
     "Evaluación del mes completa."],
], [1.4, 3.2, 1.8])
d.h2("Privacidad y control")
d.lista([
    "Novedades aparece en la portada pública: cada cliente acepta aparecer con una casilla en su perfil.",
    "Se publica solo nombre y primera inicial.",
    "El sistema arma la propuesta al cierre del mes y la administración pulsa <b>Publicar</b>; nada sale solo.",
])

d.h1("4. Comparativa general y meta élite")
d.recuadro("Objetivo", "Que al ver sus resultados el cliente sepa dónde está frente a otros y frente a un objetivo fuerte.")
d.h2("Etapa 1: niveles de referencia (ya hay datos)")
d.p("Mostrar al cliente su nivel <b>inicial / intermedio / avanzado</b> por test, con la tabla que ya existe.")
d.h2("Etapa 2: promedios propios del sistema")
d.lista([
    "Promedios por <b>sexo + división de peso + experiencia</b> (la experiencia y la edad pesan más que solo el peso).",
    "Se muestran solo cuando haya al menos 10 evaluados en el grupo, para que no engañen.",
    "Mejora sola conforme se sumen gimnasios al sistema.",
])
d.h2("Meta élite (idea del usuario)")
d.lista([
    "Métricas de boxeadores de élite como <b>objetivo</b>, no como promedio: aunque sea alta, da un techo concreto.",
    "No existen mediciones de campeones en estos tests exactos. Se usarán <b>estudios de ciencias del deporte</b> sobre "
    "boxeadores de élite (selecciones olímpicas, profesionales) en pruebas equivalentes: salto, golpes por segundo, caída "
    "de rendimiento entre asaltos, recuperación cardíaca. Cada cifra con su fuente y marcada como aproximada.",
    "Donde no haya dato publicado (cuadrantes, rúbrica), la meta es el <b>mejor registro histórico del sistema</b> en su categoría.",
    "Se puede mostrar además “% de la meta élite” (ej. “estás al 72% de un élite”), más fácil de entender que el índice contra la base.",
    "Antes de cargarlas: investigación y revisión de las cifras con sus fuentes para aprobación.",
])

d.h1("5. Por decidir: simplificar los tests")
d.p("Los tests se sintieron algo confusos. Puntos que podrían simplificarse:")
d.lista([
    "Fórmulas distintas por test (×2, resta, retención, diferencia), visibles en los nombres de los campos.",
    "El índice relativo a la base: 100 no significa “bueno”, significa “igual que tu primera vez”.",
    "Estados especiales: parcial, no apta y el test nuevo que todavía no cuenta.",
    "La rúbrica de 10 conductas en dos escenarios, que necesita compañero de sparring.",
])
d.p("Alternativa sencilla posible: un test por pilar con su resultado crudo y una flecha mejoró / igual / bajó contra el mes anterior.")

d.h1("6. Orden de trabajo y decisiones abiertas")
d.tabla([
    ["#", "Entrega", "Depende de"],
    ["1", "Instructivo dentro de cada test", "Nada; se puede hacer primero."],
    ["2", "Histórico y gráfica", "Nada; es lo más urgente para el cliente."],
    ["3", "Reconocimiento mensual", "2 (usa los mismos cálculos) y consentimiento en el perfil."],
    ["4", "Comparativa y meta élite", "Investigación de fuentes; promedios propios cuando haya datos."],
], [0.4, 2.6, 3.4])
d.h2("Decisiones abiertas")
d.lista([
    "¿Se simplifican los tests antes de construir lo demás? (cambia qué se grafica).",
    "¿Reconocimiento mensual o por otro periodo?",
    "Aprobación de las cifras de la meta élite.",
])

d.salto()
d.h1("Anexo. Instructivo de los 8 tests (texto base)")
d.recuadro("Antes de todos", "Calentamiento de 8 a 10 minutos (trote, movilidad, 2 asaltos suaves de sombra). Siempre el mismo "
           "equipo y el mismo orden. Un intento mal hecho se deja vacío (nulo), no en 0.")
tests = [
    ("1. Sprint en costal 6 s · Velocidad", [
        "Equipo: costal y cronómetro (la app trae uno).",
        "En guardia, a distancia de golpeo. A la señal, rectos alternados (jab–cross) lo más rápido posible durante 6 s.",
        "El evaluador cuenta solo los cross; la app multiplica por 2.",
        "2 intentos con 60 s de descanso. Se anotan los cross de cada uno; cuenta el mejor."]),
    ("2. Cuadrantes 15 s · Velocidad de pies", [
        "Equipo: cinta en el piso formando una cruz (4 cuadros de unos 50 cm).",
        "En guardia dentro de un cuadro; a la señal pasa por los 4 cuadros en orden, siempre en el mismo sentido, durante 15 s.",
        "Cada llegada limpia a un cuadro es un toque; cada vez que pisa la línea es una pisada.",
        "2 intentos. La app resta toques − pisadas y toma el mejor."]),
    ("3. Salto horizontal · Fuerza", [
        "Equipo: cinta métrica en el piso con el 0 en la línea de salida.",
        "Pies juntos detrás de la línea, impulso con brazos y salto hacia adelante, cayendo con los dos pies.",
        "Se mide de la línea al talón más atrasado.",
        "Nulo: se cae hacia atrás, apoya las manos o da un pasito antes de saltar. 3 intentos; cuenta el mejor."]),
    ("4. Flexiones con despegue 30 s · Fuerza explosiva", [
        "Flexión con el pecho a la altura del puño del evaluador puesto en el piso, y empuje explosivo hasta despegar las manos.",
        "Válida solo si baja al puño y despega las manos.",
        "1 serie de 30 s. Se anotan solo las válidas."]),
    ("5. Escenario A · Presión 2 min · Estrategia", [
        "Careta y guantes de 16 oz para ambos. El compañero camina hacia adelante empujando hacia cuerdas o pared, sin golpear.",
        "Se califican 5 conductas (0 no, 1 a veces, 2 consistente): salida de cuerdas, retirada en ángulo, anticipación del avance, fintas previas, ángulo de salida."]),
    ("6. Escenario B · Jab 2 min · Estrategia", [
        "Mismo equipo. El compañero tira un jab controlado cada 2–3 s.",
        "Se califican 5 conductas: mentón abajo, neutraliza el jab, contragolpe en un solo tiempo, retorno a guardia, calidad en los últimos 30 s.",
        "Se anota quién fue el compañero y si es el habitual."]),
    ("7. Drop-off · Retención · Resistencia", [
        "Costal. 3 asaltos de 3 min con 1 min de descanso; al inicio de cada asalto, sprint de 6 s como el test 1.",
        "G1 = cross del sprint del asalto 1; G3 = cross del sprint del asalto 3.",
        "Resultado: G3 ÷ G1 × 100 (90% = conservó el 90% de su velocidad cansado)."]),
    ("8. Recuperación cardíaca · Resistencia (opcional)", [
        "Pulsómetro. Al terminar el asalto 3 se anota la FC pico; de pie caminando suave, a los 60 s exactos la segunda FC.",
        "Resultado: pico − FC a los 60 s; más alto es mejor. Sin pulsómetro se deja vacío."]),
]
for titulo, pasos in tests:
    d.h2(titulo)
    d.lista(pasos)

d.construir()
print("ok", sys.argv[1])

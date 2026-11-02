import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
                                Table, TableStyle, PageBreak, KeepTogether)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

OUT = sys.argv[1]
F = "C:/Windows/Fonts/"
pdfmetrics.registerFont(TTFont("A", F + "arial.ttf"))
pdfmetrics.registerFont(TTFont("AB", F + "arialbd.ttf"))
pdfmetrics.registerFont(TTFont("AI", F + "ariali.ttf"))
pdfmetrics.registerFont(TTFont("ABI", F + "arialbi.ttf"))
pdfmetrics.registerFont(TTFont("M", F + "consola.ttf"))
from reportlab.pdfbase.pdfmetrics import registerFontFamily
registerFontFamily("A", normal="A", bold="AB", italic="AI", boldItalic="ABI")

INK = colors.HexColor("#1b1d22")
RED = colors.HexColor("#c8102e")
GREY = colors.HexColor("#5b6270")
LIGHT = colors.HexColor("#f3f4f6")
LINE = colors.HexColor("#d9dce1")

sTitle = ParagraphStyle("t", fontName="AB", fontSize=30, leading=36, textColor=INK)
sSub = ParagraphStyle("s", fontName="A", fontSize=13, leading=18, textColor=GREY)
sH1 = ParagraphStyle("h1", fontName="AB", fontSize=17, leading=22, textColor=INK, spaceBefore=6, spaceAfter=8)
sH2 = ParagraphStyle("h2", fontName="AB", fontSize=12.5, leading=16, textColor=RED, spaceBefore=10, spaceAfter=4)
sH3 = ParagraphStyle("h3", fontName="AB", fontSize=10.5, leading=14, textColor=INK, spaceBefore=6, spaceAfter=2)
sP = ParagraphStyle("p", fontName="A", fontSize=9.5, leading=13.5, textColor=INK, spaceAfter=4)
sB = ParagraphStyle("b", parent=sP, leftIndent=12, bulletIndent=2, spaceAfter=2)
sCell = ParagraphStyle("c", fontName="A", fontSize=8.3, leading=10.8, textColor=INK)
sCellH = ParagraphStyle("ch", fontName="AB", fontSize=8.3, leading=10.8, textColor=colors.white)
sNote = ParagraphStyle("n", parent=sP, fontName="AI", textColor=GREY, fontSize=8.8)
sMono = ParagraphStyle("m", fontName="M", fontSize=7.8, leading=9.6, textColor=INK)

story = []
W = letter[0] - 3.6 * cm


def h1(t): story.append(Paragraph(t, sH1))
def h2(t): story.append(Paragraph(t, sH2))
def h3(t): story.append(Paragraph(t, sH3))
def p(t): story.append(Paragraph(t, sP))
def note(t): story.append(Paragraph(t, sNote))
def bl(items):
    for i in items:
        story.append(Paragraph(i, sB, bulletText="•"))
def sp(h=6): story.append(Spacer(1, h))


def tbl(rows, widths, head=True):
    tot = sum(widths)
    ws = [W * w / tot for w in widths]
    data = []
    for r_i, r in enumerate(rows):
        st = sCellH if (head and r_i == 0) else sCell
        data.append([Paragraph(str(c), st) for c in r])
    t = Table(data, colWidths=ws, repeatRows=1 if head else 0)
    style = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.4, LINE),
        ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]
    if head:
        style.append(("BACKGROUND", (0, 0), (-1, 0), INK))
    for i in range(1 if head else 0, len(rows)):
        if i % 2 == 0:
            style.append(("BACKGROUND", (0, i), (-1, i), LIGHT))
    t.setStyle(TableStyle(style))
    story.append(t)
    sp(6)


def mono(text):
    t = Table([[Paragraph(text.replace(" ", "&nbsp;").replace("\n", "<br/>"), sMono)]], colWidths=[W])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), LIGHT), ("BOX", (0, 0), (-1, -1), 0.4, LINE),
                           ("LEFTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 6),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
    story.append(t)
    sp(6)


def on_page(c, d):
    if d.page == 1:
        c.setFillColor(INK); c.rect(0, letter[1] - 9.5 * cm, letter[0], 9.5 * cm, stroke=0, fill=1)
        c.setFillColor(RED); c.rect(0, letter[1] - 9.8 * cm, letter[0], 0.3 * cm, stroke=0, fill=1)
        return
    c.setStrokeColor(LINE); c.line(1.8 * cm, 1.5 * cm, letter[0] - 1.8 * cm, 1.5 * cm)
    c.setFont("A", 7.5); c.setFillColor(GREY)
    c.drawString(1.8 * cm, 1.05 * cm, "Plan del sistema · Gimnasio de boxeo · v1.4 · 1 nov 2026")
    c.drawRightString(letter[0] - 1.8 * cm, 1.05 * cm, f"Página {d.page}")


# ---------------- PORTADA ----------------
cover_t = ParagraphStyle("ct", parent=sTitle, textColor=colors.white)
cover_s = ParagraphStyle("cs", parent=sSub, textColor=colors.HexColor("#c9ccd3"))
story.append(Spacer(1, 2.2 * cm))
story.append(Paragraph("Plan del sistema", cover_t))
story.append(Paragraph("de gestión para gimnasio", cover_t))
sp(8)
story.append(Paragraph("Disciplina inicial: boxeo · Diseño replicable a otras actividades", cover_s))
story.append(Spacer(1, 4.2 * cm))
p("<b>Contenido</b>")
toc = ["1. Visión y alcance", "2. Arquitectura", "3. Usuarios, roles y accesos", "4. Modelo de datos",
       "5. Flujos principales", "6. Sistema de evaluación", "7. Biblioteca de ejercicios y plan de trabajo",
       "8. Novedades", "9. Detección de talentos", "10. Finanzas: relación de ingresos",
       "11. Panel del sistema y cobro del servicio", "12. Interfaces por usuario",
       "13. Infraestructura, seguridad y respaldos", "14. Aspectos legales", "15. Plan de integración por fases",
       "16. Decisiones tomadas y pendientes", "17. Arranque y crecimiento", "18. Instructivo de uso por rol"]
for t in toc:
    story.append(Paragraph(t, ParagraphStyle("toc", parent=sP, leftIndent=8, spaceAfter=1)))
sp(20)
note("Versión 1.2 · 31 de octubre de 2026 · Documento de diseño, previo a la construcción.")
story.append(PageBreak())

# ---------------- 1 ----------------
h1("1. Visión y alcance")
p("Sistema web (instalable en el celular como app) para administrar un gimnasio de boxeo: usuarios y accesos, "
  "horarios de coaches, clientes y membresías, pagos y comisiones, evaluación física por pilares, biblioteca de "
  "ejercicios, planes de trabajo y novedades. Todo lo propio del boxeo (pilares, tests, categorías de ejercicios) "
  "es <b>configuración en base de datos</b>, no código: el mismo sistema sirve para otra disciplina.")
p("También se diseña para <b>varios gimnasios</b> desde el inicio, para poder ofrecerlo como servicio a otros "
  "administradores, con los datos de cada gimnasio aislados.")
h2("Objetivos")
bl(["Simple de usar y visualmente atractivo: pocas pantallas, acciones principales en uno o dos toques.",
    "Orden real en el gimnasio: horarios, pagos, planes y evaluaciones registrados de la misma forma.",
    "Medir el avance de cada cliente respecto a su propio punto de partida, y el rendimiento de cada coach.",
    "Datos seguros, auditados y con respaldo fuerte."])

# ---------------- 2 ----------------
h1("2. Arquitectura")
p("Basada en <b>Arquitectura Limpia</b> y <b>Código Limpio</b> (Robert C. Martin), principios <b>SOLID</b> y "
  "<b>diseño guiado por el dominio</b> (Eric Evans). Las dependencias apuntan siempre hacia el centro: las reglas del "
  "negocio no conocen la base de datos ni el framework.")
mono("""Frameworks      Web (Next.js PWA), API (NestJS), PostgreSQL, almacenamiento, correo
 Adaptadores    controladores HTTP, repositorios, presentadores
  Casos de uso  ReportarPago, ConfirmarPago, AprobarCoach, AsignarHorario,
                IniciarEvaluacion, PublicarEvaluacion, EnviarPlanTrabajo...
   Dominio      Cliente, Coach, Membresia, SesionEvaluacion, Pilar, Test,
                CalculadoraIndice, Rutina, Ejercicio (reglas puras)""")
h2("Módulos (contextos del dominio)")
tbl([["Módulo", "Responsabilidad"],
     ["Identidad y acceso", "Usuarios, roles, registro, invitaciones, aprobaciones, documentos legales, 2FA"],
     ["Operación", "Franjas horarias, horarios de coaches, perfiles, asignación coach–cliente"],
     ["Membresías y pagos", "Planes, pagos reportados y confirmados, periodos, comisiones, liquidaciones"],
     ["Evaluación", "Pilares, tests, baterías, sesiones, índices, resultados de clientes y coaches"],
     ["Talentos", "Puntaje de proyección, etapas de seguimiento, nominaciones, registro de combates"],
     ["Finanzas", "Relación de ingresos: cuentas, ingresos automáticos y manuales, cierres mensuales, reportes"],
     ["Sistema (superadmin)", "Gimnasios, suscripciones y pagos del servicio, métricas generales"],
     ["Biblioteca y planes", "Ejercicios, formalización, permisos, rutinas, plan de trabajo mensual"],
     ["Novedades", "Anuncios, eventos, sparrings, felicitaciones, inscripciones"]], [1.2, 3])
p("Cada módulo tiene sus capas y no lee tablas de otro: se comunican por casos de uso o <b>eventos de dominio</b> "
  "(ej. <i>PagoConfirmado</i> → crear periodo y comisión; <i>SesionPublicada</i> → notificar y recalcular KPI del coach).")
h2("Estructura del código")
mono("""/apps
  /web           Next.js PWA (presentación)
  /api           NestJS (controladores HTTP)
/modulos
  /identidad /operacion /membresias /evaluacion /biblioteca /novedades
     dominio/          entidades y reglas puras
     aplicacion/       casos de uso y puertos (interfaces)
     infraestructura/  repositorios PostgreSQL, almacenamiento, correo
/compartido      eventos, auditoría, errores, tipos comunes""")
h2("Convenciones de datos")
bl(["Identificadores UUID; <b>creado_en</b>, <b>actualizado_en</b> y borrado lógico (<b>eliminado_en</b>) en todas las tablas.",
    "Dinero en NUMERIC(10,2); fechas con zona horaria; <b>gimnasio_id</b> en toda tabla de un gimnasio.",
    "No se guarda lo que se puede calcular: \"activo\" y \"días restantes\" salen de las fechas del periodo.",
    "Resultados de evaluación se guardan como foto fija al publicarse; los datos crudos siempre se conservan."])

# ---------------- 3 ----------------
story.append(PageBreak())
h1("3. Usuarios, roles y accesos")
tbl([["Rol", "Quién", "Alcance"],
     ["Superadmin", "Dueño del sistema", "Todos los gimnasios, cobro del servicio, métricas generales de pilares por gimnasio, coach y cliente, salud del sistema"],
     ["Administrador", "Administración del gimnasio (tú o a quien des acceso)", "Todo lo de su gimnasio; único que evalúa"],
     ["Coach", "Entrenador contratado", "Sus turnos, su plan, sus clientes, su biblioteca y comisiones"],
     ["Cliente", "Alumno inscrito", "Su membresía, sus resultados por pilar, novedades"]], [1, 1.6, 3])
h2("Acceso")
bl(["Cada persona tiene <b>usuario y contraseña propios</b>. Sin sesión solo se ve la <b>vista inicial pública</b>: "
    "disciplinas, horarios generales, novedades públicas, contacto, solicitar clase de prueba, iniciar sesión y registrarse.",
    "<b>Registro de coach</b>: queda pendiente hasta que la administración lo aprueba y le asigna turnos.",
    "<b>Registro de cliente, dos caminos</b>: (A) invitación del coach o admin por enlace que vence en 48 h; "
    "(B) registro propio desde la vista inicial, elige coach o \"que me asigne la administración\" y queda pendiente hasta su aprobación.",
    "Cuenta pendiente: ve \"tu solicitud está en revisión\". Cuenta suspendida: mensaje para contactar a la administración."])
h2("Matriz de permisos")
tbl([["Información", "Admin", "Coach", "Cliente"],
     ["Tests, intentos y valores crudos", "Sí", "No", "No"],
     ["Puntaje por pilar de cada cliente", "Todos", "Solo sus clientes", "Solo el suyo"],
     ["Resultado general del coach", "Todos", "El suyo", "No"],
     ["Plan de trabajo", "Todos", "El suyo", "Opcional: \"hoy en tu turno\""],
     ["Clientes y estado de membresía", "Todos", "Solo los suyos", "El suyo"],
     ["Biblioteca compartida", "Todo + formalizar", "Solo con permiso", "No"],
     ["Subir ilustraciones", "Sí", "No", "No"],
     ["Realizar evaluaciones", "Sí (con PIN)", "No", "No"],
     ["Detección de talentos", "Sí", "Solo nominar", "No"],
     ["Finanzas del gimnasio", "Sí", "Solo sus comisiones", "Solo sus pagos"],
     ["Pagos del servicio del sistema", "Reportar y ver", "No", "No"],
     ["Comentarios o retroalimentación de tests", "No existen", "No existen", "No existen"]], [2.2, 1.2, 1.3, 1.3])

# ---------------- 4 ----------------
story.append(PageBreak())
h1("4. Modelo de datos")
note("Todas las tablas incluyen id, creado_en, actualizado_en y eliminado_en; se omiten abajo por brevedad.")
h2("4.1 Identidad y acceso")
tbl([["Tabla", "Columnas clave", "Notas"],
     ["gimnasio", "nombre, slug, logo_url, color_primario, zona_horaria, plan_servicio, estado", "El inquilino; su color tematiza la app"],
     ["usuario", "email (único), password_hash, nombre, apellido, telefono, foto_url, estado, ultimo_acceso, debe_cambiar_password, totp_secreto_cifrado", "Una persona, uno o varios roles"],
     ["rol", "codigo: SUPERADMIN / ADMIN / COACH / CLIENTE", "Catálogo fijo"],
     ["usuario_rol", "usuario_id, gimnasio_id, rol_id, estado, origen_registro (invitacion/autoregistro), coach_solicitado_id, aprobado_por, aprobado_en", "Aprobaciones y los dos caminos de registro"],
     ["credencial_sensible", "usuario_id, pin_evaluaciones_hash, intentos_fallidos, bloqueado_hasta", "PIN para entrar a evaluaciones"],
     ["invitacion", "usuario_id, token_hash, expira_en, usada_en", ""],
     ["sesion_usuario", "usuario_id, token_hash, dispositivo, ip, expira_en, revocada_en", "Cerrar sesión en todos los dispositivos"],
     ["intento_login", "email, ip, exitoso, fecha", "Bloqueo ante ataques"],
     ["restablecer_password", "usuario_id, token_hash, expira_en, usado_en", ""],
     ["documento_legal", "gimnasio_id, tipo (deslinde / aviso_privacidad / reglamento / declaracion_salud), version, contenido, vigente_desde, obligatorio", "Versiones de textos legales"],
     ["aceptacion_documento", "usuario_id, documento_id, aceptado_en, ip, dispositivo, firma_url, nombre_tutor, firma_tutor", "Prueba de aceptación y firma"],
     ["disciplina", "gimnasio_id, nombre, activo", "Base de la replicabilidad"]], [1.3, 3, 1.6])
h2("4.2 Operación")
tbl([["Tabla", "Columnas clave", "Notas"],
     ["perfil_coach", "usuario_rol_id, bio, especialidad, fecha_contratacion, estado_contrato", ""],
     ["acuerdo_comision", "coach_id, porcentaje, tipo (inscripcion/recurrente), vigente_desde, vigente_hasta", "Historial de comisiones"],
     ["dia_operacion", "gimnasio_id, dia_semana, activo", "Por defecto lunes a viernes; cada gimnasio lo cambia"],
     ["franja_horaria", "gimnasio_id, hora_inicio, hora_fin, orden, activo", "Franjas de 2 h; en este gimnasio 7, de 8:00 a 22:00"],
     ["asignacion_horario", "coach_id, franja_id, dia_semana, disciplina_id, cupo_max, vigente_desde, vigente_hasta", "Única por (coach, franja, día): <b>varios coaches por franja</b>"],
     ["perfil_cliente", "usuario_rol_id, fecha_nacimiento, contacto_emergencia (cifrado), notas_medicas (cifrado), fecha_ingreso", ""],
     ["asignacion_coach_cliente", "cliente_id, coach_id, asignacion_horario_id, desde, hasta, motivo", "Historial; coach actual = hasta vacío"]], [1.3, 3, 1.6])
h2("4.3 Membresías y pagos")
tbl([["Tabla", "Columnas clave", "Notas"],
     ["plan_membresia", "gimnasio_id, disciplina_id, nombre, duracion_dias, precio, activo", "Mensual, trimestral…"],
     ["pago", "cliente_id, plan_id, monto, metodo, fecha_pago, reportado_por, comprobante_url, estado (reportado/confirmado/rechazado), revisado_por, revisado_en, motivo_rechazo", "El coach reporta, la administración confirma"],
     ["periodo_membresia", "cliente_id, pago_id, fecha_inicio, fecha_fin", "Activo si hoy está dentro del periodo"],
     ["comision", "coach_id, pago_id, acuerdo_id, porcentaje_aplicado, monto, liquidacion_id", "Se crea con PagoConfirmado"],
     ["liquidacion_coach", "coach_id, mes, total, estado (abierta/pagada), pagada_en", "Corte mensual"]], [1.3, 3, 1.6])
h2("4.4 Evaluación")
tbl([["Tabla", "Columnas clave", "Notas"],
     ["pilar", "disciplina_id, padre_id, nombre, peso_en_padre, orden", "Táctica y Adaptabilidad cuelgan de Estrategia"],
     ["test", "pilar_id, nombre, protocolo, equipo, formula, intentos, mayor_es_mejor, descanso_seg, escenario, tope_indice, relativo_al_peso, requiere_equipo, estado", "Fórmulas: mejor_intento, promedio_central, retencion, diferencia, cm_a_ms, rubrica"],
     ["test_campo", "test_id, codigo, etiqueta, unidad", "Ej.: G1 y G3; FC_pico y FC_60"],
     ["rubrica_criterio", "test_id, subpilar_id, nombre, escala (0-1-2), orden", ""],
     ["rubrica_nivel", "criterio_id, nivel, descripcion, video_url", "Descripción de cada nivel"],
     ["referencia_nivel", "test_id, nivel (inicial/intermedio/avanzado), desde, hasta", "Solo referencia para la administración"],
     ["bateria", "gimnasio_id, version, nombre, tipo (nucleo/extendida), vigente_desde, vigente_hasta, estado", ""],
     ["bateria_test", "bateria_id, test_id, peso_en_pilar, orden_ejecucion, obligatorio", ""],
     ["sesion_evaluacion", "cliente_id, coach_id, evaluador_id, bateria_id, tipo (inicial/mensual), periodo, apto, companero_sparring_id, companero_habitual, estado (en_curso/completa/parcial/anulada), iniciada_en, finalizada_en", "Una mensual completa por cliente y mes"],
     ["linea_base_cliente", "cliente_id, test_id, sesion_id, valor_base, vigente_desde, reiniciada_por, motivo", "Punto de partida por test"],
     ["protocolo_cliente", "cliente_id, test_id, parametro, valor", "Carga o equipo fijo de su línea base"],
     ["medicion_corporal", "sesion_id, tipo (peso/estatura/cintura), valor, unidad", ""],
     ["resultado_intento", "sesion_id, test_id, campo_id, intento_n, valor, capturado_en", "Datos crudos"],
     ["resultado_rubrica", "sesion_id, criterio_id, nivel", "Sin comentarios"],
     ["puntaje_test", "sesion_id, test_id, valor_final, valor_base, indice", "Foto fija"],
     ["puntaje_pilar", "sesion_id, pilar_id, indice, completo", "Foto fija"],
     ["resultado_coach_mes", "coach_id, periodo, pilar_id, n_clientes, indice_promedio, cobertura_pct", "Resultado general del coach"]], [1.3, 3, 1.6])
h2("4.5 Biblioteca y plan de trabajo")
tbl([["Tabla", "Columnas clave", "Notas"],
     ["categoria_ejercicio", "disciplina_id, nombre, orden", "Técnica ofensiva, defensa, desplazamiento…"],
     ["ejercicio", "gimnasio_id, categoria_id, nombre_oficial, descripcion, ejecucion, errores_comunes, nivel, pilar_id, variacion_de_id, diferencia_variacion, estado (propuesto/formalizado/archivado), visibilidad (privado/seleccion/compartido), creado_por, formalizado_por, formalizado_en, fusionado_en_id", "El coach propone nombre y descripción; la administración formaliza"],
     ["ejercicio_alias", "ejercicio_id, nombre, nombre_normalizado, tipo", "Nombres secundarios; detecta duplicados"],
     ["ejercicio_media", "ejercicio_id, tipo, url, orden, subido_por", "Solo administración"],
     ["equipo / ejercicio_equipo", "nombre", "Filtros"],
     ["permiso_biblioteca", "coach_id, nivel (solo_propios/consulta_compartida), otorgado_por, otorgado_en, revocado_en", ""],
     ["ejercicio_compartido_con", "ejercicio_id, coach_id", "Compartir con coaches específicos"],
     ["rutina", "coach_id, nombre, descripcion, duracion_min, pilar_id (opcional), estado", "Sesión de 2 h"],
     ["rutina_bloque", "rutina_id, orden, tipo, minutos, rounds, descripcion", ""],
     ["bloque_ejercicio", "rutina_bloque_id, ejercicio_id, orden, series, repeticiones_o_tiempo, notas", "Une rutinas con la biblioteca"],
     ["plan_trabajo", "coach_id, mes, es_fijo, version, basado_en_plan_id, estado (borrador/enviado/aprobado/requiere_cambios), revisado_por, revisado_en, comentario", "Un plan por coach por mes"],
     ["plan_turno", "plan_id, asignacion_horario_id, rutina_id, semana (opcional)", "Qué rutina va en cada turno"]], [1.3, 3, 1.6])
h2("4.6 Novedades y transversales")
tbl([["Tabla", "Columnas clave", "Notas"],
     ["publicacion", "gimnasio_id, tipo (anuncio/evento/sparring/felicitacion/pelea/reunion/dia_prueba), titulo, cuerpo, imagen_url, autor_id, audiencia, fijada, publicada_en, expira_en, estado", ""],
     ["evento", "publicacion_id, inicio, fin, lugar, cupo, requiere_inscripcion", ""],
     ["inscripcion_evento", "evento_id, usuario_id, estado", ""],
     ["mencion", "publicacion_id, usuario_id", "Felicitaciones"],
     ["emparejamiento_sparring", "evento_id, peleador_a, peleador_b, rounds, notas", "Fase posterior"],
     ["notificacion", "usuario_id, tipo, mensaje, enlace, leida", ""],
     ["auditoria", "usuario_id, accion, entidad, entidad_id, antes, despues, ip, fecha", "Solo inserción; nunca se edita"]], [1.3, 3, 1.6])

# ---------------- 5 ----------------
story.append(PageBreak())
h1("5. Flujos principales")
tbl([["Flujo", "Pasos"],
     ["Alta de coach", "Se registra → queda pendiente → la administración aprueba → define comisión → asigna turnos"],
     ["Alta de cliente (invitación)", "Coach o admin lo da de alta → enlace de 48 h → crea contraseña → acepta documentos y firma → activo"],
     ["Alta de cliente (registro propio)", "Llena datos → verifica correo → elige coach → acepta documentos y firma → pendiente → coach o admin aprueba"],
     ["Pago", "Coach reporta con foto del comprobante → cliente ve \"en revisión\" → admin confirma → se crean periodo y comisión"],
     ["Evaluación", "Admin pulsa Comenzar evaluación → PIN → elige cliente (coach automático) → check-in → tests → resumen → guardar y publicar"],
     ["Plan de trabajo", "Día 25: \"¿mantienes tu plan?\" → mantener (se renueva aprobado) o cambiar → enviar → admin aprueba o pide cambios"],
     ["Ejercicio", "Coach propone nombre y descripción → lo usa de inmediato → admin formaliza, fusiona o archiva"]], [1.4, 4])

# ---------------- 6 ----------------
h1("6. Sistema de evaluación")
p("La realiza <b>solo la administración</b>: una <b>evaluación inicial</b> y una <b>mensual</b> para todos los clientes. "
  "Los tests son internos; el cliente y el coach solo ven <b>resultados por pilar</b>, sin retroalimentación.")
h2("6.1 Pilares")
mono("""1. Fuerza          2. Velocidad          3. Resistencia
4. Estrategia ── 4.1 Táctica (50%)  ── 4.2 Adaptabilidad (50%)""")
h2("6.2 Batería núcleo v1 (mensual, ~39 min)")
tbl([["#", "Pilar", "Test", "Captura", "Resultado", "Peso"],
     ["1", "Velocidad", "2.1 Sprint en costal 6 s", "2 intentos; contador táctil: se cuenta el cross y se multiplica ×2", "Mejor intento (golpes)", "60"],
     ["2", "Velocidad", "2.4 Cuadrantes 15 s", "2 intentos: toques limpios y pisadas", "Mejor (toques − pisadas)", "40"],
     ["3", "Fuerza", "1.1 Salto horizontal", "3 intentos en cm; nulos marcados", "Mejor intento (cm)", "50"],
     ["4", "Fuerza", "1.3 Flexiones con despegue 30 s", "Repeticiones válidas", "Repeticiones", "50"],
     ["5", "Estrategia", "4.1 Escenario A · Presión (2 min)", "5 conductas, escala 0-1-2", "Rúbrica", "—"],
     ["6", "Estrategia", "4.1 Escenario B · Jab (2 min)", "5 conductas, escala 0-1-2", "Rúbrica", "—"],
     ["7", "Resistencia", "3.1 Drop-off → Retención", "Golpes en sprints del asalto 1 (G1) y 3 (G3)", "G3 ÷ G1 × 100", "60"],
     ["8", "Resistencia", "3.5 Recuperación cardíaca", "FC pico al terminar el asalto 3 y FC a los 60 s (pulsómetro)", "ΔFC (lpm)", "40"]],
    [0.3, 0.9, 1.6, 2.2, 1.3, 0.45])
mono("""Check-in + peso 3' → Calentamiento 8' → Velocidad 7' → Fuerza 6'
→ Estrategia 6' → Resistencia 9'   (resistencia siempre al final)""")
h2("6.3 Rúbrica de estrategia (0 = No, 1 = A veces, 2 = Consistente)")
tbl([["Escenario A · Presión", "Subpilar", "Escenario B · Jab", "Subpilar"],
     ["1 Salida de cuerdas", "Adaptabilidad", "5 Disciplina de mentón", "Táctica"],
     ["2 Eje de retirada", "Adaptabilidad", "6 Neutralización del jab", "Adaptabilidad"],
     ["3 Anticipación mecánica", "Táctica", "7 Contragolpe en un solo tiempo", "Adaptabilidad"],
     ["4 Fintas previas", "Táctica", "9 Retorno a guardia", "Táctica"],
     ["8 Ángulos de salida", "Táctica", "10 Consistencia en fatiga (últimos 30 s)", "Adaptabilidad"]], [1.8, 1, 2, 1])
p("Táctica = 5 conductas (0–10). Adaptabilidad = 5 conductas (0–10). Estrategia = promedio de ambas.")
h3("Compañero de sparring: fijo, pero sin depender de él")
bl(["Se usa un <b>compañero habitual</b> entrenado en el guion: en A camina hacia adelante sin golpear; en B lanza un jab cada 2–3 s a intensidad controlada. Careta y guantes de 16 oz obligatorios.",
    "Si no está disponible, la administración elige un <b>sustituto de nivel similar</b> de una lista autorizada. La sesión registra quién fue el compañero y si era el habitual, para tenerlo en cuenta al comparar.",
    "Si no hay compañero, se guardan los otros tres pilares y la sesión queda <b>parcial</b>: Estrategia se completa otro día del mismo mes y se publica al completarse. El resto de los resultados no espera."])
h2("6.4 Cálculo contra la condición inicial")
tbl([["Tipo de resultado", "Índice (evaluación inicial = 100)"],
     ["Conteos, cm, retención, ΔFC (mayor es mejor)", "actual ÷ inicial × 100"],
     ["Tiempos (menor es mejor, batería extendida)", "inicial ÷ actual × 100"],
     ["Rúbrica 0–10", "100 + (actual − inicial) × 10  (funciona aunque el inicial sea 0)"]], [2.2, 3])
bl(["<b>Pilar</b> = promedio ponderado de los índices de sus tests. <b>Estrategia</b> = Táctica 50% + Adaptabilidad 50%.",
    "<b>Línea base por test</b>: un test nuevo toma como base la primera vez que el cliente lo hace y entra al pilar desde su segunda medición.",
    "<b>Tope</b> de 150 por test; <b>alerta</b> si cambia más de ±40% contra el mes anterior.",
    "<b>Protocolo fijo por cliente</b>: misma carga y equipo que en su línea base.",
    "<b>Reinicio de línea base</b> con motivo (regreso tras 3+ meses o lesión); el historial se conserva.",
    "Si falta un test obligatorio, ese pilar no se publica. Sin pulsómetro, la recuperación cardíaca queda como \"no realizado\"."])
h2("6.5 Resultado del coach")
bl(["<b>Índice promedio por pilar</b> de sus clientes y su mejora mes a mes (se mide avance, no nivel absoluto).",
    "<b>Cobertura</b>: % de clientes activos evaluados en el mes.",
    "Se compara con otros coaches solo con 3 o más clientes evaluados."])
h2("6.6 Protocolo de la sesión")
tbl([["Etapa", "Qué se hace"],
     ["Inicio", "Admin pulsa Comenzar evaluación, ingresa PIN y elige al cliente. Coach y tipo (inicial/mensual) se asignan solos."],
     ["Check-in", "¿Lesión o dolor? ¿Durmió bien? ¿Comió en 3 h? Si hay riesgo: no apto y se reprograma. Peso en la misma báscula."],
     ["Ejecución", "Calentamiento estándar, orden fijo, mismo equipo y descansos. Protocolo en pantalla, cronómetro y contador integrados."],
     ["Cierre", "Resumen con índices y alertas de valores atípicos. Guardar y publicar: notificación al cliente y resultado al coach."],
     ["Correcciones", "Solo con motivo; quedan en auditoría. Una mensual por mes; repetir requiere motivo. Se puede pausar y continuar."]], [1, 4])
h2("6.7 Referencia de niveles (solo administración)")
tbl([["Test", "Inicial", "Intermedio", "Avanzado"],
     ["Salto horizontal", "< 190 cm", "190–230", "> 230"],
     ["Flexiones con despegue 30 s", "≤ 16", "17–24", "≥ 25"],
     ["Sprint en costal 6 s", "≤ 28", "29–35", "≥ 36"],
     ["Cuadrantes 15 s", "≤ 20", "21–27", "≥ 28"],
     ["Retención drop-off", "< 77%", "77–87%", "> 87%"],
     ["Recuperación cardíaca", "≤ 25 lpm", "26–40", "> 40"],
     ["Táctica / Adaptabilidad (0–10)", "0–4", "5–7", "8–10"]], [2.2, 1, 1, 1])
h2("6.8 Batería extendida (catálogo inactivo)")
tbl([["Test", "Ajuste"],
     ["1.2 Dominadas", "Variante con banda fija si la base es 0"],
     ["1.4 Ground-to-overhead", "Solo con técnica validada (riesgo lumbar)"],
     ["1.5 Elevaciones colgado", "Sin cambios"],
     ["2.2 Mancuernas al aire", "Conteo con video en cámara lenta"],
     ["2.3 Reacción (regla)", "Conversión cm → ms automática; promedio de los 3 intentos centrales de 5"],
     ["3.2 Combat burpee", "Sin cambios"],
     ["3.3 Suspensión en barra", "Sin cambios"],
     ["3.4 Paseo del granjero", "Carga fija desde la línea base; si no completa, metros recorridos"]], [1.8, 4])

# ---------------- 7 ----------------
story.append(PageBreak())
h1("7. Biblioteca de ejercicios y plan de trabajo")
h2("7.1 Glosario del boxeo")
p("La biblioteca abre con un <b>glosario</b>: los golpes y los ejercicios básicos con un nombre oficial, sus nombres "
  "alternos y una <b>ilustración sencilla</b>. Su función es que todos usen las mismas palabras. Tiene dos partes separadas "
  "y lo mantiene la administración; los coaches lo consultan siempre, sin permiso especial.")
h3("Golpes")
tbl([["Número", "Nombre oficial", "Nombres alternos (ejemplo)", "Mano"],
     ["1", "Jab", "Directo de adelante, recto", "Adelante"],
     ["2", "Recto de atrás", "Cross, directo de atrás", "Atrás"],
     ["1-2", "Uno-dos", "Jab-cross", "Combinación básica"],
     ["3", "Gancho de adelante", "Hook de adelante", "Adelante"],
     ["4", "Gancho de atrás", "Hook de atrás", "Atrás"],
     ["5", "Uppercut de adelante", "Gancho ascendente, upper", "Adelante"],
     ["6", "Uppercut de atrás", "Gancho ascendente de atrás", "Atrás"],
     ["1c", "Jab al cuerpo", "Directo al cuerpo, jab abajo", "Adelante"],
     ["3c", "Gancho al hígado", "Gancho de adelante al cuerpo", "Adelante"],
     ["4c", "Gancho al cuerpo (lado contrario)", "Gancho de atrás al cuerpo, al bazo", "Atrás"],
     ["V", "Volado", "Overhand, golpe en arco por arriba", "Atrás"]], [0.7, 1.6, 2.2, 1.2])
note("La numeración cambia entre escuelas; la del gimnasio es la oficial y se puede ajustar. La letra c indica el golpe al cuerpo. En las ilustraciones, rojo = mano de adelante y dorado = mano de atrás.")
h3("Ejercicios básicos")
tbl([["Ejercicio", "En qué consiste", "Ejemplo en rutina"],
     ["Manopleo", "Combinaciones y defensa con el coach usando manoplas", "6 rounds de manopleo grupal"],
     ["Gobernadora", "Golpes fuertes contra la colchoneta", "4 rounds de gobernadora en parejas"],
     ["Perillas", "Ritmo, coordinación y resistencia de hombros", "3 rounds de perilla"],
     ["Costal", "Potencia y volumen de golpeo por rounds", "6 × 3 min de costal"],
     ["Sombra", "Técnica sin implemento, frente al espejo", "3 rounds de sombra"],
     ["Cuerda", "Ritmo de pies y resistencia", "3 × 3 min de cuerda"]], [1.1, 2.6, 2])
bl(["Los ejercicios básicos son <b>ejercicios registrados</b> de la biblioteca marcados como básicos: se usan directo en las rutinas (ej. \"6 rounds de manopleo grupal\").",
    "Al escribir una combinación en una rutina (\"1-2-3\"), la app muestra los nombres oficiales de cada golpe.",
    "La detección de duplicados también revisa los nombres alternos del glosario."])
tbl([["Tabla / campo", "Columnas clave", "Notas"],
     ["golpe", "disciplina_id, codigo (ej. \"1\", \"1-2\"), nombre_oficial, mano (adelante/atrás/combinación), descripcion, ilustracion_url, orden", "Precargado desde la plantilla de la disciplina"],
     ["golpe_alias", "golpe_id, nombre, nombre_normalizado", "Nombres alternos"],
     ["ejercicio.es_basico", "booleano", "Lo muestra en el glosario"],
     ["ejercicio_golpe", "ejercicio_id, golpe_id", "Qué golpes trabaja cada ejercicio"],
     ["bloque_ejercicio.modalidad", "individual / parejas / grupal", "Para \"manopleo grupal\""]], [1.4, 3, 1.5])
h2("7.2 Biblioteca de ejercicios")
bl(["El coach <b>propone</b> un ejercicio solo con nombre y descripción, y puede usarlo de inmediato en sus rutinas.",
    "La administración lo <b>formaliza</b>: nombre oficial, nombres secundarios, variaciones, ejecución, errores comunes, equipo e ilustraciones. O lo <b>fusiona</b> con uno existente (el nombre queda como alias y las rutinas se actualizan solas).",
    "Al escribir un nombre, la app sugiere ejercicios parecidos para evitar duplicados.",
    "Visibilidad por ejercicio: privado (autor y admin), selección (coaches elegidos) o compartido (coaches con permiso). El acceso a la biblioteca compartida lo otorga la administración.",
    "Cada ejercicio guarda quién lo aportó."])
h2("7.3 Plan de trabajo del coach")
p("Responde solo a: <b>¿qué haré en cada uno de mis turnos?</b> No depende de los pilares (pueden usarse como etiqueta opcional).")
mono("""Ejemplo: coach con L-M-V de 06-08 y 08-10
            Lunes          Miércoles        Viernes
06-08   A Técnica y     B Manoplas y     C Sparring
        saco            acondicionam.    controlado
08-10   A (repetida)    B (repetida)     C (repetida)""")
bl(["El coach arma su biblioteca de rutinas (bloques con ejercicios) y asigna una a cada turno; \"aplicar también a\" la repite en otros turnos.",
    "El plan puede ser <b>fijo</b>: el día 25 la app pregunta \"¿mantienes tu plan?\". Si lo mantiene, se renueva aprobado; si cambia algo, solo los cambios van a revisión y mientras tanto sigue vigente el anterior.",
    "Puede intercambiar o agregar rutinas, o alternar por semana.",
    "La administración ve solo las diferencias contra el mes anterior y aprueba o pide cambios. El coach ve su plan, su historial y su estado."])

# ---------------- 8 ----------------
h1("8. Novedades")
p("Sección de publicaciones con tipo: anuncio, evento, sparring, felicitación, pelea, reunión o día de prueba. "
  "Pueden tener fecha, cupo e inscripción, mencionar a un cliente para felicitarlo, fijarse arriba y expirar. "
  "La audiencia se elige: todos, coaches, clientes o público (visible en la vista inicial).")

# ---------------- 9 TALENTOS ----------------
story.append(PageBreak())
h1("9. Detección de talentos")
p("Módulo <b>solo para la administración</b> para identificar a los clientes con mayor proyección competitiva, "
  "darles seguimiento y llevarlos, si así se decide, al boxeo amateur y profesional. El sistema <b>sugiere</b>; "
  "la decisión siempre es de la administración. El cliente no ve este módulo, en línea con la regla de no dar retroalimentación.")
h2("9.1 Señales que se combinan")
tbl([["Señal", "Qué mide", "De dónde sale", "Peso inicial"],
     ["Ritmo de mejora", "Qué tan rápido sube su índice global mes a mes (pendiente de las últimas 3–6 evaluaciones)", "puntaje_pilar", "30%"],
     ["Nivel absoluto", "% de tests núcleo en nivel Avanzado según la referencia de la administración", "puntaje_test + referencia_nivel", "25%"],
     ["Inteligencia de combate", "Táctica y Adaptabilidad en valor absoluto (0–10): lo más difícil de enseñar", "resultado_rubrica", "25%"],
     ["Contexto", "Mismo nivel con menos edad o menos meses entrenando = más potencial", "perfil_cliente, fecha_ingreso", "10%"],
     ["Constancia", "Meses con membresía activa sin interrupción y evaluaciones completas", "periodo_membresia, sesion_evaluacion", "10%"]],
    [1.2, 2.6, 1.6, 0.8])
p("Resultado: <b>puntaje de proyección (0–100)</b>, con el desglose visible de cada señal para que la administración entienda por qué aparece cada cliente. "
  "Los pesos y umbrales son configurables.")
h2("9.2 Reglas de justicia")
bl(["<b>Comparación por cohorte</b>: los principiantes mejoran rápido al inicio por naturaleza. El ritmo de mejora se compara contra clientes con los <b>mismos meses entrenando</b> (percentil dentro de su cohorte), no contra todos.",
    "<b>Elegibilidad mínima</b>: 3 evaluaciones mensuales completas antes de aparecer en el ranking.",
    "<b>Mismas condiciones</b>: solo cuentan sesiones con protocolo completo; las sesiones con compañero de sparring sustituto se marcan.",
    "<b>Menores de edad</b>: el seguimiento competitivo requiere autorización del tutor."])
h2("9.3 Etapas de seguimiento")
mono("""Observación → Prospecto → Plan competitivo → Amateur → Profesional
                     (cualquier etapa puede pasar a Descartado, con motivo)""")
bl(["El <b>coach puede nominar</b> a un cliente (con motivo); la nominación llega a la administración, que decide la etapa.",
    "Cada cambio de etapa guarda fecha, quién lo decidió y el motivo: queda la historia completa del atleta.",
    "En etapa <b>Plan competitivo</b> o superior se registran sparrings evaluados y combates (rival, nivel, rounds, resultado) para medir el rendimiento en condiciones reales de pelea."])
h2("9.4 Tablas nuevas")
tbl([["Tabla", "Columnas clave", "Notas"],
     ["configuracion_talento", "gimnasio_id, peso_mejora, peso_nivel, peso_estrategia, peso_contexto, peso_constancia, min_evaluaciones, vigente_desde", "Pesos y umbrales editables"],
     ["perfil_talento_mes", "cliente_id, periodo, ritmo_mejora, percentil_cohorte, nivel_absoluto_pct, estrategia_abs, factor_contexto, constancia_pct, puntaje_proyeccion, elegible", "Foto mensual al publicarse la evaluación"],
     ["seguimiento_talento", "cliente_id, etapa, desde, decidido_por, motivo", "Historial de etapas"],
     ["nominacion_talento", "cliente_id, coach_id, fecha, motivo, estado (pendiente/aceptada/rechazada)", "Propuesta del coach"],
     ["registro_combate", "cliente_id, tipo (sparring_evaluado/amateur/profesional), fecha, rival, nivel_rival, rounds, resultado, evento_id", "Se puede ligar a un evento de Novedades"]],
    [1.3, 3, 1.6])
h2("9.5 Cómo mejora el sistema con el tiempo")
bl(["Con los datos de combate se puede revisar qué tests predicen mejor el rendimiento real en el ring, y ajustar pesos y baterías con evidencia propia del gimnasio.",
    "Los registros de sparrings y peleas también sirven para afinar la rúbrica de estrategia y acercar las evaluaciones a la realidad de una pelea."])

# ---------------- 10 FINANZAS ----------------
story.append(PageBreak())
h1("10. Finanzas de la administración: relación de ingresos")
p("Relación del dinero que entra al gimnasio, para el reporte de finanzas. <b>Solo se registran ingresos</b>; los gastos del "
  "gimnasio no se llevan en el sistema. Casi todo se registra <b>solo</b> a partir de los pagos confirmados.")
h2("10.1 De dónde salen los ingresos")
tbl([["Origen", "Cómo se registra", "Concepto"],
     ["Pago de cliente confirmado", "Automático, en la cuenta donde entró el dinero", "Membresía (según el plan)"],
     ["Pago reportado sin confirmar", "Se muestra como ingreso por confirmar; no suma hasta confirmarse", "—"],
     ["Otro ingreso", "Manual, con comprobante", "Eventos, clases de prueba, venta de equipo, otros"]], [1.8, 2.6, 1.6])
h2("10.2 Reglas")
bl(["Varias <b>cuentas</b> donde entra el dinero: caja en efectivo, banco y pagos digitales.",
    "Los ingresos <b>nunca se borran</b>: se anulan con motivo y quedan en la auditoría.",
    "<b>Cierre mensual</b>: al cerrar un mes se congelan sus cifras; corregir algo después exige reabrirlo con motivo.",
    "Los conceptos de ingreso son configurables por gimnasio.",
    "Las comisiones de los coaches siguen en su propio módulo (liquidaciones), fuera de esta relación."])
h2("10.3 Reportes")
bl(["<b>Ingresos del mes</b> por concepto, por plan, por cuenta, por método de pago y por coach (de las membresías de sus clientes).",
    "<b>Por confirmar</b>: pagos reportados que aún no entran.",
    "<b>Esperado</b>: membresías que vencen en los próximos 30 días (ingreso posible por renovaciones).",
    "<b>Comparativo</b> de los últimos 12 meses.",
    "Exportación a PDF y Excel."])
h2("10.4 Tablas nuevas")
tbl([["Tabla", "Columnas clave", "Notas"],
     ["cuenta_financiera", "gimnasio_id, nombre, tipo (efectivo/banco/digital), activo", "Dónde entra el dinero"],
     ["concepto_ingreso", "gimnasio_id, nombre, es_automatico", "Configurable"],
     ["ingreso", "gimnasio_id, cuenta_id, concepto_id, monto, fecha, metodo, descripcion, origen (pago/manual), pago_id, comprobante_url, registrado_por, anulado_en, motivo_anulacion", "La relación de ingresos"],
     ["cierre_mensual", "gimnasio_id, periodo, total_ingresos, cerrado_por, cerrado_en, reabierto_por, motivo", "Congela el mes"]], [1.3, 3, 1.6])
p("Además, <b>pago</b> suma <b>cuenta_id</b> (en qué cuenta entró el dinero al confirmarse).")

# ---------------- 11 SISTEMA ----------------
story.append(PageBreak())
h1("11. Panel del sistema y cobro del servicio")
p("Interfaz del <b>superadmin</b> (dueño del sistema) para ver todos los gimnasios de forma muy general y, cuando sea "
  "necesario, cobrar el servicio a cada administración. Tu propio gimnasio puede quedar como <b>cortesía</b> (sin cobro).")
h2("11.1 Qué muestra")
tbl([["Bloque", "Contenido"],
     ["Gimnasios", "Estado, plan contratado, clientes activos, coaches, último acceso de la administración"],
     ["Cobro del servicio", "Suscripciones al día, por vencer y vencidas; pagos reportados por cada administración para confirmar"],
     ["Métricas por gimnasio", "Índice promedio de los 4 pilares y cobertura de evaluación"],
     ["Métricas por coach", "Al abrir un gimnasio: índice promedio por pilar de cada coach y número de clientes"],
     ["Métricas por cliente", "Al abrir un coach: solo índices por pilar, sin datos personales ni de salud"],
     ["Salud del sistema", "Respaldos, errores, almacenamiento usado"]], [1.4, 4])
bl(["Todo es de <b>lectura</b> y agregado; el superadmin no modifica datos de un gimnasio desde aquí.",
    "Bajar al nivel de cliente queda registrado en la auditoría.",
    "Si una suscripción vence, se avisa a la administración y, tras un periodo de gracia configurable, el gimnasio pasa a solo lectura (nunca se borran datos)."])
h2("11.2 Tablas nuevas")
tbl([["Tabla", "Columnas clave", "Notas"],
     ["plan_servicio", "nombre, precio_mensual, limite_clientes, limite_coaches, activo", "Planes que ofreces"],
     ["suscripcion_gimnasio", "gimnasio_id, plan_id, inicio, fin, estado (activa/por_vencer/vencida/cortesia/suspendida), dias_gracia", ""],
     ["pago_servicio", "gimnasio_id, suscripcion_id, monto, fecha, metodo, comprobante_url, estado (reportado/confirmado/rechazado), confirmado_por", "La administración reporta, el superadmin confirma"],
     ["metrica_gimnasio_mes", "gimnasio_id, periodo, clientes_activos, coaches_activos, indice_promedio_por_pilar, cobertura_pct", "Vista materializada para el panel"]], [1.3, 3, 1.6])

# ---------------- 12 ----------------
h1("12. Interfaces por usuario")
p("Estilo: modo oscuro con acento del color del gimnasio, números grandes, tarjetas claras y semáforo de estado "
  "(verde activo, amarillo vence en 7 días o menos, rojo vencido). Coach y cliente usan el celular; la administración, escritorio o tablet.")
tbl([["Usuario", "Navegación", "Pantallas clave"],
     ["Vista pública", "Una página", "Disciplinas, horarios, novedades públicas, clase de prueba, iniciar sesión, registrarse como cliente o coach"],
     ["Superadmin", "Menú lateral: Panel · Gimnasios · Cobros · Métricas · Sistema", "Resumen de gimnasios y cobros; métricas de pilares por gimnasio, coach y cliente; pagos del servicio por confirmar; salud del sistema"],
     ["Administración", "Menú lateral: Inicio · Horario · Coaches · Clientes · Pagos · Finanzas · Evaluaciones · Talentos · Planes · Biblioteca · Novedades · Configuración",
      "Inicio con indicadores y pendientes; cuadrícula de horario solo con los días que opera el gimnasio y varios coaches por celda; relación de ingresos por cuenta, concepto y coach; bandeja de pagos; modo evaluación en tablet; revisión de planes por diferencias; biblioteca con Por formalizar / Catálogo / Permisos"],
     ["Coach", "Menú inferior: Hoy · Mi plan · Clientes · Biblioteca · Más",
      "Turnos del día con rutina; cuadrícula de su plan; clientes con semáforo y resultados por pilar; reportar pago en 3 toques; comisiones; su resultado general"],
     ["Cliente", "Menú inferior: Inicio · Resultados · Novedades · Perfil",
      "Anillo de días restantes y estado; su coach y turno; radar de 4 pilares (inicio contra hoy) e historial; novedades e inscripciones"]], [1, 1.7, 3])

# ---------------- 10 ----------------
story.append(PageBreak())
h1("13. Infraestructura, seguridad y respaldos")
h2("10.1 Etapa de prueba (costo $0)")
tbl([["Componente", "Servicio", "Nota"],
     ["App web y API", "Google Cloud Run (capa gratuita)", "Alerta de presupuesto en $1"],
     ["Base de datos", "Neon PostgreSQL (plan gratuito)", "Mismo motor que producción"],
     ["Archivos", "Google Cloud Storage (capa gratuita)", "Comprobantes y fotos privados"],
     ["Respaldo", "Tu Google Drive", "Exportación nocturna cifrada, 30 días"]], [1.3, 2, 2])
note("Limitaciones: sin garantía de disponibilidad, recuperación a un punto en el tiempo de solo horas, primera carga lenta tras inactividad. Los límites gratuitos cambian y se revisan al montar.")
h2("10.2 Producción (después de la prueba)")
p("App en Vercel o Render; PostgreSQL administrado (Supabase o AWS RDS) con recuperación a un punto en el tiempo; "
  "almacenamiento con versionado. Migración: exportar e importar la base y cambiar conexiones, sin tocar la lógica del negocio.")
h2("10.3 Seguridad")
tbl([["Área", "Medidas"],
     ["Acceso", "Contraseñas con Argon2id; 2FA obligatorio para superadmin y admin; PIN de evaluaciones que vence a los 15 min; bloqueo tras 5 intentos; sesiones revocables"],
     ["Aislamiento", "Permisos por rol en la API y Row Level Security en la base de datos (doble candado)"],
     ["Cifrado", "HTTPS en todo; disco cifrado; notas médicas y contacto de emergencia cifrados por campo; archivos con enlaces temporales"],
     ["Integridad", "Pagos y evaluaciones nunca se borran, se anulan con motivo; auditoría solo de inserción; usuario de BD con mínimo privilegio; secretos fuera del código"],
     ["Ambientes", "Desarrollo, pruebas y producción separados; nunca se prueba con datos reales"]], [1, 4])
h2("10.4 Respaldo (regla 3-2-1)")
tbl([["Capa", "Qué hace", "Protege contra"],
     ["Recuperación a un punto en el tiempo", "Regresar la base a cualquier minuto de los últimos 7–30 días (en producción)", "Errores humanos"],
     ["Respaldo diario cifrado externo", "Otro proveedor y región, modo inmutable", "Caída del proveedor, hackeo, ransomware"],
     ["Archivos versionados", "Versionado y copia en otra región", "Archivos borrados o sobrescritos"]], [1.6, 2.4, 1.6])
bl(["Retención: 30 diarios, 12 mensuales, 1 anual por 5 años.",
    "<b>Prueba de restauración automática mensual</b> con reporte.",
    "Objetivos: perder como máximo minutos de datos; volver en línea en menos de 4 horas."])

# ---------------- 11 ----------------
h1("14. Aspectos legales")
bl(["En la inscripción (ambos caminos) hay un paso obligatorio de documentos: <b>deslinde de responsabilidad</b>, aviso de privacidad, reglamento y declaración de salud, con casilla y firma en pantalla. Sin esto la cuenta no se activa.",
    "Si un texto cambia, la app pide aceptar la nueva versión en el siguiente inicio de sesión.",
    "Menores de edad: firma del tutor.",
    "Un deslinde no cubre la negligencia del gimnasio; solo los riesgos propios del deporte. Se recomienda revisión por un abogado del país y un seguro de accidentes."])
h3("Borrador del deslinde")
p("<i>Yo, [nombre], declaro que practico [disciplina] de forma voluntaria y conozco que es una actividad de contacto físico "
  "que implica riesgos de lesión. Declaro estar en condiciones de salud aptas o haber informado mis padecimientos; me "
  "comprometo a seguir las indicaciones del coach, usar el equipo de protección y respetar el reglamento; deslindo a "
  "[gimnasio], su administración y su personal de cualquier responsabilidad por accidentes o lesiones derivados de la "
  "práctica normal de la actividad dentro de sus instalaciones y servicios; y autorizo primeros auxilios y el aviso a mi "
  "contacto de emergencia.</i>")

# ---------------- 12 ----------------
story.append(PageBreak())
h1("15. Plan de integración por fases")
mono("""Identidad ──► Operación ──► Membresías/Pagos
                 │                 │
                 ├──► Evaluación ◄─┘   SesionPublicada ─► Notificación + KPI coach
                 ├──► Biblioteca ──► Rutinas ──► Plan de trabajo
                 └──► Novedades
Eventos: CoachAprobado · PagoConfirmado → Periodo + Comisión · SesionPublicada
         PlanEnviado / PlanAprobado · EjercicioFormalizado""")
tbl([["Fase", "Contenido", "Resultado"],
     ["0. Cimientos", "Repositorio, estructura, migraciones, pruebas automáticas, despliegue gratuito, respaldo nocturno a Google Drive", "App vacía en línea con respaldos"],
     ["1. Identidad y acceso", "Vista pública, registro de coach y cliente (2 caminos), invitaciones, aprobaciones, documentos y firma, 2FA, roles y RLS", "Cada quien entra con su usuario"],
     ["2. Operación", "Franjas, horarios con varios coaches por turno, perfiles, asignación coach–cliente", "Horario real armado"],
     ["3. Membresías, pagos y finanzas", "Planes, reporte y confirmación de pagos, estado activo/vencido, comisiones, liquidación, relación de ingresos, cierre mensual y reportes", "Versión mínima usable"],
     ["4. Evaluación", "Catálogo, batería núcleo v1, modo evaluación, cálculo de índices con pruebas, publicación, vistas de cliente y coach, KPI", "Primera evaluación inicial real"],
     ["5. Biblioteca y planes", "Ejercicios, formalización, permisos, rutinas, plan mensual fijo con aprobación", "Coaches con plan aprobado"],
     ["6. Novedades", "Publicaciones, eventos, sparrings, inscripciones, menciones", "Comunicación interna"],
     ["7. Piloto", "Un mes de uso real con 1–2 coaches y sus clientes; ajustes", "Sistema probado en el gimnasio"],
     ["8. Migración", "Paso al plan pagado con PITR y respaldo inmutable", "Producción estable"],
     ["9. Talentos", "Puntaje de proyección, cohortes, etapas, nominaciones, registro de combates. Se activa cuando haya clientes con 3 evaluaciones mensuales", "Seguimiento de prospectos"],
     ["10. Panel del sistema", "Gimnasios, planes y suscripciones, pagos del servicio, métricas generales. Necesario al ofrecer el sistema a otros gimnasios", "Cobro del servicio"]], [1.2, 3.2, 1.5])
h2("Calidad en todas las fases")
bl(["Pruebas unitarias del dominio; las fórmulas de índice con casos reales (base 0, tope, atípicos, sesión parcial).",
    "Pruebas de punta a punta de registro, pago, evaluación y plan de trabajo.",
    "Auditoría activa desde la Fase 1; revisión de código en cada cambio."])

# ---------------- 13 ----------------
h1("16. Decisiones tomadas y pendientes")
h2("Tomadas")
tbl([["Tema", "Decisión"],
     ["Coaches por turno", "Varios coaches en la misma franja"],
     ["Registro de clientes", "Invitación del coach y registro propio, ambos"],
     ["Quién evalúa", "Solo la administración"],
     ["Frecuencia", "Inicial y mensual para todos"],
     ["Punto de partida", "La primera evaluación de cada cliente; referencias iguales para todos"],
     ["Lo que ve el coach", "Resultado por pilar de sus clientes y su resultado general"],
     ["Retroalimentación", "Ninguna; el cliente solo ve resultados"],
     ["Batería mensual", "Núcleo de 8 mediciones; extendida disponible pero inactiva"],
     ["Compañero de sparring", "Fijo, con sustituto registrado o sesión parcial si falta"],
     ["Pulsómetro", "Se consigue"],
     ["Plan de trabajo", "Por turnos del coach, mensual, fijo con opción de cambiar; aprobado por la administración"],
     ["Etapa de prueba", "Gratis con Google Cloud + Neon, respaldo a Google Drive; luego plan pagado"],
     ["Detección de talentos", "Módulo solo para la administración; el coach puede nominar"],
     ["Días de operación", "Lunes a viernes por defecto, configurable por gimnasio; la vista pública no fija días"],
     ["Finanzas", "Solo relación de ingresos (sin egresos): automáticos por pagos confirmados y manuales, con cierre mensual y reportes"],
     ["Panel del sistema", "Superadmin con cobro del servicio (opcional) y métricas generales por gimnasio, coach y cliente"],
     ["País y moneda", "México, peso mexicano (MXN); servidores en EE. UU. central, aviso de privacidad según la LFPDPPP"],
     ["Horario del gimnasio", "Lunes a viernes, 8:00 a 22:00: 7 franjas de 2 horas"],
     ["Coaches iniciales", "Mike, Chato e Iván"],
     ["Comisión", "50% para el coach de cada pago confirmado de sus clientes (inscripción y renovaciones); la administración la puede mover"],
     ["Deslinde", "Revisado por abogado"],
     ["Clientes", "Se registran desde cero; su pago vigente es el punto de arranque de su tiempo"]], [1.6, 4])
h2("Pendientes")
bl(["Si los coaches ven el ranking de todos o solo su lugar.",
    "Si el tiempo del cliente cuenta desde la fecha de pago reportada o desde la confirmación.",
    "Talentos: confirmar pesos del puntaje de proyección y edad mínima para seguimiento competitivo.",
    "Servicio del sistema: precios de los planes y método de cobro a otros gimnasios."])


story.append(PageBreak())
h1("17. Arranque y crecimiento")
h2("17.1 Lo que ya está listo")
tbl([["Qué", "Estado"],
     ["Proyecto en Google Cloud", "Creado: gimnasio-boxeo-1656, con facturación ligada"],
     ["Servicios activados", "Cloud Run, Cloud Storage, Secret Manager, Artifact Registry, Cloud Build, Cloud Scheduler"],
     ["Almacenamiento de archivos", "Depósito privado para comprobantes, firmas e ilustraciones"],
     ["Depósito de respaldos", "Privado, con versiones y 30 días de recuperación de borrados"],
     ["Alerta de presupuesto", "100 MXN al mes, con avisos al 1%, 50% y 100%: avisa ante el primer cargo"],
     ["Identidad para el código", "Git configurado a nombre de Iván"]], [1.8, 3.8])
h2("17.2 Lo que falta (lo hace el dueño)")
bl(["<b>Neon</b> (base de datos gratis): crear la cuenta en neon.tech con Google y un proyecto en la región de EE. UU.; la cadena de conexión se guarda directo en Secret Manager, nunca en el código ni en el chat.",
    "<b>GitHub</b>: crear la cuenta (o usar una existente) para guardar el código.",
    "<b>Correo</b> para invitaciones y recuperar contraseña (ej. Resend, gratis): se activa en la Fase 1.",
    "<b>Dominio</b> (opcional): se puede empezar con la dirección gratuita de Cloud Run."])
h2("17.3 Configuración inicial (datos semilla)")
tbl([["Dato", "Valor"],
     ["Gimnasio", "Boxeo, México, MXN, zona horaria America/Mexico_City"],
     ["Días de operación", "Lunes a viernes"],
     ["Franjas", "8–10, 10–12, 12–14, 14–16, 16–18, 18–20, 20–22"],
     ["Coaches", "Mike, Chato e Iván (Iván también es superadmin y admin)"],
     ["Comisión", "50% de cada pago confirmado"],
     ["Biblioteca", "Glosario (10 golpes + volado, 6 básicos) y batería núcleo v1"]], [1.6, 4])
h2("17.4 Alta de los clientes actuales")
p("No hay registro previo: cada cliente se da de alta desde cero. Durante el <b>arranque</b>, la administración puede "
  "registrar el <b>pago vigente</b> de cada cliente con su fecha real (aunque sea anterior al uso del sistema); su tiempo "
  "restante se calcula desde esa fecha, sin regalar ni quitar días. Esos pagos se marcan como <b>carga inicial</b>: "
  "cuentan para el estado del cliente pero no generan comisión de nuevo ni entran como ingreso del mes, si ya se "
  "pagaron antes. Al cerrar el arranque, todo pago nuevo sigue el flujo normal.")
h2("17.5 Preparada para cambiar")
p("Esta etapa de prototipo tendrá muchos cambios. La app se arma para recibirlos sin rehacer lo que ya funciona:")
bl(["<b>Roles por permisos</b>: cada rol es un conjunto de permisos (ej. <i>evaluacion.realizar</i>). Un rol nuevo se crea sin reprogramar.",
    "<b>Interruptores por gimnasio</b>: una función nueva se enciende en un gimnasio y en los demás no.",
    "<b>Tests y glosario como datos</b>: se editan desde la administración; un test cambiado crea una versión nueva y respeta el historial.",
    "<b>Cambios versionados</b>: cada cambio a la base de datos queda registrado y se puede revertir.",
    "<b>Entregas pequeñas</b>: cada cambio pasa pruebas automáticas y se publica en minutos."])
h3("Futuro: rol Evaluador")
tbl([["Aspecto", "Propuesta"],
     ["Alta", "Se registra y la administración lo aprueba, igual que un coach"],
     ["Permiso", "evaluacion.realizar, con PIN, solo en los gimnasios asignados"],
     ["Conflicto de interés", "Si también es coach, no evalúa a sus propios clientes"],
     ["Control", "Toda evaluación queda en la auditoría con quién la hizo"]], [1.6, 4])


h2("17.6 Comisión movible desde la administración")
p("En <b>Configuración → Comisiones</b> la administración cambia la comisión sin tocar el código:")
bl(["<b>Comisión general</b> del gimnasio (hoy 50%) y <b>excepciones por coach</b> (ej. un coach con 60%).",
    "Cada cambio pide <b>porcentaje, desde qué fecha aplica y motivo</b>. Aplica desde hoy en adelante, <b>nunca hacia atrás</b>: las comisiones ya generadas no cambian.",
    "El acuerdo anterior se cierra solo el día previo y queda en el <b>historial</b>; un cambio programado que aún no empieza se puede reemplazar.",
    "Al confirmar un pago se usa el acuerdo vigente ese día: primero la excepción del coach, si no la general.",
    "Solo roles con el permiso <i>comision.cambiar</i> (administración y superadmin). Cada cambio queda en la auditoría con el antes y el después.",
    "El coach ve su porcentaje vigente y sus comisiones, no el de los demás."])

story.append(PageBreak())
h1("18. Instructivo de uso por rol")
p("Cada persona recibe una introducción a la app según su rol, y una sección de <b>Ayuda</b> siempre a la mano. "
  "El contenido es editable por la administración, así acompaña los cambios de la etapa de prototipo.")
h2("18.1 Cómo se presenta")
bl(["<b>Bienvenida al primer ingreso</b>: recorrido de 3 a 5 pantallas cortas con ilustración, según el rol. Se puede saltar y volver a ver desde Ayuda.",
    "<b>Sección Ayuda</b>: guías breves por tarea (\"¿Cómo reporto un pago?\"), con pasos numerados y capturas.",
    "<b>Ayuda en contexto</b>: botón <b>?</b> en las pantallas clave y pantallas vacías que explican qué hacer (ej. \"Aún no tienes clientes: compárteles tu invitación\").",
    "<b>Novedades de la app</b>: cuando se agrega o cambia algo, un aviso corto la próxima vez que entran.",
    "<b>Manual en PDF</b> por rol para imprimir o compartir, generado desde las mismas guías."])
h2("18.2 Contenido por rol")
tbl([["Rol", "Introducción", "Guías principales"],
     ["Cliente", "Tu coach y tu turno; tus días restantes; tus resultados por pilar",
      "Leer tu estado y vencimiento · Qué significa cada pilar y el índice 100 · Cómo renovar · Reglas del gimnasio"],
     ["Coach", "Tus turnos de hoy; tu plan; tus clientes; tu comisión",
      "Invitar a un cliente · Reportar un pago con comprobante · Armar y enviar el plan del mes · Usar el glosario y proponer ejercicios · Leer los resultados de tus clientes"],
     ["Administración", "Pendientes del día; horario; evaluación; finanzas",
      "Aprobar coaches y clientes · Confirmar pagos · Alta de clientes con su pago vigente · Aplicar una evaluación con PIN · Aprobar planes · Mover la comisión · Cerrar el mes"],
     ["Superadmin", "Panel del sistema", "Dar de alta un gimnasio · Activar funciones · Revisar cobros del servicio y respaldos"]], [1.1, 2, 2.9])
h2("18.3 Tablas")
tbl([["Tabla", "Columnas clave", "Notas"],
     ["guia", "gimnasio_id (vacío = para todos), rol, titulo, tipo (bienvenida/tarea/novedad), orden, version, publicada", "Contenido editable"],
     ["guia_paso", "guia_id, orden, texto, imagen_url, pantalla", "Pasos con captura; pantalla liga el botón ?"],
     ["guia_vista", "usuario_id, guia_id, version, vista_en, completada", "Saber qué ya vio cada quien"]], [1.1, 3.2, 1.6])
p("Se integra en la <b>Fase 1</b> (bienvenida y Ayuda) y crece con cada fase: cada función nueva sale con su guía.")

doc = BaseDocTemplate(OUT, pagesize=letter, leftMargin=1.8 * cm, rightMargin=1.8 * cm,
                      topMargin=1.8 * cm, bottomMargin=2 * cm,
                      title="Plan del sistema de gestión para gimnasio", author="Plan v1.0")
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="f")
doc.addPageTemplates([PageTemplate(id="p", frames=[frame], onPage=on_page)])
doc.build(story)
print("ok")

/**
 * Instructivo por rol. Cada función nueva sale con su guía; lo que aún no existe se anuncia como "próximamente".
 * Más adelante pasará a la base de datos para que la administración lo edite (tablas guia y guia_paso del plan).
 */
export interface Guia {
  titulo: string;
  pasos: string[];
}

export interface SeccionDeAyuda {
  rol: "admin" | "coach" | "cliente";
  nombre: string;
  bienvenida: string;
  guias: Guia[];
  proximamente: string[];
}

export const AYUDA: SeccionDeAyuda[] = [
  {
    rol: "cliente",
    nombre: "Clientes",
    bienvenida: "Aquí ves tus días pagados, tu coach y horario, tu peso y tu división, y tus resultados por pilar.",
    guias: [
      {
        titulo: "Registrarte",
        pasos: [
          "Abre el enlace que te mandó tu coach, o entra a Registro y elige a tu coach.",
          "Escribe tu nombre, correo, teléfono, tu rama (femenil o varonil) y una contraseña de al menos 10 caracteres.",
          "Peso y estatura son opcionales y pueden ser aproximados: en tu primera evaluación te pesamos y medimos.",
          "Acepta el reglamento y la responsiva. Tu registro queda “por aprobar”.",
          "Cuando la administración lo apruebe, verás tu registro aprobado en Hoy.",
        ],
      },
      {
        titulo: "Tu rutina de hoy",
        pasos: [
          "En Hoy aparece la rutina que preparó tu coach para la clase del día. Tú decides qué días vienes.",
          "Si hoy no te toca, te dice cuál es tu siguiente día.",
        ],
      },
      {
        titulo: "Tus días y tu peso",
        pasos: [
          "En Hoy, el anillo te dice cuántos días te quedan pagados; el calendario marca tus días pagados y cuándo vence.",
          "En Mi progreso, Peso y división te muestra tu peso, tu división (según tu rama) y cuánto ha cambiado desde tu inicio.",
          "Tu división se mantiene hasta el siguiente pesaje. Tu peso no cuenta en tu calificación.",
          "En Mi progreso, Tu mejora compara tu primera evaluación con la última, pilar por pilar, y la gráfica muestra cada mes.",
        ],
      },
      {
        titulo: "Tus resultados por pilar",
        pasos: [
          "Te evaluamos al empezar y una vez al mes: fuerza, velocidad, resistencia y estrategia.",
          "Cada pilar se califica del 1 al 10, como en la escuela: 6 aprueba y 10 es nivel élite para tu rama. Desde tu primera evaluación ves qué tan cerca estás de la élite y cuánto has subido desde tu inicio.",
          "En Mi progreso ves tus pilares mes a mes, el radar (la línea punteada es tu inicio), tu peso y tu historial.",
        ],
      },
      {
        titulo: "Novedades",
        pasos: [
          "En Novedades ves avisos, eventos, sparrings y felicitaciones del gimnasio; el número junto a Novedades son las nuevas.",
          "Si un evento lleva inscripción, toca Inscribirme (mientras haya lugares). Puedes cancelar antes de que empiece.",
          "Si te felicitan, la publicación aparece destacada en verde.",
        ],
      },
      {
        titulo: "Completar tu perfil",
        pasos: [
          "Toca tu nombre arriba a la derecha → Mi cuenta.",
          "Escribe tu fecha de nacimiento y un contacto de emergencia (nombre y teléfono).",
          "Si tienes alguna lesión o condición, anótala en Notas médicas. Se guardan cifradas y solo las ven tu coach y la administración.",
        ],
      },
      {
        titulo: "Si olvidas tu contraseña",
        pasos: ["Pide en el gimnasio un enlace para cambiarla.", "Ábrelo, escribe la nueva y listo: entras de inmediato."],
      },
    ],
    proximamente: [],
  },
  {
    rol: "coach",
    nombre: "Coaches",
    bienvenida: "Ve tus turnos con su rutina y sus clientes, arma tu plan del mes, reporta pagos y consulta el glosario.",
    guias: [
      {
        titulo: "Ver tus turnos",
        pasos: [
          "En Doy clases → Hoy ves tu turno de hoy con su rutina y sus clientes; abajo, tus turnos de la semana.",
          "Si un cliente tiene contacto de emergencia o notas médicas, ábrelas en “Emergencia y salud”.",
          "Los turnos los asigna la administración en el horario.",
        ],
      },
      {
        titulo: "Resultados de tus clientes",
        pasos: [
          "En Resultados ves la última evaluación por pilar de cada cliente (del 1 al 10; 10 = nivel élite) y su división.",
          "Tu resultado del mes es el promedio por pilar de tus clientes evaluados; la cobertura dice cuántos de tus activos se evaluaron.",
          "Se mide el avance de cada cliente, no su nivel: un principiante que mejora cuenta igual que un avanzado.",
        ],
      },
      {
        titulo: "Armar tus rutinas",
        pasos: [
          "En Rutinas arma lo que harás en un turno de 2 horas: bloques por pilar (calentamiento, fuerza, velocidad, resistencia, estrategia, enfriamiento) con sus minutos o rounds; cada bloque te sugiere los ejercicios de ese pilar.",
          "En cada bloque agrega ejercicios de la biblioteca o combinaciones de golpes (1-2-3c).",
          "La rutina no puede pasar de 120 minutos; la app te dice cuánto llevas.",
        ],
      },
      {
        titulo: "Tu plan del mes",
        pasos: [
          "En Mi plan elige una rutina para cada uno de tus turnos y toca Enviar a la administración.",
          "Si te piden cambios, verás el comentario; corrige y vuelve a enviar. Mientras tanto sigue vigente tu plan aprobado anterior.",
          "Si tu plan es fijo, desde el día 25 te preguntamos si lo mantienes: un toque y el mes siguiente queda aprobado.",
          "En Hoy → Mis turnos de la semana ves qué rutina toca en cada turno.",
        ],
      },
      {
        titulo: "Glosario y biblioteca",
        pasos: [
          "En Biblioteca están los golpes con su número oficial y sus otros nombres; escribe una combinación y ve el nombre de cada golpe.",
          "Si usas un ejercicio que no está, propónlo con nombre y descripción: lo usas de inmediato y la administración lo formaliza.",
          "Si la app dice que se parece a otro, revisa que no sea el mismo antes de marcar “Es distinto”.",
        ],
      },
      {
        titulo: "Reportar un pago",
        pasos: [
          "Entra a Mis pagos.",
          "Elige al cliente y el plan; el monto se llena solo y lo puedes corregir.",
          "Indica si te pagó a ti o en la administración, y toma foto del comprobante.",
          "Queda “por confirmar”. Cuando la administración lo confirma, se suma tu comisión.",
        ],
      },
      {
        titulo: "Tu cuenta del mes",
        pasos: [
          "En Mis pagos ves tu comisión del mes y el dinero que cobraste tú.",
          "Si cobraste más que tu comisión, entregas la diferencia; si no, la administración te paga.",
          "Al terminar el mes, la administración lo marca como cuadrado.",
        ],
      },
      {
        titulo: "Tu perfil",
        pasos: ["Toca tu nombre arriba a la derecha → Mi cuenta.", "Escribe tu especialidad y una presentación corta. Por ahora no se muestran en la portada."],
      },
      {
        titulo: "Invitar a un cliente",
        pasos: [
          "Entra a Hoy y abre Invitar a un cliente.",
          "En Tu invitación, toca WhatsApp (o Copiar) y mándala.",
          "Cuando se registre, aparece en tu lista como “por aprobar” hasta que la administración lo apruebe.",
        ],
      },
      {
        titulo: "Activar tu cuenta",
        pasos: [
          "La administración te manda un enlace por WhatsApp; vence en 72 horas.",
          "Ábrelo, elige un usuario corto (o escribe tu correo) y una contraseña de al menos 10 caracteres.",
          "Desde entonces entras con ese usuario o correo y tu contraseña.",
        ],
      },
    ],
    proximamente: [],
  },
  {
    rol: "admin",
    nombre: "Administración",
    bienvenida: "Apruebas registros, das acceso al equipo y mueves comisiones. Todo lo que cambias queda en la auditoría.",
    guias: [
      {
        titulo: "Agregar a alguien al equipo",
        pasos: [
          "En Personas → Equipo, abre Agregar al equipo, escribe el nombre, elige Administración o Coach y, si quieres, un usuario corto (ej. admin2).",
          "Toca Agregar: aparece su enlace de activación; mándaselo por WhatsApp. Vence en 72 horas.",
          "Cada persona tiene su propia cuenta y contraseña: así se sabe quién hizo cada cosa y nadie depende de la clave de otro.",
        ],
      },
      {
        titulo: "Dar acceso a un coach",
        pasos: [
          "Entra a Personas → Equipo y abre Administración o Coaches.",
          "Toca “Enlace de activación” junto a su nombre.",
          "Mándale el enlace por WhatsApp. Sirve una vez y vence en 72 horas.",
          "Si alguien olvida su contraseña, el mismo botón genera un enlace para cambiarla.",
        ],
      },
      {
        titulo: "Aprobar clientes",
        pasos: [
          "En Registros por aprobar ves nombre, coach y contacto.",
          "Toca Aprobar si ya entregó su responsiva firmada; si no, Rechazar.",
          "Cada decisión queda registrada con tu nombre.",
        ],
      },
      {
        titulo: "Armar el horario",
        pasos: [
          "Entra a Horario y toca una celda (día y franja).",
          "Elige el coach y toca Agregar al turno. Puede haber varios coaches en el mismo turno; el cupo es opcional.",
          "Para quitar a alguien, toca Quitar. Queda en el historial.",
        ],
      },
      {
        titulo: "Cambiar el coach o la franja de un cliente",
        pasos: [
          "En Personas → Clientes, abre el grupo de su coach y toca al cliente.",
          "En Coach y turno elige coach y franja. Junto a cada franja ves qué coaches dan clase y qué días.",
          "Escribe el motivo y guarda. El historial guarda cada cambio.",
          "En la misma ficha puedes ver y corregir su perfil.",
        ],
      },
      {
        titulo: "Pagos",
        pasos: [
          "En Pagos, primero ves los reportados por los coaches: revisa el comprobante y toca Confirmar o Rechazar (con motivo).",
          "Para registrar un pago que recibiste tú, usa Registrar pago: queda confirmado de una vez.",
          "Si lo cobró un coach, elige qué coach tiene el dinero; se cuadra a fin de mes.",
          "La membresía corre desde la fecha del pago; si el cliente aún tenía días, sigue al terminar esos.",
        ],
      },
      {
        titulo: "Alta de clientes actuales (carga inicial)",
        pasos: [
          "Registra su pago vigente con su fecha real y marca Carga inicial.",
          "Queda activo hasta donde cubre ese pago, pero no genera comisión ni cuenta como ingreso del mes.",
        ],
      },
      {
        titulo: "Cuadre mensual",
        pasos: [
          "En Cuadre ves, por coach, su comisión del mes contra el dinero que cobró él.",
          "Si cobró de más, te entrega la diferencia; si no, tú le pagas.",
          "Cuando el mes termina y quedan a mano, toca Marcar cuadrado. Queda registrado y ya no cambia.",
        ],
      },
      {
        titulo: "Aplicar una evaluación",
        pasos: [
          "Primero define tu PIN en Mi cuenta (una sola vez).",
          "En Evaluación, junto al cliente escribe tu PIN y toca Comenzar. El coach y si es inicial o mensual se ponen solos.",
          "Check-in: si tiene lesión o dolor no se evalúa (queda no apto y se reprograma). Pésalo en la misma báscula.",
          "Sigue los tests en orden, con el cronómetro y el contador en pantalla. Guarda cada uno; deja vacío un intento nulo.",
          "Estrategia: califica cada conducta 0, 1 o 2 y anota al compañero de sparring. Si no hay compañero, cierra como parcial y complétala otro día del mes.",
          "Cerrar y publicar calcula la calificación del 1 al 10; avisa si algún valor cambió más de 40% contra el mes anterior. Para repetirla, anúlala con motivo.",
        ],
      },
      {
        titulo: "Quieren ser coach",
        pasos: [
          "Desde la portada, quien quiere dar clases toca Quiero ser coach y deja su experiencia y disponibilidad.",
          "Te aparece en Administración, en Quieren ser coach: escríbele por WhatsApp para conocerlo.",
          "Si lo apruebas, toca Aprobar como coach (puedes darle un usuario corto) y mándale el enlace que aparece. Si no, Descartar.",
        ],
      },
      {
        titulo: "Clases de prueba",
        pasos: [
          "Desde la portada, quien quiera probar deja su nombre, WhatsApp y horario preferido.",
          "Te aparecen en Administración, en Clases de prueba por agendar: toca WhatsApp para escribirle.",
          "Cuando la agendes toca Ya la agendé (o Descartar). Un mismo teléfono no se duplica en 24 horas.",
        ],
      },
      {
        titulo: "Ver como lo ve el cliente",
        pasos: [
          "En la ficha del cliente toca “Ver como lo ve el cliente”: ves su pantalla Hoy tal cual, sin poder cambiar nada.",
          "Si tú también entrenas, en Mi cuenta → También entreno aquí te inscribes como cliente con tu mismo usuario.",
          "Si tú también das clases, en Mi cuenta → También doy clases te sumas como coach con tu misma cuenta.",
        ],
      },
      {
        titulo: "Reiniciar el punto de partida",
        pasos: [
          "Si un cliente regresa tras 3 meses o más, o de una lesión, abre su ficha → Reiniciar punto de partida.",
          "Escribe el motivo. Su siguiente evaluación vuelve a ser la inicial: su avance se mide desde ahí; las anteriores siguen en su historial.",
        ],
      },
      {
        titulo: "Pesar a un cliente",
        pasos: [
          "En la ficha del cliente, en Peso y división, escribe el peso y la fecha.",
          "Elige si es evaluación periódica o pesaje imprevisto. La estatura, solo si cambió.",
          "La división se calcula con su rama y se mantiene hasta el siguiente pesaje.",
        ],
      },
      {
        titulo: "Revisar planes de trabajo",
        pasos: [
          "En Planes ves el estado del plan de cada coach para este mes y el siguiente.",
          "Al revisar solo ves lo que cambió contra el mes anterior; aprueba o pide cambios diciendo qué.",
          "Un plan fijo que el coach mantiene sin cambios se aprueba solo.",
        ],
      },
      {
        titulo: "Biblioteca",
        pasos: [
          "Las propuestas de los coaches llegan a Por formalizar: completa nombre oficial, ejecución, errores comunes y nombres alternos.",
          "Si una propuesta es igual a un ejercicio existente, fusiónala: su nombre queda como alterno y las rutinas se actualizan solas.",
          "Decide qué coaches ven la biblioteca compartida; los básicos y sus propios ejercicios los ven siempre.",
        ],
      },
      {
        titulo: "Publicar novedades",
        pasos: [
          "En Novedades, abre Publicar: elige el tipo (anuncio, evento, sparring, felicitación, pelea, reunión o día de prueba) y para quién es.",
          "Para eventos pon cuándo empieza, el lugar y, si lleva inscripción, el cupo. Ves quiénes se inscribieron.",
          "Para felicitar, menciona a los clientes. Lo que marques como Público aparece en la portada, sin datos de clientes.",
          "Fíjala para que quede arriba; archívala cuando ya no sirva.",
        ],
      },
      {
        titulo: "Mover la comisión",
        pasos: [
          "Entra a Comisiones.",
          "Elige si cambia la general o solo la de un coach.",
          "Escribe el porcentaje, desde qué fecha aplica (hoy o después) y el motivo.",
          "Las comisiones ya generadas no cambian; el historial guarda cada cambio.",
        ],
      },
    ],
    proximamente: ["Relación de ingresos y reportes", "Detección de talentos"],
  },
];

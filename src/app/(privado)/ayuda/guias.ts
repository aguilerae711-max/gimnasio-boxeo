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
    bienvenida: "Aquí ves tus días pagados, tu coach y horario, tu peso y tu división y, muy pronto, tus resultados por pilar.",
    guias: [
      {
        titulo: "Registrarte",
        pasos: [
          "Abre el enlace que te mandó tu coach, o entra a Registro y elige a tu coach.",
          "Escribe tu nombre, correo, teléfono, tu rama (femenil o varonil) y una contraseña de al menos 10 caracteres.",
          "Peso y estatura son opcionales y pueden ser aproximados: en tu primera evaluación te pesamos y medimos.",
          "Acepta el reglamento y la responsiva. Tu registro queda “por aprobar”.",
          "Cuando la administración lo apruebe, verás tu estado como “activo” en Mi estado.",
        ],
      },
      {
        titulo: "Tus días y tu peso",
        pasos: [
          "En Mi estado ves cuántos días te quedan pagados y hasta qué fecha.",
          "En Peso y división ves tu peso, tu división (según tu rama), tu IMC y cuánto has subido o bajado.",
          "Tu división se mantiene hasta el siguiente pesaje. El IMC es solo una referencia.",
        ],
      },
      {
        titulo: "Completar tu perfil",
        pasos: [
          "Entra a Mi perfil.",
          "Escribe tu fecha de nacimiento y un contacto de emergencia (nombre y teléfono).",
          "Si tienes alguna lesión o condición, anótala en Notas médicas. Se guardan cifradas y solo las ven tu coach y la administración.",
        ],
      },
      {
        titulo: "Si olvidas tu contraseña",
        pasos: ["Pide en el gimnasio un enlace para cambiarla.", "Ábrelo, escribe la nueva y listo: entras de inmediato."],
      },
    ],
    proximamente: ["Tus resultados por pilar: fuerza, velocidad, resistencia y estrategia"],
  },
  {
    rol: "coach",
    nombre: "Coaches",
    bienvenida: "Ve tus turnos con sus clientes, reporta pagos y lleva tu cuenta del mes. El plan del mes llega en una siguiente fase.",
    guias: [
      {
        titulo: "Ver tus turnos",
        pasos: [
          "Entra a Mis turnos: ves cada día y franja que te toca, con los clientes de esa franja. El de hoy está marcado.",
          "Si un cliente tiene contacto de emergencia o notas médicas, ábrelas en “Emergencia y salud”.",
          "Los turnos los asigna la administración en el horario.",
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
        titulo: "Tu perfil público",
        pasos: ["Entra a Mi perfil.", "Escribe tu especialidad y una presentación corta. La especialidad aparece en la página pública."],
      },
      {
        titulo: "Invitar a un cliente",
        pasos: [
          "Entra a Mis turnos.",
          "En Tu invitación, toca WhatsApp (o Copiar) y mándala.",
          "Cuando se registre, aparece en tu lista como “por aprobar” hasta que la administración lo apruebe.",
        ],
      },
      {
        titulo: "Activar tu cuenta",
        pasos: [
          "La administración te manda un enlace por WhatsApp; vence en 72 horas.",
          "Ábrelo, escribe tu correo y una contraseña de al menos 10 caracteres.",
          "Desde entonces entras con ese correo y contraseña.",
        ],
      },
    ],
    proximamente: [
      "La rutina que toca en cada turno",
      "Armar y enviar tu plan del mes",
    ],
  },
  {
    rol: "admin",
    nombre: "Administración",
    bienvenida: "Apruebas registros, das acceso al equipo y mueves comisiones. Todo lo que cambias queda en la auditoría.",
    guias: [
      {
        titulo: "Dar acceso a un coach",
        pasos: [
          "Entra a Administración → Equipo.",
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
          "En Administración → Clientes, toca al cliente.",
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
          "Abajo ves la cuenta con el sistema: hoy 0%.",
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
        titulo: "Mover la comisión",
        pasos: [
          "Entra a Comisiones.",
          "Elige si cambia la general o solo la de un coach.",
          "Escribe el porcentaje, desde qué fecha aplica (hoy o después) y el motivo.",
          "Las comisiones ya generadas no cambian; el historial guarda cada cambio.",
        ],
      },
    ],
    proximamente: ["Evaluación por pilares con PIN", "Aprobar planes de trabajo", "Relación de ingresos y reportes"],
  },
];

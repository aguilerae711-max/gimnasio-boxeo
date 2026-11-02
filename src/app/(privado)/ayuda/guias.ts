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
    bienvenida: "Aquí ves tu registro, tu coach, tus días y horario de entrenamiento y, muy pronto, tus resultados por pilar.",
    guias: [
      {
        titulo: "Registrarte",
        pasos: [
          "Abre el enlace que te mandó tu coach, o entra a Registro y elige a tu coach.",
          "Escribe tu nombre, correo, teléfono y una contraseña de al menos 10 caracteres.",
          "Acepta el reglamento y la responsiva. Tu registro queda “por aprobar”.",
          "Cuando la administración lo apruebe, verás tu estado como “activo” en Mi estado.",
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
    proximamente: ["Días restantes y vencimiento de tu pago", "Tus resultados por pilar: fuerza, velocidad, resistencia y estrategia"],
  },
  {
    rol: "coach",
    nombre: "Coaches",
    bienvenida: "Ve tus turnos de la semana con sus clientes e invita a nuevos. El plan del mes y los pagos llegan en las siguientes fases.",
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
      "Reportar un pago con foto del comprobante",
      "Armar y enviar tu plan del mes",
      "Ver tu comisión del mes",
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
        titulo: "Mover la comisión",
        pasos: [
          "Entra a Comisiones.",
          "Elige si cambia la general o solo la de un coach.",
          "Escribe el porcentaje, desde qué fecha aplica (hoy o después) y el motivo.",
          "Las comisiones ya generadas no cambian; el historial guarda cada cambio.",
        ],
      },
    ],
    proximamente: ["Confirmar pagos y alta de clientes con su pago vigente", "Evaluación con PIN", "Aprobar planes", "Cerrar el mes"],
  },
];

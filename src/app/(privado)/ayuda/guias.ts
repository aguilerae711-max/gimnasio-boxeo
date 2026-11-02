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
    bienvenida: "Aquí ves tu registro, tu coach y, muy pronto, tus días restantes y tus resultados por pilar.",
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
        titulo: "Si olvidas tu contraseña",
        pasos: ["Pide en el gimnasio un enlace para cambiarla.", "Ábrelo, escribe la nueva y listo: entras de inmediato."],
      },
    ],
    proximamente: ["Días restantes y vencimiento de tu pago", "Tus resultados por pilar: fuerza, velocidad, resistencia y estrategia"],
  },
  {
    rol: "coach",
    nombre: "Coaches",
    bienvenida: "Invita a tus clientes y sigue quién está activo. Turnos, plan del mes y pagos llegan en las siguientes fases.",
    guias: [
      {
        titulo: "Invitar a un cliente",
        pasos: [
          "Entra a Mis clientes.",
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
      "Tus turnos de hoy con la rutina que toca",
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

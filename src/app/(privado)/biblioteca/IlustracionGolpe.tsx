/**
 * Dibujo sencillo de la trayectoria de cada golpe (guardia derecha / ortodoxa).
 * Rectos y ganchos se ven desde arriba; uppercuts y volado, de lado.
 * Rojo: mano de adelante. Ámbar: mano de atrás.
 */

const ADELANTE = "#ff6b76";
const ATRAS = "#e8b04b";
const LINEA = "#3a3d46";

type Trazo = { d: string; color: string; punteado?: boolean };

const DESDE_ARRIBA: Record<string, Trazo[]> = {
  "1": [{ d: "M31 45 L38 17", color: ADELANTE }],
  "2": [{ d: "M48 51 L41 17", color: ATRAS }],
  "3": [{ d: "M29 46 C 12 38, 14 18, 35 14", color: ADELANTE }],
  "4": [{ d: "M51 50 C 68 40, 64 18, 45 14", color: ATRAS }],
  "1c": [{ d: "M31 45 L38 17", color: ADELANTE }],
  "3c": [{ d: "M29 46 C 12 38, 14 18, 35 14", color: ADELANTE }],
  "4c": [{ d: "M51 50 C 68 40, 64 18, 45 14", color: ATRAS }],
};

const DE_LADO: Record<string, Trazo[]> = {
  "5": [{ d: "M30 52 C 42 58, 54 46, 60 30", color: ADELANTE }],
  "6": [{ d: "M18 54 C 36 62, 54 48, 60 30", color: ATRAS }],
  V: [
    { d: "M28 34 C 32 6, 52 4, 61 22", color: ADELANTE },
    { d: "M18 36 C 22 0, 54 0, 62 26", color: ATRAS, punteado: true },
  ],
};

function Flechas({ id, trazos }: { id: string; trazos: Trazo[] }) {
  return (
    <>
      <defs>
        {[ADELANTE, ATRAS].map((c) => (
          <marker key={c} id={`${id}-${c.slice(1)}`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill={c} />
          </marker>
        ))}
      </defs>
      {trazos.map((t, i) => (
        <path
          key={i}
          d={t.d}
          fill="none"
          stroke={t.color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={t.punteado ? "5 4" : undefined}
          markerEnd={`url(#${id}-${t.color.slice(1)})`}
        />
      ))}
    </>
  );
}

export function IlustracionGolpe({ codigo, nombre }: { codigo: string; nombre: string }) {
  const id = `golpe-${codigo.replace(/[^a-z0-9]/gi, "")}`;
  const cuerpo = codigo.endsWith("c");
  if (DESDE_ARRIBA[codigo]) {
    return (
      <svg viewBox="0 0 80 80" className="h-20 w-20 shrink-0 rounded-xl bg-white/[0.03]" role="img" aria-label={`${nombre}: trayectoria vista desde arriba`}>
        {/* Rival arriba: cabeza o cuerpo. */}
        {cuerpo ? (
          <rect x="30" y="8" width="20" height="12" rx="5" fill="none" stroke="#a3a8b3" strokeWidth="1.5" />
        ) : (
          <circle cx="40" cy="13" r="6" fill="none" stroke="#a3a8b3" strokeWidth="1.5" />
        )}
        {/* Tú abajo, de perfil: hombros, cabeza y guantes. */}
        <line x1="27" y1="58" x2="55" y2="66" stroke={LINEA} strokeWidth="5" strokeLinecap="round" />
        <circle cx="41" cy="61" r="6" fill="#2a2d36" stroke={LINEA} strokeWidth="1.5" />
        <circle cx="30" cy="47" r="4.5" fill={ADELANTE} opacity="0.35" />
        <circle cx="49" cy="52" r="4.5" fill={ATRAS} opacity="0.35" />
        <Flechas id={id} trazos={DESDE_ARRIBA[codigo]} />
      </svg>
    );
  }
  if (DE_LADO[codigo]) {
    return (
      <svg viewBox="0 0 80 80" className="h-20 w-20 shrink-0 rounded-xl bg-white/[0.03]" role="img" aria-label={`${nombre}: trayectoria vista de lado`}>
        {/* Rival a la derecha; tú a la izquierda. */}
        <circle cx="66" cy="26" r="6" fill="none" stroke="#a3a8b3" strokeWidth="1.5" />
        <line x1="66" y1="32" x2="66" y2="62" stroke="#a3a8b3" strokeWidth="1.5" />
        <circle cx="20" cy="28" r="6" fill="#2a2d36" stroke={LINEA} strokeWidth="1.5" />
        <line x1="20" y1="34" x2="20" y2="64" stroke={LINEA} strokeWidth="5" strokeLinecap="round" />
        <Flechas id={id} trazos={DE_LADO[codigo]} />
      </svg>
    );
  }
  return null;
}

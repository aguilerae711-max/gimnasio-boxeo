import type { ResumenPilares } from "@/modules/evaluacion/infrastructure/EvaluacionesPostgres";
import { nombreMes } from "./formato";
import { Tarjeta } from "./piezas";

export const PILARES = ["fuerza", "velocidad", "resistencia", "estrategia"] as const;
export const NOMBRE_PILAR: Record<string, string> = { fuerza: "Fuerza", velocidad: "Velocidad", resistencia: "Resistencia", estrategia: "Estrategia" };
export const COLOR_PILAR: Record<string, string> = { fuerza: "#FF6B76", velocidad: "#E8B04B", resistencia: "#4FA3FF", estrategia: "#6FE0A2" };

/** Color de boleta: menos de 6 no aprueba, 6–7.9 regular, 8–8.9 bien, 9–10 excelente. */
export function colorCalificacion(c: number | null) {
  if (c === null) return "#a3a8b3";
  if (c < 6) return "#ff8f97";
  if (c < 8) return "#f1d9a8";
  if (c < 9) return "#6fe0a2";
  return "#e8c25b";
}

/** Una calificación con un decimal (8.4); el 10 sin decimal. */
export const calificacion = (c: number | null) => (c === null ? "—" : c >= 10 ? "10" : c.toFixed(1));

/** Promedio de los pilares con calificación. */
export function promedioPilares(p: Record<string, number | null>) {
  const v = PILARES.map((k) => p[k]).filter((x): x is number => x !== null);
  return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
}

/** Radar de los 4 pilares del 0 al 10: la élite (10) en dorado, tu inicio punteado y tu última evaluación en rojo. */
export function Radar({ actual, inicio }: { actual: Record<string, number | null>; inicio?: Record<string, number | null> }) {
  const centro = 110;
  const radio = 90;
  const punto = (i: number, valor: number) => {
    const angulo = -Math.PI / 2 + (i * Math.PI) / 2;
    const r = (Math.max(0, Math.min(10, valor)) / 10) * radio;
    return [centro + r * Math.cos(angulo), centro + r * Math.sin(angulo)];
  };
  const poligono = (valores: number[]) => valores.map((v, i) => punto(i, v).join(",")).join(" ");
  const actuales = PILARES.map((p) => actual[p] ?? 0);
  return (
    <svg viewBox="0 0 220 220" className="mx-auto h-56 w-56" role="img" aria-label={`Pilares: ${PILARES.map((p) => `${NOMBRE_PILAR[p]} ${actual[p] ?? "sin dato"}`).join(", ")}`}>
      {[2, 4, 6, 8].map((v) => (
        <polygon key={v} points={poligono([v, v, v, v])} fill="none" stroke="#2a2d36" strokeWidth="1" />
      ))}
      <polygon points={poligono([10, 10, 10, 10])} fill="none" stroke="#e8c25b" strokeOpacity="0.7" strokeDasharray="2 3" strokeWidth="1.5" />
      {PILARES.map((p, i) => {
        const [x, y] = punto(i, 10);
        return <line key={p} x1={centro} y1={centro} x2={x} y2={y} stroke="#2a2d36" />;
      })}
      {inicio && (
        <polygon points={poligono(PILARES.map((p) => inicio[p] ?? 0))} fill="none" stroke="#a3a8b3" strokeDasharray="4 3" strokeWidth="1.5" />
      )}
      <polygon points={poligono(actuales)} fill="#d7263d33" stroke="#d7263d" strokeWidth="2.5" strokeLinejoin="round" />
      {PILARES.map((p, i) => {
        const [x, y] = punto(i, actuales[i]);
        return <circle key={p} cx={x} cy={y} r="4" fill={COLOR_PILAR[p]} />;
      })}
    </svg>
  );
}

/** Tabla mes a mes de los pilares con peso y división. */
export function TablaHistorial({ historial }: { historial: ResumenPilares[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="cifras w-full min-w-[480px] text-left text-sm">
        <thead className="text-texto-suave">
          <tr>
            <th className="py-1.5 font-semibold">Mes</th>
            {PILARES.map((p) => (
              <th key={p} className="font-semibold">
                {NOMBRE_PILAR[p]}
              </th>
            ))}
            <th className="font-semibold">Peso · división</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-borde">
          {[...historial].reverse().map((h) => (
            <tr key={h.sesionId}>
              <td className="py-1.5">{nombreMes(h.periodo)}</td>
              {PILARES.map((p) => (
                <td key={p} style={{ color: colorCalificacion(h.pilares[p] ?? null) }}>
                  {calificacion(h.pilares[p] ?? null)}
                </td>
              ))}
              <td>
                {h.pesoKg ?? "—"} kg{h.division ? ` · ${h.division}` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ResultadosPorPilar({
  historial,
  titulo = "Resultados por pilar",
  conTabla = true,
}: {
  historial: ResumenPilares[];
  titulo?: string;
  conTabla?: boolean;
}) {
  if (historial.length === 0) {
    return (
      <Tarjeta>
        <h2 className="font-titulos text-2xl font-bold uppercase">{titulo}</h2>
        <p className="mt-1 text-sm text-texto-suave">Aún no hay evaluaciones. Se califica del 1 al 10, donde 10 es nivel élite.</p>
      </Tarjeta>
    );
  }
  const ultima = historial.at(-1)!;
  const anterior = historial.length > 1 ? historial.at(-2)! : null;
  const inicio = historial[0];
  const conSigno = (d: number) => `${d > 0 ? "+" : d < 0 ? "−" : ""}${Math.abs(d).toFixed(1)}`;
  return (
    <Tarjeta>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-titulos text-2xl font-bold uppercase">{titulo}</h2>
        <span className="text-xs text-texto-suave">
          {nombreMes(ultima.periodo)}
          {ultima.division ? ` · ${ultima.division}` : ""}
          {ultima.pesoKg ? ` · ${ultima.pesoKg} kg` : ""}
        </span>
      </div>
      <div className="mt-2 grid items-center gap-4 sm:grid-cols-[auto_1fr]">
        <Radar actual={ultima.pilares} inicio={historial.length > 1 ? inicio.pilares : undefined} />
        <div className="grid grid-cols-2 gap-3">
          {PILARES.map((p) => {
            const valor = ultima.pilares[p] ?? null;
            const previo = anterior?.pilares[p] ?? null;
            const primero = inicio.pilares[p] ?? null;
            const delta = valor !== null && previo !== null ? Math.round((valor - previo) * 10) / 10 : null;
            const desdeInicio = valor !== null && primero !== null && historial.length > 1 ? Math.round((valor - primero) * 10) / 10 : null;
            return (
              <div key={p} className="rounded-xl bg-white/[0.04] p-3">
                <p className="text-xs font-semibold uppercase" style={{ color: COLOR_PILAR[p] }}>
                  {NOMBRE_PILAR[p]}
                </p>
                <p className="cifras font-titulos text-4xl font-extrabold leading-none" style={{ color: colorCalificacion(valor) }}>
                  {calificacion(valor)}
                  {delta !== null && delta !== 0 && (
                    <span className={`ml-1 text-base ${delta > 0 ? "text-[#6fe0a2]" : "text-[#ff8f97]"}`}>
                      {delta > 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs text-texto-suave">
                  {p === "estrategia" && ultima.tactica !== null
                    ? `Táctica ${ultima.tactica} · Adapt. ${ultima.adaptabilidad}`
                    : valor === null
                      ? "pendiente"
                      : desdeInicio !== null
                        ? `${conSigno(desdeInicio)} desde tu inicio`
                        : `a ${Math.max(0, 10 - valor).toFixed(1)} de la élite`}
                </p>
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-2 text-xs text-texto-suave">
        Del 1 al 10: 6 aprueba y 10 es nivel élite para tu rama. El contorno dorado del radar es la élite
        {historial.length > 1 ? "; la línea punteada, tu inicio" : ""}.
      </p>
      {conTabla && historial.length > 1 && (
        <div className="mt-3">
          <TablaHistorial historial={historial} />
        </div>
      )}
    </Tarjeta>
  );
}

/**
 * Tu mejora: de tu primera evaluación a la última, promedio y cada pilar (1 al 10).
 * El peso va aparte: no cuenta en la calificación.
 */
export function TuMejora({ historial, children }: { historial: ResumenPilares[]; children?: React.ReactNode }) {
  const encabezado = <h2 className="font-titulos text-2xl font-bold uppercase">Tu mejora</h2>;
  if (historial.length === 0) {
    return (
      <Tarjeta>
        {encabezado}
        <p className="mt-1 text-sm text-texto-suave">Después de tu primera evaluación verás aquí cuánto vas mejorando, mes a mes.</p>
      </Tarjeta>
    );
  }
  const inicio = historial[0];
  const ultima = historial.at(-1)!;
  const una = historial.length === 1;
  const filas = [
    { clave: "promedio", nombre: "Promedio", color: "#e6e7ea", de: promedioPilares(inicio.pilares), a: promedioPilares(ultima.pilares) },
    ...PILARES.map((p) => ({ clave: p, nombre: NOMBRE_PILAR[p], color: COLOR_PILAR[p], de: inicio.pilares[p] ?? null, a: ultima.pilares[p] ?? null })),
  ];
  return (
    <Tarjeta>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        {encabezado}
        <span className="text-xs text-texto-suave">{una ? nombreMes(inicio.periodo) : `${nombreMes(inicio.periodo)} → ${nombreMes(ultima.periodo)}`}</span>
      </div>
      <ul className="mt-2 divide-y divide-borde">
        {filas.map((f) => {
          const d = f.de !== null && f.a !== null ? Math.round((f.a - f.de) * 10) / 10 : null;
          return (
            <li key={f.clave} className="flex items-center justify-between gap-3 py-2">
              <span style={{ color: f.color }} className={`text-sm ${f.clave === "promedio" ? "font-bold" : "font-semibold"}`}>
                {f.nombre}
              </span>
              <span className="cifras flex items-baseline gap-2 text-sm">
                {!una && <span className="text-texto-suave">{calificacion(f.de)} →</span>}
                <span className="font-titulos text-xl font-extrabold" style={{ color: colorCalificacion(f.a) }}>
                  {calificacion(f.a)}
                </span>
                {!una && d !== null && (
                  <span className={`w-12 text-right text-xs font-semibold ${d > 0 ? "text-[#6fe0a2]" : d < 0 ? "text-[#ff8f97]" : "text-texto-suave"}`}>
                    {d > 0 ? `▲ ${d.toFixed(1)}` : d < 0 ? `▼ ${Math.abs(d).toFixed(1)}` : "="}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-texto-suave">
        {una ? "Este es tu punto de partida; en tu próxima evaluación verás cuánto subiste." : "De tu primera evaluación a la última."} Del 1 al 10, donde 10
        es nivel élite. Tu peso va aparte y no cuenta en esta calificación.
      </p>
      {children}
    </Tarjeta>
  );
}

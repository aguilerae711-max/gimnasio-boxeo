import type { ResumenPilares } from "@/modules/evaluacion/infrastructure/EvaluacionesPostgres";
import { nombreMes } from "./formato";
import { Tarjeta } from "./piezas";

export const PILARES = ["fuerza", "velocidad", "resistencia", "estrategia"] as const;
export const NOMBRE_PILAR: Record<string, string> = { fuerza: "Fuerza", velocidad: "Velocidad", resistencia: "Resistencia", estrategia: "Estrategia" };
export const COLOR_PILAR: Record<string, string> = { fuerza: "#FF6B76", velocidad: "#E8B04B", resistencia: "#4FA3FF", estrategia: "#6FE0A2" };

/** Radar de los 4 pilares: el inicio (100) contra la evaluación más reciente. Escala de 50 a 150. */
export function Radar({ actual }: { actual: Record<string, number | null> }) {
  const centro = 110;
  const radio = 90;
  const punto = (i: number, valor: number) => {
    const angulo = -Math.PI / 2 + (i * Math.PI) / 2;
    const r = (Math.max(50, Math.min(150, valor)) - 50) / 100 * radio;
    return [centro + r * Math.cos(angulo), centro + r * Math.sin(angulo)];
  };
  const poligono = (valores: number[]) => valores.map((v, i) => punto(i, v).join(",")).join(" ");
  const actuales = PILARES.map((p) => actual[p] ?? 100);
  return (
    <svg viewBox="0 0 220 220" className="mx-auto h-56 w-56" role="img" aria-label={`Pilares: ${PILARES.map((p) => `${NOMBRE_PILAR[p]} ${actual[p] ?? "sin dato"}`).join(", ")}`}>
      {[50, 100, 150].map((v) => (
        <polygon key={v} points={poligono([v, v, v, v])} fill="none" stroke="#2a2d36" strokeWidth="1" />
      ))}
      {PILARES.map((p, i) => {
        const [x, y] = punto(i, 150);
        return <line key={p} x1={centro} y1={centro} x2={x} y2={y} stroke="#2a2d36" />;
      })}
      <polygon points={poligono([100, 100, 100, 100])} fill="none" stroke="#a3a8b3" strokeDasharray="4 3" strokeWidth="1.5" />
      <polygon points={poligono(actuales)} fill="#d7263d33" stroke="#d7263d" strokeWidth="2.5" strokeLinejoin="round" />
      {PILARES.map((p, i) => {
        const [x, y] = punto(i, actuales[i]);
        return <circle key={p} cx={x} cy={y} r="4" fill={COLOR_PILAR[p]} />;
      })}
    </svg>
  );
}

/** Tarjetas por pilar con la última evaluación, el cambio contra la anterior y contra el inicio. */
export function ResultadosPorPilar({ historial, titulo = "Resultados por pilar" }: { historial: ResumenPilares[]; titulo?: string }) {
  if (historial.length === 0) {
    return (
      <Tarjeta>
        <h2 className="font-titulos text-2xl font-bold uppercase">{titulo}</h2>
        <p className="mt-1 text-sm text-texto-suave">Aún no hay evaluaciones. La primera es la inicial: tu punto de partida vale 100.</p>
      </Tarjeta>
    );
  }
  const ultima = historial.at(-1)!;
  const anterior = historial.length > 1 ? historial.at(-2)! : null;
  return (
    <Tarjeta>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-titulos text-2xl font-bold uppercase">{titulo}</h2>
        <span className="text-xs text-texto-suave">
          {nombreMes(ultima.periodo)} · {ultima.tipo}
          {ultima.division ? ` · división ${ultima.division}` : ""}
          {ultima.pesoKg ? ` · ${ultima.pesoKg} kg` : ""}
        </span>
      </div>
      <div className="mt-2 grid items-center gap-4 sm:grid-cols-[auto_1fr]">
        <Radar actual={ultima.pilares} />
        <div className="grid grid-cols-2 gap-3">
          {PILARES.map((p) => {
            const valor = ultima.pilares[p] ?? null;
            const previo = anterior?.pilares[p] ?? null;
            const delta = valor !== null && previo !== null ? valor - previo : null;
            return (
              <div key={p} className="rounded-xl bg-[#23262e] p-3">
                <p className="text-xs font-semibold uppercase" style={{ color: COLOR_PILAR[p] }}>
                  {NOMBRE_PILAR[p]}
                </p>
                <p className="font-titulos text-4xl font-extrabold leading-none">
                  {valor ?? "—"}
                  {delta !== null && delta !== 0 && (
                    <span className={`ml-1 text-base ${delta > 0 ? "text-[#6fe0a2]" : "text-[#ff8f97]"}`}>
                      {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs text-texto-suave">
                  {p === "estrategia" && ultima.tactica !== null
                    ? `Táctica ${ultima.tactica} · Adapt. ${ultima.adaptabilidad}`
                    : valor === null
                      ? "pendiente"
                      : `desde tu inicio: ${valor >= 100 ? "+" : ""}${valor - 100}%`}
                </p>
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-2 text-xs text-texto-suave">Tu evaluación inicial vale 100 en cada pilar; arriba de 100 es avance. La línea punteada del radar es tu inicio.</p>
      {historial.length > 1 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
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
            <tbody className="divide-y divide-[#2a2d36]">
              {[...historial].reverse().map((h) => (
                <tr key={h.sesionId}>
                  <td className="py-1.5">{nombreMes(h.periodo)}</td>
                  {PILARES.map((p) => (
                    <td key={p}>{h.pilares[p] ?? "—"}</td>
                  ))}
                  <td>
                    {h.pesoKg ?? "—"} kg{h.division ? ` · ${h.division}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Tarjeta>
  );
}

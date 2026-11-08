import { Fecha } from "@/shared/domain/Fecha";
import { fechaCorta, nombreMes } from "./formato";

/* Piezas visuales del cliente: sus días pagados y su progreso. Todo en SVG o CSS, sin librerías. */

const INICIALES = ["D", "L", "M", "M", "J", "V", "S"];
const ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0]; // lunes a domingo

/** Anillo con los días pagados que quedan del periodo vigente. */
export function AnilloDias({ restantes, total, color }: { restantes: number; total: number; color: string }) {
  const r = 52;
  const circulo = 2 * Math.PI * r;
  const avance = total > 0 ? Math.max(0, Math.min(1, restantes / total)) : 0;
  return (
    <svg viewBox="0 0 128 128" className="h-32 w-32 shrink-0" role="img" aria-label={`${restantes} días pagados de ${total}`}>
      <circle cx="64" cy="64" r={r} fill="none" stroke="#2a2d36" strokeWidth="10" />
      <circle
        cx="64"
        cy="64"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${circulo * avance} ${circulo}`}
        transform="rotate(-90 64 64)"
      />
      <text x="64" y="66" textAnchor="middle" className="fill-texto font-titulos" fontSize="40" fontWeight="800">
        {restantes}
      </text>
      <text x="64" y="86" textAnchor="middle" className="fill-[#a3a8b3]" fontSize="11" letterSpacing="1.5">
        {restantes === 1 ? "DÍA" : "DÍAS"}
      </text>
    </svg>
  );
}

/** Calendario del mes: días pagados sombreados, hoy y el día en que vence. */
export function CalendarioMes({
  hoy,
  periodos,
  vence,
}: {
  hoy: Fecha;
  periodos: readonly { periodoDesde: Fecha; periodoHasta: Fecha }[];
  vence: Fecha | null;
}) {
  const primero = Fecha.de(`${hoy.mes}-01`);
  const siguiente = primero.sumarMeses(1);
  const totalDias = primero.diasHasta(siguiente);
  const diaSemana = (f: Fecha) => new Date(`${f.valor}T12:00:00Z`).getUTCDay();
  const huecos = (diaSemana(primero) + 6) % 7; // la semana empieza en lunes
  const cubierto = (f: Fecha) => periodos.some((p) => !f.esAntesDe(p.periodoDesde) && !p.periodoHasta.esAntesDe(f));
  const celdas = Array.from({ length: totalDias }, (_, i) => primero.sumarDias(i));

  return (
    <div>
      <p className="mb-2 font-titulos text-xl font-bold uppercase">{nombreMes(hoy.mes).replace(" de ", " ")}</p>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-texto-suave">
        {ORDEN_SEMANA.map((d) => (
          <span key={d}>{INICIALES[d]}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: huecos }, (_, i) => (
          <span key={`h${i}`} />
        ))}
        {celdas.map((f) => {
          const pagado = cubierto(f);
          const esHoy = f.esIgualA(hoy);
          const esVence = vence?.esIgualA(f);
          const pasado = f.esAntesDe(hoy);
          return (
            <span
              key={f.valor}
              className={`cifras relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm ${
                pagado ? "bg-[#6fe0a2]/[0.12] text-texto" : "text-[#6b7080]"
              } ${pasado ? "opacity-50" : ""} ${esHoy ? "ring-2 ring-white" : ""} ${esVence ? "ring-2 ring-[#f1d9a8]" : ""}`}
            >
              {Number(f.valor.slice(8))}
            </span>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-texto-suave">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-[#6fe0a2]/30" /> Pagado
        </span>
        {vence && (
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded ring-2 ring-[#f1d9a8]" /> Vence {fechaCorta(vence.valor)}
          </span>
        )}
      </div>
    </div>
  );
}

/** Líneas de los 4 pilares mes a mes, con la línea de 100 (tu inicio) punteada. */
export function GraficaPilares({
  historial,
  pilares,
  nombres,
  colores,
}: {
  historial: { periodo: string; pilares: Record<string, number | null> }[];
  pilares: readonly string[];
  nombres: Record<string, string>;
  colores: Record<string, string>;
}) {
  if (historial.length < 2) return null;
  const valores = historial.flatMap((h) => pilares.map((p) => h.pilares[p])).filter((v): v is number => v !== null);
  const min = Math.min(97, ...valores) - 3;
  const max = Math.max(103, ...valores) + 3;
  const ancho = 320;
  const alto = 160;
  const x = (i: number) => 28 + (i * (ancho - 40)) / (historial.length - 1);
  const y = (v: number) => 12 + ((max - v) / (max - min)) * (alto - 36);
  const mesCorto = (m: string) => new Intl.DateTimeFormat("es-MX", { month: "short", timeZone: "UTC" }).format(new Date(`${m}-01T00:00:00Z`));
  return (
    <figure>
      <svg viewBox={`0 0 ${ancho} ${alto}`} className="w-full" role="img" aria-label="Tus pilares mes a mes">
        <line x1="28" x2={ancho - 12} y1={y(100)} y2={y(100)} stroke="#a3a8b3" strokeDasharray="4 4" strokeWidth="1" />
        <text x="2" y={y(100) + 4} fontSize="10" className="fill-[#a3a8b3]">
          100
        </text>
        {pilares.map((p) => {
          const puntos = historial.map((h, i) => (h.pilares[p] !== null ? `${x(i)},${y(h.pilares[p]!)}` : null)).filter(Boolean);
          return (
            <g key={p}>
              <polyline points={puntos.join(" ")} fill="none" stroke={colores[p]} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
              {historial.map((h, i) =>
                h.pilares[p] !== null ? <circle key={i} cx={x(i)} cy={y(h.pilares[p]!)} r="3" fill={colores[p]} /> : null,
              )}
            </g>
          );
        })}
        {historial.map((h, i) => (
          <text key={h.periodo} x={x(i)} y={alto - 6} textAnchor="middle" fontSize="10" className="fill-[#a3a8b3]">
            {mesCorto(h.periodo)}
          </text>
        ))}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-texto-suave">
        {pilares.map((p) => (
          <span key={p} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: colores[p] }} /> {nombres[p]}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="w-3 border-t border-dashed border-[#a3a8b3]" /> Tu inicio
        </span>
      </figcaption>
    </figure>
  );
}

/** Peso en el tiempo, con su primer y último registro. */
export function GraficaPeso({ mediciones }: { mediciones: { fecha: string; pesoKg: number }[] }) {
  if (mediciones.length < 2) return null;
  const pesos = mediciones.map((m) => m.pesoKg);
  const min = Math.min(...pesos) - 1;
  const max = Math.max(...pesos) + 1;
  const ancho = 320;
  const alto = 120;
  const x = (i: number) => 12 + (i * (ancho - 24)) / (mediciones.length - 1);
  const y = (v: number) => 14 + ((max - v) / (max - min)) * (alto - 40);
  const puntos = mediciones.map((m, i) => `${x(i)},${y(m.pesoKg)}`).join(" ");
  const area = `${x(0)},${alto - 22} ${puntos} ${x(mediciones.length - 1)},${alto - 22}`;
  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} className="w-full" role="img" aria-label={`Peso de ${pesos[0]} a ${pesos.at(-1)} kg`}>
      <defs>
        <linearGradient id="relleno-peso" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--acento)" stopOpacity="0.35" />
          <stop offset="1" stopColor="var(--acento)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#relleno-peso)" />
      <polyline points={puntos} fill="none" stroke="var(--acento)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {mediciones.map((m, i) => (
        <circle key={i} cx={x(i)} cy={y(m.pesoKg)} r="3" fill="#f2f3f5" />
      ))}
      <text x={x(0)} y={alto - 6} fontSize="10" className="fill-[#a3a8b3]">
        {fechaCorta(mediciones[0].fecha)}
      </text>
      <text x={x(mediciones.length - 1)} y={alto - 6} fontSize="10" textAnchor="end" className="fill-[#a3a8b3]">
        {fechaCorta(mediciones.at(-1)!.fecha)}
      </text>
    </svg>
  );
}

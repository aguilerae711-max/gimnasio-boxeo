import { estadoCorporal, NOMBRE_ORIGEN, type DivisionPeso, type Medicion, type Sexo } from "@/modules/evaluacion/domain/Composicion";
import { fechaCorta } from "./formato";
import { GraficaPeso } from "./Visual";
import { Tarjeta } from "./piezas";

/** "hasta 57.2 kg", o "sin límite" para Pesado. */
export const limiteDivision = (d: DivisionPeso) => (d.limiteKg !== null ? `hasta ${d.limiteKg} kg` : "sin límite");

const conSigno =(kg: number) => `${kg > 0 ? "+" : ""}${kg.toFixed(1)} kg`;

/** Peso actual, IMC, división (se mantiene hasta el siguiente pesaje), cambio y historial. */
export function PanelPeso({
  mediciones,
  sexo,
  divisiones,
  children,
  paraCliente = false,
}: {
  mediciones: Medicion[];
  sexo: Sexo | null;
  divisiones: DivisionPeso[];
  children?: React.ReactNode;
  /** Al cliente no se le etiqueta su cuerpo (sin IMC ni «sobrepeso»): ve su cambio de peso. */
  paraCliente?: boolean;
}) {
  const estado = estadoCorporal(mediciones, sexo, divisiones);
  return (
    <Tarjeta>
      <h2 className="font-titulos text-2xl font-bold uppercase">Peso y división</h2>
      {!estado ? (
        <p className="mt-1 text-sm text-texto-suave">Aún no hay pesajes. Se registra en la evaluación.</p>
      ) : (
        <>
          <div className="mt-2 grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-texto-suave">Peso</p>
              <p className="cifras font-titulos text-3xl font-extrabold">{estado.actual.pesoKg.toFixed(1)} kg</p>
              {estado.actual.aproximado && <p className="text-xs text-[#f1d9a8]">aproximado</p>}
            </div>
            <div>
              <p className="text-xs text-texto-suave">División</p>
              <p className="font-titulos text-3xl font-extrabold text-acento">{estado.division?.nombre ?? "—"}</p>
              <p className="text-xs text-texto-suave">{sexo ? `${sexo === "F" ? "Femenil" : "Varonil"}${estado.division ? ` · ${limiteDivision(estado.division)}` : ""}` : paraCliente ? <a href="/perfil">Indica tu rama en Mi cuenta</a> : "Falta su rama"}</p>
            </div>
            {paraCliente ? (
              <div>
                <p className="text-xs text-texto-suave">Desde tu inicio</p>
                <p className="cifras font-titulos text-3xl font-extrabold">{estado.cambioTotal !== null ? conSigno(estado.cambioTotal) : "—"}</p>
                <p className="text-xs text-texto-suave">{estado.cambioTotal !== null ? "cambio de peso" : "tu primer pesaje"}</p>
              </div>
            ) : (
              <div>
                <p className="text-xs text-texto-suave">IMC</p>
                <p className="font-titulos text-3xl font-extrabold">{estado.imc?.valor ?? "—"}</p>
                <p className="text-xs text-texto-suave">{estado.imc ? estado.imc.lectura : "Falta estatura"}</p>
              </div>
            )}
          </div>
          {(estado.cambioAnterior !== null || (!paraCliente && estado.cambioTotal !== null)) && (
            <p className="mt-3 text-sm text-[#c9ccd3]">
              {estado.cambioAnterior !== null && <>Desde el pesaje anterior: <b>{conSigno(estado.cambioAnterior)}</b></>}
              {!paraCliente && estado.cambioTotal !== null && <> · Desde el primero: <b>{conSigno(estado.cambioTotal)}</b></>}
            </p>
          )}
          <div className="mt-3">
            <GraficaPeso mediciones={mediciones.filter((m) => !m.aproximado || mediciones.every((x) => x.aproximado))} />
          </div>
          <details className="mt-2">
            <summary className="cursor-pointer text-sm font-semibold text-texto-suave">Todos los pesajes ({mediciones.length})</summary>
          <ul className="mt-1 divide-y divide-borde text-sm">
            {[...mediciones].reverse().map((m, i) => (
              <li key={i} className="flex justify-between py-2">
                <span>
                  {fechaCorta(m.fecha)} {m.fecha.slice(0, 4)} · <span className="text-texto-suave">{NOMBRE_ORIGEN[m.origen]}</span>
                </span>
                <span className="whitespace-nowrap font-semibold">{m.pesoKg.toFixed(1)} kg</span>
              </li>
            ))}
          </ul>
          </details>
          <p className="mt-2 text-xs text-texto-suave">
            {paraCliente
              ? "Tu división se mantiene hasta el siguiente pesaje."
              : "El IMC es solo una referencia: con mucho músculo sale alto. La división se mantiene hasta el siguiente pesaje."}
          </p>
        </>
      )}
      {children}
    </Tarjeta>
  );
}

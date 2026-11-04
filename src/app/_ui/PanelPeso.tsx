import { estadoCorporal, NOMBRE_ORIGEN, type DivisionPeso, type Medicion, type Sexo } from "@/modules/evaluacion/domain/Composicion";
import { fechaCorta, LineaDePeso } from "./formato";
import { Tarjeta } from "./piezas";

const conSigno = (kg: number) => `${kg > 0 ? "+" : ""}${kg.toFixed(1)} kg`;

/** Peso actual, IMC, división (se mantiene hasta el siguiente pesaje), cambio y historial. */
export function PanelPeso({
  mediciones,
  sexo,
  divisiones,
  children,
}: {
  mediciones: Medicion[];
  sexo: Sexo | null;
  divisiones: DivisionPeso[];
  children?: React.ReactNode;
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
              <p className="font-titulos text-3xl font-extrabold">{estado.actual.pesoKg.toFixed(1)} kg</p>
              {estado.actual.aproximado && <p className="text-xs text-[#f1d9a8]">aproximado</p>}
            </div>
            <div>
              <p className="text-xs text-texto-suave">División</p>
              <p className="font-titulos text-3xl font-extrabold text-acento">{estado.division?.nombre ?? "—"}</p>
              <p className="text-xs text-texto-suave">{sexo === "F" ? "Femenil" : sexo === "M" ? "Varonil" : "Indica tu rama en Mi perfil"}</p>
            </div>
            <div>
              <p className="text-xs text-texto-suave">IMC</p>
              <p className="font-titulos text-3xl font-extrabold">{estado.imc?.valor ?? "—"}</p>
              <p className="text-xs text-texto-suave">{estado.imc ? estado.imc.lectura : "Falta estatura"}</p>
            </div>
          </div>
          {(estado.cambioAnterior !== null || estado.cambioTotal !== null) && (
            <p className="mt-3 text-sm text-[#c9ccd3]">
              {estado.cambioAnterior !== null && <>Desde el pesaje anterior: <b>{conSigno(estado.cambioAnterior)}</b></>}
              {estado.cambioTotal !== null && <> · Desde el primero: <b>{conSigno(estado.cambioTotal)}</b></>}
            </p>
          )}
          <LineaDePeso pesos={mediciones.filter((m) => !m.aproximado || mediciones.every((x) => x.aproximado)).map((m) => m.pesoKg)} />
          <ul className="mt-3 divide-y divide-[#2a2d36] text-sm">
            {[...mediciones].reverse().map((m, i) => (
              <li key={i} className="flex justify-between py-2">
                <span>
                  {fechaCorta(m.fecha)} {m.fecha.slice(0, 4)} · <span className="text-texto-suave">{NOMBRE_ORIGEN[m.origen]}</span>
                </span>
                <span className="whitespace-nowrap font-semibold">{m.pesoKg.toFixed(1)} kg</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-texto-suave">
            El IMC es solo una referencia: con mucho músculo sale alto. Tu división se mantiene hasta el siguiente pesaje.
          </p>
        </>
      )}
      {children}
    </Tarjeta>
  );
}

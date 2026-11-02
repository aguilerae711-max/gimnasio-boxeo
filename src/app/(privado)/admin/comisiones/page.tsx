import { PoliticaComision } from "@/modules/membresias/domain/PoliticaComision";
import { Fecha } from "@/shared/domain/Fecha";
import { casosDeComisiones } from "../../../_servidor/contenedor";
import { requerirSesion } from "../../../_servidor/sesion";
import { Formulario } from "../../../_ui/Formulario";
import { Campo, Tarjeta, Titulo } from "../../../_ui/piezas";
import { cambiarComision } from "../acciones";

const fechaLarga = (valor: string) =>
  new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${valor}T00:00:00Z`));

export default async function Comisiones() {
  const sesion = await requerirSesion("comision.cambiar");
  const casos = casosDeComisiones();
  const [acuerdos, coaches, historial] = await Promise.all([
    casos.repositorio.delGimnasio(sesion.gimnasioId),
    casos.consultas.coaches(sesion.gimnasioId),
    casos.consultas.historial(sesion.gimnasioId),
  ]);
  const hoy = Fecha.hoyEn(sesion.zonaHoraria, new Date());
  const politica = new PoliticaComision(acuerdos);
  const vigente = (coachId: string) => {
    try {
      return politica.acuerdoPara(coachId, hoy);
    } catch {
      return null;
    }
  };
  const general = acuerdos.find((a) => a.esGeneral() && a.aplicaEl(hoy));
  const programados = acuerdos.filter((a) => hoy.esAntesDe(a.vigenteDesde));
  const nombreCoach = (id: string | null) => (id ? `Coach ${coaches.find((c) => c.id === id)?.apodo ?? ""}` : "Comisión general");

  return (
    <>
      <Titulo antetitulo="Configuración">Comisiones</Titulo>
      <div className="grid gap-5 md:grid-cols-[3fr_2fr]">
        <div className="flex flex-col gap-5">
          <Tarjeta>
            <p className="text-sm text-texto-suave">Comisión general del gimnasio</p>
            <p className="font-titulos text-6xl font-extrabold leading-none text-[#6fe0a2]">{general ? `${general.porcentaje.valor}%` : "—"}</p>
            <p className="mt-1 text-xs text-texto-suave">
              De cada pago confirmado{general ? ` · vigente desde ${fechaLarga(general.vigenteDesde.valor)}` : ""}
            </p>
          </Tarjeta>

          <Tarjeta>
            <h2 className="font-titulos text-2xl font-bold uppercase">Por coach, hoy</h2>
            <p className="text-xs text-texto-suave">Sin excepción, el coach usa la comisión general.</p>
            <ul className="mt-2 divide-y divide-[#2a2d36]">
              {coaches.map((c) => {
                const a = vigente(c.id);
                return (
                  <li key={c.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-semibold">Coach {c.apodo}</p>
                      <p className="text-xs text-texto-suave">{a && !a.esGeneral() ? "Excepción propia" : "Usa la general"}</p>
                    </div>
                    <span className="font-titulos text-3xl font-extrabold">{a ? `${a.porcentaje.valor}%` : "—"}</span>
                  </li>
                );
              })}
            </ul>
          </Tarjeta>

          {programados.length > 0 && (
            <Tarjeta>
              <h2 className="font-titulos text-2xl font-bold uppercase">Cambios programados</h2>
              <ul className="mt-2 divide-y divide-[#2a2d36]">
                {programados.map((a) => (
                  <li key={a.id} className="flex items-center justify-between py-3 text-sm">
                    <span>
                      {nombreCoach(a.coachId)} · desde {fechaLarga(a.vigenteDesde.valor)}
                    </span>
                    <span className="font-titulos text-2xl font-bold">{a.porcentaje.valor}%</span>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <Tarjeta className="border-2 border-acento">
            <h2 className="font-titulos text-2xl font-bold uppercase">Mover comisión</h2>
            <Formulario accion={cambiarComision} boton="Guardar cambio" className="mt-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-[#c9ccd3]">A quién aplica</span>
                <select
                  name="alcance"
                  className="min-h-12 rounded-xl border border-[#2a2d36] bg-[#23262e] px-3 text-base text-texto"
                  defaultValue="general"
                >
                  <option value="general">Comisión general</option>
                  {coaches.map((c) => (
                    <option key={c.id} value={c.id}>
                      Solo Coach {c.apodo}
                    </option>
                  ))}
                </select>
              </label>
              <Campo etiqueta="Nuevo porcentaje" name="porcentaje" type="number" min={0} max={100} step={0.01} inputMode="decimal" required />
              <Campo etiqueta="Aplica desde" name="desde" type="date" min={hoy.valor} defaultValue={hoy.valor} required />
              <Campo etiqueta="Motivo" name="motivo" placeholder="Ej. ajuste anual" maxLength={200} required />
              <p className="rounded-xl bg-[#2a2111] px-4 py-3 text-xs leading-relaxed text-[#f1d9a8]">
                Aplica a pagos confirmados desde esa fecha. Las comisiones ya generadas no cambian. Si ya había un cambio programado para
                la misma fecha o después, se reemplaza.
              </p>
            </Formulario>
          </Tarjeta>

          <Tarjeta>
            <h2 className="font-titulos text-2xl font-bold uppercase">Historial</h2>
            <ul className="mt-2 divide-y divide-[#2a2d36]">
              {historial.map((h) => (
                <li key={h.id} className="py-3">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="font-semibold">{h.coach ? `Coach ${h.coach}` : "Comisión general"}</span>
                    <span className="font-titulos text-xl font-bold">{h.porcentaje}%</span>
                  </div>
                  <p className="text-xs text-texto-suave">
                    {fechaLarga(h.vigenteDesde)}
                    {h.vigenteHasta ? ` a ${fechaLarga(h.vigenteHasta)}` : " en adelante"} · {h.motivo} · por {h.creadoPor}
                  </p>
                </li>
              ))}
            </ul>
          </Tarjeta>
        </div>
      </div>
    </>
  );
}

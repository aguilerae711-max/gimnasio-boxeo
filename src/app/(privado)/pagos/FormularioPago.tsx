import type { DatosPlan } from "@/modules/membresias/domain/Plan";
import { describirDuracion } from "@/modules/membresias/domain/Plan";
import { Formulario } from "../../_ui/Formulario";
import { Campo } from "../../_ui/piezas";
import { registrarPago } from "./acciones";

const selector = "min-h-12 rounded-xl border border-[#2a2d36] bg-[#23262e] px-3 text-base text-texto";

/**
 * Registrar o reportar un pago. La administración elige quién recibió el dinero y si es carga inicial;
 * el coach solo dice si se lo pagaron a él o en la administración.
 */
export function FormularioPago({
  clientes,
  planes,
  coaches,
  hoy,
  esAdministracion,
  clienteFijo,
}: {
  clientes: { id: string; nombre: string }[];
  planes: DatosPlan[];
  coaches: { id: string; apodo: string }[];
  hoy: string;
  esAdministracion: boolean;
  clienteFijo?: string;
}) {
  const vigentes = planes.filter((p) => p.activo);
  if (vigentes.length === 0) {
    return <p className="text-sm text-texto-suave">Primero la administración debe crear un plan (por ejemplo, Mensualidad).</p>;
  }
  return (
    <Formulario accion={registrarPago} boton={esAdministracion ? "Registrar pago" : "Reportar pago"}>
      {clienteFijo ? (
        <input type="hidden" name="clienteId" value={clienteFijo} />
      ) : (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-[#c9ccd3]">Cliente</span>
          <select name="clienteId" required className={selector}>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-[#c9ccd3]">Plan</span>
        <select name="planId" required className={selector}>
          {vigentes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre} · {describirDuracion(p)} · ${p.precio.centavos / 100}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <Campo etiqueta="Monto ($)" name="monto" type="number" min={1} step={0.01} inputMode="decimal" defaultValue={vigentes[0].precio.centavos / 100} required />
        <Campo etiqueta="Fecha del pago" name="fechaPago" type="date" max={hoy} defaultValue={hoy} required />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-[#c9ccd3]">Método</span>
          <select name="metodo" className={selector}>
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="tarjeta">Tarjeta</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-[#c9ccd3]">¿Quién recibió el dinero?</span>
          <select name="recibidoPor" className={selector}>
            {esAdministracion ? (
              <>
                <option value="administracion">Administración</option>
                {coaches.map((c) => (
                  <option key={c.id} value={`coach:${c.id}`}>
                    Coach {c.apodo}
                  </option>
                ))}
              </>
            ) : (
              <>
                <option value="coach">Yo (me lo pagó a mí)</option>
                <option value="administracion">La administración</option>
              </>
            )}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-[#c9ccd3]">Foto del comprobante (opcional)</span>
        <input
          type="file"
          name="comprobante"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          capture="environment"
          className="text-sm text-texto-suave file:mr-3 file:min-h-10 file:rounded-lg file:border-0 file:bg-[#2a2d36] file:px-3 file:text-texto"
        />
      </label>
      <Campo etiqueta="Nota (opcional)" name="nota" maxLength={200} />
      {esAdministracion && (
        <label className="flex items-start gap-3 rounded-xl bg-[#23262e] p-3 text-sm leading-relaxed text-[#c9ccd3]">
          <input type="checkbox" name="cargaInicial" value="si" className="mt-1 h-5 w-5 accent-[#d7263d]" />
          <span>
            <b>Carga inicial</b>: pago vigente de un cliente que ya entrenaba antes del sistema. Lo deja activo, pero no genera comisión ni
            cuenta como ingreso del mes. Acepta fechas antiguas.
          </span>
        </label>
      )}
    </Formulario>
  );
}

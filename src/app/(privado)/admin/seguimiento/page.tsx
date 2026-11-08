import Link from "next/link";
import { DIAS_AVISO_ANTICIPADO, renovacionesDelMes, situacionDePago } from "@/modules/membresias/domain/Cuentas";
import { Fecha } from "@/shared/domain/Fecha";
import { casosDeClientes, casosDePagos } from "../../../_servidor/contenedor";
import { requerirSesion } from "../../../_servidor/sesion";
import { BOTON_WHATSAPP, fechaCorta, nombreMes, textoVencimiento, whatsapp } from "../../../_ui/formato";
import { Desplegable, Filas, Tarjeta, Titulo, Vacio } from "../../../_ui/piezas";

/**
 * Seguimiento de pagos: quién está por vencer (una semana antes), quién se venció, quién renovó
 * y quién dejó de pagar este mes. Con WhatsApp listo para avisar.
 */
export default async function Seguimiento() {
  const sesion = await requerirSesion("pago.confirmar");
  const hoy = Fecha.hoyEn(sesion.zonaHoraria, new Date());
  const [clientes, periodos] = await Promise.all([
    casosDeClientes().consultas.delGimnasio(sesion.gimnasioId, "activo"),
    casosDePagos(sesion.permisos, sesion.zonaHoraria).consultas.periodos(sesion.gimnasioId),
  ]);
  const conPago = clientes.map((c) => ({ ...c, ...situacionDePago(periodos.get(c.id) ?? [], hoy) }));
  const porVencer = conPago.filter((c) => c.dias !== null && c.dias > 0 && c.dias <= DIAS_AVISO_ANTICIPADO).sort((a, b) => a.dias! - b.dias!);
  const vencidas = conPago.filter((c) => c.dias !== null && c.dias <= 0).sort((a, b) => b.dias! - a.dias!);
  const sinPago = conPago.filter((c) => c.dias === null);
  const alCorriente = conPago.length - porVencer.length - vencidas.length - sinPago.length;
  const activos = new Map(clientes.map((c) => [c.id, c]));
  const { renovaron, sinRenovar } = renovacionesDelMes(periodos, hoy.mes, hoy);
  const vencieronEnElMes = renovaron.length + sinRenovar.length;
  const tasa = vencieronEnElMes ? Math.round((renovaron.length / vencieronEnElMes) * 100) : null;

  const fila = (c: (typeof conPago)[number], mensaje: string) => (
    <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
      <Link href={`/admin/clientes/${c.id}`} className="min-w-0 text-texto no-underline">
        <span className="block font-semibold">{c.nombre}</span>
        <span className="text-sm text-texto-suave">
          Coach {c.coach}
          {c.dias !== null && c.vence && <> · {textoVencimiento(c.dias)} ({fechaCorta(c.vence.valor)})</>}
        </span>
      </Link>
      {c.telefono && (
        <a href={whatsapp(c.telefono, mensaje)} target="_blank" rel="noreferrer" className={BOTON_WHATSAPP}>
          WhatsApp
        </a>
      )}
    </li>
  );
  const primerNombre = (n: string) => n.split(" ")[0];

  return (
    <>
      <Titulo antetitulo={`Membresías · ${nombreMes(hoy.mes)}`}>Seguimiento</Titulo>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { nombre: "Al corriente", valor: alCorriente, color: "#6fe0a2" },
          { nombre: "Por vencer", valor: porVencer.length, color: "#f1d9a8", nota: `en ${DIAS_AVISO_ANTICIPADO} días` },
          { nombre: "Vencidas", valor: vencidas.length, color: "#ff8f97" },
          { nombre: "Renovaron", valor: tasa === null ? "—" : `${tasa}%`, color: "#c9ccd3", nota: `${renovaron.length} de ${vencieronEnElMes} este mes` },
        ].map((k) => (
          <Tarjeta key={k.nombre} className="p-4!">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-texto-suave">{k.nombre}</p>
            <p className="cifras font-titulos text-4xl font-extrabold leading-tight" style={{ color: k.color }}>
              {k.valor}
            </p>
            {k.nota && <p className="text-xs text-texto-suave">{k.nota}</p>}
          </Tarjeta>
        ))}
      </div>

      <Desplegable titulo="Por vencer" cuenta={porVencer.length} alerta abierto>
        {porVencer.length === 0 ? (
          <Vacio>Nadie vence en los próximos {DIAS_AVISO_ANTICIPADO} días.</Vacio>
        ) : (
          <Filas>
            {porVencer.map((c) =>
              fila(c, `Hola ${primerNombre(c.nombre)}, tu membresía ${textoVencimiento(c.dias!)} (${fechaCorta(c.vence!.valor)}). Renuévala con tu coach o aquí en el gimnasio.`),
            )}
          </Filas>
        )}
      </Desplegable>

      <Desplegable titulo="Vencidas" cuenta={vencidas.length} alerta>
        {vencidas.length === 0 ? (
          <Vacio>No hay membresías vencidas.</Vacio>
        ) : (
          <Filas>
            {vencidas.map((c) =>
              fila(c, `Hola ${primerNombre(c.nombre)}, tu membresía venció el ${fechaCorta(c.vence!.valor)}. ¡Te esperamos para seguir entrenando!`),
            )}
          </Filas>
        )}
      </Desplegable>

      <Desplegable titulo="Dejaron de pagar este mes" cuenta={sinRenovar.length} nota="Se les venció y no renovaron">
        {sinRenovar.length === 0 ? (
          <Vacio>Todos los que vencieron este mes renovaron.</Vacio>
        ) : (
          <Filas>
            {sinRenovar.map((id) => {
              const c = conPago.find((x) => x.id === id);
              return c ? (
                fila(c, `Hola ${primerNombre(c.nombre)}, te extrañamos en el gimnasio. ¿Todo bien? Cuando quieras regresar, aquí estamos.`)
              ) : (
                <li key={id} className="py-3 text-sm text-texto-suave">
                  {activos.get(id)?.nombre ?? "Cliente dado de baja"}
                </li>
              );
            })}
          </Filas>
        )}
      </Desplegable>

      {sinPago.length > 0 && (
        <Desplegable titulo="Sin ningún pago" cuenta={sinPago.length}>
          <Filas>{sinPago.map((c) => fila(c, `Hola ${primerNombre(c.nombre)}, te escribimos del gimnasio para registrar tu membresía.`))}</Filas>
        </Desplegable>
      )}
    </>
  );
}

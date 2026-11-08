import Link from "next/link";
import { cuadreDelMes } from "@/modules/membresias/domain/Cuentas";
import { Fecha } from "@/shared/domain/Fecha";
import { casosDeOperacion, casosDePagos } from "../../../_servidor/contenedor";
import { requerirSesion } from "../../../_servidor/sesion";
import { nombreMes, pesos } from "../../../_ui/formato";
import { Formulario } from "../../../_ui/Formulario";
import { Desplegable, Estado, Titulo } from "../../../_ui/piezas";
import { cerrarCuadre } from "../../pagos/acciones";

export default async function Cuadre({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const sesion = await requerirSesion("cuadre.cerrar");
  const hoy = Fecha.hoyEn(sesion.zonaHoraria, new Date());
  const pedido = (await searchParams).mes ?? "";
  const mes = /^\d{4}-\d{2}$/.test(pedido) && pedido <= hoy.mes ? pedido : hoy.mes;
  const inicio = Fecha.de(`${mes}-01`);
  const [anterior, siguiente] = [inicio.sumarMeses(-1).mes, inicio.sumarMeses(1).mes];

  const casos = casosDePagos(sesion.permisos, sesion.zonaHoraria);
  const [pagos, cerrados, coaches] = await Promise.all([
    casos.repositorio.confirmadosDelMes(sesion.gimnasioId, mes),
    casos.consultas.cuadresDelMes(sesion.gimnasioId, mes),
    casosDeOperacion(sesion.permisos, sesion.zonaHoraria).consultas.coaches(sesion.gimnasioId),
  ]);
  const terminado = mes < hoy.mes;

  return (
    <>
      <Titulo antetitulo="Cuentas">Cuadre mensual</Titulo>
      <div className="flex items-center gap-3">
        <Link href={`/admin/cuadre?mes=${anterior}`} className="min-h-10 rounded-lg border border-[#3a3d46] px-3 py-2 text-sm text-texto no-underline">
          ←
        </Link>
        <span className="font-titulos text-2xl font-bold uppercase">{nombreMes(mes)}</span>
        {mes < hoy.mes && (
          <Link href={`/admin/cuadre?mes=${siguiente}`} className="min-h-10 rounded-lg border border-[#3a3d46] px-3 py-2 text-sm text-texto no-underline">
            →
          </Link>
        )}
        {!terminado && <span className="text-sm text-texto-suave">Mes en curso: se cuadra cuando termine.</span>}
      </div>

      <Desplegable titulo="Con cada coach" abierto>
        <p className="text-xs text-texto-suave">
          Comisión de sus clientes contra el dinero que cobró él. Cuenta lo confirmado en el mes; la carga inicial no entra.
        </p>
        <ul className="mt-2 divide-y divide-[#2a2d36]">
          {coaches.map((c) => {
            const cuadre = cuadreDelMes(pagos, c.id, mes);
            const cerrado = cerrados.find((x) => x.coachId === c.id);
            const saldo = cerrado?.saldoCentavos ?? cuadre.saldoCentavos;
            return (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold">
                    <span className="h-3 w-3 rounded" style={{ background: c.color }} /> Coach {c.apodo}
                  </p>
                  <p className="text-sm text-texto-suave">
                    Comisión {pesos(cuadre.comisiones.centavos)} · cobró {pesos(cuadre.cobrosEnMano.centavos)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-titulos text-2xl font-bold">{pesos(Math.abs(saldo))}</p>
                  <p className="text-xs text-texto-suave">
                    {saldo === 0 ? "Sin saldo" : saldo > 0 ? "La administración le paga" : "Él entrega a la administración"}
                  </p>
                </div>
                <div className="w-full sm:w-auto">
                  {cerrado ? (
                    <Estado valor="activo" texto={`cuadrado por ${cerrado.cerradoPor}`} />
                  ) : terminado ? (
                    <Formulario accion={cerrarCuadre} boton="Marcar cuadrado" variante="secundario" className="gap-2!">
                      <input type="hidden" name="coachId" value={c.id} />
                      <input type="hidden" name="mes" value={mes} />
                      <input name="nota" placeholder="Nota (opcional)" className="min-h-11 rounded-xl border border-[#2a2d36] bg-[#23262e] px-3 text-sm text-texto" />
                    </Formulario>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </Desplegable>

    </>
  );
}

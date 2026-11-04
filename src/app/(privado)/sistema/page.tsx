import Link from "next/link";
import { cargoDelSistema, ingresosDelMes } from "@/modules/membresias/domain/Cuentas";
import { Fecha } from "@/shared/domain/Fecha";
import { baseDeDatos } from "@/shared/infrastructure/baseDeDatos";
import { casosDeClientes, casosDeOperacion, casosDePagos } from "../../_servidor/contenedor";
import { requerirSesion } from "../../_servidor/sesion";
import { nombreMes, pesos } from "../../_ui/formato";
import { Tarjeta, Titulo } from "../../_ui/piezas";
import { versionVisible } from "../../version";

export const dynamic = "force-dynamic";

const describirTarifa = (t: { tipo: string; puntosBase: number; cuotaFija: { centavos: number } }) =>
  t.tipo === "porcentaje" ? `${t.puntosBase / 100}%` : `${pesos(t.cuotaFija.centavos)} fijos`;

/**
 * Panel del sistema: solo el superadministrador. Vista general y de solo lectura de todos los gimnasios;
 * cifras agregadas, sin datos personales de clientes.
 */
export default async function PanelDelSistema() {
  const sesion = await requerirSesion("sistema.administrar");
  const gimnasios = await baseDeDatos()<{ id: string; nombre: string; zonaHoraria: string }[]>`
    SELECT id, nombre, zona_horaria AS "zonaHoraria" FROM gimnasio WHERE eliminado_en IS NULL ORDER BY creado_en`;

  const filas = await Promise.all(
    gimnasios.map(async (g) => {
      const mes = Fecha.hoyEn(g.zonaHoraria, new Date()).mes;
      const pagos = casosDePagos(sesion.permisos, g.zonaHoraria).repositorio;
      const [activos, pendientes, coaches, confirmados, tarifas] = await Promise.all([
        casosDeClientes().consultas.delGimnasio(g.id, "activo"),
        casosDeClientes().consultas.delGimnasio(g.id, "pendiente"),
        casosDeOperacion(sesion.permisos, g.zonaHoraria).consultas.coaches(g.id),
        pagos.confirmadosDelMes(g.id, mes),
        pagos.tarifas(g.id),
      ]);
      const ingresos = ingresosDelMes(confirmados, mes);
      const sistema = cargoDelSistema(tarifas, mes, ingresos);
      return { ...g, mes, activos: activos.length, pendientes: pendientes.length, coaches: coaches.length, ingresos, sistema };
    }),
  );
  const total = (f: (x: (typeof filas)[number]) => number) => filas.reduce((t, x) => t + f(x), 0);
  const indicadores = [
    { nombre: "Gimnasios", valor: String(filas.length) },
    { nombre: "Clientes activos", valor: String(total((x) => x.activos)), nota: `${total((x) => x.pendientes)} por aprobar` },
    { nombre: "Coaches", valor: String(total((x) => x.coaches)) },
    { nombre: "A cobrar este mes", valor: pesos(total((x) => x.sistema.cargo.centavos)), nota: "cuota del servicio" },
  ];

  return (
    <>
      <Titulo antetitulo="Superadministrador">Panel del sistema</Titulo>
      <p className="-mt-3 text-sm text-texto-suave">Vista general de todos los gimnasios. Solo tú la ves.</p>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {indicadores.map((k) => (
          <Tarjeta key={k.nombre}>
            <p className="text-sm text-texto-suave">{k.nombre}</p>
            <p className="font-titulos text-4xl font-extrabold leading-tight">{k.valor}</p>
            {k.nota && <p className="text-xs text-texto-suave">{k.nota}</p>}
          </Tarjeta>
        ))}
      </div>

      <Tarjeta>
        <h2 className="font-titulos text-2xl font-bold uppercase">Gimnasios</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-texto-suave">
              <tr>
                <th className="py-2 font-semibold">Gimnasio</th>
                <th className="py-2 font-semibold">Clientes</th>
                <th className="py-2 font-semibold">Coaches</th>
                <th className="py-2 font-semibold">Ingresos del mes</th>
                <th className="py-2 font-semibold">Cuota</th>
                <th className="py-2 font-semibold">A cobrar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2d36]">
              {filas.map((g) => (
                <tr key={g.id}>
                  <td className="py-3">
                    <p className="font-semibold">{g.nombre}</p>
                    <p className="text-xs text-texto-suave">{nombreMes(g.mes)}</p>
                  </td>
                  <td className="py-3">
                    <span className="font-titulos text-xl font-bold">{g.activos}</span>
                    {g.pendientes > 0 && <span className="ml-1 text-xs text-texto-suave">+{g.pendientes} por aprobar</span>}
                  </td>
                  <td className="py-3 font-titulos text-xl font-bold">{g.coaches}</td>
                  <td className="py-3">{pesos(g.ingresos.centavos)}</td>
                  <td className="py-3">{g.sistema.tarifa ? describirTarifa(g.sistema.tarifa) : "Cortesía"}</td>
                  <td className="py-3 font-semibold text-[#6fe0a2]">{pesos(g.sistema.cargo.centavos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-texto-suave">
          La cuota de tu gimnasio se programa en <Link href="/admin/cuadre">Cuadre → Con el sistema</Link>.
        </p>
      </Tarjeta>

      <Tarjeta>
        <h2 className="font-titulos text-2xl font-bold uppercase">Sistema</h2>
        <ul className="mt-2 flex flex-col gap-2 text-sm">
          <li className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#3dbe7a]" /> Versión en producción: {versionVisible()}
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#3dbe7a]" /> Respaldo nocturno automático de la base de datos
          </li>
        </ul>
        <p className="mt-3 text-xs text-texto-suave">Próximamente: cobros del servicio por confirmar y métricas por pilar de cada gimnasio.</p>
      </Tarjeta>
    </>
  );
}

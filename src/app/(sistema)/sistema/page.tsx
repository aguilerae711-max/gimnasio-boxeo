import Link from "next/link";
import { baseDeDatos } from "@/shared/infrastructure/baseDeDatos";
import { requerirSistema } from "../../_servidor/sesion";
import { nombreMes, pesos } from "../../_ui/formato";
import { versionVisible } from "../../version";
import { describirTarifa, gimnasiosDelSistema, Indicadores, ListaActividad, resumenDeGimnasio, Seccion } from "./datos";

export const dynamic = "force-dynamic";

/** Controles que todavía no existen; se muestran para que el plan del sistema quede a la vista. */
const PROXIMOS = [
  { titulo: "Cobro del servicio", texto: "Registrar y confirmar el pago de la cuota de cada administración, con recordatorio y estado al corriente o vencido." },
  { titulo: "Alta de administraciones", texto: "Dar de alta una administración nueva con su marca, zona horaria, primera cuenta y cuota." },
  { titulo: "Suspender o reactivar una administración", texto: "Pausar el acceso de una administración que no paga, sin borrar sus datos." },
  { titulo: "Marca de cada administración", texto: "Cambiar logotipo, colores, eslogan y frase según lo pida cada administración." },
  { titulo: "Métricas por pilar", texto: "Promedios de fuerza, velocidad, resistencia y estrategia por administración, sin datos personales." },
  { titulo: "Uso y retención", texto: "Personas que entraron en los últimos 30 días, clientes nuevos y bajas por mes en cada administración." },
  { titulo: "Auditoría completa", texto: "Búsqueda por persona, acción y fechas, y descarga en CSV." },
  { titulo: "Seguridad de cuentas", texto: "Cerrar todas las sesiones de una persona y ver accesos bloqueados por intentos fallidos." },
];

/**
 * Panel del sistema: solo el superadministrador. Primer nivel de la ramificación:
 * Sistema → Administración → Interfaz → Persona. Aquí se ve todo el sistema y se elige una administración.
 */
export default async function PanelDelSistema() {
  const sesion = await requerirSistema();
  const gimnasios = await gimnasiosDelSistema();
  // En la base local de pruebas no existe la tabla de migraciones: entonces no se muestra el número.
  const migraciones = await baseDeDatos()<{ n: number }[]>`SELECT count(*)::int AS n FROM schema_migraciones`.then(([f]) => f.n).catch(() => null);
  const filas = await Promise.all(gimnasios.map((g) => resumenDeGimnasio(g, sesion)));
  const zona = gimnasios[0]?.zonaHoraria ?? "America/Mexico_City";

  const total = (f: (x: (typeof filas)[number]) => number) => filas.reduce((t, x) => t + f(x), 0);
  const actividad = filas
    .flatMap((g) => g.actividad.map((a) => ({ ...a, gimnasio: g.nombre })))
    .sort((a, b) => b.creadoEn.getTime() - a.creadoEn.getTime())
    .slice(0, 10);
  const hoy = new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeZone: zona }).format(new Date());

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-acento">Administración del sistema · Centro de control</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Panel del sistema</h1>
          <p className="mt-1 text-sm text-texto-suave">Vista general de todas las administraciones · {hoy}. Solo tú la ves.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[#1f4a33] bg-[#0f1f17] px-3 py-1.5 text-xs font-semibold text-[#6fe0a2]">
          <span className="h-2 w-2 rounded-full bg-[#3dbe7a]" /> Operando · {versionVisible()}
        </span>
      </div>

      <Indicadores
        lista={[
          { nombre: "Administraciones", valor: String(filas.length), nota: "activas en el sistema" },
          { nombre: "Clientes activos", valor: String(total((x) => x.activos)), nota: `${total((x) => x.pendientes)} por aprobar` },
          { nombre: "Coaches", valor: String(total((x) => x.coaches)), nota: "aprobados" },
          { nombre: "Cuota del mes", valor: pesos(total((x) => x.sistema.cargo.centavos)), nota: "a cobrar por el servicio", acento: true },
        ]}
      />

      <Seccion
        titulo="Administraciones"
        descripcion="Elige una administración para ver su detalle, entrar a su panel o ver la app como alguien de ella."
      >
        {/* En el celular: una tarjeta por administración, sin tabla ancha. */}
        <ul className="flex flex-col gap-2 sm:hidden">
          {filas.map((g, i) => (
            <li key={g.id}>
              <Link
                href={`/sistema/administraciones/${g.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#262932] px-4 py-3 text-texto no-underline"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">
                    <span className="mr-2 font-mono text-xs text-texto-suave">{i + 1}</span>
                    {g.nombre}
                  </span>
                  <span className="block text-xs text-texto-suave">
                    {g.activos} clientes · {g.coaches} coaches · {pesos(g.ingresos.centavos)}
                    {g.pendientes > 0 && <span className="text-[#f1d9a8]"> · +{g.pendientes} por aprobar</span>}
                  </span>
                </span>
                <span aria-hidden className="shrink-0 text-acento">→</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="-mx-5 hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="whitespace-nowrap text-xs uppercase tracking-wider text-texto-suave">
                <th className="px-5 py-2 font-semibold">Administración</th>
                <th className="px-3 py-2 font-semibold">Estado</th>
                <th className="px-3 py-2 text-right font-semibold">Clientes</th>
                <th className="px-3 py-2 text-right font-semibold">Coaches</th>
                <th className="px-3 py-2 text-right font-semibold">Ingresos del mes</th>
                <th className="px-3 py-2 font-semibold">Cuota</th>
                <th className="px-3 py-2 text-right font-semibold">A cobrar</th>
                <th className="px-5 py-2">
                  <span className="sr-only">Abrir</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262932]">
              {filas.map((g, i) => (
                <tr key={g.id}>
                  <td className="px-5 py-3">
                    <span className="mr-2 font-mono text-xs text-texto-suave">{i + 1}</span>
                    <Link href={`/sistema/administraciones/${g.id}`} className="font-semibold text-texto no-underline hover:underline">
                      {g.nombre}
                    </Link>
                    <p className="ml-5 text-xs text-texto-suave">{nombreMes(g.mes)}</p>
                  </td>
                  <td className="px-3 py-3">
                    <span className="rounded-full bg-[#132a1f] px-2.5 py-1 text-xs font-semibold text-[#6fe0a2]">Activo</span>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    <span className="font-semibold">{g.activos}</span>
                    {g.pendientes > 0 && <span className="block text-xs text-[#f1d9a8]">+{g.pendientes} por aprobar</span>}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums">{g.coaches}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{pesos(g.ingresos.centavos)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-texto-suave">{describirTarifa(g.sistema.tarifa)}</td>
                  <td className="px-3 py-3 text-right font-bold tabular-nums text-[#6fe0a2]">{pesos(g.sistema.cargo.centavos)}</td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/sistema/administraciones/${g.id}`}
                      className="inline-flex min-h-9 items-center whitespace-nowrap rounded-lg bg-acento px-3 text-sm font-bold text-white no-underline"
                    >
                      Abrir →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Seccion>

      <div className="grid gap-5 md:grid-cols-2">
        <Seccion titulo="Actividad reciente" descripcion="Últimos movimientos registrados en la auditoría de todas las administraciones.">
          <ListaActividad actividad={actividad} zona={zona} />
        </Seccion>

        <Seccion titulo="Salud del sistema">
          <ul className="flex flex-col gap-3 text-sm">
            {[
              ["Versión en producción", versionVisible()],
              ["Base de datos", migraciones === null ? "En línea" : `En línea · ${migraciones} migraciones aplicadas`],
              ["Respaldo", "Automático cada noche"],
              ["Aislamiento de datos", "Cada administración solo ve lo suyo (RLS)"],
            ].map(([nombre, valor]) => (
              <li key={nombre} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#3dbe7a]" /> {nombre}
                </span>
                <span className="text-right text-texto-suave">{valor}</span>
              </li>
            ))}
          </ul>
        </Seccion>
      </div>

      <Seccion titulo="Próximos controles" descripcion="Lo que falta para administrar el sistema completo desde aquí.">
        <ul className="grid gap-3 md:grid-cols-2">
          {PROXIMOS.map((p) => (
            <li key={p.titulo} className="rounded-xl border border-dashed border-[#3a3d46] px-4 py-3">
              <p className="text-sm font-semibold">{p.titulo}</p>
              <p className="mt-0.5 text-xs text-texto-suave">{p.texto}</p>
            </li>
          ))}
        </ul>
      </Seccion>
    </>
  );
}

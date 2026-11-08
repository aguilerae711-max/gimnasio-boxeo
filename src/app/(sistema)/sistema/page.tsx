import Link from "next/link";
import { cargoDelSistema, ingresosDelMes } from "@/modules/membresias/domain/Cuentas";
import { Fecha } from "@/shared/domain/Fecha";
import { baseDeDatos, enGimnasio } from "@/shared/infrastructure/baseDeDatos";
import { casosDeAcceso, casosDeClientes, casosDeOperacion, casosDePagos } from "../../_servidor/contenedor";
import { requerirSistema } from "../../_servidor/sesion";
import { nombreMes, pesos } from "../../_ui/formato";
import { versionVisible } from "../../version";
import { entrarAGimnasio, verComo } from "./acciones";

export const dynamic = "force-dynamic";

const describirTarifa = (t: { tipo: string; puntosBase: number; cuotaFija: { centavos: number } }) =>
  t.tipo === "porcentaje" ? `${t.puntosBase / 100}% de ingresos` : `${pesos(t.cuotaFija.centavos)} fijos`;

const ACCIONES: Record<string, string> = {
  "acceso.enlace_activar": "Generó un enlace de acceso",
  "acceso.usuario_cambiado": "Cambió su usuario",
  "cliente.aprobado": "Revisó un registro de cliente",
  "cliente.inscrito_con_su_cuenta": "Se inscribió como cliente",
  "cliente.perfil_actualizado": "Actualizó un perfil de cliente",
  "cliente.reasignado": "Reasignó un cliente a otro coach",
  "coach.perfil_actualizado": "Actualizó su perfil de coach",
  "comision.cambiada": "Cambió una comisión",
  "cuadre.cerrado": "Cerró un cuadre",
  "equipo.agregado": "Agregó a alguien al equipo",
  "evaluacion.anulada": "Anuló una evaluación",
  "evaluacion.cerrada": "Cerró una evaluación",
  "evaluacion.iniciada": "Inició una evaluación",
  "evaluacion.no_apta": "Marcó una evaluación como no apta",
  "evaluacion.pesaje": "Registró un pesaje",
  "evaluacion.pin_definido": "Definió su PIN de evaluador",
  "evaluacion.punto_de_partida_reiniciado": "Reinició un punto de partida",
  "horario.turno_asignado": "Asignó un turno",
  "horario.turno_quitado": "Quitó un turno",
  "novedades.archivada": "Archivó una novedad",
  "novedades.publicada": "Publicó una novedad",
  "sistema.tarifa_cambiada": "Cambió la cuota del servicio",
  "sistema.ver_como": "Usó Ver como (solo lectura)",
  "sistema.entro_al_gimnasio": "El superadministrador entró al gimnasio",
};

const GRUPOS_VER_COMO = [
  { interfaz: "administracion", titulo: "Administración", tiene: (r: string[]) => r.includes("admin") },
  { interfaz: "coach", titulo: "Coach", tiene: (r: string[]) => r.includes("coach") },
  { interfaz: "cliente", titulo: "Cliente", tiene: (r: string[]) => r.includes("cliente") },
] as const;

/** Controles que todavía no existen; se muestran para que el plan del sistema quede a la vista. */
const PROXIMOS = [
  { titulo: "Cobro del servicio", texto: "Registrar y confirmar el pago de la cuota de cada gimnasio, con recordatorio y estado al corriente o vencido." },
  { titulo: "Alta de gimnasios", texto: "Dar de alta un gimnasio nuevo con su marca, zona horaria, primera cuenta de administración y cuota." },
  { titulo: "Suspender o reactivar un gimnasio", texto: "Pausar el acceso de un gimnasio que no paga, sin borrar sus datos." },
  { titulo: "Métricas por pilar", texto: "Promedios de fuerza, velocidad, resistencia y estrategia por gimnasio, sin datos personales." },
  { titulo: "Uso y retención", texto: "Personas que entraron en los últimos 30 días, clientes nuevos y bajas por mes en cada gimnasio." },
  { titulo: "Auditoría completa", texto: "Búsqueda por persona, acción y fechas, y descarga en CSV." },
  { titulo: "Seguridad de cuentas", texto: "Cerrar todas las sesiones de una persona y ver accesos bloqueados por intentos fallidos." },
  { titulo: "Aviso a todos los gimnasios", texto: "Publicar un aviso del sistema (mantenimiento, novedades de la app) en todas las administraciones." },
];

function Seccion({ titulo, descripcion, children, accion }: { titulo: string; descripcion?: string; children: React.ReactNode; accion?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#262932] bg-tarjeta">
      <header className="flex flex-wrap items-end justify-between gap-2 border-b border-[#262932] px-5 py-4">
        <div>
          <h2 className="text-base font-bold tracking-tight">{titulo}</h2>
          {descripcion && <p className="mt-0.5 text-sm text-texto-suave">{descripcion}</p>}
        </div>
        {accion}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

/**
 * Panel del sistema: solo el superadministrador. Vista general de todos los gimnasios con cifras agregadas,
 * "Ver como" (solo lectura) y actividad reciente.
 */
export default async function PanelDelSistema({ searchParams }: { searchParams: Promise<{ vercomo?: string }> }) {
  const sesion = await requerirSistema();
  const { vercomo } = await searchParams;
  const sql = baseDeDatos();
  const acceso = await casosDeAcceso();
  const gimnasios = await sql<{ id: string; nombre: string; zonaHoraria: string }[]>`
    SELECT id, nombre, zona_horaria AS "zonaHoraria" FROM gimnasio WHERE eliminado_en IS NULL ORDER BY creado_en`;
  // En la base local de pruebas no existe la tabla de migraciones: entonces no se muestra el número.
  const migraciones = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM schema_migraciones`.then(([f]) => f.n).catch(() => null);

  const filas = await Promise.all(
    gimnasios.map(async (g) => {
      const mes = Fecha.hoyEn(g.zonaHoraria, new Date()).mes;
      const pagos = casosDePagos(sesion.permisos, g.zonaHoraria).repositorio;
      const [activos, pendientes, coaches, confirmados, tarifas, personas, actividad] = await Promise.all([
        casosDeClientes().consultas.delGimnasio(g.id, "activo"),
        casosDeClientes().consultas.delGimnasio(g.id, "pendiente"),
        casosDeOperacion(sesion.permisos, g.zonaHoraria).consultas.coaches(g.id),
        pagos.confirmadosDelMes(g.id, mes),
        pagos.tarifas(g.id),
        acceso.equipo.personasDelGimnasio(g.id),
        enGimnasio(sql, g.id, (tx) => tx<{ id: string; accion: string; quien: string | null; creadoEn: Date }[]>`
          SELECT a.id::text, a.accion, u.nombre AS quien, a.creado_en AS "creadoEn"
          FROM auditoria a LEFT JOIN usuario u ON u.id = a.usuario_id
          WHERE a.gimnasio_id = ${g.id} ORDER BY a.creado_en DESC LIMIT 8`),
      ]);
      const ingresos = ingresosDelMes(confirmados, mes);
      const sistema = cargoDelSistema(tarifas, mes, ingresos);
      const visibles = personas.filter((p) => p.usuarioId !== sesion.usuarioId && !p.roles.includes("superadmin"));
      return { ...g, mes, activos: activos.length, pendientes: pendientes.length, coaches: coaches.length, ingresos, sistema, visibles, actividad };
    }),
  );
  const total = (f: (x: (typeof filas)[number]) => number) => filas.reduce((t, x) => t + f(x), 0);
  const actividad = filas
    .flatMap((g) => g.actividad.map((a) => ({ ...a, gimnasio: g.nombre })))
    .sort((a, b) => b.creadoEn.getTime() - a.creadoEn.getTime())
    .slice(0, 10);
  const indicadores = [
    { nombre: "Gimnasios activos", valor: String(filas.length), nota: "en el sistema" },
    { nombre: "Clientes activos", valor: String(total((x) => x.activos)), nota: `${total((x) => x.pendientes)} por aprobar` },
    { nombre: "Coaches", valor: String(total((x) => x.coaches)), nota: "aprobados" },
    { nombre: "Cuota del mes", valor: pesos(total((x) => x.sistema.cargo.centavos)), nota: "a cobrar por el servicio", acento: true },
  ];
  const hora = new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeZone: gimnasios[0]?.zonaHoraria ?? "America/Mexico_City" }).format(new Date());
  const cuando = (d: Date) =>
    new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: gimnasios[0]?.zonaHoraria ?? "America/Mexico_City" }).format(d);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-acento">Superadministrador · Centro de control</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Panel del sistema</h1>
          <p className="mt-1 text-sm text-texto-suave">Vista general de todos los gimnasios · {hora}. Solo tú la ves.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[#1f4a33] bg-[#0f1f17] px-3 py-1.5 text-xs font-semibold text-[#6fe0a2]">
          <span className="h-2 w-2 rounded-full bg-[#3dbe7a]" /> Operando · {versionVisible()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {indicadores.map((k) => (
          <div key={k.nombre} className="rounded-2xl border border-[#262932] bg-tarjeta px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-texto-suave">{k.nombre}</p>
            <p className={`mt-2 text-3xl font-extrabold tabular-nums tracking-tight ${k.acento ? "text-[#6fe0a2]" : ""}`}>{k.valor}</p>
            <p className="mt-1 text-xs text-texto-suave">{k.nota}</p>
          </div>
        ))}
      </div>

      <Seccion titulo="Gimnasios" descripcion="Cifras del mes en curso de cada gimnasio. Sin datos personales de clientes.">
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="whitespace-nowrap text-xs uppercase tracking-wider text-texto-suave">
                <th className="px-5 py-2 font-semibold">Gimnasio</th>
                <th className="px-3 py-2 font-semibold">Estado</th>
                <th className="px-3 py-2 text-right font-semibold">Clientes</th>
                <th className="px-3 py-2 text-right font-semibold">Coaches</th>
                <th className="px-3 py-2 text-right font-semibold">Ingresos del mes</th>
                <th className="px-3 py-2 font-semibold">Cuota</th>
                <th className="px-3 py-2 text-right font-semibold">A cobrar</th>
                <th className="px-5 py-2"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262932]">
              {filas.map((g) => (
                <tr key={g.id}>
                  <td className="px-5 py-3">
                    <p className="font-semibold">{g.nombre}</p>
                    <p className="text-xs text-texto-suave">{nombreMes(g.mes)}</p>
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
                  <td className="px-3 py-3 text-texto-suave">{g.sistema.tarifa ? describirTarifa(g.sistema.tarifa) : "Cortesía"}</td>
                  <td className="px-3 py-3 text-right font-bold tabular-nums text-[#6fe0a2]">{pesos(g.sistema.cargo.centavos)}</td>
                  <td className="px-5 py-3 text-right">
                    <form action={entrarAGimnasio}>
                      <input type="hidden" name="gimnasioId" value={g.id} />
                      <button type="submit" className="min-h-9 whitespace-nowrap rounded-lg bg-acento px-3 text-sm font-bold text-white">
                        Entrar al gimnasio
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-texto-suave">
          Al entrar a un gimnasio ves su administración con su marca, como superadministrador. La cuota del servicio se programa ahí, en
          Cuadre → Con el sistema. Regresas aquí con «← Panel del sistema».
        </p>
      </Seccion>

      <Seccion
        titulo="Ver como"
        descripcion="Abre la app exactamente como la ve otra persona, para revisar cada interfaz. Es solo lectura: nada se guarda, dura 2 horas y queda en la auditoría del gimnasio."
      >
        {vercomo === "no" && (
          <p role="alert" className="mb-3 rounded-lg bg-[#2a1418] px-3 py-2 text-sm text-[#ff8f97]">
            Esa persona ya no está activa o no tiene esa interfaz. Elige otra.
          </p>
        )}
        <div className="flex flex-col gap-4">
          {filas.map((g) => (
            <form key={g.id} action={verComo} className="flex flex-col gap-2 md:flex-row md:items-end">
              <label className="flex flex-1 flex-col gap-1 text-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-texto-suave">{g.nombre}</span>
                <select
                  name="eleccion"
                  required
                  defaultValue=""
                  className="min-h-11 rounded-lg border border-[#3a3d46] bg-fondo px-3 text-texto"
                >
                  <option value="" disabled>
                    Elige interfaz y persona…
                  </option>
                  {GRUPOS_VER_COMO.map((grupo) => {
                    const personas = g.visibles.filter((p) => grupo.tiene(p.roles));
                    return personas.length === 0 ? null : (
                      <optgroup key={grupo.interfaz} label={`${grupo.titulo} (${personas.length})`}>
                        {personas.map((p) => (
                          <option key={p.usuarioId} value={`${grupo.interfaz}:${p.usuarioId}`}>
                            {p.nombre}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </label>
              <button type="submit" className="min-h-11 rounded-lg bg-acento px-5 font-bold text-white">
                Ver como
              </button>
            </form>
          ))}
        </div>
        <p className="mt-3 text-xs text-texto-suave">
          La portada pública la ves sin cuenta en <Link href="/">la página de inicio</Link>; abre una ventana privada para verla como un visitante.
        </p>
      </Seccion>

      <div className="grid gap-5 md:grid-cols-2">
        <Seccion titulo="Actividad reciente" descripcion="Últimos movimientos registrados en la auditoría.">
          {actividad.length === 0 ? (
            <p className="text-sm text-texto-suave">Sin movimientos todavía.</p>
          ) : (
            <ul className="divide-y divide-[#262932] text-sm">
              {actividad.map((a) => (
                <li key={`${a.gimnasio}-${a.id}`} className="flex items-start justify-between gap-3 py-2">
                  <div>
                    <p>{ACCIONES[a.accion] ?? a.accion}</p>
                    <p className="text-xs text-texto-suave">
                      {a.quien ?? "Sistema"} · {a.gimnasio}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-texto-suave">{cuando(a.creadoEn)}</span>
                </li>
              ))}
            </ul>
          )}
        </Seccion>

        <Seccion titulo="Salud del sistema">
          <ul className="flex flex-col gap-3 text-sm">
            {[
              ["Versión en producción", versionVisible()],
              ["Base de datos", migraciones === null ? "En línea" : `En línea · ${migraciones} migraciones aplicadas`],
              ["Respaldo", "Automático cada noche"],
              ["Aislamiento de datos", "Cada gimnasio solo ve lo suyo (RLS)"],
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

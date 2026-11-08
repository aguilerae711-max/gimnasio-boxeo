import "server-only";
import { cargoDelSistema, ingresosDelMes } from "@/modules/membresias/domain/Cuentas";
import { Fecha } from "@/shared/domain/Fecha";
import { baseDeDatos, enGimnasio } from "@/shared/infrastructure/baseDeDatos";
import { casosDeAcceso, casosDeClientes, casosDePagos } from "../../_servidor/contenedor";
import type { ContextoActual } from "../../_servidor/sesion";
import { pesos } from "../../_ui/formato";

/** Piezas compartidas del panel del sistema: datos por gimnasio y la presentación neutra. */

export interface GimnasioDelSistema {
  id: string;
  nombre: string;
  zonaHoraria: string;
}

export async function gimnasiosDelSistema(): Promise<GimnasioDelSistema[]> {
  return baseDeDatos()<GimnasioDelSistema[]>`
    SELECT id, nombre, zona_horaria AS "zonaHoraria" FROM gimnasio WHERE eliminado_en IS NULL ORDER BY creado_en`;
}

export async function gimnasioDelSistema(id: string): Promise<GimnasioDelSistema | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [g] = await baseDeDatos()<GimnasioDelSistema[]>`
    SELECT id, nombre, zona_horaria AS "zonaHoraria" FROM gimnasio WHERE id = ${id} AND eliminado_en IS NULL`;
  return g ?? null;
}

/** Cifras del mes de un gimnasio, sus personas (para Ver como) y su actividad reciente. Sin datos personales de clientes. */
export async function resumenDeGimnasio(g: GimnasioDelSistema, sesion: ContextoActual, actividadMax = 8) {
  const sql = baseDeDatos();
  const mes = Fecha.hoyEn(g.zonaHoraria, new Date()).mes;
  const pagos = casosDePagos(sesion.permisos, g.zonaHoraria).repositorio;
  const [arbol, activos, pendientes, confirmados, tarifas, personas, actividad] = await Promise.all([
    casosDeClientes().consultas.arbolDelGimnasio(g.id),
    casosDeClientes().consultas.delGimnasio(g.id, "activo"),
    casosDeClientes().consultas.delGimnasio(g.id, "pendiente"),
    pagos.confirmadosDelMes(g.id, mes),
    pagos.tarifas(g.id),
    (await casosDeAcceso()).equipo.personasDelGimnasio(g.id),
    enGimnasio(sql, g.id, (tx) => tx<{ id: string; accion: string; quien: string | null; creadoEn: Date }[]>`
      SELECT a.id::text, a.accion, u.nombre AS quien, a.creado_en AS "creadoEn"
      FROM auditoria a LEFT JOIN usuario u ON u.id = a.usuario_id
      WHERE a.gimnasio_id = ${g.id} ORDER BY a.creado_en DESC LIMIT ${actividadMax}`),
  ]);
  const ingresos = ingresosDelMes(confirmados, mes);
  const sistema = cargoDelSistema(tarifas, mes, ingresos);
  // Tú no apareces en Ver como: tu cuenta es la del sistema.
  // Coaches aprobados de la administración; tu cuenta es la del sistema y no cuenta como coach.
  const coaches = arbol.coaches.filter((c) => c.estado === "aprobado" && c.usuarioId !== sesion.usuarioId);
  const visibles = personas.filter((p) => p.usuarioId !== sesion.usuarioId && !p.roles.includes("superadmin"));
  // Roles que tu cuenta del sistema todavía tiene en esta administración (lo ideal: ninguno).
  const misRoles = personas.find((p) => p.usuarioId === sesion.usuarioId)?.roles.filter((r) => r === "admin" || r === "coach") ?? [];
  return { ...g, mes, activos: activos.length, pendientes: pendientes.length, coaches: coaches.length, ingresos, sistema, visibles, actividad, arbol, misRoles };
}

export const describirTarifa = (t: { tipo: string; puntosBase: number; cuotaFija: { centavos: number } } | null) =>
  !t ? "Cortesía" : t.tipo === "porcentaje" ? `${t.puntosBase / 100}% de ingresos` : `${pesos(t.cuotaFija.centavos)} fijos`;

export const ACCIONES: Record<string, string> = {
  "acceso.enlace_activar": "Generó un enlace de acceso",
  "acceso.usuario_cambiado": "Cambió su usuario",
  "sistema.cuenta_separada": "Separó la cuenta del sistema",
  "prueba.contactado": "Agendó una clase de prueba",
  "prueba.inscrito": "Inscribió a alguien tras su prueba",
  "prueba.descartado": "Descartó una clase de prueba",
  "cliente.aprobado": "Revisó un registro de cliente",
  "cliente.inscrito_con_su_cuenta": "Se inscribió como cliente",
  "cliente.perfil_actualizado": "Actualizó un perfil de cliente",
  "cliente.reasignado": "Reasignó un cliente a otro coach",
  "coach.perfil_actualizado": "Actualizó su perfil de coach",
  "comision.cambiada": "Cambió una comisión",
  "cuadre.cerrado": "Cerró un cuadre",
  "equipo.agregado": "Agregó a alguien al equipo",
  "equipo.tambien_coach": "Se sumó como coach",
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
  "sistema.entro_al_gimnasio": "El superadministrador entró al panel",
};

export const fechaCorta = (d: Date, zona: string) =>
  new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: zona }).format(d);

export function Seccion({ titulo, descripcion, children, accion }: { titulo: string; descripcion?: string; children: React.ReactNode; accion?: React.ReactNode }) {
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

export function Indicadores({ lista }: { lista: { nombre: string; valor: string; nota: string; acento?: boolean }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {lista.map((k) => (
        <div key={k.nombre} className="rounded-2xl border border-[#262932] bg-tarjeta px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-texto-suave">{k.nombre}</p>
          <p className={`mt-2 text-3xl font-extrabold tabular-nums tracking-tight ${k.acento ? "text-[#6fe0a2]" : ""}`}>{k.valor}</p>
          <p className="mt-1 text-xs text-texto-suave">{k.nota}</p>
        </div>
      ))}
    </div>
  );
}

export function ListaActividad({ actividad, zona }: { actividad: { id: string; accion: string; quien: string | null; creadoEn: Date; gimnasio?: string }[]; zona: string }) {
  if (actividad.length === 0) return <p className="text-sm text-texto-suave">Sin movimientos todavía.</p>;
  return (
    <ul className="divide-y divide-[#262932] text-sm">
      {actividad.map((a) => (
        <li key={`${a.gimnasio ?? ""}-${a.id}`} className="flex items-start justify-between gap-3 py-2">
          <div>
            <p>{ACCIONES[a.accion] ?? a.accion}</p>
            <p className="text-xs text-texto-suave">
              {a.quien ?? "Sistema"}
              {a.gimnasio ? ` · ${a.gimnasio}` : ""}
            </p>
          </div>
          <span className="shrink-0 text-xs tabular-nums text-texto-suave">{fechaCorta(a.creadoEn, zona)}</span>
        </li>
      ))}
    </ul>
  );
}

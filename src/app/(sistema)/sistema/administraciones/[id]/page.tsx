import Link from "next/link";
import { notFound } from "next/navigation";
import { marcaDe } from "../../../../_servidor/marca";
import { requerirSistema } from "../../../../_servidor/sesion";
import { nombreMes, pesos } from "../../../../_ui/formato";
import { Logotipo } from "../../../../_ui/MarcaGimnasio";
import { Fecha } from "@/shared/domain/Fecha";
import { casosDePagos } from "../../../../_servidor/contenedor";
import { Formulario } from "../../../../_ui/Formulario";
import { Campo } from "../../../../_ui/piezas";
import {
  entrarAGimnasio,
  programarCuota,
  separarMiCuenta,
  verComo,
} from "../../acciones";
import {
  describirTarifa,
  gimnasioDelSistema,
  gimnasiosDelSistema,
  Indicadores,
  ListaActividad,
  resumenDeGimnasio,
  Seccion,
} from "../../datos";

export const dynamic = "force-dynamic";

type Interfaz = "administracion" | "coach" | "cliente";

/** Un nodo del árbol: número, nombre, estado y su botón de "Ver como". */
function Nodo({
  numero,
  nombre,
  rol,
  estado,
  interfaz,
  usuarioId,
  gimnasioId,
  tu,
}: {
  numero: string;
  nombre: string;
  rol: string;
  estado?: string;
  interfaz: Interfaz;
  usuarioId: string;
  gimnasioId: string;
  tu?: boolean;
}) {
  const pendiente = estado === "pendiente";
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-[#1b1e25]">
      <div className="flex min-w-0 items-center gap-3">
        <span className="w-12 shrink-0 font-mono text-xs tabular-nums text-texto-suave">
          {numero}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {nombre}
            {tu && (
              <span className="ml-1 font-normal text-texto-suave">(tú)</span>
            )}
          </p>
          <p className="text-xs text-texto-suave">
            {rol}
            {pendiente && (
              <span className="ml-1 text-[#f1d9a8]">· por aprobar</span>
            )}
          </p>
        </div>
      </div>
      {!tu && (
        <form action={verComo} className="shrink-0">
          <input
            type="hidden"
            name="eleccion"
            value={`${interfaz}:${usuarioId}`}
          />
          <input type="hidden" name="gimnasioId" value={gimnasioId} />
          <button
            type="submit"
            className="rounded-md border border-[#3a3d46] px-2.5 py-1 text-xs font-semibold text-texto"
          >
            Ver como
          </button>
        </form>
      )}
    </div>
  );
}

/**
 * Segundo nivel del árbol del sistema: Sistema (tú) → Administración → Coaches → Clientes.
 * Muestra su marca, cifras, la entrada a su panel y "Ver como" en cada nodo.
 */
export default async function AdministracionEnElSistema({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ vercomo?: string }>;
}) {
  const sesion = await requerirSistema();
  const [{ id }, { vercomo }] = await Promise.all([params, searchParams]);
  const [todas, g] = await Promise.all([
    gimnasiosDelSistema(),
    gimnasioDelSistema(id),
  ]);
  if (!g) notFound();
  const [r, marca, tarifas] = await Promise.all([
    resumenDeGimnasio(g, sesion, 12),
    marcaDe(g.id),
    casosDePagos(sesion.permisos, g.zonaHoraria).repositorio.tarifas(g.id),
  ]);
  const proximoMes = Fecha.de(
    `${Fecha.hoyEn(g.zonaHoraria, new Date()).mes}-01`,
  ).sumarMeses(1).mes;
  const n = String(todas.findIndex((x) => x.id === g.id) + 1);

  // Quienes administran (sin ti) y el árbol coach → clientes.
  const administradores = r.visibles.filter((p) => p.roles.includes("admin"));
  // Tú eres el nivel del sistema: tu cuenta no aparece como coach ni como cliente en el árbol.
  const coaches = r.arbol.coaches
    .filter((c) => c.usuarioId !== sesion.usuarioId)
    .map((c, i) => ({
      ...c,
      numero: `${n}.${i + 1}`,
      clientes: r.arbol.clientes.filter(
        (cl) => cl.coachUsuarioId === c.usuarioId,
      ),
    }));

  return (
    <>
      <nav
        aria-label="Ruta"
        className="flex flex-wrap items-center gap-2 text-sm text-texto-suave"
      >
        <Link
          href="/sistema"
          className="text-texto-suave no-underline hover:text-texto"
        >
          Administración del sistema
        </Link>
        <span aria-hidden>/</span>
        <span className="text-texto">
          {n} · {g.nombre}
        </span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#262932] bg-tarjeta px-5 py-4">
        <div className="flex items-center gap-4">
          <Logotipo marca={marca} tamano={56} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-acento">
              Administración {n}
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight">
              {g.nombre}
            </h1>
            {marca.eslogan && (
              <p className="text-sm text-texto-suave">{marca.eslogan}</p>
            )}
          </div>
        </div>
        <form action={entrarAGimnasio}>
          <input type="hidden" name="gimnasioId" value={g.id} />
          <button
            type="submit"
            className="min-h-11 rounded-lg bg-acento px-5 font-bold text-white"
          >
            Entrar a su panel
          </button>
        </form>
      </div>

      <Indicadores
        lista={[
          {
            nombre: "Clientes activos",
            valor: String(r.activos),
            nota: `${r.pendientes} por aprobar`,
          },
          { nombre: "Coaches", valor: String(r.coaches), nota: "aprobados" },
          {
            nombre: "Ingresos del mes",
            valor: pesos(r.ingresos.centavos),
            nota: nombreMes(r.mes),
          },
          {
            nombre: "Cuota del servicio",
            valor: pesos(r.sistema.cargo.centavos),
            nota: describirTarifa(r.sistema.tarifa),
            acento: true,
          },
        ]}
      />

      <Seccion
        titulo="Estructura y Ver como"
        descripcion="Cada coach con sus clientes. Toca «Ver como» en cualquiera para ver la app exactamente como la ve, con la marca de esta administración. Solo lectura: nada se guarda, dura 2 horas y queda en la auditoría."
      >
        {vercomo === "no" && (
          <p
            role="alert"
            className="mb-3 rounded-lg bg-[#2a1418] px-3 py-2 text-sm text-[#ff8f97]"
          >
            Esa persona ya no está activa o no tiene esa interfaz. Elige otra.
          </p>
        )}

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3 px-3 py-2">
            <span className="w-12 shrink-0 font-mono text-xs text-texto-suave">
              {n}
            </span>
            <p className="text-sm font-bold">{g.nombre}</p>
          </div>

          {administradores.length > 0 && (
            <div className="ml-6 border-l border-[#2f333d] pl-3">
              {administradores.map((p) => (
                <Nodo
                  key={p.usuarioId}
                  numero={`${n}`}
                  nombre={p.nombre}
                  rol="Panel de administración"
                  interfaz="administracion"
                  usuarioId={p.usuarioId}
                  gimnasioId={g.id}
                />
              ))}
            </div>
          )}

          {coaches.length === 0 ? (
            <p className="ml-6 border-l border-[#2f333d] px-3 py-2 text-sm text-texto-suave">
              Todavía no hay coaches.
            </p>
          ) : (
            <ul className="ml-6 flex flex-col gap-1 border-l border-[#2f333d] pl-3">
              {coaches.map((c) => (
                <li key={c.usuarioId}>
                  <Nodo
                    numero={c.numero}
                    nombre={c.nombre}
                    rol={`Coach · ${c.clientes.length} ${c.clientes.length === 1 ? "cliente" : "clientes"}`}
                    estado={c.estado}
                    interfaz="coach"
                    usuarioId={c.usuarioId}
                    gimnasioId={g.id}
                    tu={c.usuarioId === sesion.usuarioId}
                  />
                  {c.clientes.length > 0 && (
                    <ul className="ml-6 max-h-80 overflow-y-auto border-l border-[#2f333d] pl-3">
                      {c.clientes.map((cl, j) => (
                        <li key={cl.usuarioId}>
                          <Nodo
                            numero={`${c.numero}.${j + 1}`}
                            nombre={cl.nombre}
                            rol="Cliente"
                            estado={cl.estado}
                            interfaz="cliente"
                            usuarioId={cl.usuarioId}
                            gimnasioId={g.id}
                            tu={cl.usuarioId === sesion.usuarioId}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="mt-3 text-xs text-texto-suave">
          La portada pública de esta administración la ves sin cuenta: abre una
          ventana privada en <Link href="/">la página de inicio</Link>.
        </p>
      </Seccion>

      {r.misRoles.length > 0 && (
        <Seccion
          titulo="Tu cuenta en esta administración"
          descripcion={`Tu cuenta del sistema todavía es ${r.misRoles.map((x) => (x === "admin" ? "administración" : "coach")).join(" y ")} aquí. Para que el sistema quede independiente, pasa esa parte a tu cuenta de la administración.`}
        >
          <ul className="mb-3 list-disc pl-5 text-sm text-texto-suave">
            <li>
              Tu coach pasa completo a esa cuenta: clientes, turnos, planes,
              rutinas, comisiones y pagos. Nada se copia ni se borra.
            </li>
            <li>
              Tu cuenta del sistema deja de ser administración y coach aquí;
              sigues siendo superadministrador y entras con «Entrar a su panel».
            </li>
            <li>Queda en la auditoría.</li>
          </ul>
          {administradores.length === 0 ? (
            <p className="text-sm text-texto-suave">
              Primero crea tu cuenta de la administración: entra a su panel →
              Personas → Equipo → Agregar al equipo.
            </p>
          ) : (
            <Formulario
              accion={separarMiCuenta}
              boton="Separar mi cuenta"
              variante="secundario"
            >
              <input type="hidden" name="gimnasioId" value={g.id} />
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-[#c9ccd3]">
                  Tu cuenta de la administración
                </span>
                <select
                  name="destino"
                  required
                  className="min-h-12 rounded-xl border border-borde bg-campo px-3 text-texto"
                >
                  {administradores.map((p) => (
                    <option key={p.usuarioId} value={p.usuarioId}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-start gap-3 text-sm text-[#c9ccd3]">
                <input
                  type="checkbox"
                  name="confirmo"
                  value="si"
                  required
                  className="mt-1 h-5 w-5 accent-[#4f8cff]"
                />
                <span>
                  Sí, esa cuenta es mía y ahí seguiré como administración y
                  coach.
                </span>
              </label>
            </Formulario>
          )}
        </Seccion>
      )}

      <Seccion
        titulo="Cuota del servicio"
        descripcion="Lo que esta administración le paga al sistema. Solo tú la ves y la programas; empieza el primer día del mes que elijas."
      >
        <ul className="mb-4 text-sm text-texto-suave">
          {tarifas.length === 0 && <li>Sin cuota programada.</li>}
          {tarifas.map((t) => (
            <li key={t.vigenteDesde.valor}>
              Desde {nombreMes(t.vigenteDesde.mes)}:{" "}
              <b className="text-texto">{describirTarifa(t)}</b>
            </li>
          ))}
        </ul>
        <Formulario
          accion={programarCuota}
          boton="Programar cuota"
          variante="secundario"
          className="grid! grid-cols-2 items-end gap-2! sm:grid-cols-[1fr_1fr_1fr_1fr_2fr_auto]"
        >
          <input type="hidden" name="gimnasioId" value={g.id} />
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-[#c9ccd3]">Tipo</span>
            <select
              name="tipo"
              className="min-h-12 rounded-xl border border-borde bg-campo px-3 text-texto"
            >
              <option value="porcentaje">Porcentaje</option>
              <option value="cuota_fija">Cuota fija</option>
            </select>
          </label>
          <Campo
            etiqueta="%"
            name="porcentaje"
            type="number"
            min={0}
            max={50}
            step={0.01}
            defaultValue={0}
          />
          <Campo
            etiqueta="Cuota ($)"
            name="cuota"
            type="number"
            min={0}
            step={0.01}
            defaultValue={0}
          />
          <Campo
            etiqueta="Desde"
            name="desde"
            type="month"
            min={proximoMes}
            required
          />
          <Campo etiqueta="Motivo" name="motivo" required />
        </Formulario>
      </Seccion>

      <Seccion
        titulo="Actividad reciente"
        descripcion="Últimos movimientos en la auditoría de esta administración."
      >
        <ListaActividad actividad={r.actividad} zona={g.zonaHoraria} />
      </Seccion>
    </>
  );
}

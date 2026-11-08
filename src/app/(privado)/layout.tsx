import { casosDeNovedades } from "../_servidor/contenedor";
import Link from "next/link";
import { esSuperadministrador, lectorDe, requerirSesion } from "../_servidor/sesion";
import { Menu, type Enlace, type Opcion, type Rol } from "../_ui/Menu";
import { CuentaMenu } from "../_ui/CuentaMenu";
import { marcaDe } from "../_servidor/marca";
import { MarcaGimnasio } from "../_ui/MarcaGimnasio";
import { salir } from "../(publico)/acciones";
import { SoloLectura } from "../_ui/SoloLectura";

export const dynamic = "force-dynamic";

export default async function LayoutPrivado({ children }: { children: React.ReactNode }) {
  const sesion = await requerirSesion();
  const tiene = (p: string) => sesion.permisos.includes(p);
  const marca = await marcaDe(sesion.gimnasioId);
  const sinVer = await casosDeNovedades(sesion.permisos).consultas.sinVer(sesion.gimnasioId, lectorDe(sesion), sesion.usuarioId);
  const solo = <T,>(condicion: boolean, valor: T) => (condicion ? [valor] : []);
  const novedades: Opcion = { texto: "Novedades", paginas: [{ href: "/novedades", texto: "Novedades" }], aviso: sinVer };
  const opcion = (texto: string, paginas: Enlace[]): Opcion[] => (paginas.length > 0 ? [{ texto, paginas }] : []);

  const roles: Rol[] = [];
  if (tiene("cliente.aprobar")) {
    roles.push({
      clave: "administro",
      titulo: "Administro",
      opciones: [
        { texto: "Hoy", paginas: [{ href: "/admin", texto: "Hoy" }] },
        ...opcion("Personas", [
          { href: "/admin/personas", texto: "Equipo" },
          ...solo(tiene("horario.asignar"), { href: "/admin/horario", texto: "Horario" }),
        ]),
        ...opcion("Dinero", [
          ...solo(tiene("pago.confirmar"), { href: "/admin/pagos", texto: "Pagos" }),
          ...solo(tiene("cuadre.cerrar"), { href: "/admin/cuadre", texto: "Cuadre" }),
          ...solo(tiene("comision.cambiar"), { href: "/admin/comisiones", texto: "Comisiones" }),
        ]),
        ...opcion("Entrenamiento", [
          ...solo(tiene("evaluacion.realizar"), { href: "/admin/evaluacion", texto: "Evaluación" }),
          ...solo(tiene("plan.aprobar"), { href: "/admin/planes", texto: "Planes de trabajo" }),
          ...solo(tiene("biblioteca.formalizar"), { href: "/biblioteca", texto: "Biblioteca" }),
        ]),
        novedades,
      ],
    });
  }
  if (sesion.roles.includes("coach")) {
    roles.push({
      clave: "clases",
      titulo: "Doy clases",
      opciones: [
        { texto: "Hoy", paginas: [{ href: "/coach", texto: "Hoy" }] },
        {
          texto: "Entrenamiento",
          paginas: [
            { href: "/coach/rutinas", texto: "Rutinas" },
            { href: "/coach/plan", texto: "Mi plan" },
            { href: "/biblioteca", texto: "Biblioteca" },
            { href: "/coach/resultados", texto: "Resultados" },
          ],
        },
        { texto: "Mis pagos", paginas: [{ href: "/coach/pagos", texto: "Mis pagos" }] },
        novedades,
      ],
    });
  }
  if (sesion.roles.includes("cliente")) {
    roles.push({
      clave: "entreno",
      titulo: "Entreno",
      opciones: [
        { texto: "Hoy", paginas: [{ href: "/cliente", texto: "Hoy" }] },
        { texto: "Mi progreso", paginas: [{ href: "/cliente/resultados", texto: "Mi progreso" }] },
        novedades,
      ],
    });
  }
  if (roles.length === 0) roles.push({ clave: "general", titulo: "General", opciones: [novedades] });

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-5">
      {sesion.vistaComo && <SoloLectura />}
      {sesion.vistaComo && (
        <div
          role="status"
          className="sticky top-2 z-20 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#6b4d12] bg-[#2a2111] px-4 py-3 text-sm text-[#f1d9a8] shadow-lg"
        >
          <p>
            <span className="font-bold uppercase tracking-wider">Vista de solo lectura</span> · Estás viendo la app como{" "}
            <b className="text-white">{sesion.nombre}</b>. Nada de lo que toques se guarda.
          </p>
          <form action="/ver-como/terminar" method="post">
            <button type="submit" className="min-h-9 rounded-lg bg-[#f1d9a8] px-3 font-bold text-[#2a2111]">
              Terminar vista
            </button>
          </form>
        </div>
      )}
      {esSuperadministrador(sesion) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#262932] bg-[#0f1116] px-4 py-2 text-sm">
          <span className="text-texto-suave">
            Superadministrador · en la administración <b className="text-texto">{marca.nombre}</b>
          </span>
          <Link href="/sistema" className="font-semibold text-[#8fb4ff] no-underline">
            ← Panel del sistema
          </Link>
        </div>
      )}
      <header className="flex items-center justify-between gap-3">
        <MarcaGimnasio marca={marca} />
        <CuentaMenu nombre={sesion.nombre}>
          {!sesion.vistaComo && (
            <form action={salir}>
              <button type="submit" className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#ff8f97] hover:bg-white/[0.05]">
                Salir
              </button>
            </form>
          )}
        </CuentaMenu>
      </header>
      <Menu roles={roles} />
      <main className="mt-6 flex flex-1 flex-col gap-5">{children}</main>
    </div>
  );
}

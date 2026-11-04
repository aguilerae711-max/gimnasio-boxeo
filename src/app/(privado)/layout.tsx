import Link from "next/link";
import { casosDeNovedades } from "../_servidor/contenedor";
import { lectorDe, requerirSesion } from "../_servidor/sesion";
import { Marca } from "../_ui/piezas";
import { salir } from "../(publico)/acciones";

export const dynamic = "force-dynamic";

export default async function LayoutPrivado({ children }: { children: React.ReactNode }) {
  const sesion = await requerirSesion();
  const tiene = (p: string) => sesion.permisos.includes(p);
  const sinVer = await casosDeNovedades(sesion.permisos).consultas.sinVer(sesion.gimnasioId, lectorDe(sesion), sesion.usuarioId);
  const menu: ({ href: string; texto: string; aviso?: number } | false)[] = [
    { href: "/novedades", texto: "Novedades", aviso: sinVer },
    tiene("cliente.aprobar") && { href: "/admin", texto: "Administración" },
    tiene("horario.asignar") && { href: "/admin/horario", texto: "Horario" },
    tiene("pago.confirmar") && { href: "/admin/pagos", texto: "Pagos" },
    tiene("cuadre.cerrar") && { href: "/admin/cuadre", texto: "Cuadre" },
    tiene("evaluacion.realizar") && { href: "/admin/evaluacion", texto: "Evaluación" },
    tiene("plan.aprobar") && { href: "/admin/planes", texto: "Planes" },
    tiene("comision.cambiar") && { href: "/admin/comisiones", texto: "Comisiones" },
    sesion.roles.includes("coach") && { href: "/coach", texto: "Mis turnos" },
    sesion.roles.includes("coach") && { href: "/coach/pagos", texto: "Mis pagos" },
    sesion.roles.includes("coach") && { href: "/coach/resultados", texto: "Resultados" },
    sesion.roles.includes("coach") && { href: "/coach/plan", texto: "Mi plan" },
    sesion.roles.includes("coach") && { href: "/coach/rutinas", texto: "Rutinas" },
    tiene("biblioteca.proponer") && { href: "/biblioteca", texto: "Biblioteca" },
    sesion.roles.includes("cliente") && { href: "/cliente", texto: "Mi estado" },
    sesion.roles.includes("cliente") && { href: "/cliente/resultados", texto: "Mis resultados" },
    { href: "/perfil", texto: "Mi perfil" },
    { href: "/ayuda", texto: "Ayuda" },
  ];
  const enlaces = menu.filter((x): x is { href: string; texto: string; aviso?: number } => Boolean(x));

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Marca />
        <div className="flex items-center gap-3 text-sm text-texto-suave">
          <span>{sesion.nombre}</span>
          <form action={salir}>
            <button type="submit" className="min-h-10 rounded-lg border border-[#3a3d46] px-3 font-semibold text-texto">
              Salir
            </button>
          </form>
        </div>
      </header>
      <nav className="-mx-1 mt-4 flex gap-2 overflow-x-auto pb-1">
        {enlaces.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="whitespace-nowrap rounded-full bg-tarjeta px-4 py-2 text-sm font-semibold text-[#c9ccd3] no-underline"
          >
            {m.texto}
            {m.aviso ? <span className="ml-1.5 rounded-full bg-acento px-1.5 py-0.5 text-xs text-white">{m.aviso}</span> : null}
          </Link>
        ))}
      </nav>
      <main className="mt-6 flex flex-1 flex-col gap-5">{children}</main>
    </div>
  );
}

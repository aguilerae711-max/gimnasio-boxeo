import { casosDeNovedades } from "../_servidor/contenedor";
import Link from "next/link";
import { esSuperadministrador, lectorDe, requerirSesion } from "../_servidor/sesion";
import { Menu, type Grupo } from "../_ui/Menu";
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
  const coach = sesion.roles.includes("coach");
  const solo = <T,>(condicion: boolean, valor: T) => (condicion ? [valor] : []);
  const grupos: Grupo[] = [
    {
      titulo: "Gimnasio",
      enlaces: [
        ...solo(tiene("cliente.aprobar"), { href: "/admin", texto: "Administración" }),
        ...solo(tiene("horario.asignar"), { href: "/admin/horario", texto: "Horario" }),
        ...solo(tiene("pago.confirmar"), { href: "/admin/pagos", texto: "Pagos" }),
        ...solo(tiene("cuadre.cerrar"), { href: "/admin/cuadre", texto: "Cuadre" }),
        ...solo(tiene("evaluacion.realizar"), { href: "/admin/evaluacion", texto: "Evaluación" }),
        ...solo(tiene("plan.aprobar"), { href: "/admin/planes", texto: "Planes" }),
        ...solo(tiene("comision.cambiar"), { href: "/admin/comisiones", texto: "Comisiones" }),
        ...solo(tiene("biblioteca.formalizar"), { href: "/biblioteca", texto: "Biblioteca" }),
      ],
    },
    {
      titulo: "Coach",
      enlaces: [
        ...solo(coach, { href: "/coach", texto: "Mis turnos" }),
        ...solo(coach, { href: "/coach/plan", texto: "Mi plan" }),
        ...solo(coach, { href: "/coach/rutinas", texto: "Rutinas" }),
        ...solo(coach && !tiene("biblioteca.formalizar"), { href: "/biblioteca", texto: "Biblioteca" }),
        ...solo(coach, { href: "/coach/resultados", texto: "Resultados" }),
        ...solo(coach, { href: "/coach/pagos", texto: "Mis pagos" }),
      ],
    },
    {
      titulo: "Cliente",
      enlaces: [
        ...solo(sesion.roles.includes("cliente"), { href: "/cliente", texto: "Mi estado" }),
        ...solo(sesion.roles.includes("cliente"), { href: "/cliente/resultados", texto: "Mis resultados" }),
      ],
    },
  ];
  const sueltos = {
    antes: [{ href: "/novedades", texto: "Novedades", aviso: sinVer }],
    despues: [
      { href: "/perfil", texto: "Mi perfil" },
      { href: "/ayuda", texto: "Ayuda" },
    ],
  };

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
      <header className="flex flex-wrap items-center justify-between gap-3">
        <MarcaGimnasio marca={marca} />
        <div className="flex items-center gap-3 text-sm text-texto-suave">
          <span>{sesion.nombre}</span>
          {!sesion.vistaComo && (
            <form action={salir}>
              <button type="submit" className="min-h-10 rounded-lg border border-[#3a3d46] px-3 font-semibold text-texto">
                Salir
              </button>
            </form>
          )}
        </div>
      </header>
      <Menu grupos={grupos} sueltos={sueltos} />
      <main className="mt-6 flex flex-1 flex-col gap-5">{children}</main>
    </div>
  );
}

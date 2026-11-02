import Link from "next/link";
import { casosDeClientes } from "../../_servidor/contenedor";
import { PaginaCorta, Titulo } from "../../_ui/piezas";

export const metadata = { title: "Registro · Gimnasio de boxeo" };
export const dynamic = "force-dynamic";

export default async function ElegirCoach() {
  const coaches = await casosDeClientes().repositorio.coachesParaRegistro();
  return (
    <PaginaCorta>
      <Titulo antetitulo="Registro">¿Quién es tu coach?</Titulo>
      <p className="text-[15px] leading-relaxed text-[#c9ccd3]">
        Si tu coach te mandó un enlace, úsalo. Si no, elige aquí con quién vas a entrenar.
      </p>
      <ul className="flex flex-col gap-3">
        {coaches.map((c) => (
          <li key={c.coachId}>
            <Link
              href={`/registro/${c.codigo}`}
              className="flex min-h-14 items-center justify-between rounded-2xl bg-tarjeta px-5 text-lg font-semibold text-texto no-underline"
            >
              Coach {c.apodo}
              <span aria-hidden className="text-texto-suave">→</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-sm text-texto-suave">
        ¿Ya tienes cuenta? <Link href="/entrar">Entra aquí</Link>
      </p>
    </PaginaCorta>
  );
}

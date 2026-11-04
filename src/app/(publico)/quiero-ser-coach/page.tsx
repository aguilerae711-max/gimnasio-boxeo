import Link from "next/link";
import { PaginaCorta } from "../../_ui/MarcaGimnasio";
import { Titulo } from "../../_ui/piezas";
import { FormularioCoach } from "./FormularioCoach";

export const metadata = { title: "Quiero ser coach" };
export const dynamic = "force-dynamic";

export default function QuieroSerCoach() {
  return (
    <PaginaCorta>
      <Titulo antetitulo="Equipo">Quiero ser coach</Titulo>
      <p className="text-[15px] leading-relaxed text-[#c9ccd3]">
        Cuéntanos de ti. La administración revisa tu solicitud y, si hay lugar, te escribe por WhatsApp para conocerte.
      </p>
      <FormularioCoach />
      <p className="text-sm text-texto-suave">
        ¿Ya eres coach aquí? <Link href="/entrar">Entra</Link>
      </p>
    </PaginaCorta>
  );
}

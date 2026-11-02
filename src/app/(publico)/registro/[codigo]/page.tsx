import Link from "next/link";
import { notFound } from "next/navigation";
import { casosDeClientes } from "../../../_servidor/contenedor";
import { Formulario } from "../../../_ui/Formulario";
import { Campo, PaginaCorta, Titulo } from "../../../_ui/piezas";
import { registrarCliente } from "../../acciones";

export const metadata = { title: "Registro · Gimnasio de boxeo" };

export default async function Registro({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const coach = await casosDeClientes().repositorio.coachPorCodigo(decodeURIComponent(codigo).toLowerCase());
  if (!coach) notFound();
  return (
    <PaginaCorta>
      <Titulo antetitulo={`Entrenas con Coach ${coach.apodo}`}>Crea tu cuenta</Titulo>
      <Formulario accion={registrarCliente} boton="Registrarme">
        <input type="hidden" name="codigo" value={coach.codigo} />
        <Campo etiqueta="Nombre completo" name="nombre" autoComplete="name" required />
        <Campo etiqueta="Correo" name="correo" type="email" autoComplete="email" inputMode="email" required />
        <Campo etiqueta="Teléfono (WhatsApp)" name="telefono" type="tel" autoComplete="tel" inputMode="tel" placeholder="10 dígitos" />
        <Campo
          etiqueta="Contraseña"
          name="clave"
          type="password"
          autoComplete="new-password"
          minLength={10}
          ayuda="Mínimo 10 caracteres. Una frase fácil de recordar funciona bien."
          required
        />
        <Campo etiqueta="Repite la contraseña" name="confirmacion" type="password" autoComplete="new-password" required />
        <label className="flex items-start gap-3 rounded-xl bg-tarjeta p-4 text-sm leading-relaxed text-[#c9ccd3]">
          <input type="checkbox" name="reglamento" value="si" required className="mt-1 h-5 w-5 accent-[#d7263d]" />
          <span>
            Leí y acepto el reglamento del gimnasio y la responsiva de riesgos. La administración te entrega una copia en tu
            primera visita.
          </span>
        </label>
      </Formulario>
      <p className="text-sm text-texto-suave">
        Tu registro queda pendiente hasta que la administración lo apruebe. ¿Ya tienes cuenta? <Link href="/entrar">Entra aquí</Link>
      </p>
    </PaginaCorta>
  );
}

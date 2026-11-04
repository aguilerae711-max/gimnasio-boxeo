import Link from "next/link";
import { notFound } from "next/navigation";
import { casosDeClientes } from "../../../_servidor/contenedor";
import { Formulario } from "../../../_ui/Formulario";
import { Campo, Titulo } from "../../../_ui/piezas";
import { PaginaCorta } from "../../../_ui/MarcaGimnasio";
import { registrarCliente } from "../../acciones";

export const metadata = { title: "Registro" };

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
        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-sm font-semibold text-[#c9ccd3]">Rama (para tu división de peso)</legend>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {[
              ["F", "Femenil"],
              ["M", "Varonil"],
            ].map(([valor, texto]) => (
              <label key={valor} className="flex min-h-12 items-center gap-2 rounded-xl border border-[#2a2d36] bg-[#23262e] px-4 has-[:checked]:border-acento">
                <input type="radio" name="sexo" value={valor} required className="h-4 w-4 accent-[#d7263d]" /> {texto}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-2">
          <Campo etiqueta="Peso (kg)" name="peso" type="number" step={0.1} min={20} max={250} inputMode="decimal" placeholder="Ej. 72" />
          <Campo etiqueta="Estatura (cm)" name="estatura" type="number" min={100} max={230} inputMode="numeric" placeholder="Ej. 170" />
        </div>
        <p className="-mt-2 text-xs text-texto-suave">
          Opcionales. Puede ser aproximado o el último que recuerdes: en tu primera evaluación te pesamos y medimos.
        </p>
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

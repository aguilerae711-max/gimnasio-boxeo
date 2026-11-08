import Link from "next/link";
import { redirect } from "next/navigation";
import { esSuperadministrador, sesionActual } from "../../_servidor/sesion";
import { Formulario } from "../../_ui/Formulario";
import { Campo, Titulo } from "../../_ui/piezas";
import { PaginaCorta } from "../../_ui/MarcaGimnasio";
import { entrar } from "../acciones";

export const metadata = { title: "Entrar" };

export default async function Entrar() {
  const sesion = await sesionActual();
  if (sesion && (sesion.gimnasioId || esSuperadministrador(sesion))) redirect("/panel");
  return (
    <PaginaCorta>
      <Titulo antetitulo="Bienvenido de vuelta">Entrar</Titulo>
      <Formulario accion={entrar} boton="Entrar">
        <Campo etiqueta="Correo o usuario" name="correo" autoComplete="username" autoCapitalize="none" spellCheck={false} required />
        <Campo etiqueta="Contraseña" name="clave" type="password" autoComplete="current-password" required />
      </Formulario>
      <p className="text-sm text-texto-suave">
        ¿Olvidaste tu contraseña? Pídele a la administración un enlace para restablecerla.
      </p>
      <p className="text-sm text-texto-suave">
        ¿Eres nuevo? <Link href="/registro">Regístrate con tu coach</Link>
      </p>
    </PaginaCorta>
  );
}

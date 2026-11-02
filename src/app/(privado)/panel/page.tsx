import { redirect } from "next/navigation";
import { requerirSesion } from "../../_servidor/sesion";

/** Después de entrar: la bienvenida la primera vez y luego la pantalla principal de cada rol. */
export default async function Panel() {
  const sesion = await requerirSesion();
  if (!sesion.vioBienvenida) redirect("/ayuda?bienvenida=1");
  if (sesion.permisos.includes("cliente.aprobar")) redirect("/admin");
  if (sesion.roles.includes("coach")) redirect("/coach");
  redirect("/cliente");
}

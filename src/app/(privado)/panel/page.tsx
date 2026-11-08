import { redirect } from "next/navigation";
import { esSuperadministrador, requerirSesion, sesionActual } from "../../_servidor/sesion";

/** Después de entrar: el superadministrador a su panel; los demás, la bienvenida la primera vez y luego su pantalla. */
export default async function Panel() {
  const actual = await sesionActual();
  if (actual && esSuperadministrador(actual)) redirect("/sistema");
  const sesion = await requerirSesion();
  if (!sesion.vioBienvenida && !sesion.vistaComo) redirect("/ayuda?bienvenida=1");
  if (sesion.permisos.includes("cliente.aprobar")) redirect("/admin");
  if (sesion.roles.includes("coach")) redirect("/coach");
  redirect("/cliente");
}

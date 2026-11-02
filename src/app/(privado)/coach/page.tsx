import { redirect } from "next/navigation";
import { casosDeAcceso, casosDeClientes } from "../../_servidor/contenedor";
import { direccionPublica, requerirSesion } from "../../_servidor/sesion";
import { CopiarEnlace } from "../../_ui/CopiarEnlace";
import { Estado, Tarjeta, Titulo } from "../../_ui/piezas";

export default async function MisClientes() {
  const sesion = await requerirSesion();
  if (!sesion.roles.includes("coach")) redirect("/panel");
  const [codigo, clientes] = await Promise.all([
    (await casosDeAcceso()).equipo.invitacionDe(sesion.gimnasioId, sesion.usuarioId),
    casosDeClientes().consultas.delCoach(sesion.gimnasioId, sesion.usuarioId),
  ]);
  const activos = clientes.filter((c) => c.estado === "activo").length;

  return (
    <>
      <Titulo antetitulo={`Coach ${sesion.nombre}`}>Mis clientes</Titulo>

      {codigo && (
        <Tarjeta>
          <h2 className="font-titulos text-2xl font-bold uppercase">Tu invitación</h2>
          <p className="mb-3 text-sm text-texto-suave">
            Mándala a quien vaya a entrenar contigo. Se registra, queda asignado a ti y la administración lo aprueba.
          </p>
          <CopiarEnlace enlace={`${await direccionPublica()}/registro/${codigo}`} mensaje="Regístrate en el gimnasio con este enlace:" />
        </Tarjeta>
      )}

      <Tarjeta>
        <div className="flex items-baseline justify-between">
          <h2 className="font-titulos text-2xl font-bold uppercase">Clientes</h2>
          <span className="text-sm text-texto-suave">{activos} activos</span>
        </div>
        {clientes.length === 0 ? (
          <p className="mt-2 text-sm text-texto-suave">Aún no tienes clientes: compárteles tu invitación.</p>
        ) : (
          <ul className="mt-2 divide-y divide-[#2a2d36]">
            {clientes.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold">{c.nombre}</p>
                  <p className="text-sm text-texto-suave">{c.telefono ?? c.correo}</p>
                </div>
                <Estado valor={c.estado} texto={c.estado === "pendiente" ? "por aprobar" : c.estado} />
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>
    </>
  );
}

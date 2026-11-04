import Link from "next/link";
import { notFound } from "next/navigation";
import { casosDeClientes } from "../../../../../_servidor/contenedor";
import { requerirSesion } from "../../../../../_servidor/sesion";
import { PantallaMiEstado } from "../../../../../_ui/PantallaMiEstado";

/** La administración ve "Mi estado" tal como lo ve el cliente, solo para revisar o darle soporte. */
export default async function ComoCliente({ params }: { params: Promise<{ id: string }> }) {
  const sesion = await requerirSesion("cliente.ver_todos");
  const { id } = await params;
  const cliente = await casosDeClientes().consultas.usuarioDe(sesion.gimnasioId, id);
  if (!cliente) notFound();
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-[#f1d9a8] px-4 py-3 text-sm">
        <span>
          Así ve <b>{cliente.nombre}</b> su pantalla. Solo para revisar: aquí no cambias nada.
        </span>
        <Link href={`/admin/clientes/${id}`} className="font-semibold">
          ← Volver a su ficha
        </Link>
      </div>
      <PantallaMiEstado sesion={sesion} usuarioId={cliente.usuarioId} vista />
    </>
  );
}

import { casosDePagos } from "../../../_servidor/contenedor";
import { sesionActual } from "../../../_servidor/sesion";

export const dynamic = "force-dynamic";

/** El comprobante solo lo ven la administración y quien reportó el pago. Nunca hay enlace público al archivo. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await sesionActual();
  if (!sesion?.gimnasioId) return new Response("Inicia sesión.", { status: 401 });
  const casos = casosDePagos(sesion.permisos, sesion.zonaHoraria);
  const pago = await casos.consultas.comprobante(sesion.gimnasioId, (await params).id);
  const permitido = sesion.permisos.includes("pago.confirmar") || pago?.reportadoPor === sesion.usuarioId;
  if (!pago?.ruta || !permitido) return new Response("No encontrado.", { status: 404 });
  const archivo = await casos.archivos.leer(pago.ruta);
  if (!archivo) return new Response("No encontrado.", { status: 404 });
  return new Response(Buffer.from(archivo.contenido), {
    headers: { "Content-Type": archivo.tipo, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}

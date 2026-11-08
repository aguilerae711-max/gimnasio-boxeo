import { NextResponse, type NextRequest } from "next/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Termina "Ver como": borra la cookie y regresa a la página de la administración que se estaba viendo
 * (o al panel del sistema). Va por POST: las cookies son SameSite.
 */
export async function POST(req: NextRequest) {
  const gimnasioId = (req.cookies.get("ver_como")?.value ?? "").split(":")[1] ?? "";
  const destino = UUID.test(gimnasioId) ? `/sistema/administraciones/${gimnasioId}` : "/sistema";
  const res = NextResponse.redirect(new URL(destino, req.url), 303);
  res.cookies.delete("ver_como");
  return res;
}

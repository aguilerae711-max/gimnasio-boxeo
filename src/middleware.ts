import { NextResponse, type NextRequest } from "next/server";

/**
 * "Ver como" es solo lectura: mientras exista la cookie, ninguna petición que escriba pasa
 * (acciones de servidor, formularios, subidas). La única excepción es terminar la vista.
 */
export function middleware(req: NextRequest) {
  const lectura = req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS";
  if (lectura || !req.cookies.has("ver_como") || req.nextUrl.pathname === "/ver-como/terminar") return NextResponse.next();
  return new NextResponse("Estás viendo la app como otra persona: es solo lectura. Toca «Terminar vista» para volver a tu cuenta.", {
    status: 403,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|marca/).*)"],
};

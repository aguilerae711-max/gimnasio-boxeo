import { NextResponse, type NextRequest } from "next/server";

/** Termina "Ver como": borra la cookie y regresa al panel del sistema. Va por POST (las cookies son SameSite). */
export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/sistema", req.url), 303);
  res.cookies.delete("ver_como");
  return res;
}

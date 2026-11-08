import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { middleware } from "./middleware";

const peticion = (metodo: string, ruta: string, verComo: boolean) =>
  new NextRequest(`http://localhost${ruta}`, {
    method: metodo,
    headers: { ...(verComo ? { cookie: "ver_como=00000000-0000-4000-8000-000000000301" } : {}), "next-action": "abc" },
  });

describe("ver como: solo lectura", () => {
  it("bloquea cualquier escritura mientras dura la vista", () => {
    expect(middleware(peticion("POST", "/admin", true)).status).toBe(403);
    expect(middleware(peticion("POST", "/api/comprobantes/1", true)).status).toBe(403);
  });

  it("deja leer, terminar la vista y escribir sin la vista", () => {
    expect(middleware(peticion("GET", "/admin", true)).status).toBe(200);
    expect(middleware(peticion("POST", "/ver-como/terminar", true)).status).toBe(200);
    expect(middleware(peticion("POST", "/admin", false)).status).toBe(200);
  });
});

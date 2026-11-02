import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { cifradorAes } from "./cifrado";

describe("cifrado de datos sensibles", () => {
  const cifrador = cifradorAes(randomBytes(32).toString("base64"));

  it("cifra y descifra, y el texto no aparece en lo guardado", () => {
    const guardado = cifrador.cifrar("Asma leve; usa inhalador");
    expect(guardado).not.toContain("Asma");
    expect(cifrador.descifrar(guardado)).toBe("Asma leve; usa inhalador");
  });

  it("el mismo texto se cifra distinto cada vez", () => {
    expect(cifrador.cifrar("igual")).not.toBe(cifrador.cifrar("igual"));
  });

  it("detecta si alguien alteró el dato", () => {
    const partes = cifrador.cifrar("contacto").split(".");
    partes[3] = Buffer.from("otra cosa").toString("base64url");
    expect(() => cifrador.descifrar(partes.join("."))).toThrow();
  });

  it("con otra clave no se puede leer", () => {
    const otro = cifradorAes(randomBytes(32).toString("base64"));
    expect(() => otro.descifrar(cifrador.cifrar("secreto"))).toThrow();
  });
});

import { describe, expect, it } from "vitest";
import { audienciasPara, estaVigente, validarInscripcion, validarPublicacion, type Publicacion } from "./Novedades";

const ahora = new Date("2026-11-20T18:00:00Z");
const base: Publicacion = {
  tipo: "anuncio",
  titulo: "Cerramos el lunes 16",
  cuerpo: "Por el día festivo.",
  audiencia: "todos",
  fijada: false,
  expiraEn: null,
  inicio: null,
  fin: null,
  lugar: null,
  cupo: null,
  requiereInscripcion: false,
  menciones: [],
};

describe("publicaciones", () => {
  it("los eventos piden fecha; la inscripción solo va en eventos con fecha", () => {
    expect(() => validarPublicacion({ ...base, tipo: "sparring" }, ahora)).toThrow(/fecha y hora de sparring/);
    expect(() => validarPublicacion({ ...base, requiereInscripcion: true }, ahora)).toThrow(/eventos con fecha/);
    const evento = validarPublicacion({ ...base, tipo: "evento", inicio: new Date("2026-11-28T16:00:00Z"), requiereInscripcion: true, cupo: 12, lugar: " Ring " }, ahora);
    expect(evento).toMatchObject({ cupo: 12, lugar: "Ring" });
  });

  it("la felicitación menciona a alguien y no puede ser pública", () => {
    expect(() => validarPublicacion({ ...base, tipo: "felicitacion" }, ahora)).toThrow(/Menciona/);
    expect(() => validarPublicacion({ ...base, tipo: "felicitacion", menciones: ["ana"], audiencia: "publico" }, ahora)).toThrow(/públicas/);
  });

  it("cada quien ve lo suyo; sin cuenta solo lo público", () => {
    expect(audienciasPara("cliente")).not.toContain("coaches");
    expect(audienciasPara("coach")).not.toContain("clientes");
    expect(audienciasPara("visitante")).toEqual(["publico"]);
  });

  it("deja de mostrarse al expirar o cuando el evento termina", () => {
    expect(estaVigente({ expiraEn: new Date("2026-11-19T00:00:00Z"), inicio: null, fin: null }, ahora)).toBe(false);
    expect(estaVigente({ expiraEn: null, inicio: new Date("2026-11-19T10:00:00Z"), fin: null }, ahora)).toBe(false);
    expect(estaVigente({ expiraEn: null, inicio: new Date("2026-11-20T10:00:00Z"), fin: null }, ahora)).toBe(true);
    expect(estaVigente({ expiraEn: null, inicio: null, fin: null }, ahora)).toBe(true);
  });

  it("inscripción: con cupo, antes de empezar y una sola vez", () => {
    const evento = { requiereInscripcion: true, inicio: new Date("2026-11-28T16:00:00Z"), cupo: 2 };
    expect(() => validarInscripcion(evento, 1, false, ahora)).not.toThrow();
    expect(() => validarInscripcion(evento, 2, false, ahora)).toThrow(/lugares/);
    expect(() => validarInscripcion(evento, 0, true, ahora)).toThrow(/Ya estás/);
    expect(() => validarInscripcion(evento, 0, false, new Date("2026-11-29T00:00:00Z"))).toThrow(/ya empezó/);
  });
});

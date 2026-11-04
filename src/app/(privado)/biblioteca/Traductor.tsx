"use client";

import { useState } from "react";
import { traducirCombinacion, type Golpe } from "@/modules/biblioteca/domain/Biblioteca";

/** Escribe "1-2-3c" y ve el nombre oficial de cada golpe. Rojo = mano de adelante; dorado = mano de atrás. */
export function Traductor({ golpes }: { golpes: Golpe[] }) {
  const [texto, setTexto] = useState("1-2-3");
  let resultado: Golpe[] = [];
  let error = "";
  try {
    resultado = texto.trim() ? traducirCombinacion(texto, golpes) : [];
  } catch (e) {
    error = (e as Error).message;
  }
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-[#c9ccd3]">Escribe una combinación</span>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="1-2-3c"
          className="min-h-12 rounded-xl border border-[#2a2d36] bg-[#23262e] px-4 font-titulos text-2xl text-texto"
        />
      </label>
      {error ? (
        <p className="text-sm text-[#ff8f97]">{error}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {resultado.map((g, i) => (
            <span
              key={i}
              className="rounded-lg px-2.5 py-1 text-sm font-semibold text-[#121317]"
              style={{ background: g.mano === "adelante" ? "#ff6b76" : g.mano === "atras" ? "#e8b04b" : "#a3a8b3" }}
            >
              {g.codigo} · {g.nombre}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

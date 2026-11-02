"use client";

import { useState } from "react";

/** Muestra un enlace para compartir (por WhatsApp) con botón para copiarlo. */
export function CopiarEnlace({ enlace, mensaje }: { enlace: string; mensaje?: string }) {
  const [copiado, setCopiado] = useState(false);
  const textoWhatsApp = encodeURIComponent(`${mensaje ? `${mensaje} ` : ""}${enlace}`);
  return (
    <div className="flex flex-col gap-2">
      <code className="break-all rounded-xl bg-[#23262e] px-3 py-2.5 text-sm">{enlace}</code>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(enlace);
            setCopiado(true);
          }}
          className="min-h-11 flex-1 rounded-xl border border-[#3a3d46] px-4 text-sm font-semibold"
        >
          {copiado ? "Copiado ✓" : "Copiar"}
        </button>
        <a
          href={`https://wa.me/?text=${textoWhatsApp}`}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-[#1f7a4d] px-4 text-sm font-semibold text-white"
        >
          WhatsApp
        </a>
      </div>
    </div>
  );
}

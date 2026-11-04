"use client";

import { useActionState } from "react";
import { Campo } from "../../_ui/piezas";
import { aplicarComoCoach } from "../acciones";

const area = "rounded-xl border border-[#2a2d36] bg-[#23262e] px-4 py-3 text-base text-texto outline-none focus:border-acento";

/** Al enviarse, el formulario se cambia por el agradecimiento. */
export function FormularioCoach() {
  const [estado, enviar, enviando] = useActionState(aplicarComoCoach, {});
  if (estado.ok) {
    return (
      <section role="status" className="rounded-2xl bg-tarjeta p-6 text-center">
        <p className="font-titulos text-3xl font-extrabold uppercase">¡Gracias por aplicar como coach!</p>
        <p className="mt-2 text-[15px] leading-relaxed text-[#c9ccd3]">
          La administración revisará tus datos y te escribirá por WhatsApp. Si te aprueban, recibirás un enlace para activar tu cuenta.
        </p>
      </section>
    );
  }
  return (
    <form action={enviar} className="flex flex-col gap-4">
      <Campo etiqueta="Nombre completo" name="nombre" autoComplete="name" defaultValue={estado.valores?.nombre} required />
      <Campo etiqueta="WhatsApp" name="telefono" type="tel" inputMode="tel" autoComplete="tel" placeholder="10 dígitos" defaultValue={estado.valores?.telefono} required />
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-[#c9ccd3]">Tu experiencia en boxeo</span>
        <textarea name="experiencia" rows={4} maxLength={600} required placeholder="Años entrenando o dando clase, peleas, certificaciones…" className={area} />
      </label>
      <Campo
        etiqueta="Disponibilidad (opcional)"
        name="disponibilidad"
        maxLength={200}
        placeholder="Ej. lunes a viernes por la tarde"
        defaultValue={estado.valores?.disponibilidad}
      />
      <input type="text" name="sitio" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <label className="flex items-start gap-3 text-sm text-[#c9ccd3]">
        <input type="checkbox" name="contacto" value="si" required className="mt-1 h-5 w-5 accent-[#d7263d]" />
        <span>Acepto que la administración me escriba por WhatsApp sobre mi solicitud. Solo usamos tus datos para revisarla.</span>
      </label>
      {estado.error && (
        <p role="alert" className="rounded-xl bg-[#2a1418] px-4 py-3 text-sm text-[#ff8f97]">
          {estado.error}
        </p>
      )}
      <button type="submit" disabled={enviando} className="min-h-12 rounded-xl bg-acento px-5 font-semibold text-white disabled:opacity-60">
        {enviando ? "Enviando…" : "Enviar mi solicitud"}
      </button>
    </form>
  );
}

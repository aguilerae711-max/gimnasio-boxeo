import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { Cifrador } from "@/shared/application/puertos";

const VERSION = "v1";

/**
 * AES-256-GCM: además de ocultar el texto, detecta si alguien lo alteró.
 * Formato guardado: v1.<iv>.<etiqueta>.<datos>, todo en base64url.
 * La clave vive en Secret Manager (clave-datos); si se pierde, estos datos no se pueden recuperar.
 */
export function cifradorAes(claveBase64: string): Cifrador {
  const clave = Buffer.from(claveBase64, "base64");
  if (clave.length !== 32) throw new Error("La clave de cifrado debe tener 32 bytes (base64).");
  return {
    cifrar(texto) {
      const iv = randomBytes(12);
      const cifra = createCipheriv("aes-256-gcm", clave, iv);
      const datos = Buffer.concat([cifra.update(texto, "utf8"), cifra.final()]);
      return [VERSION, iv, cifra.getAuthTag(), datos].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
    },
    descifrar(cifrado) {
      const [version, iv, etiqueta, datos] = cifrado.split(".");
      if (version !== VERSION || !iv || !etiqueta || datos === undefined) throw new Error("Dato cifrado con formato desconocido.");
      const descifra = createDecipheriv("aes-256-gcm", clave, Buffer.from(iv, "base64url"));
      descifra.setAuthTag(Buffer.from(etiqueta, "base64url"));
      return Buffer.concat([descifra.update(Buffer.from(datos, "base64url")), descifra.final()]).toString("utf8");
    },
  };
}

/** Cifrador de la app: la clave sale de CLAVE_DATOS. */
export function cifradorDelEntorno(): Cifrador {
  const clave = process.env.CLAVE_DATOS;
  if (!clave) throw new Error("Falta CLAVE_DATOS para cifrar datos sensibles.");
  return cifradorAes(clave);
}

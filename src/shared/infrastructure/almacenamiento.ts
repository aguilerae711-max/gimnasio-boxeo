import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Almacenamiento } from "@/shared/application/puertos";

/**
 * Cloud Storage con la cuenta de servicio de Cloud Run (token del servidor de metadatos), sin librerías extra.
 * El bucket es privado: los archivos solo salen a través de la app.
 */
export function almacenamientoGcs(bucket: string): Almacenamiento {
  const token = async () => {
    const r = await fetch("http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token", {
      headers: { "Metadata-Flavor": "Google" },
    });
    if (!r.ok) throw new Error(`Sin token de Cloud Storage (${r.status}).`);
    return ((await r.json()) as { access_token: string }).access_token;
  };
  const objeto = (ruta: string) => encodeURIComponent(ruta);
  return {
    async guardar(ruta, contenido, tipo) {
      const r = await fetch(`https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${objeto(ruta)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${await token()}`, "Content-Type": tipo },
        body: Buffer.from(contenido),
      });
      if (!r.ok) throw new Error(`No se pudo guardar el archivo (${r.status}).`);
    },
    async leer(ruta) {
      const r = await fetch(`https://storage.googleapis.com/storage/v1/b/${bucket}/o/${objeto(ruta)}?alt=media`, {
        headers: { Authorization: `Bearer ${await token()}` },
      });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`No se pudo leer el archivo (${r.status}).`);
      return { contenido: new Uint8Array(await r.arrayBuffer()), tipo: r.headers.get("content-type") ?? "application/octet-stream" };
    },
  };
}

/** Para desarrollo local: carpeta .archivos (ignorada por Git). */
export function almacenamientoLocal(carpeta: string): Almacenamiento {
  const tipos: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", pdf: "application/pdf" };
  return {
    async guardar(ruta, contenido) {
      const destino = join(carpeta, ruta);
      await mkdir(dirname(destino), { recursive: true });
      await writeFile(destino, contenido);
    },
    async leer(ruta) {
      try {
        return { contenido: new Uint8Array(await readFile(join(carpeta, ruta))), tipo: tipos[ruta.split(".").pop() ?? ""] ?? "application/octet-stream" };
      } catch {
        return null;
      }
    },
  };
}

export function almacenamientoDelEntorno(): Almacenamiento {
  const bucket = process.env.BUCKET_ARCHIVOS;
  return bucket ? almacenamientoGcs(bucket) : almacenamientoLocal(join(process.cwd(), ".archivos"));
}

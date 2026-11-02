import { baseDeDatos } from "@/shared/infrastructure/baseDeDatos";
import { COMMIT, VERSION } from "../../version";

export const dynamic = "force-dynamic";

// Para el monitoreo de Cloud Run: responde si la app y la base de datos están en pie.
export async function GET() {
  try {
    const [fila] = await baseDeDatos()`SELECT count(*)::int AS migraciones FROM schema_migraciones`;
    return Response.json({ estado: "ok", version: VERSION, commit: COMMIT, baseDeDatos: "ok", migraciones: fila.migraciones });
  } catch {
    return Response.json({ estado: "degradado", version: VERSION, baseDeDatos: "sin conexión" }, { status: 503 });
  }
}

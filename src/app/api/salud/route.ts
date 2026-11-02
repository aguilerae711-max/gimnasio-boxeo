import { baseDeDatos } from "@/shared/infrastructure/baseDeDatos";

export const dynamic = "force-dynamic";

// Para el monitoreo de Cloud Run: responde si la app y la base de datos están en pie.
export async function GET() {
  try {
    const [fila] = await baseDeDatos()`SELECT count(*)::int AS migraciones FROM schema_migraciones`;
    return Response.json({ estado: "ok", baseDeDatos: "ok", migraciones: fila.migraciones });
  } catch {
    return Response.json({ estado: "degradado", baseDeDatos: "sin conexión" }, { status: 503 });
  }
}

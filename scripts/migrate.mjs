// Aplica en orden las migraciones de db/migrations que falten, cada una en su transacción.
// Uso: npm run db:migrate  (lee .env.local; usa la conexión directa, no la del pooler)
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL_UNPOOLED (o DATABASE_URL).");
  process.exit(1);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });
const carpeta = join(import.meta.dirname, "..", "db", "migrations");

try {
  await sql`CREATE TABLE IF NOT EXISTS schema_migraciones (nombre text PRIMARY KEY, aplicada_en timestamptz NOT NULL DEFAULT now())`;
  const aplicadas = new Set((await sql`SELECT nombre FROM schema_migraciones`).map((f) => f.nombre));
  const pendientes = (await readdir(carpeta)).filter((n) => n.endsWith(".sql") && !aplicadas.has(n)).sort();

  for (const nombre of pendientes) {
    const contenido = await readFile(join(carpeta, nombre), "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(contenido);
      await tx`INSERT INTO schema_migraciones (nombre) VALUES (${nombre})`;
    });
    console.log(`Aplicada: ${nombre}`);
  }
  console.log(pendientes.length ? "Migraciones al día." : "No había migraciones pendientes.");
} finally {
  await sql.end();
}

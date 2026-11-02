// Postgres local en memoria con todas las migraciones, para probar la app sin tocar Neon.
// Uso: npm run db:local   y luego   DATABASE_URL=postgres://postgres@127.0.0.1:55433/postgres npm run dev
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { citext } from "@electric-sql/pglite/contrib/citext";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const carpeta = join(import.meta.dirname, "..", "db", "migrations");
const db = new PGlite({ extensions: { citext } });
for (const nombre of readdirSync(carpeta).filter((n) => n.endsWith(".sql")).sort()) {
  await db.transaction((tx) => tx.exec(readFileSync(join(carpeta, nombre), "utf8")));
}
const servidor = new PGLiteSocketServer({ db, port: 55433, host: "127.0.0.1" });
await servidor.start();
console.log("Base local lista en postgres://postgres@127.0.0.1:55433/postgres");

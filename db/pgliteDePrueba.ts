import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { citext } from "@electric-sql/pglite/contrib/citext";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import postgres from "postgres";

const carpeta = join(__dirname, "migrations");

/** Postgres embebido con todas las migraciones aplicadas, igual que en Neon. */
export async function baseConMigraciones(): Promise<PGlite> {
  const db = new PGlite({ extensions: { citext } });
  for (const nombre of readdirSync(carpeta).filter((n) => n.endsWith(".sql")).sort()) {
    await db.transaction(async (tx) => {
      await tx.exec(readFileSync(join(carpeta, nombre), "utf8"));
    });
  }
  return db;
}

/**
 * Lo mismo, pero expuesto por TCP para usar el mismo cliente (postgres.js) que la app,
 * conectado como app_gimnasio: con RLS y permisos reales, igual que en producción.
 */
export async function servidorDePrueba(puerto: number): Promise<{ sql: postgres.Sql; cerrar: () => Promise<void> }> {
  const db = await baseConMigraciones();
  const servidor = new PGLiteSocketServer({ db, port: puerto, host: "127.0.0.1" });
  await servidor.start();
  const sql = postgres({ host: "127.0.0.1", port: puerto, database: "postgres", username: "postgres", max: 1, prepare: false, onnotice: () => {} });
  await sql`SET ROLE app_gimnasio`;
  return {
    sql,
    cerrar: async () => {
      await sql.end();
      await servidor.stop();
      await db.close();
    },
  };
}

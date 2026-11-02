// Genera un enlace de un solo uso (72 horas) para activar una cuenta o cambiar la contraseña.
// Sirve para el primer acceso de la administración, cuando aún nadie puede generarlo desde la app.
// Uso: npm run acceso:enlace -- "Iván"
import { createHash, randomBytes } from "node:crypto";
import postgres from "postgres";

const DIRECCION = process.env.APP_URL ?? "https://gimnasio-boxeo-211387478559.us-central1.run.app";
const nombre = process.argv[2];
if (!nombre) {
  console.error('Indica el nombre: npm run acceso:enlace -- "Iván"');
  process.exit(1);
}

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL (corre `neon env pull` o revisa .env.local).");
  process.exit(1);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });
try {
  // Sin distinguir acentos ni mayúsculas: "ivan" encuentra a "Iván".
  const sinAcentos = (t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const usuarios = (await sql`SELECT id, nombre, hash_clave FROM usuario WHERE eliminado_en IS NULL`).filter(
    (u) => sinAcentos(u.nombre) === sinAcentos(nombre),
  );
  if (usuarios.length !== 1) {
    console.error(usuarios.length === 0 ? `No hay nadie llamado "${nombre}".` : `Hay varias personas llamadas "${nombre}".`);
    process.exit(1);
  }
  const [u] = usuarios;
  const token = randomBytes(32).toString("base64url");
  const proposito = u.hash_clave ? "restablecer" : "activar";
  await sql`
    INSERT INTO enlace_acceso (token_hash, usuario_id, proposito, expira_en)
    VALUES (${createHash("sha256").update(token).digest("hex")}, ${u.id}, ${proposito}, now() + interval '72 hours')`;
  console.log(`\nEnlace para ${u.nombre} (${proposito === "activar" ? "activar cuenta" : "nueva contraseña"}, vence en 72 horas):\n`);
  console.log(`${DIRECCION}/activar/${token}\n`);
} finally {
  await sql.end();
}

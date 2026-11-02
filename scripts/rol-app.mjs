// Activa (o renueva) la contraseña del usuario app_gimnasio en Neon y guarda su conexión
// en Secret Manager (database-url-app). La contraseña nunca se imprime ni se guarda en archivos.
// Requiere haber aplicado la migración 0004. Uso: npm run db:rol-app
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import postgres from "postgres";

const PROYECTO = "gimnasio-boxeo-1656";
const SECRETO = "database-url-app";

const dueno = process.env.DATABASE_URL_UNPOOLED;
const conPooler = process.env.DATABASE_URL;
if (!dueno || !conPooler) {
  console.error("Faltan DATABASE_URL y DATABASE_URL_UNPOOLED en .env.local.");
  process.exit(1);
}

const clave = randomBytes(32).toString("base64url");
const admin = postgres(dueno, { max: 1, onnotice: () => {} });
try {
  await admin.unsafe(`ALTER ROLE app_gimnasio WITH LOGIN PASSWORD '${clave}'`);
} finally {
  await admin.end();
}

const url = new URL(conPooler);
url.username = "app_gimnasio";
url.password = clave;
const urlApp = url.toString();

// Comprobar antes de guardar: entra, respeta RLS y no puede tocar la auditoría.
const app = postgres(urlApp, { max: 1, prepare: false, onnotice: () => {} });
try {
  const [{ usuario }] = await app`SELECT current_user AS usuario`;
  const [{ n }] = await app`SELECT count(*)::int AS n FROM coach`;
  const [{ puede }] = await app`SELECT has_table_privilege('auditoria', 'DELETE') AS puede`;
  if (usuario !== "app_gimnasio" || n !== 0 || puede) {
    throw new Error(`Comprobación fallida: usuario=${usuario}, coaches sin gimnasio=${n}, borra auditoría=${puede}`);
  }
  console.log("✓ app_gimnasio entra por el pooler, no ve datos sin gimnasio y no puede borrar la auditoría.");
} finally {
  await app.end();
}

const existe = (() => {
  try {
    execSync(`gcloud secrets describe ${SECRETO} --project=${PROYECTO}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();
if (!existe) {
  execSync(`gcloud secrets create ${SECRETO} --project=${PROYECTO} --replication-policy=automatic`, { stdio: "ignore" });
}
execSync(`gcloud secrets versions add ${SECRETO} --project=${PROYECTO} --data-file=-`, { input: urlApp, stdio: ["pipe", "ignore", "inherit"] });
console.log(`✓ Conexión guardada en Secret Manager (${SECRETO}). Se usa en la siguiente publicación.`);

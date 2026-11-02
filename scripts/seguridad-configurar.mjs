// Configuración de seguridad en producción (se corre una vez; repetirlo es seguro):
//   1. migraciones pendientes en Neon (crea app_gimnasio);
//   2. activa app_gimnasio con contraseña nueva y guarda su conexión en Secret Manager;
//      crea la clave de cifrado de datos sensibles (clave-datos) si aún no existe;
//   3. respaldo nocturno: Cloud Run Job que copia la base a Cloud Storage cada día a las 3:00 (hora de México),
//      con una cuenta de servicio que solo puede leer su secreto y escribir en el bucket de respaldos;
//   4. corre un respaldo de prueba y muestra el archivo creado.
// Uso: npm run seguridad:configurar
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const P = "gimnasio-boxeo-1656";
const R = "us-central1";
const BUCKET = "gimnasio-boxeo-1656-respaldos";
const CUENTA = `respaldos@${P}.iam.gserviceaccount.com`;
const IMAGEN = `${R}-docker.pkg.dev/${P}/cloud-run-source-deploy/respaldo-nocturno`;

const correr = (c, opciones = {}) => execSync(c, { stdio: "inherit", ...opciones });
const existe = (c) => {
  try {
    execSync(c, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};
const paso = (t) => console.log(`\n▶ ${t}`);

paso("Migraciones");
correr("npm run db:migrate");

paso("Usuario de la app con RLS");
correr("npm run db:rol-app");
const NUMERO = execSync(`gcloud projects describe ${P} --format=value(projectNumber)`, { encoding: "utf8" }).trim();
correr(`gcloud secrets add-iam-policy-binding database-url-app --project=${P} --member=serviceAccount:${NUMERO}-compute@developer.gserviceaccount.com --role=roles/secretmanager.secretAccessor --condition=None --quiet`, { stdio: "ignore" });

paso("Clave para cifrar datos sensibles (solo se crea una vez; nunca se reemplaza)");
if (!existe(`gcloud secrets describe clave-datos --project=${P}`)) {
  correr(`gcloud secrets create clave-datos --project=${P} --replication-policy=automatic`);
  execSync(`gcloud secrets versions add clave-datos --project=${P} --data-file=-`, {
    input: randomBytes(32).toString("base64"),
    stdio: ["pipe", "ignore", "inherit"],
  });
}
correr(`gcloud secrets add-iam-policy-binding clave-datos --project=${P} --member=serviceAccount:${NUMERO}-compute@developer.gserviceaccount.com --role=roles/secretmanager.secretAccessor --condition=None --quiet`, { stdio: "ignore" });

paso("Secreto para el respaldo (conexión directa del dueño, sin pooler)");
const directa = process.env.DATABASE_URL_UNPOOLED;
if (!directa) throw new Error("Falta DATABASE_URL_UNPOOLED en .env.local");
if (!existe(`gcloud secrets describe database-url-respaldo --project=${P}`)) {
  correr(`gcloud secrets create database-url-respaldo --project=${P} --replication-policy=automatic`);
}
execSync(`gcloud secrets versions add database-url-respaldo --project=${P} --data-file=-`, { input: directa, stdio: ["pipe", "ignore", "inherit"] });

paso("Cuenta de servicio con permisos mínimos");
if (!existe(`gcloud iam service-accounts describe ${CUENTA} --project=${P}`)) {
  correr(`gcloud iam service-accounts create respaldos --project=${P} --display-name="Respaldo nocturno"`);
}
correr(`gcloud secrets add-iam-policy-binding database-url-respaldo --project=${P} --member=serviceAccount:${CUENTA} --role=roles/secretmanager.secretAccessor --condition=None --quiet`, { stdio: "ignore" });
correr(`gcloud storage buckets add-iam-policy-binding gs://${BUCKET} --member=serviceAccount:${CUENTA} --role=roles/storage.objectCreator --quiet`, { stdio: "ignore" });

paso("Conservar respaldos 90 días");
const reglas = join(tmpdir(), "ciclo-respaldos.json");
writeFileSync(reglas, JSON.stringify({ rule: [{ action: { type: "Delete" }, condition: { age: 90 } }] }));
correr(`gcloud storage buckets update gs://${BUCKET} --lifecycle-file="${reglas}"`);

paso("Imagen del respaldo");
correr(`gcloud builds submit respaldo --tag=${IMAGEN} --project=${P} --region=${R}`);

paso("Cloud Run Job");
correr(
  `gcloud run jobs deploy respaldo-nocturno --image=${IMAGEN} --project=${P} --region=${R} ` +
    `--service-account=${CUENTA} --set-secrets=DATABASE_URL=database-url-respaldo:latest ` +
    `--set-env-vars=BUCKET=${BUCKET} --max-retries=2 --task-timeout=15m --memory=512Mi --quiet`,
);
correr(`gcloud run jobs add-iam-policy-binding respaldo-nocturno --project=${P} --region=${R} --member=serviceAccount:${CUENTA} --role=roles/run.invoker --quiet`, { stdio: "ignore" });

paso("Programación diaria 3:00 (Ciudad de México)");
const programa =
  `--location=${R} --project=${P} --schedule="0 3 * * *" --time-zone="America/Mexico_City" ` +
  `--uri=https://run.googleapis.com/v2/projects/${P}/locations/${R}/jobs/respaldo-nocturno:run --http-method=POST ` +
  `--oauth-service-account-email=${CUENTA}`;
const verbo = existe(`gcloud scheduler jobs describe respaldo-nocturno --location=${R} --project=${P}`) ? "update" : "create";
correr(`gcloud scheduler jobs ${verbo} http respaldo-nocturno ${programa}`);

paso("Respaldo de prueba");
correr(`gcloud run jobs execute respaldo-nocturno --project=${P} --region=${R} --wait`);
correr(`gcloud storage ls -l gs://${BUCKET}/neon/`);

console.log("\n✓ Seguridad configurada. Publica con: npm run publicar\n");

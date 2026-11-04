// Publica la versión de package.json en producción, siempre de forma rastreable:
//   1. exige cambios guardados en Git, la versión anotada en CHANGELOG.md y su etiqueta vX.Y.Z en este commit;
//   2. corre lint, tipos y pruebas;
//   3. aplica las migraciones pendientes en Neon (con el dueño, desde .env.local);
//   4. publica en Cloud Run con la revisión gimnasio-boxeo-vX-Y-Z (no se puede repetir una versión);
//   5. sube el commit y la etiqueta a GitHub.
// Uso: npm run publicar
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const PROYECTO = "gimnasio-boxeo-1656";
const REGION = "us-central1";
const SERVICIO = "gimnasio-boxeo";

const correr = (comando) => execSync(comando, { stdio: "inherit" });
const leer = (comando) => execSync(comando, { encoding: "utf8" }).trim();
const alto = (mensaje) => {
  console.error(`\n✗ ${mensaje}\n`);
  process.exit(1);
};

const { version } = JSON.parse(readFileSync("package.json", "utf8"));
const etiqueta = `v${version}`;

if (leer("git status --porcelain")) alto("Hay cambios sin guardar en Git. Haz commit antes de publicar.");
if (!readFileSync("CHANGELOG.md", "utf8").includes(`## [${version}]`)) alto(`Falta la sección ## [${version}] en CHANGELOG.md.`);
const commit = leer("git rev-parse --short HEAD");
let commitDeEtiqueta = "";
try {
  commitDeEtiqueta = leer(`git rev-list -n 1 --abbrev-commit ${etiqueta}`);
} catch {
  alto(`Falta la etiqueta ${etiqueta}. Créala con: git tag -a ${etiqueta} -m "<resumen>"`);
}
if (commitDeEtiqueta !== commit) alto(`La etiqueta ${etiqueta} apunta a ${commitDeEtiqueta}, no al commit actual ${commit}.`);
for (const [secreto, version] of [["database-url-app", "latest"], ["clave-datos", "1"]]) {
  try {
    execSync(`gcloud secrets versions describe ${version} --secret=${secreto} --project=${PROYECTO}`, { stdio: "ignore" });
  } catch {
    alto(`Falta el secreto ${secreto}. Corre primero: npm run seguridad:configurar`);
  }
}

console.log(`\n▶ Publicando ${etiqueta} (${commit})\n`);
correr("npm run lint");
correr("npm run typecheck");
correr("npm test");
correr("npm run db:migrate");
const sufijo = etiqueta.replaceAll(".", "-");
correr(
  `gcloud run deploy ${SERVICIO} --source . --project=${PROYECTO} --region=${REGION} --quiet ` +
    `--revision-suffix=${sufijo} --update-labels=version=${sufijo} --update-env-vars=APP_COMMIT=${commit},BUCKET_ARCHIVOS=gimnasio-boxeo-1656-archivos ` +
    // La app entra como app_gimnasio (respeta RLS), nunca como dueño de la base.
    `--update-secrets=DATABASE_URL=database-url-app:latest,CLAVE_DATOS=clave-datos:1`,
);
const anterior = leer(
  `gcloud run revisions list --service=${SERVICIO} --project=${PROYECTO} --region=${REGION} --sort-by=~metadata.creationTimestamp --limit=2 --format=value(metadata.name)`,
).split(/\s+/)[1];
const direccion = leer(`gcloud run services describe ${SERVICIO} --project=${PROYECTO} --region=${REGION} --format=value(status.url)`);
const salud = await fetch(`${direccion}/api/salud`).then((r) => r.json()).catch(() => ({}));
if (salud.estado !== "ok" || salud.version !== version) {
  alto(
    `La versión publicada no responde bien: ${JSON.stringify(salud)}. ` +
      `Regresa a la anterior con: gcloud run services update-traffic ${SERVICIO} --to-revisions=${anterior}=100 --project=${PROYECTO} --region=${REGION}`,
  );
}
console.log(`✓ ${direccion}/api/salud responde ok con la versión ${version}.`);
correr(`git push origin HEAD ${etiqueta}`);
console.log(`\n✓ ${etiqueta} publicada como ${SERVICIO}-${sufijo}.`);
console.log(`  Para regresar a otra versión: gcloud run services update-traffic ${SERVICIO} --to-revisions=${SERVICIO}-vX-Y-Z=100 --project=${PROYECTO} --region=${REGION}\n`);

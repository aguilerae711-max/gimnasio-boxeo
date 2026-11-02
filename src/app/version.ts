import paquete from "../../package.json";

/** Versión publicada (package.json) y commit con que se construyó, si el despliegue lo indicó. */
export const VERSION = paquete.version;
export const COMMIT = process.env.APP_COMMIT ?? null;

export const versionVisible = () => `v${VERSION}${COMMIT ? ` · ${COMMIT}` : ""}`;

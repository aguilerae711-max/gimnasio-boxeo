import { ErrorDeDominio, SinPermiso } from "@/shared/domain/ErrorDeDominio";
import type { Actor, Auditoria, Autorizacion, Reloj } from "@/shared/application/puertos";
import { normalizarCorreo, validarClaveNueva } from "../domain/Credenciales";
import { PoliticaDeAcceso } from "../domain/PoliticaDeAcceso";
import type { HashDeClaves, PropositoEnlace, RepositorioCuentas, RepositorioEnlaces, RepositorioSesiones, Tokens } from "./puertos";

export const PERMISO_ENLACE_ACCESO = "usuario.enlace_acceso";

const ENLACE_INVALIDO = new ErrorDeDominio("enlace_invalido", "El enlace ya se usó o venció. Pide uno nuevo a la administración.");

/**
 * La administración genera un enlace de un solo uso (72 horas) para que alguien active su cuenta
 * o restablezca su contraseña. El enlace se comparte por WhatsApp mientras no haya correo automático.
 */
export class GenerarEnlaceDeAcceso {
  constructor(
    private readonly cuentas: RepositorioCuentas,
    private readonly enlaces: RepositorioEnlaces,
    private readonly autorizacion: Autorizacion,
    private readonly auditoria: Auditoria,
    private readonly tokens: Tokens,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(actor: Actor, usuarioId: string): Promise<{ token: string; proposito: PropositoEnlace; expiraEn: Date }> {
    if (!(await this.autorizacion.tienePermiso(actor, PERMISO_ENLACE_ACCESO))) {
      throw new SinPermiso(PERMISO_ENLACE_ACCESO);
    }
    const cuenta = await this.cuentas.porId(usuarioId);
    if (!cuenta || !(await this.cuentas.esDelGimnasio(usuarioId, actor.gimnasioId))) {
      throw new ErrorDeDominio("usuario_no_encontrado", "No existe esa persona en el gimnasio.");
    }
    const proposito: PropositoEnlace = cuenta.hashClave ? "restablecer" : "activar";
    const token = this.tokens.nuevo();
    const expiraEn = new Date(this.reloj.ahora().getTime() + PoliticaDeAcceso.duracionEnlaceMs);
    await this.enlaces.crear({ huella: this.tokens.huella(token), usuarioId, proposito, expiraEn, creadoPor: actor.usuarioId });
    await this.auditoria.registrar({
      gimnasioId: actor.gimnasioId,
      usuarioId: actor.usuarioId,
      accion: `acceso.enlace_${proposito}`,
      entidad: "usuario",
      entidadId: usuarioId,
      antes: null,
      despues: { expiraEn: expiraEn.toISOString() },
    });
    return { token, proposito, expiraEn };
  }
}

/** Quien recibe el enlace define su correo y contraseña. Al restablecer se cierran sus otras sesiones. */
export class UsarEnlaceDeAcceso {
  constructor(
    private readonly cuentas: RepositorioCuentas,
    private readonly enlaces: RepositorioEnlaces,
    private readonly sesiones: RepositorioSesiones,
    private readonly claves: HashDeClaves,
    private readonly tokens: Tokens,
    private readonly reloj: Reloj,
  ) {}

  /** Para mostrar el formulario: a quién pertenece el enlace. */
  async consultar(token: string): Promise<{ nombre: string; correo: string | null; proposito: PropositoEnlace }> {
    const enlace = await this.enlaces.vigente(this.tokens.huella(token), this.reloj.ahora());
    const cuenta = enlace && (await this.cuentas.porId(enlace.usuarioId));
    if (!enlace || !cuenta) throw ENLACE_INVALIDO;
    return { nombre: cuenta.nombre, correo: cuenta.correo, proposito: enlace.proposito };
  }

  async ejecutar(token: string, datos: { correo: string; clave: string }): Promise<{ usuarioId: string }> {
    const correo = normalizarCorreo(datos.correo);
    validarClaveNueva(datos.clave);
    const huella = this.tokens.huella(token);
    const ahora = this.reloj.ahora();
    const enlace = await this.enlaces.vigente(huella, ahora);
    if (!enlace) throw ENLACE_INVALIDO;

    const otra = await this.cuentas.porCorreo(correo);
    if (otra && otra.id !== enlace.usuarioId) {
      throw new ErrorDeDominio("correo_en_uso", "Ese correo ya lo usa otra cuenta.");
    }
    if (!(await this.enlaces.consumir(huella, ahora))) throw ENLACE_INVALIDO;

    await this.cuentas.guardarCredenciales(enlace.usuarioId, correo, await this.claves.hash(datos.clave));
    await this.sesiones.revocarTodas(enlace.usuarioId);
    return { usuarioId: enlace.usuarioId };
  }
}

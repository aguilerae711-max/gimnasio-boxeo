import { ErrorDeDominio } from "@/shared/domain/ErrorDeDominio";
import type { Reloj } from "@/shared/application/puertos";
import { identificar } from "../domain/Credenciales";
import { PoliticaDeAcceso } from "../domain/PoliticaDeAcceso";
import type { HashDeClaves, RegistroDeIntentos, RepositorioCuentas, RepositorioSesiones, Tokens } from "./puertos";

const CREDENCIALES_INCORRECTAS = new ErrorDeDominio("credenciales", "Usuario o contraseña incorrectos.");

export interface SesionIniciada {
  token: string;
  expiraEn: Date;
  usuarioId: string;
}

/**
 * Entra con correo o usuario corto y contraseña. Cada persona tiene su cuenta: así la auditoría sabe quién hizo qué.
 * El mensaje de error es el mismo si la cuenta no existe o la contraseña no coincide, para no revelar qué cuentas hay.
 */
export class IniciarSesion {
  constructor(
    private readonly cuentas: RepositorioCuentas,
    private readonly sesiones: RepositorioSesiones,
    private readonly intentos: RegistroDeIntentos,
    private readonly claves: HashDeClaves,
    private readonly tokens: Tokens,
    private readonly reloj: Reloj,
    /** Hash de una clave cualquiera: se verifica aunque la cuenta no exista, para que tarde lo mismo. */
    private readonly hashDeRelleno: string,
  ) {}

  async ejecutar(escrito: string, clave: string): Promise<SesionIniciada> {
    let quien: { tipo: "correo" | "usuario"; valor: string };
    try {
      quien = identificar(escrito);
    } catch {
      throw CREDENCIALES_INCORRECTAS;
    }
    // El freno de intentos es por lo que se escribió para entrar (cada cuenta tiene el suyo).
    const identificador = quien.valor;
    const ahora = this.reloj.ahora();
    const fallos = await this.intentos.fallosDesde(identificador, new Date(ahora.getTime() - PoliticaDeAcceso.ventanaFallosMs));
    if (PoliticaDeAcceso.estaBloqueado(fallos)) {
      throw new ErrorDeDominio("demasiados_intentos", "Demasiados intentos. Espera 15 minutos y vuelve a probar.");
    }

    const cuenta = quien.tipo === "correo" ? await this.cuentas.porCorreo(quien.valor) : await this.cuentas.porUsuario(quien.valor);
    const coincide = await this.claves.verificar(cuenta?.hashClave ?? this.hashDeRelleno, clave);
    if (!cuenta || !cuenta.hashClave || !coincide || cuenta.estado !== "activo") {
      await this.intentos.registrar(identificador, false);
      if (cuenta?.estado === "suspendido" && coincide) {
        throw new ErrorDeDominio("cuenta_suspendida", "Tu cuenta está suspendida. Habla con la administración.");
      }
      throw CREDENCIALES_INCORRECTAS;
    }

    await this.intentos.registrar(identificador, true);
    const token = this.tokens.nuevo();
    const expiraEn = new Date(ahora.getTime() + PoliticaDeAcceso.duracionSesionMs);
    await this.sesiones.crear(this.tokens.huella(token), cuenta.id, expiraEn);
    return { token, expiraEn, usuarioId: cuenta.id };
  }
}

export class CerrarSesion {
  constructor(
    private readonly sesiones: RepositorioSesiones,
    private readonly tokens: Tokens,
  ) {}

  async ejecutar(token: string): Promise<void> {
    await this.sesiones.revocar(this.tokens.huella(token));
  }
}

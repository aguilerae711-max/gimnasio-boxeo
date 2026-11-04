import type {
  Cuenta,
  PropositoEnlace,
  RegistroDeIntentos,
  RepositorioCuentas,
  RepositorioEnlaces,
  RepositorioSesiones,
} from "../application/puertos";

/** Para pruebas y desarrollo local sin base de datos. */
export class CuentasEnMemoria implements RepositorioCuentas {
  readonly cuentas = new Map<string, Cuenta>();

  constructor(
    iniciales: Cuenta[] = [],
    private readonly membresias: { usuarioId: string; gimnasioId: string }[] = [],
  ) {
    iniciales.forEach((c) => this.cuentas.set(c.id, { ...c }));
  }

  async porId(id: string) {
    return this.cuentas.get(id) ?? null;
  }

  async porCorreo(correo: string) {
    return [...this.cuentas.values()].find((c) => c.correo === correo) ?? null;
  }

  async porUsuario(usuario: string) {
    return [...this.cuentas.values()].find((c) => c.usuario === usuario) ?? null;
  }

  async cambiarUsuario(usuarioId: string, usuario: string | null) {
    this.cuentas.set(usuarioId, { ...this.cuentas.get(usuarioId)!, usuario });
  }

  async crearMiembro(gimnasioId: string, m: { id: string; nombre: string; usuario: string | null }) {
    this.cuentas.set(m.id, { id: m.id, nombre: m.nombre, correo: null, usuario: m.usuario, hashClave: null, estado: "pendiente" });
    this.membresias.push({ usuarioId: m.id, gimnasioId });
  }

  async esDelGimnasio(usuarioId: string, gimnasioId: string) {
    return this.membresias.some((m) => m.usuarioId === usuarioId && m.gimnasioId === gimnasioId);
  }

  async guardarCredenciales(usuarioId: string, acceso: { correo: string | null; usuario: string | null }, hashClave: string) {
    const c = this.cuentas.get(usuarioId)!;
    this.cuentas.set(usuarioId, { ...c, ...acceso, hashClave, estado: "activo" });
  }
}

export class SesionesEnMemoria implements RepositorioSesiones {
  readonly sesiones = new Map<string, { usuarioId: string; expiraEn: Date; revocada: boolean }>();

  async crear(huella: string, usuarioId: string, expiraEn: Date) {
    this.sesiones.set(huella, { usuarioId, expiraEn, revocada: false });
  }

  async revocar(huella: string) {
    const s = this.sesiones.get(huella);
    if (s) s.revocada = true;
  }

  async revocarTodas(usuarioId: string) {
    this.sesiones.forEach((s) => s.usuarioId === usuarioId && (s.revocada = true));
  }
}

export class EnlacesEnMemoria implements RepositorioEnlaces {
  readonly enlaces = new Map<string, { usuarioId: string; proposito: PropositoEnlace; expiraEn: Date; usado: boolean }>();

  async crear(e: { huella: string; usuarioId: string; proposito: PropositoEnlace; expiraEn: Date }) {
    this.enlaces.set(e.huella, { usuarioId: e.usuarioId, proposito: e.proposito, expiraEn: e.expiraEn, usado: false });
  }

  async vigente(huella: string, ahora: Date) {
    const e = this.enlaces.get(huella);
    return e && !e.usado && e.expiraEn > ahora ? { usuarioId: e.usuarioId, proposito: e.proposito } : null;
  }

  async consumir(huella: string, ahora: Date) {
    if (!(await this.vigente(huella, ahora))) return false;
    this.enlaces.get(huella)!.usado = true;
    return true;
  }
}

export class IntentosEnMemoria implements RegistroDeIntentos {
  readonly intentos: { correo: string; exito: boolean; en: Date }[] = [];

  constructor(private readonly reloj: { ahora(): Date }) {}

  async fallosDesde(correo: string, desde: Date) {
    return this.intentos.filter((i) => i.correo === correo && !i.exito && i.en >= desde).length;
  }

  async registrar(correo: string, exito: boolean) {
    this.intentos.push({ correo, exito, en: this.reloj.ahora() });
  }
}

export interface Cuenta {
  id: string;
  nombre: string;
  correo: string | null;
  /** Usuario corto para entrar (ej. admin1), opcional. */
  usuario: string | null;
  hashClave: string | null;
  estado: "pendiente" | "activo" | "suspendido";
}

export type PropositoEnlace = "activar" | "restablecer";

export interface HashDeClaves {
  hash(clave: string): Promise<string>;
  verificar(hash: string, clave: string): Promise<boolean>;
}

/** Tokens aleatorios para sesiones y enlaces; en la base solo se guarda su huella. */
export interface Tokens {
  nuevo(): string;
  huella(token: string): string;
}

export interface RepositorioCuentas {
  porId(id: string): Promise<Cuenta | null>;
  porCorreo(correo: string): Promise<Cuenta | null>;
  porUsuario(usuario: string): Promise<Cuenta | null>;
  /** Si el usuario tiene algún rol en ese gimnasio (coach, cliente, admin). */
  esDelGimnasio(usuarioId: string, gimnasioId: string): Promise<boolean>;
  /** Fija correo y/o usuario y la contraseña, y deja la cuenta activa. */
  guardarCredenciales(usuarioId: string, acceso: { correo: string | null; usuario: string | null }, hashClave: string): Promise<void>;
  cambiarUsuario(usuarioId: string, usuario: string | null): Promise<void>;
  /** Alta de alguien del equipo (administración o coach), sin contraseña: la define con su enlace. */
  crearMiembro(gimnasioId: string, m: { id: string; nombre: string; usuario: string | null; rol: "admin" | "coach" }): Promise<void>;
}

export interface RepositorioSesiones {
  crear(huella: string, usuarioId: string, expiraEn: Date): Promise<void>;
  revocar(huella: string): Promise<void>;
  revocarTodas(usuarioId: string): Promise<void>;
}

export interface RepositorioEnlaces {
  crear(enlace: { huella: string; usuarioId: string; proposito: PropositoEnlace; expiraEn: Date; creadoPor: string | null }): Promise<void>;
  /** El enlace sin usar y sin vencer, o null. */
  vigente(huella: string, ahora: Date): Promise<{ usuarioId: string; proposito: PropositoEnlace } | null>;
  /** Lo marca usado solo si seguía vigente; false si alguien lo usó antes. */
  consumir(huella: string, ahora: Date): Promise<boolean>;
}

export interface RegistroDeIntentos {
  fallosDesde(correo: string, desde: Date): Promise<number>;
  registrar(correo: string, exito: boolean): Promise<void>;
}

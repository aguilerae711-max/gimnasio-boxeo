import { ErrorDeDominio, SinPermiso } from "@/shared/domain/ErrorDeDominio";
import type { Actor, Auditoria, Autorizacion, GeneradorDeIds } from "@/shared/application/puertos";
import { normalizarUsuario } from "../domain/Credenciales";
import type { RepositorioCuentas } from "./puertos";

export const PERMISO_AGREGAR_EQUIPO = "equipo.agregar";

/**
 * La administración da de alta a otra persona de administración o a un coach, con su propio usuario corto.
 * Queda sin contraseña: la define con su enlace de activación (que se genera aparte).
 */
export class AgregarMiembro {
  constructor(
    private readonly d: { cuentas: RepositorioCuentas; autorizacion: Autorizacion; auditoria: Auditoria; ids: GeneradorDeIds },
  ) {}

  async ejecutar(actor: Actor, s: { nombre: string; usuario: string; rol: "admin" | "coach" }) {
    if (!(await this.d.autorizacion.tienePermiso(actor, PERMISO_AGREGAR_EQUIPO))) throw new SinPermiso(PERMISO_AGREGAR_EQUIPO);
    const nombre = s.nombre.trim().replace(/\s+/g, " ");
    if (nombre.length < 2 || nombre.length > 80) throw new ErrorDeDominio("nombre_invalido", "Escribe el nombre (de 2 a 80 letras).");
    if (s.rol !== "admin" && s.rol !== "coach") throw new ErrorDeDominio("rol_invalido", "Elige administración o coach.");
    const usuario = s.usuario.trim() ? normalizarUsuario(s.usuario) : null;
    if (usuario && (await this.d.cuentas.porUsuario(usuario))) throw new ErrorDeDominio("usuario_en_uso", "Ese usuario ya está ocupado. Prueba con otro.");
    const id = this.d.ids.nuevo();
    await this.d.cuentas.crearMiembro(actor.gimnasioId, { id, nombre, usuario, rol: s.rol });
    await this.d.auditoria.registrar({
      gimnasioId: actor.gimnasioId,
      usuarioId: actor.usuarioId,
      accion: "equipo.agregado",
      entidad: "usuario",
      entidadId: id,
      antes: null,
      despues: { nombre, usuario, rol: s.rol },
    });
    return id;
  }
}

/**
 * Quien administra y también da clases se suma como coach con su misma cuenta:
 * tendrá el grupo Coach en el menú y su código para invitar clientes.
 */
export class TambienDoyClases {
  constructor(private readonly d: { cuentas: RepositorioCuentas; autorizacion: Autorizacion; auditoria: Auditoria }) {}

  async ejecutar(actor: Actor, s: { apodo: string }) {
    if (!(await this.d.autorizacion.tienePermiso(actor, PERMISO_AGREGAR_EQUIPO))) throw new SinPermiso(PERMISO_AGREGAR_EQUIPO);
    const apodo = s.apodo.trim().replace(/\s+/g, " ");
    if (apodo.length < 2 || apodo.length > 30) throw new ErrorDeDominio("apodo_invalido", "Escribe cómo te llaman tus clientes (de 2 a 30 letras).");
    if (!(await this.d.cuentas.esDelGimnasio(actor.usuarioId, actor.gimnasioId))) throw new ErrorDeDominio("no_es_del_gimnasio", "Tu cuenta no es de esta administración.");
    if (!(await this.d.cuentas.sumarCoach(actor.gimnasioId, actor.usuarioId, apodo))) throw new ErrorDeDominio("ya_es_coach", "Ya eres coach en esta administración.");
    await this.d.auditoria.registrar({
      gimnasioId: actor.gimnasioId,
      usuarioId: actor.usuarioId,
      accion: "equipo.tambien_coach",
      entidad: "usuario",
      entidadId: actor.usuarioId,
      antes: null,
      despues: { rol: "coach", apodo },
    });
  }
}

/** Cada quien puede ponerse (o cambiar) su usuario corto para entrar. */
export class CambiarMiUsuario {
  constructor(private readonly d: { cuentas: RepositorioCuentas; auditoria: Auditoria }) {}

  async ejecutar(actor: Actor, texto: string) {
    const cuenta = await this.d.cuentas.porId(actor.usuarioId);
    if (!cuenta) throw new ErrorDeDominio("cuenta", "No existe la cuenta.");
    const usuario = texto.trim() ? normalizarUsuario(texto) : null;
    if (!usuario && !cuenta.correo) throw new ErrorDeDominio("sin_acceso", "Necesitas correo o usuario para entrar; no puedes quitar los dos.");
    const otra = usuario ? await this.d.cuentas.porUsuario(usuario) : null;
    if (otra && otra.id !== actor.usuarioId) throw new ErrorDeDominio("usuario_en_uso", "Ese usuario ya está ocupado. Prueba con otro.");
    await this.d.cuentas.cambiarUsuario(actor.usuarioId, usuario);
    await this.d.auditoria.registrar({
      gimnasioId: actor.gimnasioId,
      usuarioId: actor.usuarioId,
      accion: "acceso.usuario_cambiado",
      entidad: "usuario",
      entidadId: actor.usuarioId,
      antes: { usuario: cuenta.usuario },
      despues: { usuario },
    });
    return usuario;
  }
}

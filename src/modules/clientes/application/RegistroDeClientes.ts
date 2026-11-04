import { ErrorDeDominio, SinPermiso } from "@/shared/domain/ErrorDeDominio";
import type { Actor, Auditoria, Autorizacion, GeneradorDeIds, Reloj } from "@/shared/application/puertos";
import { normalizarCorreo, validarClaveNueva } from "@/modules/acceso/domain/Credenciales";
import type { HashDeClaves } from "@/modules/acceso/application/puertos";
import { validarEstatura, validarPeso, type Sexo } from "@/modules/evaluacion/domain/Composicion";
import { REGLAMENTO_VIGENTE, revisarSolicitud, validarNombre, validarTelefono, type Decision } from "../domain/SolicitudCliente";
import type { RepositorioClientes } from "./puertos";

export const PERMISO_APROBAR_CLIENTE = "cliente.aprobar";

export interface DatosRegistro {
  codigoCoach: string;
  nombre: string;
  correo: string;
  telefono: string;
  clave: string;
  aceptaReglamento: boolean;
  /** Para su división de peso. Peso y estatura son opcionales y pueden ser aproximados. */
  sexo: Sexo | "";
  pesoKg?: number | null;
  estaturaCm?: number | null;
}

/**
 * El cliente se registra con el enlace de invitación de su coach.
 * Puede entrar de inmediato, pero queda pendiente hasta que la administración lo apruebe.
 */
export class RegistrarCliente {
  constructor(
    private readonly clientes: RepositorioClientes,
    private readonly claves: HashDeClaves,
    private readonly ids: GeneradorDeIds,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(datos: DatosRegistro): Promise<{ clienteId: string; usuarioId: string; correo: string }> {
    const nombre = validarNombre(datos.nombre);
    const correo = normalizarCorreo(datos.correo);
    const telefono = validarTelefono(datos.telefono);
    validarClaveNueva(datos.clave);
    if (datos.sexo !== "F" && datos.sexo !== "M") {
      throw new ErrorDeDominio("sexo", "Indica si compites en la rama femenil o varonil.");
    }
    const pesoKg = datos.pesoKg ? validarPeso(datos.pesoKg) : null;
    const estaturaCm = datos.estaturaCm ? validarEstatura(datos.estaturaCm) : null;
    if (!datos.aceptaReglamento) {
      throw new ErrorDeDominio("reglamento", "Para registrarte debes aceptar el reglamento y la responsiva.");
    }
    const coach = await this.clientes.coachPorCodigo(datos.codigoCoach.trim().toLowerCase());
    if (!coach) {
      throw new ErrorDeDominio("invitacion_invalida", "La invitación no es válida. Pide el enlace a tu coach.");
    }
    if (await this.clientes.correoEnUso(correo)) {
      throw new ErrorDeDominio("correo_en_uso", "Ya hay una cuenta con ese correo. Entra con tu contraseña.");
    }
    const nuevo = {
      usuarioId: this.ids.nuevo(),
      clienteId: this.ids.nuevo(),
      gimnasioId: coach.gimnasioId,
      coachId: coach.coachId,
      nombre,
      correo,
      telefono,
      hashClave: await this.claves.hash(datos.clave),
      reglamentoVersion: REGLAMENTO_VIGENTE,
      reglamentoAceptadoEn: this.reloj.ahora(),
      sexo: datos.sexo,
      pesoKg,
      estaturaCm,
      medicionId: pesoKg ? this.ids.nuevo() : null,
    };
    await this.clientes.registrar(nuevo);
    return { clienteId: nuevo.clienteId, usuarioId: nuevo.usuarioId, correo };
  }
}

export class RevisarRegistroCliente {
  constructor(
    private readonly clientes: RepositorioClientes,
    private readonly autorizacion: Autorizacion,
    private readonly auditoria: Auditoria,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(actor: Actor, clienteId: string, decision: Decision): Promise<void> {
    if (!(await this.autorizacion.tienePermiso(actor, PERMISO_APROBAR_CLIENTE))) {
      throw new SinPermiso(PERMISO_APROBAR_CLIENTE);
    }
    const cliente = await this.clientes.porId(actor.gimnasioId, clienteId);
    if (!cliente) throw new ErrorDeDominio("cliente_no_encontrado", "No existe ese registro.");
    const estado = revisarSolicitud(cliente.estado, decision);
    await this.clientes.cambiarEstado(actor.gimnasioId, clienteId, estado, actor.usuarioId, this.reloj.ahora());
    await this.auditoria.registrar({
      gimnasioId: actor.gimnasioId,
      usuarioId: actor.usuarioId,
      accion: decision === "aprobar" ? "cliente.aprobado" : "cliente.rechazado",
      entidad: "cliente",
      entidadId: clienteId,
      antes: { estado: cliente.estado },
      despues: { estado },
    });
  }
}

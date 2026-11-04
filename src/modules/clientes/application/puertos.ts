import type { EstadoCliente } from "../domain/SolicitudCliente";

export interface CoachParaRegistro {
  coachId: string;
  gimnasioId: string;
  apodo: string;
}

export interface NuevoCliente {
  usuarioId: string;
  clienteId: string;
  gimnasioId: string;
  coachId: string;
  nombre: string;
  correo: string;
  telefono: string | null;
  hashClave: string;
  reglamentoVersion: string;
  reglamentoAceptadoEn: Date;
  sexo: "F" | "M";
  /** Peso aproximado del registro; se guarda como primer pesaje (aproximado). */
  pesoKg: number | null;
  estaturaCm: number | null;
  medicionId: string | null;
}

export interface RepositorioClientes {
  coachPorCodigo(codigo: string): Promise<CoachParaRegistro | null>;
  correoEnUso(correo: string): Promise<boolean>;
  /** En una sola transacción: la cuenta (activa), su rol de cliente y el registro pendiente. */
  registrar(nuevo: NuevoCliente): Promise<void>;
  porId(gimnasioId: string, clienteId: string): Promise<{ id: string; estado: EstadoCliente } | null>;
  cambiarEstado(gimnasioId: string, clienteId: string, estado: EstadoCliente, revisadoPor: string, en: Date): Promise<void>;
}

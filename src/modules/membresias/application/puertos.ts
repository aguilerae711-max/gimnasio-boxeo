import { AcuerdoComision } from "../domain/AcuerdoComision";

export interface RepositorioAcuerdosComision {
  /** Todos los acuerdos del gimnasio (generales y por coach), incluido el historial. */
  delGimnasio(gimnasioId: string): Promise<AcuerdoComision[]>;
  /** Guarda en una sola transacción: el acuerdo nuevo, los que se cierran y los futuros que se cancelan. */
  aplicarCambio(cambio: { nuevo: AcuerdoComision; cerrados: AcuerdoComision[]; cancelados: AcuerdoComision[] }): Promise<void>;
}

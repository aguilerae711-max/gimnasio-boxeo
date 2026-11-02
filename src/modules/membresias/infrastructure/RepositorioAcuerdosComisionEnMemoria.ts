import { AcuerdoComision } from "../domain/AcuerdoComision";
import type { RepositorioAcuerdosComision } from "../application/puertos";

/** Para pruebas y desarrollo local sin base de datos. */
export class RepositorioAcuerdosComisionEnMemoria implements RepositorioAcuerdosComision {
  private readonly acuerdos = new Map<string, AcuerdoComision>();

  constructor(iniciales: AcuerdoComision[] = []) {
    iniciales.forEach((a) => this.acuerdos.set(a.id, a));
  }

  async delGimnasio(gimnasioId: string): Promise<AcuerdoComision[]> {
    return [...this.acuerdos.values()].filter((a) => a.gimnasioId === gimnasioId);
  }

  async aplicarCambio(cambio: { nuevo: AcuerdoComision; cerrados: AcuerdoComision[]; cancelados: AcuerdoComision[] }): Promise<void> {
    cambio.cancelados.forEach((a) => this.acuerdos.delete(a.id));
    cambio.cerrados.forEach((a) => this.acuerdos.set(a.id, a));
    this.acuerdos.set(cambio.nuevo.id, cambio.nuevo);
  }
}

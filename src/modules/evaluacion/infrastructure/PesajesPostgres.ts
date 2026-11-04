import type postgres from "postgres";
import { enGimnasio } from "@/shared/infrastructure/baseDeDatos";
import type { RepositorioPesajes } from "../application/Pesajes";
import type { DivisionPeso, Medicion, OrigenMedicion, Sexo } from "../domain/Composicion";

export class PesajesPostgres implements RepositorioPesajes {
  constructor(private readonly sql: postgres.Sql) {}

  async existeCliente(gimnasioId: string, clienteId: string) {
    const [f] = await enGimnasio(this.sql, gimnasioId, (tx) => tx`SELECT 1 FROM cliente WHERE id = ${clienteId} AND gimnasio_id = ${gimnasioId}`);
    return Boolean(f);
  }

  async guardar(
    gimnasioId: string,
    m: { id: string; clienteId: string; fecha: string; pesoKg: number; estaturaCm: number | null; origen: OrigenMedicion; aproximado: boolean; registradoPor: string },
  ) {
    await enGimnasio(this.sql, gimnasioId, (tx) => tx`
      INSERT INTO medicion_corporal (id, gimnasio_id, cliente_id, fecha, peso_kg, estatura_cm, origen, aproximado, registrado_por)
      VALUES (${m.id}, ${gimnasioId}, ${m.clienteId}, ${m.fecha}, ${m.pesoKg}, ${m.estaturaCm}, ${m.origen}, ${m.aproximado}, ${m.registradoPor})`);
  }
}

/** Pesajes, sexo y divisiones de un cliente, para su estado corporal (solo lectura). */
export class ConsultasPesajes {
  constructor(private readonly sql: postgres.Sql) {}

  async delCliente(gimnasioId: string, clienteId: string): Promise<{ mediciones: Medicion[]; sexo: Sexo | null; divisiones: DivisionPeso[] }> {
    return enGimnasio(this.sql, gimnasioId, async (tx) => {
      const mediciones = await tx<{ fecha: string; peso: string; estatura: string | null; origen: OrigenMedicion; aproximado: boolean }[]>`
        SELECT fecha::text, peso_kg AS peso, estatura_cm AS estatura, origen, aproximado
        FROM medicion_corporal WHERE cliente_id = ${clienteId} ORDER BY fecha, creado_en`;
      const [perfil] = await tx<{ sexo: Sexo | null }[]>`SELECT sexo FROM perfil_cliente WHERE cliente_id = ${clienteId}`;
      const divisiones = await tx<{ nombre: string; sexo: Sexo; limite: string | null }[]>`
        SELECT d.nombre, d.sexo, d.limite_kg AS limite
        FROM division_peso d JOIN gimnasio g ON g.disciplina_id = d.disciplina_id
        WHERE g.id = ${gimnasioId} AND d.estandar = 'world_boxing_elite' ORDER BY d.sexo, d.orden`;
      return {
        mediciones: mediciones.map((m) => ({
          fecha: m.fecha,
          pesoKg: Number(m.peso),
          estaturaCm: m.estatura === null ? null : Number(m.estatura),
          origen: m.origen,
          aproximado: m.aproximado,
        })),
        sexo: perfil?.sexo ?? null,
        divisiones: divisiones.map((d) => ({ nombre: d.nombre, sexo: d.sexo, limiteKg: d.limite === null ? null : Number(d.limite) })),
      };
    });
  }
}

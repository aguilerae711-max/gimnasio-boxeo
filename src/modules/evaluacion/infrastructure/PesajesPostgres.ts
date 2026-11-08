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

export interface CambioDePeso {
  clienteId: string;
  nombre: string;
  primeroKg: number;
  anteriorKg: number | null;
  ultimoKg: number;
  ultimaFecha: string;
  pesajes: number;
}

/** Primer, penúltimo y último pesaje real de cada cliente activo: para ver quién avanzó y felicitarlo. */
export async function cambiosDePeso(sql: postgres.Sql, gimnasioId: string): Promise<CambioDePeso[]> {
  const filas = await enGimnasio(sql, gimnasioId, (tx) => tx<
    { clienteId: string; nombre: string; primero: string; anterior: string | null; ultimo: string; ultimaFecha: string; pesajes: number }[]
  >`
    WITH m AS (
      SELECT cliente_id, peso_kg, fecha,
             row_number() OVER (PARTITION BY cliente_id ORDER BY fecha DESC, creado_en DESC) AS desde_fin,
             first_value(peso_kg) OVER (PARTITION BY cliente_id ORDER BY fecha, creado_en) AS primero,
             count(*) OVER (PARTITION BY cliente_id) AS pesajes
      FROM medicion_corporal WHERE gimnasio_id = ${gimnasioId} AND NOT aproximado)
    SELECT cl.id AS "clienteId", u.nombre, u1.primero, u2.peso_kg AS anterior, u1.peso_kg AS ultimo, u1.fecha::text AS "ultimaFecha", u1.pesajes::int AS pesajes
    FROM cliente cl JOIN usuario u ON u.id = cl.usuario_id
    JOIN m u1 ON u1.cliente_id = cl.id AND u1.desde_fin = 1
    LEFT JOIN m u2 ON u2.cliente_id = cl.id AND u2.desde_fin = 2
    WHERE cl.gimnasio_id = ${gimnasioId} AND cl.estado = 'activo'`);
  return filas.map((f) => ({
    clienteId: f.clienteId,
    nombre: f.nombre,
    primeroKg: Number(f.primero),
    anteriorKg: f.anterior === null ? null : Number(f.anterior),
    ultimoKg: Number(f.ultimo),
    ultimaFecha: f.ultimaFecha,
    pesajes: f.pesajes,
  }));
}

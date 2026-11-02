import { randomUUID } from "node:crypto";
import type postgres from "postgres";
import type { Auditoria, Autorizacion, EntradaAuditoria, GeneradorDeIds, Reloj } from "@/shared/application/puertos";
import { enGimnasio } from "./baseDeDatos";

export const relojDelSistema: Reloj = { ahora: () => new Date() };

export const idsAleatorios: GeneradorDeIds = { nuevo: () => randomUUID() };

/** Los permisos ya vienen cargados con la sesión; no hace falta volver a consultar. */
export function autorizacionConPermisos(permisos: readonly string[]): Autorizacion {
  return { tienePermiso: async (_actor, permiso) => permisos.includes(permiso) };
}

export class AuditoriaPostgres implements Auditoria {
  constructor(private readonly sql: postgres.Sql) {}

  async registrar(e: EntradaAuditoria): Promise<void> {
    await enGimnasio(this.sql, e.gimnasioId, (tx) => {
      const json = (v: unknown) => (v == null ? null : tx.json(v as postgres.JSONValue));
      return tx`
        INSERT INTO auditoria (gimnasio_id, usuario_id, accion, entidad, entidad_id, antes, despues, motivo)
        VALUES (${e.gimnasioId}, ${e.usuarioId}, ${e.accion}, ${e.entidad}, ${e.entidadId},
                ${json(e.antes)}, ${json(e.despues)}, ${e.motivo ?? null})
      `;
    });
  }
}

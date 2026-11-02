import postgres from "postgres";

// Cloud Run mantiene el proceso vivo: un solo pool por instancia, por la conexión con pooler de Neon.
const globalConPool = globalThis as typeof globalThis & { __sql?: postgres.Sql };

export function baseDeDatos(): postgres.Sql {
  if (!globalConPool.__sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("Falta DATABASE_URL.");
    // prepare: false porque el pooler de Neon (PgBouncer en modo transacción) no guarda sentencias preparadas.
    globalConPool.__sql = postgres(url, { max: 5, prepare: false, idle_timeout: 20 });
  }
  return globalConPool.__sql;
}

/** Ejecuta en una transacción con el gimnasio fijado para las políticas RLS. */
export function enGimnasio<T>(gimnasioId: string, trabajo: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
  return baseDeDatos().begin(async (tx) => {
    await tx`SELECT set_config('app.gimnasio_id', ${gimnasioId}, true)`;
    return trabajo(tx);
  }) as Promise<T>;
}

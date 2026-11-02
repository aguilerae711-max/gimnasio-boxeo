import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { baseConMigraciones } from "./pgliteDePrueba";

const GIMNASIO = "00000000-0000-4000-8000-000000000101";

describe("migraciones", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await baseConMigraciones();
  }, 60_000);

  it("arma el horario de lunes a viernes, 7 franjas de 8:00 a 22:00", async () => {
    const dias = await db.query<{ n: number }>("SELECT count(*)::int AS n FROM dia_operacion");
    const franjas = await db.query<{ inicio: string; fin: string }>(
      "SELECT min(hora_inicio)::text AS inicio, max(hora_fin)::text AS fin FROM franja_horaria",
    );
    expect(dias.rows[0].n).toBe(5);
    expect(franjas.rows[0]).toEqual({ inicio: "08:00:00", fin: "22:00:00" });
  });

  it("registra a Iván, Mike y Chato como coaches y la comisión general de 50%", async () => {
    const coaches = await db.query<{ apodo: string }>("SELECT apodo FROM coach ORDER BY apodo");
    const comision = await db.query<{ porcentaje_pb: number }>("SELECT porcentaje_pb FROM acuerdo_comision WHERE coach_id IS NULL");
    expect(coaches.rows.map((c) => c.apodo)).toEqual(["Chato", "Iván", "Mike"]);
    expect(comision.rows[0].porcentaje_pb).toBe(5000);
  });

  it("solo el superadmin tiene el permiso del panel del sistema", async () => {
    const r = await db.query<{ rol_codigo: string }>(
      "SELECT rol_codigo FROM rol_permiso WHERE permiso_codigo = 'sistema.administrar'",
    );
    expect(r.rows.map((f) => f.rol_codigo)).toEqual(["superadmin"]);
  });

  it("la comisión solo la cambia la administración", async () => {
    const r = await db.query<{ rol_codigo: string }>(
      "SELECT rol_codigo FROM rol_permiso WHERE permiso_codigo = 'comision.cambiar' ORDER BY rol_codigo",
    );
    expect(r.rows.map((f) => f.rol_codigo)).toEqual(["admin", "superadmin"]);
  });

  it("no deja modificar ni borrar la auditoría", async () => {
    await db.query(
      "INSERT INTO auditoria (gimnasio_id, accion, entidad, entidad_id) VALUES ($1, 'prueba', 'x', '1')",
      [GIMNASIO],
    );
    await expect(db.query("UPDATE auditoria SET accion = 'cambio'")).rejects.toThrow(/no se puede modificar/);
    await expect(db.query("DELETE FROM auditoria")).rejects.toThrow(/no se puede modificar/);
  });

  it("rechaza una comisión mayor a 100%", async () => {
    await expect(
      db.query(
        `INSERT INTO acuerdo_comision (id, gimnasio_id, porcentaje_pb, vigente_desde, motivo, creado_por)
         VALUES (gen_random_uuid(), $1, 10001, DATE '2026-12-01', 'x', '00000000-0000-4000-8000-000000000201')`,
        [GIMNASIO],
      ),
    ).rejects.toThrow();
  });

  describe("usuario de la app (app_gimnasio)", () => {
    const comoApp = async <T>(trabajo: () => Promise<T>, gimnasio?: string): Promise<T> => {
      await db.exec("BEGIN; SET LOCAL ROLE app_gimnasio;");
      try {
        if (gimnasio) await db.query("SELECT set_config('app.gimnasio_id', $1, true)", [gimnasio]);
        return await trabajo();
      } finally {
        await db.exec("ROLLBACK;");
      }
    };

    it("no ve datos de ningún gimnasio si no fija cuál", async () => {
      const r = await comoApp(() => db.query<{ n: number }>("SELECT count(*)::int AS n FROM coach"));
      expect(r.rows[0].n).toBe(0);
    });

    it("ve solo los de su gimnasio", async () => {
      const propio = await comoApp(() => db.query<{ n: number }>("SELECT count(*)::int AS n FROM coach"), GIMNASIO);
      const otro = await comoApp(
        () => db.query<{ n: number }>("SELECT count(*)::int AS n FROM coach"),
        "00000000-0000-4000-8000-000000000999",
      );
      expect(propio.rows[0].n).toBe(3);
      expect(otro.rows[0].n).toBe(0);
    });

    it("no puede escribir en otro gimnasio", async () => {
      await expect(
        comoApp(
          () => db.query("INSERT INTO dia_operacion (gimnasio_id, dia_semana) VALUES ($1, 6)", [GIMNASIO]),
          "00000000-0000-4000-8000-000000000999",
        ),
      ).rejects.toThrow(/row-level security/);
    });

    it("no puede borrar la auditoría ni cambiar el esquema", async () => {
      await expect(comoApp(() => db.query("DELETE FROM auditoria"), GIMNASIO)).rejects.toThrow(/permission denied/);
      await expect(comoApp(() => db.query("DROP TABLE cliente"))).rejects.toThrow(/must be owner/);
    });
  });
});

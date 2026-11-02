import { beforeEach, describe, expect, it } from "vitest";
import type { EntradaAuditoria } from "@/shared/application/puertos";
import type { EstadoCliente } from "../domain/SolicitudCliente";
import type { NuevoCliente, RepositorioClientes } from "./puertos";
import { RegistrarCliente, RevisarRegistroCliente } from "./RegistroDeClientes";

class ClientesEnMemoria implements RepositorioClientes {
  readonly registrados: (NuevoCliente & { estado: EstadoCliente })[] = [];
  async coachPorCodigo(codigo: string) {
    return codigo === "mike-a1b2" ? { coachId: "c-mike", gimnasioId: "g1", apodo: "Mike" } : null;
  }
  async correoEnUso(correo: string) {
    return correo === "ivan@gym.mx" || this.registrados.some((r) => r.correo === correo);
  }
  async registrar(nuevo: NuevoCliente) {
    this.registrados.push({ ...nuevo, estado: "pendiente" });
  }
  async porId(gimnasioId: string, clienteId: string) {
    const r = this.registrados.find((x) => x.gimnasioId === gimnasioId && x.clienteId === clienteId);
    return r ? { id: r.clienteId, estado: r.estado } : null;
  }
  async cambiarEstado(_g: string, clienteId: string, estado: EstadoCliente) {
    this.registrados.find((x) => x.clienteId === clienteId)!.estado = estado;
  }
}

const datos = {
  codigoCoach: "Mike-A1B2",
  nombre: "  Ana   López ",
  correo: "ana@correo.mx",
  telefono: "55 1234 5678",
  clave: "mi clave de boxeo",
  aceptaReglamento: true,
};

describe("registro de clientes", () => {
  let repo: ClientesEnMemoria;
  let registrar: RegistrarCliente;
  let revisar: RevisarRegistroCliente;
  let bitacora: EntradaAuditoria[];

  beforeEach(() => {
    let n = 0;
    repo = new ClientesEnMemoria();
    bitacora = [];
    const reloj = { ahora: () => new Date("2026-11-02T16:00:00Z") };
    registrar = new RegistrarCliente(repo, { hash: async (c) => `h:${c}`, verificar: async () => false }, { nuevo: () => `id${++n}` }, reloj);
    revisar = new RevisarRegistroCliente(
      repo,
      { tienePermiso: async (a) => a.usuarioId === "ivan" },
      { registrar: async (e) => void bitacora.push(e) },
      reloj,
    );
  });

  it("registra al cliente con su coach, pendiente de aprobación y con el reglamento aceptado", async () => {
    await registrar.ejecutar(datos);
    expect(repo.registrados[0]).toMatchObject({
      nombre: "Ana López",
      coachId: "c-mike",
      gimnasioId: "g1",
      telefono: "5512345678",
      hashClave: "h:mi clave de boxeo",
      reglamentoVersion: "v1",
      estado: "pendiente",
    });
  });

  it("exige aceptar el reglamento y la responsiva", async () => {
    await expect(registrar.ejecutar({ ...datos, aceptaReglamento: false })).rejects.toThrow(/reglamento/);
  });

  it("rechaza una invitación que no existe", async () => {
    await expect(registrar.ejecutar({ ...datos, codigoCoach: "nadie" })).rejects.toThrow(/invitación no es válida/);
  });

  it("no repite correos", async () => {
    await expect(registrar.ejecutar({ ...datos, correo: "IVAN@gym.mx" })).rejects.toThrow(/Ya hay una cuenta/);
  });

  it("la administración aprueba una sola vez y queda en la auditoría", async () => {
    const { clienteId } = await registrar.ejecutar(datos);
    await revisar.ejecutar({ usuarioId: "ivan", gimnasioId: "g1" }, clienteId, "aprobar");
    expect(repo.registrados[0].estado).toBe("activo");
    expect(bitacora[0]).toMatchObject({ accion: "cliente.aprobado", antes: { estado: "pendiente" }, despues: { estado: "activo" } });
    await expect(revisar.ejecutar({ usuarioId: "ivan", gimnasioId: "g1" }, clienteId, "rechazar")).rejects.toThrow(/ya fue revisado/);
  });

  it("un coach no puede aprobar registros", async () => {
    const { clienteId } = await registrar.ejecutar(datos);
    await expect(revisar.ejecutar({ usuarioId: "mike", gimnasioId: "g1" }, clienteId, "aprobar")).rejects.toThrow(/permiso/);
  });
});

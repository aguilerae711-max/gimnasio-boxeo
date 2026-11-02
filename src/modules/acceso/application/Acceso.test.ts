import { beforeEach, describe, expect, it } from "vitest";
import type { Actor, EntradaAuditoria } from "@/shared/application/puertos";
import { CuentasEnMemoria, EnlacesEnMemoria, IntentosEnMemoria, SesionesEnMemoria } from "../infrastructure/AccesoEnMemoria";
import { GenerarEnlaceDeAcceso, UsarEnlaceDeAcceso } from "./EnlacesDeAcceso";
import { CerrarSesion, IniciarSesion } from "./IniciarSesion";
import type { HashDeClaves, Tokens } from "./puertos";

const admin: Actor = { usuarioId: "ivan", gimnasioId: "g1" };
const CLAVE = "guantes rojos 2026";

const claves: HashDeClaves = {
  hash: async (c) => `h:${c}`,
  verificar: async (h, c) => h === `h:${c}`,
};

describe("acceso", () => {
  let ahora: Date;
  let n: number;
  let cuentas: CuentasEnMemoria;
  let sesiones: SesionesEnMemoria;
  let enlaces: EnlacesEnMemoria;
  let intentos: IntentosEnMemoria;
  let bitacora: EntradaAuditoria[];
  let entrar: IniciarSesion;
  let generar: GenerarEnlaceDeAcceso;
  let usar: UsarEnlaceDeAcceso;

  beforeEach(() => {
    ahora = new Date("2026-11-02T16:00:00Z");
    n = 0;
    const reloj = { ahora: () => ahora };
    const tokens: Tokens = { nuevo: () => `t${++n}`, huella: (t) => `#${t}` };
    cuentas = new CuentasEnMemoria(
      [
        { id: "ivan", nombre: "Iván", correo: "ivan@gym.mx", hashClave: `h:${CLAVE}`, estado: "activo" },
        { id: "mike", nombre: "Mike", correo: null, hashClave: null, estado: "pendiente" },
        { id: "otro", nombre: "Otro", correo: null, hashClave: null, estado: "pendiente" },
      ],
      [
        { usuarioId: "ivan", gimnasioId: "g1" },
        { usuarioId: "mike", gimnasioId: "g1" },
        { usuarioId: "otro", gimnasioId: "g2" },
      ],
    );
    sesiones = new SesionesEnMemoria();
    enlaces = new EnlacesEnMemoria();
    intentos = new IntentosEnMemoria(reloj);
    bitacora = [];
    entrar = new IniciarSesion(cuentas, sesiones, intentos, claves, tokens, reloj, "h:relleno");
    generar = new GenerarEnlaceDeAcceso(
      cuentas,
      enlaces,
      { tienePermiso: async (a) => a.usuarioId === "ivan" },
      { registrar: async (e) => void bitacora.push(e) },
      tokens,
      reloj,
    );
    usar = new UsarEnlaceDeAcceso(cuentas, enlaces, sesiones, claves, tokens, reloj);
  });

  describe("iniciar sesión", () => {
    it("entra con correo y contraseña, sin importar mayúsculas en el correo", async () => {
      const s = await entrar.ejecutar("  IVAN@gym.mx ", CLAVE);
      expect(s.usuarioId).toBe("ivan");
      expect(sesiones.sesiones.get(`#${s.token}`)?.usuarioId).toBe("ivan");
    });

    it("da el mismo mensaje si el correo no existe o la contraseña está mal", async () => {
      await expect(entrar.ejecutar("nadie@gym.mx", CLAVE)).rejects.toThrow("Correo o contraseña incorrectos.");
      await expect(entrar.ejecutar("ivan@gym.mx", "otra clave larga")).rejects.toThrow("Correo o contraseña incorrectos.");
    });

    it("frena después de 5 fallos en 15 minutos, aun con la contraseña correcta", async () => {
      for (let i = 0; i < 5; i++) await entrar.ejecutar("ivan@gym.mx", "mal").catch(() => {});
      await expect(entrar.ejecutar("ivan@gym.mx", CLAVE)).rejects.toThrow(/Demasiados intentos/);
      ahora = new Date(ahora.getTime() + 16 * 60_000);
      await expect(entrar.ejecutar("ivan@gym.mx", CLAVE)).resolves.toBeDefined();
    });

    it("no deja entrar a una cuenta suspendida", async () => {
      cuentas.cuentas.get("ivan")!.estado = "suspendido";
      await expect(entrar.ejecutar("ivan@gym.mx", CLAVE)).rejects.toThrow(/suspendida/);
    });

    it("cerrar sesión la revoca", async () => {
      const s = await entrar.ejecutar("ivan@gym.mx", CLAVE);
      await new CerrarSesion(sesiones, { nuevo: () => "", huella: (t) => `#${t}` }).ejecutar(s.token);
      expect(sesiones.sesiones.get(`#${s.token}`)?.revocada).toBe(true);
    });
  });

  describe("enlaces de acceso", () => {
    it("Mike activa su cuenta con el enlace y después entra", async () => {
      const { token, proposito } = await generar.ejecutar(admin, "mike");
      expect(proposito).toBe("activar");
      expect(await usar.consultar(token)).toMatchObject({ nombre: "Mike", proposito: "activar" });
      await usar.ejecutar(token, { correo: "Mike@Gym.mx", clave: "jab cruzado gancho" });
      await expect(entrar.ejecutar("mike@gym.mx", "jab cruzado gancho")).resolves.toMatchObject({ usuarioId: "mike" });
      expect(bitacora[0]).toMatchObject({ accion: "acceso.enlace_activar", entidadId: "mike" });
    });

    it("el enlace sirve una sola vez", async () => {
      const { token } = await generar.ejecutar(admin, "mike");
      await usar.ejecutar(token, { correo: "mike@gym.mx", clave: "jab cruzado gancho" });
      await expect(usar.ejecutar(token, { correo: "mike@gym.mx", clave: "otra clave larga" })).rejects.toThrow(/ya se usó o venció/);
    });

    it("vence a las 72 horas", async () => {
      const { token } = await generar.ejecutar(admin, "mike");
      ahora = new Date(ahora.getTime() + 73 * 3_600_000);
      await expect(usar.consultar(token)).rejects.toThrow(/ya se usó o venció/);
    });

    it("pide una contraseña de al menos 10 caracteres", async () => {
      const { token } = await generar.ejecutar(admin, "mike");
      await expect(usar.ejecutar(token, { correo: "mike@gym.mx", clave: "corta" })).rejects.toThrow(/al menos 10/);
    });

    it("no deja tomar un correo que ya usa otra cuenta", async () => {
      const { token } = await generar.ejecutar(admin, "mike");
      await expect(usar.ejecutar(token, { correo: "ivan@gym.mx", clave: "jab cruzado gancho" })).rejects.toThrow(/ya lo usa/);
    });

    it("al restablecer, cierra las sesiones abiertas", async () => {
      const s = await entrar.ejecutar("ivan@gym.mx", CLAVE);
      const { token, proposito } = await generar.ejecutar(admin, "ivan");
      expect(proposito).toBe("restablecer");
      await usar.ejecutar(token, { correo: "ivan@gym.mx", clave: "nueva clave segura" });
      expect(sesiones.sesiones.get(`#${s.token}`)?.revocada).toBe(true);
    });

    it("solo la administración genera enlaces, y solo de su gimnasio", async () => {
      await expect(generar.ejecutar({ usuarioId: "mike", gimnasioId: "g1" }, "ivan")).rejects.toThrow(/permiso/);
      await expect(generar.ejecutar(admin, "otro")).rejects.toThrow(/No existe/);
    });
  });
});

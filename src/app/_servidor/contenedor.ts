import "server-only";
import { GenerarEnlaceDeAcceso, UsarEnlaceDeAcceso } from "@/modules/acceso/application/EnlacesDeAcceso";
import { CerrarSesion, IniciarSesion } from "@/modules/acceso/application/IniciarSesion";
import {
  argon2id,
  ConsultasEquipo,
  CuentasPostgres,
  EnlacesPostgres,
  IntentosPostgres,
  SesionesPostgres,
  tokensAleatorios,
} from "@/modules/acceso/infrastructure/AccesoPostgres";
import { RegistrarCliente, RevisarRegistroCliente } from "@/modules/clientes/application/RegistroDeClientes";
import { ClientesPostgres, ConsultasClientes } from "@/modules/clientes/infrastructure/ClientesPostgres";
import { CambiarComision } from "@/modules/membresias/application/CambiarComision";
import {
  ConsultasComisiones,
  RepositorioAcuerdosComisionPostgres,
} from "@/modules/membresias/infrastructure/RepositorioAcuerdosComisionPostgres";
import {
  ActualizarPerfilCliente,
  ActualizarPerfilCoach,
  AsignarCliente,
  AsignarTurno,
  QuitarTurno,
} from "@/modules/operacion/application/Operacion";
import { ConsultasOperacion, OperacionPostgres } from "@/modules/operacion/infrastructure/OperacionPostgres";
import { RegistrarPesaje } from "@/modules/evaluacion/application/Pesajes";
import { ConsultasPesajes, PesajesPostgres } from "@/modules/evaluacion/infrastructure/PesajesPostgres";
import { CambiarTarifaSistema, CerrarCuadre, GuardarPlan, RegistrarPago, RevisarPago } from "@/modules/membresias/application/Pagos";
import { ConsultasPagos, PagosPostgres } from "@/modules/membresias/infrastructure/PagosPostgres";
import { almacenamientoDelEntorno } from "@/shared/infrastructure/almacenamiento";
import { baseDeDatos } from "@/shared/infrastructure/baseDeDatos";
import { cifradorDelEntorno } from "@/shared/infrastructure/cifrado";
import { AuditoriaPostgres, autorizacionConPermisos, idsAleatorios, relojDelSistema } from "@/shared/infrastructure/comunes";

/** Arma los casos de uso con sus implementaciones reales (Postgres en Neon). Único lugar que las conoce. */

let hashDeRelleno: Promise<string> | undefined;

export async function casosDeAcceso() {
  const sql = baseDeDatos();
  hashDeRelleno ??= argon2id.hash("clave de relleno para igualar tiempos");
  const cuentas = new CuentasPostgres(sql);
  const sesiones = new SesionesPostgres(sql);
  const enlaces = new EnlacesPostgres(sql);
  return {
    sesiones,
    iniciarSesion: new IniciarSesion(cuentas, sesiones, new IntentosPostgres(sql), argon2id, tokensAleatorios, relojDelSistema, await hashDeRelleno),
    cerrarSesion: new CerrarSesion(sesiones, tokensAleatorios),
    usarEnlace: new UsarEnlaceDeAcceso(cuentas, enlaces, sesiones, argon2id, tokensAleatorios, relojDelSistema),
    generarEnlace: (permisos: readonly string[]) =>
      new GenerarEnlaceDeAcceso(cuentas, enlaces, autorizacionConPermisos(permisos), new AuditoriaPostgres(sql), tokensAleatorios, relojDelSistema),
    equipo: new ConsultasEquipo(sql),
  };
}

export function casosDeClientes() {
  const sql = baseDeDatos();
  const repositorio = new ClientesPostgres(sql);
  return {
    repositorio,
    consultas: new ConsultasClientes(sql),
    registrar: new RegistrarCliente(repositorio, argon2id, idsAleatorios, relojDelSistema),
    revisar: (permisos: readonly string[]) =>
      new RevisarRegistroCliente(repositorio, autorizacionConPermisos(permisos), new AuditoriaPostgres(sql), relojDelSistema),
  };
}

export function casosDeComisiones() {
  const sql = baseDeDatos();
  const repositorio = new RepositorioAcuerdosComisionPostgres(sql);
  return {
    repositorio,
    consultas: new ConsultasComisiones(sql),
    cambiar: (permisos: readonly string[], zonaHoraria: string) =>
      new CambiarComision(repositorio, autorizacionConPermisos(permisos), new AuditoriaPostgres(sql), relojDelSistema, idsAleatorios, zonaHoraria),
  };
}

export function casosDeOperacion(permisos: readonly string[], zonaHoraria: string) {
  const sql = baseDeDatos();
  const repositorio = new OperacionPostgres(sql);
  const deps = {
    repositorio,
    autorizacion: autorizacionConPermisos(permisos),
    auditoria: new AuditoriaPostgres(sql),
    reloj: relojDelSistema,
    ids: idsAleatorios,
  };
  return {
    repositorio,
    consultas: new ConsultasOperacion(sql, cifradorDelEntorno),
    asignarTurno: new AsignarTurno(deps),
    quitarTurno: new QuitarTurno(deps),
    asignarCliente: new AsignarCliente(deps),
    perfilCliente: () => new ActualizarPerfilCliente(deps, cifradorDelEntorno(), zonaHoraria),
    perfilCoach: new ActualizarPerfilCoach(deps),
  };
}

export function casosDePagos(permisos: readonly string[], zonaHoraria: string) {
  const sql = baseDeDatos();
  const pagos = new PagosPostgres(sql);
  const d = {
    pagos,
    acuerdos: new RepositorioAcuerdosComisionPostgres(sql),
    autorizacion: autorizacionConPermisos(permisos),
    auditoria: new AuditoriaPostgres(sql),
    reloj: relojDelSistema,
    ids: idsAleatorios,
    zonaHoraria,
  };
  return {
    repositorio: pagos,
    consultas: new ConsultasPagos(sql),
    archivos: almacenamientoDelEntorno(),
    guardarPlan: new GuardarPlan(d),
    registrar: new RegistrarPago(d, almacenamientoDelEntorno()),
    revisar: new RevisarPago(d),
    cerrarCuadre: new CerrarCuadre(d),
    cambiarTarifa: new CambiarTarifaSistema(d),
  };
}

export function casosDePesajes(permisos: readonly string[], zonaHoraria: string) {
  const sql = baseDeDatos();
  return {
    consultas: new ConsultasPesajes(sql),
    registrar: new RegistrarPesaje(
      { repositorio: new PesajesPostgres(sql), autorizacion: autorizacionConPermisos(permisos), auditoria: new AuditoriaPostgres(sql), reloj: relojDelSistema, ids: idsAleatorios },
      zonaHoraria,
    ),
  };
}

export const huellaDe = (token: string) => tokensAleatorios.huella(token);

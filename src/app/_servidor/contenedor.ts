import "server-only";
import { GenerarEnlaceDeAcceso, UsarEnlaceDeAcceso } from "@/modules/acceso/application/EnlacesDeAcceso";
import { AgregarMiembro, CambiarMiUsuario, TambienDoyClases } from "@/modules/acceso/application/Equipo";
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
import { RegistrarCliente, InscribirmeComoCliente, RevisarRegistroCliente } from "@/modules/clientes/application/RegistroDeClientes";
import { ClientesPostgres, ConsultasClientes } from "@/modules/clientes/infrastructure/ClientesPostgres";
import { AtenderSolicitud, SolicitarClaseDePrueba } from "@/modules/clientes/application/SolicitudesDePrueba";
import { SolicitudesPostgres } from "@/modules/clientes/infrastructure/SolicitudesPostgres";
import { AplicarComoCoach, AtenderSolicitudCoach } from "@/modules/acceso/application/SolicitudesDeCoach";
import { SolicitudesCoachPostgres } from "@/modules/acceso/infrastructure/SolicitudesCoachPostgres";
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
import {
  AnularEvaluacion,
  CerrarEvaluacion,
  DefinirPin,
  GuardarCaptura,
  GuardarRubrica,
  IniciarEvaluacion,
  RegistrarChequeo,
  ReiniciarPuntoDePartida,
} from "@/modules/evaluacion/application/Evaluaciones";
import {
  DarAccesoBiblioteca,
  FormalizarEjercicio,
  FusionarEjercicio,
  GuardarPlanDeTrabajo,
  GuardarRutina,
  MantenerPlan,
  ProponerEjercicio,
  RevisarPlan,
} from "@/modules/biblioteca/application/Biblioteca";
import { BibliotecaPostgres, ConsultasBiblioteca } from "@/modules/biblioteca/infrastructure/BibliotecaPostgres";
import { RegistrarPesaje } from "@/modules/evaluacion/application/Pesajes";
import { Archivar, CancelarInscripcion, Inscribirse, Publicar } from "@/modules/novedades/application/Novedades";
import { ConsultasNovedades, NovedadesPostgres } from "@/modules/novedades/infrastructure/NovedadesPostgres";
import { ConsultasEvaluacion, EvaluacionesPostgres } from "@/modules/evaluacion/infrastructure/EvaluacionesPostgres";
import { ConsultasPesajes, cambiosDePeso, PesajesPostgres } from "@/modules/evaluacion/infrastructure/PesajesPostgres";
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
    agregarMiembro: (permisos: readonly string[]) =>
      new AgregarMiembro({ cuentas, autorizacion: autorizacionConPermisos(permisos), auditoria: new AuditoriaPostgres(sql), ids: idsAleatorios }),
    tambienDoyClases: (permisos: readonly string[]) =>
      new TambienDoyClases({ cuentas, autorizacion: autorizacionConPermisos(permisos), auditoria: new AuditoriaPostgres(sql) }),
    cambiarUsuario: new CambiarMiUsuario({ cuentas, auditoria: new AuditoriaPostgres(sql) }),
    cuenta: (usuarioId: string) => cuentas.porId(usuarioId),
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
    inscribirme: (permisos: readonly string[]) =>
      new InscribirmeComoCliente({
        inscripciones: repositorio,
        autorizacion: autorizacionConPermisos(permisos),
        auditoria: new AuditoriaPostgres(sql),
        ids: idsAleatorios,
        reloj: relojDelSistema,
      }),
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
    cambios: (gimnasioId: string) => cambiosDePeso(sql, gimnasioId),
    registrar: new RegistrarPesaje(
      { repositorio: new PesajesPostgres(sql), autorizacion: autorizacionConPermisos(permisos), auditoria: new AuditoriaPostgres(sql), reloj: relojDelSistema, ids: idsAleatorios },
      zonaHoraria,
    ),
  };
}

export function casosDeEvaluacion(permisos: readonly string[], zonaHoraria: string) {
  const sql = baseDeDatos();
  const d = {
    repositorio: new EvaluacionesPostgres(sql),
    autorizacion: autorizacionConPermisos(permisos),
    auditoria: new AuditoriaPostgres(sql),
    reloj: relojDelSistema,
    ids: idsAleatorios,
    claves: argon2id,
    intentos: new IntentosPostgres(sql),
    zonaHoraria,
  };
  return {
    repositorio: d.repositorio,
    consultas: new ConsultasEvaluacion(sql),
    definirPin: new DefinirPin(d),
    iniciar: new IniciarEvaluacion(d),
    chequeo: new RegistrarChequeo(d),
    captura: new GuardarCaptura(d),
    rubrica: new GuardarRubrica(d),
    cerrar: new CerrarEvaluacion(d),
    anular: new AnularEvaluacion(d),
    reiniciar: new ReiniciarPuntoDePartida(d),
  };
}

export function casosDeBiblioteca(permisos: readonly string[], zonaHoraria: string) {
  const sql = baseDeDatos();
  const d = {
    repositorio: new BibliotecaPostgres(sql),
    autorizacion: autorizacionConPermisos(permisos),
    auditoria: new AuditoriaPostgres(sql),
    reloj: relojDelSistema,
    ids: idsAleatorios,
    zonaHoraria,
  };
  return {
    repositorio: d.repositorio,
    consultas: new ConsultasBiblioteca(sql),
    proponer: new ProponerEjercicio(d),
    formalizar: new FormalizarEjercicio(d),
    fusionar: new FusionarEjercicio(d),
    darAcceso: new DarAccesoBiblioteca(d),
    guardarRutina: new GuardarRutina(d),
    guardarPlan: new GuardarPlanDeTrabajo(d),
    mantenerPlan: new MantenerPlan(d),
    revisarPlan: new RevisarPlan(d),
  };
}

export function casosDeNovedades(permisos: readonly string[]) {
  const sql = baseDeDatos();
  const d = {
    repositorio: new NovedadesPostgres(sql),
    autorizacion: autorizacionConPermisos(permisos),
    auditoria: new AuditoriaPostgres(sql),
    reloj: relojDelSistema,
    ids: idsAleatorios,
  };
  return {
    consultas: new ConsultasNovedades(sql),
    publicar: new Publicar(d),
    archivar: new Archivar(d),
    inscribirse: new Inscribirse(d),
    cancelar: new CancelarInscripcion(d),
  };
}

export function casosDeSolicitudesCoach(permisos: readonly string[] = []) {
  const sql = baseDeDatos();
  const repositorio = new SolicitudesCoachPostgres(sql);
  const autorizacion = autorizacionConPermisos(permisos);
  const auditoria = new AuditoriaPostgres(sql);
  return {
    repositorio,
    aplicar: new AplicarComoCoach({ repositorio, reloj: relojDelSistema, ids: idsAleatorios }),
    atender: new AtenderSolicitudCoach({
      repositorio,
      agregar: new AgregarMiembro({ cuentas: new CuentasPostgres(sql), autorizacion, auditoria, ids: idsAleatorios }),
      autorizacion,
      auditoria,
      reloj: relojDelSistema,
    }),
  };
}

export function casosDeSolicitudes(permisos: readonly string[] = []) {
  const sql = baseDeDatos();
  const repositorio = new SolicitudesPostgres(sql);
  return {
    repositorio,
    solicitar: new SolicitarClaseDePrueba({ repositorio, reloj: relojDelSistema, ids: idsAleatorios }),
    atender: new AtenderSolicitud({ repositorio, autorizacion: autorizacionConPermisos(permisos), auditoria: new AuditoriaPostgres(sql), reloj: relojDelSistema }),
  };
}

export const huellaDe = (token: string) => tokensAleatorios.huella(token);

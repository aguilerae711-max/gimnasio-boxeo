import type { PerfilClienteVisible } from "@/modules/operacion/infrastructure/OperacionPostgres";
import { Formulario } from "../../_ui/Formulario";
import { Campo } from "../../_ui/piezas";
import { guardarPerfilCliente } from "./acciones";

/** Formulario del perfil del cliente; lo comparten el propio cliente y la administración. */
export function FormularioPerfilCliente({ clienteId, perfil }: { clienteId: string; perfil: PerfilClienteVisible }) {
  return (
    <Formulario accion={guardarPerfilCliente} boton="Guardar perfil">
      <input type="hidden" name="clienteId" value={clienteId} />
      <Campo etiqueta="Fecha de nacimiento" name="fechaNacimiento" type="date" defaultValue={perfil.fechaNacimiento ?? ""} />
      <Campo
        etiqueta="Contacto de emergencia"
        name="contactoEmergencia"
        placeholder="Nombre y teléfono"
        maxLength={120}
        defaultValue={perfil.contactoEmergencia ?? ""}
      />
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-[#c9ccd3]">Notas médicas</span>
        <textarea
          name="notasMedicas"
          rows={3}
          maxLength={500}
          defaultValue={perfil.notasMedicas ?? ""}
          placeholder="Lesiones, alergias, condiciones que tu coach deba saber"
          className="rounded-xl border border-[#2a2d36] bg-[#23262e] px-4 py-3 text-base text-texto outline-none placeholder:text-[#6b7080] focus:border-acento"
        />
        <span className="text-xs text-texto-suave">Se guardan cifradas. Solo las ven tu coach y la administración.</span>
      </label>
    </Formulario>
  );
}

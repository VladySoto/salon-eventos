import { useState } from 'react'
import { ESTADOS_EVENTO, TIPOS_EVENTO } from '../../constants'
import Modal from '../../components/ui/Modal'
import Campo, { Entrada, Selector, AreaTexto } from '../../components/ui/Campo'
import Boton from '../../components/ui/Boton'

const MAYUSCULA_INICIAL = /\b\w/g

// El contenedor le pasa el evento tal como está guardado; aquí se edita una copia.
function ModalEditarEvento({ evento, guardando, onGuardar, onEliminar, onCerrar }) {
  const [editando, setEditando] = useState(() => ({ ...evento, clientes: { ...evento.clientes } }))

  function handleChange(e) {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setEditando({ ...editando, [e.target.name]: value })
  }

  function cambiarCliente(campo, valor) {
    setEditando({ ...editando, clientes: { ...editando.clientes, [campo]: valor } })
  }

  return (
    <Modal titulo="Editar evento" ancho="lg" onCerrar={onCerrar}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Campo etiqueta="Nombre">
          <Entrada type="text" value={editando.clientes?.nombre || ''} onChange={e => cambiarCliente('nombre', e.target.value.replace(MAYUSCULA_INICIAL, l => l.toUpperCase()))} autoCapitalize="words" />
        </Campo>
        <Campo etiqueta="CI / NIT">
          <Entrada type="tel" inputMode="numeric" value={editando.clientes?.ci_nit || ''} onChange={e => cambiarCliente('ci_nit', e.target.value)} />
        </Campo>
        <Campo etiqueta="Teléfono 1">
          <Entrada type="tel" inputMode="numeric" value={editando.clientes?.telefono || ''} onChange={e => cambiarCliente('telefono', e.target.value)} />
        </Campo>
        <Campo etiqueta="Teléfono 2">
          <Entrada type="tel" inputMode="numeric" value={editando.clientes?.telefono2 || ''} onChange={e => cambiarCliente('telefono2', e.target.value)} />
        </Campo>
        <Campo etiqueta="Tipo de evento">
          <Selector name="tipo_evento" value={editando.tipo_evento} onChange={handleChange}>
            <option value="">Seleccioná</option>
            {TIPOS_EVENTO.map(t => <option key={t.valor} value={t.valor}>{t.etiqueta}</option>)}
          </Selector>
        </Campo>
        <Campo etiqueta="Estado">
          <Selector name="estado" value={editando.estado} onChange={handleChange}>
            <option value={ESTADOS_EVENTO.RESERVADO}>Reservado</option>
            <option value={ESTADOS_EVENTO.COMPLETADO}>Completado</option>
          </Selector>
        </Campo>
        <Campo etiqueta="Fecha inicio">
          <Entrada type="date" name="fecha" value={editando.fecha} onChange={handleChange} />
        </Campo>
        <Campo etiqueta="Fecha fin (opcional)">
          <Entrada type="date" name="fecha_fin" value={editando.fecha_fin || ''} onChange={handleChange} />
        </Campo>
        <Campo etiqueta="Adelanto (Bs.)">
          <Entrada type="number" min="0" step="0.01" name="adelanto" value={editando.adelanto} onChange={handleChange} />
          {Number(editando.adelanto) !== Number(evento.adelanto) && (
            <p className="text-xs text-gray-500 mt-1">El cambio queda registrado como una corrección con la fecha de hoy.</p>
          )}
        </Campo>
        <Campo etiqueta="Saldo pendiente (Bs.)">
          <Entrada type="number" min="0" step="0.01" name="saldo_pendiente" value={editando.saldo_pendiente} onChange={handleChange} />
          {Number(editando.saldo_pendiente) < Number(evento.saldo_pendiente) && (
            <p className="text-xs text-yellow-700 mt-1">Bajaste el saldo. Si el cliente pagó, cancelá y usá el botón 💵 Cobrar de la tarjeta para que cuente como ingreso.</p>
          )}
        </Campo>
        <Campo etiqueta="Observaciones" className="col-span-1 md:col-span-2">
          <AreaTexto name="observaciones" value={editando.observaciones || ''} onChange={handleChange} rows={2} />
        </Campo>
      </div>

      <Boton variante="peligro" onClick={onEliminar} className="w-full mt-6">Eliminar evento</Boton>
      <div className="flex gap-3 mt-3">
        <Boton variante="secundario" onClick={onCerrar} className="flex-1">Cancelar</Boton>
        <Boton cargando={guardando} onClick={() => onGuardar(editando)} className="flex-1">Guardar</Boton>
      </div>
    </Modal>
  )
}

export default ModalEditarEvento

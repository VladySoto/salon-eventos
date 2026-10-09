import { useState } from 'react'
import { DIAS_PLAZO_GARANTIA } from '../../constants'
import { sumarDiasISO, formatearFecha } from '../../utils/fechas'
import Modal from '../../components/ui/Modal'
import Campo, { Entrada, AreaTexto } from '../../components/ui/Campo'
import Boton from '../../components/ui/Boton'
import CampoCantidad from '../../components/CampoCantidad'

function formVacio() {
  return {
    cajas_llevadas: '',
    botellas_llevadas: '',
    monto_garantia: '',
    fecha_limite: sumarDiasISO(DIAS_PLAZO_GARANTIA),
    observaciones: ''
  }
}

// onRegistrar(form) devuelve una promesa; el contenedor cierra el modal si se guardó.
function ModalGarantia({ evento, guardando, onRegistrar, onCerrar }) {
  const [form, setForm] = useState(formVacio)

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function handleSubmit(e) {
    e.preventDefault()
    onRegistrar(form)
  }

  return (
    <Modal
      titulo="Nueva garantía"
      subtitulo={<>Evento: <span className="font-medium text-gray-700">{evento.clientes?.nombre} — {formatearFecha(evento.fecha)}</span></>}
      onCerrar={onCerrar}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Campo etiqueta="Cajas llevadas">
            <CampoCantidad name="cajas_llevadas" value={form.cajas_llevadas} onChange={handleChange} placeholder="0" />
          </Campo>
          <Campo etiqueta="Botellas llevadas">
            <CampoCantidad name="botellas_llevadas" value={form.botellas_llevadas} onChange={handleChange} placeholder="0" />
          </Campo>
          <Campo etiqueta="Monto garantía (Bs.)">
            <Entrada type="number" min="0" step="0.01" name="monto_garantia" value={form.monto_garantia} onChange={handleChange} placeholder="Ej: 500" required />
          </Campo>
          <Campo etiqueta="Fecha límite">
            <Entrada type="date" name="fecha_limite" value={form.fecha_limite} onChange={handleChange} required />
          </Campo>
        </div>
        <Campo etiqueta="Observaciones">
          <AreaTexto name="observaciones" value={form.observaciones} onChange={handleChange} placeholder="Notas..." rows={2} />
        </Campo>
        <div className="flex gap-3">
          <Boton variante="secundario" onClick={onCerrar} className="flex-1">Cancelar</Boton>
          <Boton variante="morado" type="submit" cargando={guardando} textoCargando="Guardando..." className="flex-1">Registrar</Boton>
        </div>
      </form>
    </Modal>
  )
}

export default ModalGarantia

import { useState } from 'react'
import Modal from '../../components/ui/Modal'
import Campo, { Entrada } from '../../components/ui/Campo'
import Boton from '../../components/ui/Boton'
import { formatearFecha } from '../../utils/fechas'

const bs = numero => `Bs. ${Number(numero).toFixed(2)}`

// Cobra todo o parte del saldo de un evento. onCobrar(monto, nota) devuelve una promesa.
function ModalPago({ evento, guardando, onCobrar, onCerrar }) {
  const saldo = Number(evento.saldo_pendiente) || 0
  const [monto, setMonto] = useState(String(saldo))
  const [nota, setNota] = useState('')

  const valor = parseFloat(monto)
  const montoValido = valor > 0 && valor <= saldo
  const quedara = montoValido ? saldo - valor : null

  function handleSubmit(e) {
    e.preventDefault()
    if (montoValido) onCobrar(valor, nota)
  }

  return (
    <Modal
      titulo="Cobrar"
      subtitulo={<>{evento.clientes?.nombre} — evento del {formatearFecha(evento.fecha)}</>}
      onCerrar={onCerrar}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 flex justify-between items-center">
          <span className="text-sm text-yellow-700">Saldo pendiente</span>
          <span className="text-lg font-bold text-yellow-700">{bs(saldo)}</span>
        </div>

        <Campo etiqueta="Monto que paga el cliente (Bs.)">
          <Entrada
            type="number"
            min="0"
            step="0.01"
            max={saldo}
            value={monto}
            onChange={e => setMonto(e.target.value)}
            autoFocus
            required
          />
        </Campo>

        <div className="flex gap-2">
          <button type="button" onClick={() => setMonto(String(saldo))} className="bg-blue-50 text-blue-600 px-4 py-3 rounded-xl text-sm font-medium">Todo ({bs(saldo)})</button>
          <button type="button" onClick={() => setMonto(String(saldo / 2))} className="bg-gray-100 text-gray-700 px-4 py-3 rounded-xl text-sm font-medium">La mitad</button>
        </div>

        {valor > saldo && <p role="alert" className="text-sm text-red-600">El monto no puede superar el saldo pendiente.</p>}
        {montoValido && (
          <p className="text-sm text-gray-600">
            {quedara === 0 ? '✓ Con este pago el evento queda totalmente pagado.' : `Después de este pago quedan ${bs(quedara)} por cobrar.`}
          </p>
        )}

        <Campo etiqueta="Nota (opcional)">
          <Entrada type="text" value={nota} onChange={e => setNota(e.target.value)} placeholder="Ej: efectivo, transferencia..." />
        </Campo>

        <div className="flex gap-3">
          <Boton variante="secundario" onClick={onCerrar} className="flex-1">Cancelar</Boton>
          <Boton variante="exito" type="submit" cargando={guardando} disabled={!montoValido} className="flex-1">Registrar pago</Boton>
        </div>
      </form>
    </Modal>
  )
}

export default ModalPago

import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import AvisoCarga from '../../components/AvisoCarga'
import Boton from '../../components/ui/Boton'
import { obtenerEvento } from '../../services/eventosService'
import { etiquetaTipoEvento, ESTADOS_GARANTIA } from '../../constants'
import { fechaLocalISO, formatearFecha, formatearRangoFechas } from '../../utils/fechas'

const bs = numero => `Bs. ${Number(numero || 0).toFixed(2)}`

function Linea({ etiqueta, valor, negrita = false }) {
  return (
    <div className={`flex justify-between gap-4 py-1.5 ${negrita ? 'font-bold text-gray-900 border-t border-gray-300 mt-1 pt-2' : 'text-gray-700'}`}>
      <span>{etiqueta}</span>
      <span>{valor}</span>
    </div>
  )
}

const TEXTO_GARANTIA = {
  [ESTADOS_GARANTIA.PENDIENTE]: 'pendiente de devolución',
  [ESTADOS_GARANTIA.DEVUELTA]: 'devuelta',
  [ESTADOS_GARANTIA.EJECUTADA]: 'no devuelta a tiempo'
}

// Recibo o comprobante de un evento. Se imprime o se guarda como PDF desde el navegador.
function Recibo() {
  const { eventoId } = useParams()
  const [evento, setEvento] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState(false)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let activo = true
    obtenerEvento(eventoId)
      .then(({ data, error }) => {
        if (!activo) return
        if (error || !data) setErrorCarga(true)
        else setEvento(data)
        setCargando(false)
      })
      .catch(() => {
        if (!activo) return
        setErrorCarga(true)
        setCargando(false)
      })
    return () => { activo = false }
  }, [eventoId, intento])

  function reintentar() {
    setCargando(true)
    setErrorCarga(false)
    setIntento(n => n + 1)
  }

  const tieneTotal = evento?.monto_total != null
  const total = tieneTotal ? Number(evento.monto_total) + Number(evento.monto_lavado || 0) : null
  const titulo = evento?.pagado ? 'RECIBO DE PAGO' : 'COMPROBANTE DE RESERVA'

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-wrap gap-3 mb-4 print:hidden">
        <Link to="/alquiler" className="bg-gray-100 text-gray-700 px-4 py-3 rounded-xl text-sm font-medium">‹ Volver</Link>
        <Boton onClick={() => window.print()} disabled={!evento}>🖨️ Imprimir / Guardar PDF</Boton>
      </div>

      <AvisoCarga cargando={cargando} error={errorCarga} onReintentar={reintentar} texto="Cargando recibo..." />

      {evento && (
        <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-xl p-6 md:p-8 text-sm print:border-0 print:p-0 print:max-w-none">
          <div className="text-center border-b border-gray-300 pb-4 mb-4">
            <p className="text-2xl font-bold text-gray-900 tracking-wide">REY ILLAMPU</p>
            <p className="text-gray-600">Salón de eventos — El Alto, La Paz</p>
            <p className="mt-3 text-base font-semibold text-gray-800">{titulo}</p>
            <p className="text-gray-500">N.º {evento.id.slice(0, 8).toUpperCase()} · Emitido el {formatearFecha(fechaLocalISO())}</p>
          </div>

          <div className="mb-4">
            <p className="font-semibold text-gray-800 mb-1">Cliente</p>
            <p className="text-gray-700">{evento.clientes?.nombre}</p>
            {evento.clientes?.ci_nit && <p className="text-gray-600">CI / NIT: {evento.clientes.ci_nit}</p>}
            <p className="text-gray-600">Teléfono: {evento.clientes?.telefono}{evento.clientes?.telefono2 ? ` / ${evento.clientes.telefono2}` : ''}</p>
          </div>

          <div className="mb-4">
            <p className="font-semibold text-gray-800 mb-1">Evento</p>
            <p className="text-gray-700">{etiquetaTipoEvento(evento.tipo_evento)}</p>
            <p className="text-gray-600">Fecha: {formatearRangoFechas(evento.fecha, evento.fecha_fin)}</p>
            {evento.observaciones && <p className="text-gray-600">Notas: {evento.observaciones}</p>}
          </div>

          <div className="mb-4">
            <p className="font-semibold text-gray-800 mb-1">Detalle de pago</p>
            {tieneTotal && (
              <>
                <Linea etiqueta="Alquiler del salón" valor={bs(evento.monto_total)} />
                {Number(evento.monto_lavado) > 0 && <Linea etiqueta="Servicio de lavado" valor={bs(evento.monto_lavado)} />}
                <Linea etiqueta="Total" valor={bs(total)} negrita />
              </>
            )}
            <Linea etiqueta="Adelanto recibido" valor={bs(evento.adelanto)} />
            {evento.pagado && Number(evento.monto_saldo_cobrado) > 0 && (
              <Linea etiqueta={`Saldo cobrado el ${formatearFecha(evento.fecha_pago)}`} valor={bs(evento.monto_saldo_cobrado)} />
            )}
            <Linea
              etiqueta="Saldo pendiente"
              valor={Number(evento.saldo_pendiente) > 0 ? bs(evento.saldo_pendiente) : 'Cancelado'}
              negrita
            />
            {!tieneTotal && <p className="text-xs text-gray-400 mt-1">Este evento se registró antes de guardar el monto total del alquiler.</p>}
          </div>

          {(evento.garantias || []).length > 0 && (
            <div className="mb-4">
              <p className="font-semibold text-gray-800 mb-1">Garantía</p>
              {evento.garantias.map(g => {
                const llevado = []
                if (g.cajas_llevadas > 0) llevado.push(`${g.cajas_llevadas} cajas`)
                if (g.botellas_llevadas > 0) llevado.push(`${g.botellas_llevadas} botellas`)
                return (
                  <div key={g.id} className="text-gray-700 mb-2">
                    <p>{bs(g.monto_garantia)}{llevado.length > 0 ? ` · ${llevado.join(' y ')}` : ''}</p>
                    <p className="text-gray-500">Devolver hasta el {formatearFecha(g.fecha_limite)} — {TEXTO_GARANTIA[g.estado]}</p>
                  </div>
                )
              })}
            </div>
          )}

          <div className="grid grid-cols-2 gap-8 mt-12 pt-2 text-center text-gray-600">
            <div className="border-t border-gray-400 pt-2">Firma del salón</div>
            <div className="border-t border-gray-400 pt-2">Firma del cliente</div>
          </div>
          <p className="text-center text-gray-400 text-xs mt-6">Gracias por su preferencia.</p>
        </div>
      )}
    </div>
  )
}

export default Recibo

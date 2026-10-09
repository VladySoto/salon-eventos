import { Link } from 'react-router-dom'
import { ESTADOS_EVENTO, etiquetaTipoEvento } from '../../constants'
import { formatearRangoFechas } from '../../utils/fechas'
import GarantiasEvento from './GarantiasEvento'

function TarjetaEvento({ evento: e, hoy, onPagado, onGarantia, onEditar, onDevolverGarantia, onEliminarGarantia }) {
  const completado = e.estado === ESTADOS_EVENTO.COMPLETADO
  const tieneSaldo = Number(e.saldo_pendiente) > 0

  return (
    <div className={`border rounded-xl overflow-hidden ${completado ? 'border-green-200' : tieneSaldo ? 'border-yellow-200' : 'border-gray-200'}`}>
      <div className={`p-4 ${completado ? 'bg-green-50' : tieneSaldo ? 'bg-yellow-50' : 'bg-white'}`}>
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="font-medium text-gray-800">{e.clientes?.nombre}</p>
            <p className="text-sm text-gray-600 mt-0.5">{etiquetaTipoEvento(e.tipo_evento)} — {formatearRangoFechas(e.fecha, e.fecha_fin)}</p>
            <p className="text-sm text-gray-600">📞 {e.clientes?.telefono}{e.clientes?.telefono2 ? ` / ${e.clientes.telefono2}` : ''}</p>
            {e.clientes?.ci_nit && <p className="text-sm text-gray-500">CI: {e.clientes.ci_nit}</p>}
            {e.observaciones && <p className="text-sm text-gray-500 mt-1 italic">{e.observaciones}</p>}
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${completado ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {completado ? '✓ Completado' : '⏳ Reservado'}
            </span>
            {e.pagado && <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-700">💰 Pagado</span>}
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center pt-3 border-t border-gray-100">
          <div>
            {e.monto_total != null && (
              <p className="text-sm text-gray-600">Total: <span className="font-medium text-gray-700">Bs. {(Number(e.monto_total) + Number(e.monto_lavado || 0)).toFixed(2)}</span>{Number(e.monto_lavado) > 0 && <span> (incl. lavado Bs. {Number(e.monto_lavado).toFixed(2)})</span>}</p>
            )}
            <p className="text-sm text-gray-600">Adelanto: <span className="font-medium text-gray-700">Bs. {Number(e.adelanto).toFixed(2)}</span></p>
            <p className="text-sm text-gray-600">Saldo: <span className={`font-medium ${tieneSaldo ? 'text-yellow-700' : 'text-green-600'}`}>Bs. {Number(e.saldo_pendiente).toFixed(2)}</span></p>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {tieneSaldo && (
              <button onClick={() => onPagado(e)} className="bg-green-600 text-white px-4 py-3 rounded-xl text-sm font-medium">Pagado</button>
            )}
            <button onClick={() => onGarantia(e)} className="bg-purple-50 text-purple-600 px-4 py-3 rounded-xl text-sm font-medium">+ Garantía</button>
            <Link to={`/inventario/evento/${e.id}`} className="bg-indigo-50 text-indigo-600 px-4 py-3 rounded-xl text-sm font-medium">📋 Inventario</Link>
            <button onClick={() => onEditar(e)} className="bg-blue-50 text-blue-600 px-4 py-3 rounded-xl text-sm font-medium">Editar</button>
          </div>
        </div>
      </div>

      <GarantiasEvento garantias={e.garantias || []} hoy={hoy} onDevolver={onDevolverGarantia} onEliminar={onEliminarGarantia} />
    </div>
  )
}

export default TarjetaEvento

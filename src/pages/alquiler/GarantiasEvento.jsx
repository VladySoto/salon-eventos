import { ESTADOS_GARANTIA } from '../../constants'
import { formatearFecha } from '../../utils/fechas'
import { diasRestantesGarantia } from '../../utils/calculos'

const ESTILOS_FONDO = {
  [ESTADOS_GARANTIA.DEVUELTA]: 'bg-green-50 border-green-200',
  [ESTADOS_GARANTIA.EJECUTADA]: 'bg-red-50 border-red-200',
  [ESTADOS_GARANTIA.PENDIENTE]: 'bg-white border-orange-200'
}

const ESTILOS_ETIQUETA = {
  [ESTADOS_GARANTIA.DEVUELTA]: 'bg-green-100 text-green-700',
  [ESTADOS_GARANTIA.EJECUTADA]: 'bg-red-100 text-red-700',
  [ESTADOS_GARANTIA.PENDIENTE]: 'bg-orange-100 text-orange-700'
}

const TEXTOS_ETIQUETA = {
  [ESTADOS_GARANTIA.DEVUELTA]: '✓ Devuelta',
  [ESTADOS_GARANTIA.EJECUTADA]: '⚡ Ejecutada',
  [ESTADOS_GARANTIA.PENDIENTE]: '⏳ Pendiente'
}

function GarantiasEvento({ garantias, hoy, onDevolver, onEliminar }) {
  if (garantias.length === 0) return null
  const pendientes = garantias.filter(g => g.estado === ESTADOS_GARANTIA.PENDIENTE)

  return (
    <div className="border-t border-gray-100 bg-gray-50 p-3">
      <p className="text-xs font-medium text-gray-500 mb-2">
        🛡️ Garantías {pendientes.length > 0 && <span className="text-orange-500">({pendientes.length} pendiente{pendientes.length > 1 ? 's' : ''})</span>}
      </p>
      <div className="flex flex-col gap-2">
        {garantias.map(g => {
          const dias = diasRestantesGarantia(g.fecha_limite, hoy)
          return (
            <div key={g.id} className={`rounded-lg p-3 border ${ESTILOS_FONDO[g.estado]}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex gap-3 text-sm text-gray-600">
                    {g.cajas_llevadas > 0 && <span>📦 {g.cajas_llevadas} cajas</span>}
                    {g.botellas_llevadas > 0 && <span>🍾 {g.botellas_llevadas} botellas</span>}
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">Garantía: <span className="font-medium">Bs. {Number(g.monto_garantia).toFixed(2)}</span></p>
                  <p className="text-sm text-gray-500">Límite: {formatearFecha(g.fecha_limite)}</p>
                  {g.estado === ESTADOS_GARANTIA.PENDIENTE && <p className={`text-sm font-medium ${dias.color}`}>{dias.texto}</p>}
                  {g.observaciones && <p className="text-sm text-gray-500 italic">{g.observaciones}</p>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTILOS_ETIQUETA[g.estado]}`}>
                    {TEXTOS_ETIQUETA[g.estado]}
                  </span>
                  <div className="flex gap-2">
                    {g.estado === ESTADOS_GARANTIA.PENDIENTE && (
                      <button onClick={() => onDevolver(g.id)} aria-label="Marcar devuelta" className="bg-green-600 text-white w-11 h-11 rounded-lg text-base">✓</button>
                    )}
                    <button onClick={() => onEliminar(g.id)} aria-label="Eliminar garantía" className="bg-red-50 text-red-500 w-11 h-11 rounded-lg text-base">✕</button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default GarantiasEvento

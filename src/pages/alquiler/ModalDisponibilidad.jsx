import { useState } from 'react'
import Modal from '../../components/ui/Modal'
import { MESES, aFechaISO, diasDelMes, fechaLocalISO, formatearRangoFechas } from '../../utils/fechas'
import { eventoBloqueaFecha, eventoOcupaFecha } from '../../utils/calculos'

const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

// Calendario para elegir una fecha libre. Los días ocupados salen en rojo y los pasados no se pueden elegir.
function ModalDisponibilidad({ eventos, fechaActual, onElegir, onCerrar }) {
  const hoy = fechaLocalISO()
  const inicial = fechaActual ? new Date(`${fechaActual}T00:00:00`) : new Date()
  const [anio, setAnio] = useState(inicial.getFullYear())
  const [mes, setMes] = useState(inicial.getMonth())

  function cambiarMes(cambio) {
    const nuevo = mes + cambio
    if (nuevo < 0) { setMes(11); setAnio(a => a - 1) }
    else if (nuevo > 11) { setMes(0); setAnio(a => a + 1) }
    else setMes(nuevo)
  }

  const bloqueantes = eventos.filter(e => eventoBloqueaFecha(e, hoy))
  const prefijoMes = aFechaISO(anio, mes, 1).slice(0, 7)
  const ocupadosDelMes = bloqueantes.filter(e => e.fecha.slice(0, 7) === prefijoMes || (e.fecha_fin || '').slice(0, 7) === prefijoMes)

  const clasesFlecha = 'border border-gray-200 rounded-lg text-gray-500 w-11 h-11 text-lg'

  return (
    <Modal titulo="Fechas libres" subtitulo="Tocá un día libre para elegirlo." onCerrar={onCerrar}>
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={() => cambiarMes(-1)} aria-label="Mes anterior" className={clasesFlecha}>‹</button>
        <p className="font-semibold text-gray-700">{MESES[mes]} {anio}</p>
        <button type="button" onClick={() => cambiarMes(1)} aria-label="Mes siguiente" className={clasesFlecha}>›</button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-3">
        {DIAS_SEMANA.map((d, i) => <div key={i} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>)}
        {diasDelMes(anio, mes).map((dia, i) => {
          if (!dia) return <div key={i} />
          const fecha = aFechaISO(anio, mes, dia)
          const ocupadoPor = bloqueantes.filter(e => eventoOcupaFecha(e, fecha))
          const pasado = fecha < hoy
          const base = 'w-full h-11 rounded-lg text-sm flex items-center justify-center'

          if (ocupadoPor.length > 0) {
            return <div key={i} title={ocupadoPor.map(e => e.clientes?.nombre).join(', ')} className={`${base} bg-red-100 text-red-700 font-medium`}>{dia}</div>
          }
          if (pasado) return <div key={i} className={`${base} text-gray-300`}>{dia}</div>
          return (
            <button
              key={i}
              type="button"
              onClick={() => onElegir(fecha)}
              className={`${base} border ${fecha === fechaActual ? 'bg-blue-600 border-blue-600 text-white font-medium' : 'bg-green-50 border-green-200 text-green-800'}`}
            >
              {dia}
            </button>
          )
        })}
      </div>

      <div className="flex gap-4 text-xs text-gray-500 mb-4">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-100 border border-green-200" />Libre</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-100" />Ocupado</span>
      </div>

      {ocupadosDelMes.length > 0 && (
        <div className="border-t border-gray-100 pt-3">
          <p className="text-sm font-medium text-gray-700 mb-2">Ocupado este mes</p>
          <ul className="flex flex-col gap-1">
            {ocupadosDelMes.map(e => (
              <li key={e.id} className="text-sm text-gray-600">{formatearRangoFechas(e.fecha, e.fecha_fin)} — {e.clientes?.nombre}</li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  )
}

export default ModalDisponibilidad

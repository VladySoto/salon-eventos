import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS_SEMANA = ['L','M','M','J','V','S','D']

function obtenerDiasSemana(year, month) {
  const dias = []
  const primerDia = new Date(year, month, 1).getDay()
  const offset = primerDia === 0 ? 6 : primerDia - 1
  const totalDias = new Date(year, month + 1, 0).getDate()
  for (let i = 0; i < offset; i++) dias.push(null)
  for (let i = 1; i <= totalDias; i++) dias.push(i)
  return dias
}

function Dashboard() {
  const [compras, setCompras] = useState([])
  const [cajas, setCajas] = useState([])
  const [eventos, setEventos] = useState([])
  const [eventoSeleccionado, setEventoSeleccionado] = useState(null)
  const [anio, setAnio] = useState(new Date().getFullYear())

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    const [{ data: comprasData }, { data: cajasData }, { data: eventosData }] = await Promise.all([
      supabase.from('compras_cerveza').select('*'),
      supabase.from('cajas_vacias').select('*'),
      supabase.from('eventos').select('*, clientes(nombre, telefono, telefono2, ci_nit)')
    ])
    if (comprasData) setCompras(comprasData)
    if (cajasData) setCajas(cajasData)
    if (eventosData) setEventos(eventosData)
  }

  const hoy = new Date()
  const hoyStr = hoy.toISOString().split('T')[0]
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0]

  const deudaDistribuidor = compras.reduce((acc, c) => acc + Number(c.deuda_pendiente), 0)
  const totalDebe = cajas.filter(c => c.tipo === 'debe').reduce((acc, c) => acc + Number(c.cajas_recibidas), 0)
  const totalDevuelto = cajas.filter(c => c.tipo === 'devolucion').reduce((acc, c) => acc + Number(c.cajas_recibidas), 0)
  const cajasPendientes = totalDebe - totalDevuelto
  const eventosProximos = eventos.filter(e => e.fecha >= hoyStr && e.estado === 'reservado')
  const eventosEsteMes = eventos.filter(e => e.fecha >= inicioMes && e.estado === 'completado')
  const saldoPendienteTotal = eventos.filter(e => e.estado === 'reservado').reduce((acc, e) => acc + Number(e.saldo_pendiente), 0)
  const gananciasEsteMes = eventos.filter(e => e.fecha >= inicioMes).reduce((acc, e) => acc + Number(e.adelanto), 0)

  function obtenerEventosDia(year, month, day) {
    const fecha = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return eventos.filter(e => {
      if (!e.fecha) return false
      if (e.fecha_fin) return fecha >= e.fecha && fecha <= e.fecha_fin
      return e.fecha === fecha
    })
  }

  function handleClickDia(year, month, day) {
    const evs = obtenerEventosDia(year, month, day)
    if (evs.length > 0) setEventoSeleccionado(evs[0])
  }

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-xl md:text-2xl font-bold text-gray-800">Dashboard</h1>
      <p className="text-gray-500 mt-1 mb-4 text-sm">Resumen general del negocio</p>

      {/* Alertas */}
      {(deudaDistribuidor > 0 || cajasPendientes > 100 || saldoPendienteTotal > 0) && (
        <div className="mb-4 flex flex-col gap-2">
          {deudaDistribuidor > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
              <span className="mt-0.5">⚠️</span>
              <p className="text-sm text-red-700">Deuda de <strong>Bs. {deudaDistribuidor.toFixed(2)}</strong> con el distribuidor</p>
            </div>
          )}
          {cajasPendientes > 100 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-start gap-3">
              <span className="mt-0.5">📦</span>
              <p className="text-sm text-orange-700"><strong>{cajasPendientes} cajas vacías</strong> pendientes</p>
            </div>
          )}
          {saldoPendienteTotal > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 flex items-start gap-3">
              <span className="mt-0.5">💰</span>
              <p className="text-sm text-yellow-700"><strong>Bs. {saldoPendienteTotal.toFixed(2)}</strong> en saldos pendientes</p>
            </div>
          )}
        </div>
      )}

      {/* Calendario anual */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <h2 className="text-base font-semibold text-gray-700">Calendario {anio}</h2>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-3">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-green-600"></div><span className="text-xs text-gray-500">Completado</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-yellow-500"></div><span className="text-xs text-gray-500">Pendiente</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div><span className="text-xs text-gray-500">Hoy</span></div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setAnio(a => a - 1)} className="border border-gray-200 rounded-lg w-7 h-7 text-sm text-gray-500 hover:bg-gray-50">‹</button>
              <button onClick={() => setAnio(a => a + 1)} className="border border-gray-200 rounded-lg w-7 h-7 text-sm text-gray-500 hover:bg-gray-50">›</button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {MESES.map((mes, mesIdx) => {
            const dias = obtenerDiasSemana(anio, mesIdx)
            return (
              <div key={mesIdx}>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">{mes}</p>
                <div className="grid grid-cols-7 gap-px">
                  {DIAS_SEMANA.map((d, i) => (
                    <div key={i} className="text-center text-gray-300 font-medium" style={{ fontSize: '9px', padding: '1px 0' }}>{d}</div>
                  ))}
                  {dias.map((dia, i) => {
                    if (!dia) return <div key={i}></div>
                    const evsDelDia = obtenerEventosDia(anio, mesIdx, dia)
                    const esHoy = anio === hoy.getFullYear() && mesIdx === hoy.getMonth() && dia === hoy.getDate()
                    const tieneCompletado = evsDelDia.some(e => e.estado === 'completado')
                    const tienePendiente = evsDelDia.some(e => e.estado === 'reservado')
                    const tieneEvento = evsDelDia.length > 0
                    let clase = 'text-center cursor-pointer rounded hover:bg-gray-100 transition-colors text-gray-600'
                    let estilo = { fontSize: '10px', padding: '2px 1px' }
                    if (esHoy) {
                      clase = 'text-center cursor-pointer rounded-full bg-blue-600 text-white font-medium'
                      estilo = { fontSize: '10px', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }
                    } else if (tieneCompletado) {
                      clase = 'text-center cursor-pointer rounded bg-green-100 text-green-800 font-medium'
                      estilo = { fontSize: '10px', padding: '2px 1px' }
                    } else if (tienePendiente) {
                      clase = 'text-center cursor-pointer rounded bg-yellow-100 text-yellow-800 font-medium'
                      estilo = { fontSize: '10px', padding: '2px 1px' }
                    }
                    return (
                      <div key={i} className={clase} style={estilo} onClick={() => tieneEvento && handleClickDia(anio, mesIdx, dia)} title={tieneEvento ? evsDelDia.map(e => e.clientes?.nombre).join(', ') : ''}>
                        {dia}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tarjetas */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 md:p-4">
          <p className="text-xs text-red-600 font-medium">Deuda distribuidor</p>
          <p className="text-lg md:text-2xl font-bold text-red-700">Bs. {deudaDistribuidor.toFixed(2)}</p>
        </div>
        <div className={`border rounded-xl p-3 md:p-4 ${cajasPendientes > 100 ? 'bg-orange-50 border-orange-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <p className={`text-xs font-medium ${cajasPendientes > 100 ? 'text-orange-600' : 'text-yellow-600'}`}>Cajas pendientes</p>
          <p className={`text-lg md:text-2xl font-bold ${cajasPendientes > 100 ? 'text-orange-700' : 'text-yellow-700'}`}>{cajasPendientes}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 md:p-4">
          <p className="text-xs text-blue-600 font-medium">Eventos próximos</p>
          <p className="text-lg md:text-2xl font-bold text-blue-700">{eventosProximos.length}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 md:p-4">
          <p className="text-xs text-yellow-600 font-medium">Saldo pendiente</p>
          <p className="text-lg md:text-2xl font-bold text-yellow-700">Bs. {saldoPendienteTotal.toFixed(2)}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 md:p-4">
          <p className="text-xs text-green-600 font-medium">Completados este mes</p>
          <p className="text-lg md:text-2xl font-bold text-green-700">{eventosEsteMes.length}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 md:p-4">
          <p className="text-xs text-purple-600 font-medium">Ingresos este mes</p>
          <p className="text-lg md:text-2xl font-bold text-purple-700">Bs. {gananciasEsteMes.toFixed(2)}</p>
        </div>
      </div>

      {/* Modal */}
      {eventoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-end md:items-center justify-center z-50" onClick={() => setEventoSeleccionado(null)}>
          <div className="bg-white rounded-t-2xl md:rounded-2xl p-6 w-full md:max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-gray-800">Detalle del evento</h3>
              <button onClick={() => setEventoSeleccionado(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between"><span className="text-sm text-gray-500">Cliente</span><span className="text-sm font-medium text-gray-800">{eventoSeleccionado.clientes?.nombre}</span></div>
              <div className="flex justify-between"><span className="text-sm text-gray-500">CI / NIT</span><span className="text-sm text-gray-800">{eventoSeleccionado.clientes?.ci_nit || '—'}</span></div>
              <div className="flex justify-between"><span className="text-sm text-gray-500">Teléfono</span><span className="text-sm text-gray-800">{eventoSeleccionado.clientes?.telefono}</span></div>
              {eventoSeleccionado.clientes?.telefono2 && (
                <div className="flex justify-between"><span className="text-sm text-gray-500">Teléfono 2</span><span className="text-sm text-gray-800">{eventoSeleccionado.clientes.telefono2}</span></div>
              )}
              <div className="flex justify-between"><span className="text-sm text-gray-500">Tipo</span><span className="text-sm text-gray-800">{eventoSeleccionado.tipo_evento}</span></div>
              <div className="flex justify-between"><span className="text-sm text-gray-500">Fecha</span><span className="text-sm text-gray-800">{eventoSeleccionado.fecha}{eventoSeleccionado.fecha_fin ? ` al ${eventoSeleccionado.fecha_fin}` : ''}</span></div>
              <div className="flex justify-between"><span className="text-sm text-gray-500">Adelanto</span><span className="text-sm text-gray-800">Bs. {Number(eventoSeleccionado.adelanto).toFixed(2)}</span></div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Saldo</span>
                <span className={`text-sm font-medium ${Number(eventoSeleccionado.saldo_pendiente) > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                  Bs. {Number(eventoSeleccionado.saldo_pendiente).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Estado</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${eventoSeleccionado.estado === 'completado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {eventoSeleccionado.estado === 'completado' ? 'Completado' : 'Reservado'}
                </span>
              </div>
              {eventoSeleccionado.observaciones && (
                <div className="flex justify-between"><span className="text-sm text-gray-500">Notas</span><span className="text-sm text-gray-800 text-right">{eventoSeleccionado.observaciones}</span></div>
              )}
            </div>
            <button onClick={() => setEventoSeleccionado(null)} className="mt-6 w-full bg-gray-100 text-gray-700 py-2 rounded-xl text-sm font-medium">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
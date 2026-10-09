import { useState, useEffect } from 'react'
import AvisoCarga from '../../components/AvisoCarga'
import Modal from '../../components/ui/Modal'
import Boton from '../../components/ui/Boton'
import { cargarDatosDashboard } from '../../services/dashboardService'
import { fechaLocalISO, formatearRangoFechas } from '../../utils/fechas'
import { UMBRAL_CAJAS_PENDIENTES, ESTADOS_EVENTO, etiquetaTipoEvento } from '../../constants'
import { esEventoProximo, eventoOcupaFecha, sumarSaldosPendientes } from '../../utils/calculos'
import Calendario from './Calendario'
import PanelSemana from './PanelSemana'
import DetalleEvento from './DetalleEvento'

const CANTIDAD_PROXIMOS = 5

function Dashboard() {
  const [datos, setDatos] = useState({ deudaDistribuidor: 0, cajasPendientes: 0, eventos: [] })
  const [eventosDetalle, setEventosDetalle] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState(false)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let activo = true
    cargarDatosDashboard()
      .then(resultado => {
        if (!activo) return
        if (resultado.error) {
          setErrorCarga(true)
        } else {
          setDatos(resultado)
        }
        setCargando(false)
      })
      .catch(() => {
        if (!activo) return
        setErrorCarga(true)
        setCargando(false)
      })
    return () => { activo = false }
  }, [intento])

  function reintentarCarga() {
    setCargando(true)
    setErrorCarga(false)
    setIntento(n => n + 1)
  }

  if (cargando || errorCarga) {
    return (
      <div className="p-4 md:p-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 mt-1 mb-4 text-sm">Resumen general del negocio</p>
        <AvisoCarga cargando={cargando} error={errorCarga} onReintentar={reintentarCarga} texto="Cargando resumen..." />
      </div>
    )
  }

  const { deudaDistribuidor, cajasPendientes, eventos } = datos
  const hoy = fechaLocalISO()
  const mesActual = hoy.slice(0, 7)
  const hayMuchasCajas = cajasPendientes > UMBRAL_CAJAS_PENDIENTES

  const eventosProximos = eventos.filter(e => esEventoProximo(e, hoy))
  const eventosEsteMes = eventos.filter(e => e.fecha.slice(0, 7) === mesActual && e.estado === ESTADOS_EVENTO.COMPLETADO)
  const saldoPendienteTotal = sumarSaldosPendientes(eventos)
  const eventosHoy = eventos.filter(e => eventoOcupaFecha(e, hoy) && e.estado === ESTADOS_EVENTO.RESERVADO && Number(e.saldo_pendiente) > 0)

  // Ingresos del mes: adelantos de reservas hechas este mes + saldos cobrados este mes
  const adelantosEsteMes = eventos.filter(e => e.created_at?.slice(0, 7) === mesActual).reduce((acc, e) => acc + Number(e.adelanto), 0)
  const saldosCobradosEsteMes = eventos.filter(e => e.fecha_pago?.slice(0, 7) === mesActual).reduce((acc, e) => acc + Number(e.monto_saldo_cobrado ?? 0), 0)
  const gananciasEsteMes = adelantosEsteMes + saldosCobradosEsteMes

  function abrirDia(delDia) {
    if (delDia.length > 0) setEventosDetalle(delDia)
  }

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-xl md:text-2xl font-bold text-gray-800">Dashboard</h1>
      <p className="text-gray-500 mt-1 mb-4 text-sm">Resumen general del negocio</p>

      {/* Alertas */}
      <div className="mb-4 flex flex-col gap-2">
        {eventosHoy.map(e => (
          <div key={e.id} className="bg-blue-600 rounded-xl px-4 py-3 flex items-start gap-3">
            <span className="mt-0.5 text-white text-lg">🔔</span>
            <div>
              <p className="text-sm text-white font-medium">Evento hoy — {e.clientes?.nombre}</p>
              <p className="text-xs text-blue-100">Saldo pendiente de cobrar: <strong>Bs. {Number(e.saldo_pendiente).toFixed(2)}</strong></p>
            </div>
          </div>
        ))}
        {deudaDistribuidor > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <span className="mt-0.5">⚠️</span>
            <p className="text-sm text-red-700">Deuda de <strong>Bs. {deudaDistribuidor.toFixed(2)}</strong> con el distribuidor</p>
          </div>
        )}
        {hayMuchasCajas && (
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

      <PanelSemana eventos={eventos} hoy={hoy} />

      <Calendario eventos={eventos} onSeleccionarDia={abrirDia} />

      {/* Próximos eventos */}
      {eventosProximos.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
          <h2 className="text-base font-semibold text-gray-700 mb-3">Próximos eventos</h2>
          <div className="flex flex-col gap-2">
            {eventosProximos.slice(0, CANTIDAD_PROXIMOS).map(e => (
              <button
                key={e.id}
                type="button"
                onClick={() => setEventosDetalle([e])}
                className="flex justify-between items-center gap-3 text-left border border-gray-100 bg-gray-50 rounded-xl px-4 py-3 min-h-[56px]"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">{e.clientes?.nombre}</p>
                  <p className="text-sm text-gray-500">{etiquetaTipoEvento(e.tipo_evento)} — {formatearRangoFechas(e.fecha, e.fecha_fin)}</p>
                </div>
                {Number(e.saldo_pendiente) > 0 && (
                  <span className="text-xs px-2 py-1 rounded-full font-medium bg-yellow-100 text-yellow-700 flex-shrink-0">Saldo Bs. {Number(e.saldo_pendiente).toFixed(0)}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tarjetas */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 md:p-4">
          <p className="text-xs text-red-600 font-medium">Deuda distribuidor</p>
          <p className="text-lg md:text-2xl font-bold text-red-700">Bs. {deudaDistribuidor.toFixed(2)}</p>
        </div>
        <div className={`border rounded-xl p-3 md:p-4 ${hayMuchasCajas ? 'bg-orange-50 border-orange-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <p className={`text-xs font-medium ${hayMuchasCajas ? 'text-orange-600' : 'text-yellow-600'}`}>Cajas pendientes</p>
          <p className={`text-lg md:text-2xl font-bold ${hayMuchasCajas ? 'text-orange-700' : 'text-yellow-700'}`}>{cajasPendientes}</p>
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

      {eventosDetalle && (
        <Modal titulo={eventosDetalle.length > 1 ? `Eventos del día (${eventosDetalle.length})` : 'Detalle del evento'} onCerrar={() => setEventosDetalle(null)}>
          <div className="flex flex-col gap-5">
            {eventosDetalle.map((e, i) => (
              <div key={e.id} className={i > 0 ? 'pt-5 border-t border-gray-100' : ''}>
                <DetalleEvento evento={e} />
              </div>
            ))}
          </div>
          <Boton variante="secundario" onClick={() => setEventosDetalle(null)} className="mt-6 w-full">Cerrar</Boton>
        </Modal>
      )}
    </div>
  )
}

export default Dashboard

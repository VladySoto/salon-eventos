import { useState, useEffect } from 'react'
import Toast from '../../components/Toast'
import AvisoCarga from '../../components/AvisoCarga'
import Boton from '../../components/ui/Boton'
import { Selector } from '../../components/ui/Campo'
import { cargarDatosReporte } from '../../services/reportesService'
import { armarReporte, TEXTO_TIPO_PAGO } from '../../utils/reportes'
import { fechaLocalISO, formatearFecha, formatearMes, formatearRangoFechas, mesesRecientes } from '../../utils/fechas'
import { ESTADOS_EVENTO, etiquetaTipoEvento } from '../../constants'
import { descargarReporteExcel } from './exportarExcel'

function Tarjeta({ titulo, valor, detalle, color }) {
  const colores = {
    azul: 'bg-blue-50 border-blue-200 text-blue-700',
    verde: 'bg-green-50 border-green-200 text-green-700',
    morado: 'bg-purple-50 border-purple-200 text-purple-700',
    amarillo: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    rojo: 'bg-red-50 border-red-200 text-red-700',
    gris: 'bg-gray-50 border-gray-200 text-gray-700'
  }
  return (
    <div className={`border rounded-xl p-3 md:p-4 ${colores[color]}`}>
      <p className="text-xs font-medium opacity-80">{titulo}</p>
      <p className="text-lg md:text-2xl font-bold">{valor}</p>
      {detalle && <p className="text-xs opacity-70 mt-0.5">{detalle}</p>}
    </div>
  )
}

const bs = numero => `Bs. ${Number(numero).toFixed(2)}`

function Reportes() {
  const meses = mesesRecientes(24)
  const [mes, setMes] = useState(() => fechaLocalISO().slice(0, 7))
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState(false)
  const [intento, setIntento] = useState(0)
  const [exportando, setExportando] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    let activo = true
    cargarDatosReporte(mes)
      .then(resultado => {
        if (!activo) return
        if (resultado.error) {
          setErrorCarga(true)
        } else {
          setErrorCarga(false)
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
  }, [mes, intento])

  function cambiarMes(nuevo) {
    setCargando(true)
    setErrorCarga(false)
    setMes(nuevo)
  }

  function reintentar() {
    setCargando(true)
    setErrorCarga(false)
    setIntento(n => n + 1)
  }

  async function exportar() {
    setExportando(true)
    try {
      await descargarReporteExcel(datos, mes)
      setToast({ mensaje: 'Archivo de Excel generado', tipo: 'exito' })
    } catch {
      setToast({ mensaje: 'No se pudo generar el archivo de Excel', tipo: 'error' })
    }
    setExportando(false)
  }

  const reporte = datos && !cargando && !errorCarga ? armarReporte(datos, mes) : null
  const eventosDelMes = reporte ? datos.eventos.filter(e => e.fecha.slice(0, 7) === mes) : []

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-xl md:text-2xl font-bold text-gray-800">Reportes</h1>
      <p className="text-gray-500 mt-1 mb-4 text-sm print:hidden">Resumen del mes para revisar o llevar a Excel</p>

      <div className="flex flex-col md:flex-row gap-3 mb-4 print:hidden">
        <Selector value={mes} onChange={e => cambiarMes(e.target.value)} aria-label="Mes del reporte" className="md:max-w-xs">
          {meses.map(m => <option key={m.valor} value={m.valor}>{m.etiqueta}</option>)}
        </Selector>
        <div className="flex gap-3">
          <Boton variante="exito" onClick={exportar} cargando={exportando} textoCargando="Generando..." disabled={!reporte} className="flex-1 md:flex-none">📥 Descargar Excel</Boton>
          <Boton variante="secundario" onClick={() => window.print()} disabled={!reporte} className="flex-1 md:flex-none">🖨️ Imprimir / PDF</Boton>
        </div>
      </div>

      <AvisoCarga cargando={cargando} error={errorCarga} onReintentar={reintentar} texto="Cargando reporte..." />

      {reporte && (
        <>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Reporte de {formatearMes(mes)} — Rey Illampu</h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <Tarjeta color="azul" titulo="Eventos del mes" valor={reporte.eventos.cantidad} detalle={`${reporte.eventos.completados} completados · ${reporte.eventos.pagados} pagados`} />
            <Tarjeta color="morado" titulo="Ingresos del mes" valor={bs(reporte.ingresos.total)} detalle={`Adelantos ${bs(reporte.ingresos.adelantos)} + saldos ${bs(reporte.ingresos.saldosCobrados)}${reporte.ingresos.correcciones !== 0 ? ` + correcciones ${bs(reporte.ingresos.correcciones)}` : ''}`} />
            <Tarjeta color="gris" titulo="Monto contratado" valor={bs(reporte.eventos.contratado)} detalle={reporte.eventos.sinMonto > 0 ? `${reporte.eventos.sinMonto} evento(s) sin monto registrado` : null} />
            <Tarjeta color="amarillo" titulo="Saldo pendiente" valor={bs(reporte.eventos.saldoPendiente)} detalle="De los eventos del mes" />
            <Tarjeta color="rojo" titulo="Compras de cerveza" valor={bs(reporte.cervezas.totalCompras)} detalle={`${reporte.cervezas.cajasCompradas} cajas · deuda ${bs(reporte.cervezas.deuda)}`} />
            <Tarjeta color="verde" titulo="Cobro por inventario" valor={bs(reporte.inventario.cobroRotoFaltante)} detalle={`${reporte.inventario.itemsRotos} ítems rotos`} />
          </div>

          {Object.keys(reporte.eventos.porTipo).length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
              <h3 className="text-base font-semibold text-gray-700 mb-3">Eventos por tipo</h3>
              <ul className="flex flex-col gap-1">
                {Object.entries(reporte.eventos.porTipo).map(([tipo, cantidad]) => (
                  <li key={tipo} className="flex justify-between text-sm text-gray-700"><span>{tipo}</span><span className="font-medium">{cantidad}</span></li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
            <h3 className="text-base font-semibold text-gray-700 mb-3">Pagos cobrados en el mes</h3>
            {datos.pagos.length === 0 ? (
              <p className="text-sm text-gray-400">No se registraron pagos en este mes.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {datos.pagos.map(p => (
                  <div key={p.id} className="flex justify-between items-start gap-3 border border-gray-100 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{p.descripcion || 'Evento eliminado'}</p>
                      <p className="text-sm text-gray-500">{formatearFecha(p.fecha)} · {TEXTO_TIPO_PAGO[p.tipo]}{p.nota ? ` · ${p.nota}` : ''}</p>
                    </div>
                    <p className={`text-sm font-medium flex-shrink-0 ${Number(p.monto) < 0 ? 'text-red-600' : 'text-green-700'}`}>{bs(p.monto)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
            <h3 className="text-base font-semibold text-gray-700 mb-3">Eventos del mes</h3>
            {eventosDelMes.length === 0 ? (
              <p className="text-sm text-gray-400">No hay eventos en este mes.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {eventosDelMes.map(e => (
                  <div key={e.id} className="flex justify-between items-start gap-3 border border-gray-100 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{e.clientes?.nombre}</p>
                      <p className="text-sm text-gray-500">{etiquetaTipoEvento(e.tipo_evento)} · {formatearRangoFechas(e.fecha, e.fecha_fin)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm text-gray-700">Adelanto {bs(e.adelanto)}</p>
                      <p className={`text-sm font-medium ${Number(e.saldo_pendiente) > 0 ? 'text-yellow-700' : 'text-green-600'}`}>Saldo {bs(e.saldo_pendiente)}</p>
                      <p className="text-xs text-gray-400">{e.estado === ESTADOS_EVENTO.COMPLETADO ? 'Completado' : 'Reservado'}{e.pagado ? ' · Pagado' : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-gray-400">
            Los ingresos suman los pagos cobrados en el mes (adelantos, saldos y correcciones). No cambian si después se edita o se elimina un evento.
          </p>
        </>
      )}

      {toast && <Toast mensaje={toast.mensaje} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}

export default Reportes

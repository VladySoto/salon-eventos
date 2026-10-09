import { Link } from 'react-router-dom'
import { etiquetaTipoEvento } from '../../constants'
import { formatearDiaCorto, formatearRangoFechas, formatearFecha } from '../../utils/fechas'
import { diasRestantesGarantia } from '../../utils/calculos'
import { resumenSemana, DIAS_PANEL_SEMANA } from '../../utils/semana'
import { telefonoParaWhatsApp, enlaceWhatsApp, mensajeCobro, mensajeGarantia } from '../../utils/whatsapp'

function EnlaceWhatsApp({ cliente, mensaje }) {
  const telefono = telefonoParaWhatsApp(cliente)
  if (!telefono) return null
  return (
    <a
      href={enlaceWhatsApp(telefono, mensaje)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Escribir por WhatsApp a ${cliente.nombre}`}
      className="flex-shrink-0 bg-green-50 text-green-700 px-3 py-3 rounded-xl text-sm font-medium"
    >
      📲
    </a>
  )
}

function Seccion({ titulo, children }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">{titulo}</p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}

function Fila({ children }) {
  return <div className="flex items-center justify-between gap-3 border border-gray-100 bg-gray-50 rounded-xl px-4 py-3 min-h-[56px]">{children}</div>
}

// Lo que hay que atender en los próximos 7 días: eventos, cobros y garantías por vencer
function PanelSemana({ eventos, hoy }) {
  const { eventosSemana, cobros, garantias } = resumenSemana(eventos, hoy)
  const hayAlgo = eventosSemana.length > 0 || garantias.length > 0

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
      <h2 className="text-base font-semibold text-gray-700 mb-3">📅 Esta semana</h2>

      {!hayAlgo ? (
        <p className="text-sm text-gray-500">Sin eventos ni garantías por vencer en los próximos {DIAS_PANEL_SEMANA} días ✓</p>
      ) : (
        <div className="flex flex-col gap-4">
          {eventosSemana.length > 0 && (
            <Seccion titulo="Eventos">
              {eventosSemana.map(e => (
                <Fila key={e.id}>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {e.fecha === hoy ? 'Hoy' : formatearDiaCorto(e.fecha)} — {e.clientes?.nombre}
                    </p>
                    <p className="text-sm text-gray-500">{etiquetaTipoEvento(e.tipo_evento)} · {formatearRangoFechas(e.fecha, e.fecha_fin)}</p>
                  </div>
                </Fila>
              ))}
            </Seccion>
          )}

          {cobros.length > 0 && (
            <Seccion titulo="Saldos por cobrar">
              {cobros.map(e => (
                <Fila key={e.id}>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{e.clientes?.nombre}</p>
                    <p className="text-sm text-yellow-700">Bs. {Number(e.saldo_pendiente).toFixed(2)} · evento {formatearDiaCorto(e.fecha)}</p>
                  </div>
                  <EnlaceWhatsApp cliente={e.clientes} mensaje={mensajeCobro(e)} />
                </Fila>
              ))}
            </Seccion>
          )}

          {garantias.length > 0 && (
            <Seccion titulo="Garantías por vencer">
              {garantias.map(({ evento, garantia }) => {
                const plazo = diasRestantesGarantia(garantia.fecha_limite, hoy)
                return (
                  <Fila key={garantia.id}>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{evento.clientes?.nombre}</p>
                      <p className="text-sm text-gray-500">Bs. {Number(garantia.monto_garantia).toFixed(2)} · límite {formatearFecha(garantia.fecha_limite)}</p>
                      <p className={`text-sm font-medium ${plazo.color}`}>{plazo.texto}</p>
                    </div>
                    <EnlaceWhatsApp cliente={evento.clientes} mensaje={mensajeGarantia(evento, garantia)} />
                  </Fila>
                )
              })}
            </Seccion>
          )}
        </div>
      )}

      <Link to="/alquiler" className="inline-block mt-4 text-sm font-medium text-blue-600">Ver todos los eventos ›</Link>
    </div>
  )
}

export default PanelSemana

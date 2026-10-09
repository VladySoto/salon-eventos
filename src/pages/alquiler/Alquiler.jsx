import { useState } from 'react'
import Toast from '../../components/Toast'
import AvisoCarga from '../../components/AvisoCarga'
import { useConfirmar } from '../../hooks/useConfirmar'
import { fechaLocalISO } from '../../utils/fechas'
import { esEventoProximo, sumarSaldosPendientes } from '../../utils/calculos'
import { ESTADOS_EVENTO } from '../../constants'
import { filtrarEventos, ordenarEventos, mesesConEventos } from '../../utils/filtrosEventos'
import {
  registrarReserva,
  marcarEventoPagado,
  guardarEdicionEvento,
  eliminarEvento,
  registrarGarantia,
  marcarGarantiaDevuelta,
  eliminarGarantia
} from '../../services/eventosService'
import { useEventos } from './useEventos'
import FormularioReserva from './FormularioReserva'
import FiltrosEventos from './FiltrosEventos'
import TarjetaEvento from './TarjetaEvento'
import ModalGarantia from './ModalGarantia'
import ModalEditarEvento from './ModalEditarEvento'

function claseTab(activa) {
  return `px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap ${activa ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`
}

function Alquiler() {
  const { eventos, cargando, errorCarga, recargar, reintentar } = useEventos()
  const [tab, setTab] = useState('reservas')
  const [guardando, setGuardando] = useState(false)
  const [eventoEditando, setEventoEditando] = useState(null)
  const [eventoGarantia, setEventoGarantia] = useState(null)
  const [busqueda, setBusqueda] = useState({ texto: '', filtro: 'todos', mes: '' })
  const [toast, setToast] = useState(null)
  const [confirmar, dialogoConfirmacion] = useConfirmar()

  function mostrarToast(mensaje, tipo = 'exito') {
    setToast({ mensaje, tipo })
  }

  // Muestra el aviso de error si el servicio devolvió uno; si no, recarga y muestra el de éxito.
  async function terminar(error, mensajeExito, tipoExito = 'exito') {
    if (error) {
      mostrarToast(error, 'error')
      return false
    }
    await recargar()
    mostrarToast(mensajeExito, tipoExito)
    return true
  }

  async function handleRegistrarReserva(form) {
    setGuardando(true)
    const { error } = await registrarReserva(form)
    setGuardando(false)
    return terminar(error, 'Reserva registrada correctamente')
  }

  async function handlePagado(evento) {
    const saldo = Number(evento.saldo_pendiente) || 0
    const acepta = await confirmar(`¿Marcar el saldo de Bs. ${saldo.toFixed(2)} como pagado?`, { titulo: 'Marcar como pagado', textoConfirmar: 'Sí, pagado', peligro: false })
    if (!acepta) return
    const { error } = await marcarEventoPagado(evento)
    terminar(error, 'Saldo marcado como pagado')
  }

  async function handleGuardarEdicion(editado) {
    setGuardando(true)
    const original = eventos.find(e => e.id === editado.id)
    const { error } = await guardarEdicionEvento(original, editado)
    setGuardando(false)
    if (await terminar(error, 'Evento actualizado correctamente')) setEventoEditando(null)
  }

  async function handleEliminarEvento(evento) {
    const acepta = await confirmar('¿Seguro que querés eliminar este evento?', { titulo: 'Eliminar evento', textoConfirmar: 'Eliminar' })
    if (!acepta) return
    const { error } = await eliminarEvento(evento)
    if (error) await recargar() // por si se alcanzó a restaurar algo
    if (await terminar(error, 'Evento eliminado', 'alerta')) setEventoEditando(null)
  }

  async function handleRegistrarGarantia(form) {
    setGuardando(true)
    const { error } = await registrarGarantia(eventoGarantia, form)
    setGuardando(false)
    if (await terminar(error, 'Garantía registrada correctamente')) setEventoGarantia(null)
  }

  async function handleDevolverGarantia(id) {
    const { error } = await marcarGarantiaDevuelta(id)
    terminar(error, 'Garantía marcada como devuelta')
  }

  async function handleEliminarGarantia(id) {
    const acepta = await confirmar('¿Eliminar esta garantía?', { titulo: 'Eliminar garantía', textoConfirmar: 'Eliminar' })
    if (!acepta) return
    const { error } = await eliminarGarantia(id)
    terminar(error, 'Garantía eliminada', 'alerta')
  }

  const hoy = fechaLocalISO()
  const eventosProximos = eventos.filter(e => esEventoProximo(e, hoy))
  const eventosCompletados = eventos.filter(e => e.estado === ESTADOS_EVENTO.COMPLETADO)
  const totalSaldoPendiente = sumarSaldosPendientes(eventos)
  const eventosVisibles = ordenarEventos(filtrarEventos(eventos, busqueda, hoy), hoy)

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-xl md:text-2xl font-bold text-gray-800">Módulo de Alquiler</h1>
      <p className="text-gray-500 mt-1 mb-4 text-sm">Reservas y eventos del salón</p>

      <AvisoCarga cargando={cargando} error={errorCarga} onReintentar={reintentar} texto="Cargando eventos..." />

      <div className={`grid grid-cols-3 gap-3 mb-4 ${cargando ? 'opacity-40' : ''}`}>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <p className="text-xs text-blue-600 font-medium">Próximos</p>
          <p className="text-2xl font-bold text-blue-700">{eventosProximos.length}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
          <p className="text-xs text-yellow-600 font-medium">Saldo</p>
          <p className="text-lg font-bold text-yellow-700">Bs. {totalSaldoPendiente.toFixed(0)}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3">
          <p className="text-xs text-green-600 font-medium">Completados</p>
          <p className="text-2xl font-bold text-green-700">{eventosCompletados.length}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        <button onClick={() => setTab('reservas')} className={claseTab(tab === 'reservas')}>Nueva reserva</button>
        <button onClick={() => setTab('eventos')} className={claseTab(tab === 'eventos')}>Todos los eventos</button>
      </div>

      {tab === 'reservas' && <FormularioReserva eventos={eventos} onRegistrar={handleRegistrarReserva} guardando={guardando} />}

      {tab === 'eventos' && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Todos los eventos</h2>
          {!cargando && !errorCarga && eventos.length > 0 && (
            <FiltrosEventos
              busqueda={busqueda}
              onCambiar={cambios => setBusqueda({ ...busqueda, ...cambios })}
              meses={mesesConEventos(eventos)}
              total={eventos.length}
              mostrados={eventosVisibles.length}
            />
          )}
          {cargando || errorCarga ? null : eventos.length === 0 ? (
            <p className="text-gray-400 text-sm">No hay eventos registrados.</p>
          ) : eventosVisibles.length === 0 ? (
            <p className="text-gray-400 text-sm">Ningún evento coincide con la búsqueda.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {eventosVisibles.map(evento => (
                <TarjetaEvento
                  key={evento.id}
                  evento={evento}
                  hoy={hoy}
                  onPagado={handlePagado}
                  onGarantia={setEventoGarantia}
                  onEditar={setEventoEditando}
                  onDevolverGarantia={handleDevolverGarantia}
                  onEliminarGarantia={handleEliminarGarantia}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {eventoGarantia && (
        <ModalGarantia
          key={eventoGarantia.id}
          evento={eventoGarantia}
          guardando={guardando}
          onRegistrar={handleRegistrarGarantia}
          onCerrar={() => setEventoGarantia(null)}
        />
      )}

      {eventoEditando && (
        <ModalEditarEvento
          key={eventoEditando.id}
          evento={eventoEditando}
          guardando={guardando}
          onGuardar={handleGuardarEdicion}
          onEliminar={() => handleEliminarEvento(eventoEditando)}
          onCerrar={() => setEventoEditando(null)}
        />
      )}

      {dialogoConfirmacion}
      {toast && <Toast mensaje={toast.mensaje} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}

export default Alquiler

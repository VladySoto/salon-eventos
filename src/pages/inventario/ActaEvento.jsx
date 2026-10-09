import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Toast from '../../components/Toast'
import { useConfirmar } from '../../hooks/useConfirmar'
import { formatearRangoFechas } from '../../utils/fechas'
import { etiquetaTipoEvento } from '../../constants'
import { mensajeActaEntrega, enlaceWhatsApp, telefonoParaWhatsApp } from '../../utils/whatsapp'
import {
  obtenerDatosActaEvento,
  guardarEntregaEvento,
  guardarRetornoEvento,
  cerrarActaEvento,
  calcularComparacionFila,
  calcularTotalCobro
} from '../../services/inventarioService'

const ETIQUETA_CATEGORIA = { cocina: 'Cocina', bar: 'Bar' }
const ORDEN_CATEGORIAS = ['bar', 'cocina']

// Agrupa por categoría (Bar primero, luego Cocina) manteniendo el orden de entrada dentro de cada una
function agruparPorCategoria(lista, categoriaDe) {
  const categorias = [...ORDEN_CATEGORIAS, ...lista.map(categoriaDe).filter(c => !ORDEN_CATEGORIAS.includes(c))]
  return [...new Set(categorias)]
    .map(categoria => ({ categoria, titulo: ETIQUETA_CATEGORIA[categoria] || categoria, elementos: lista.filter(e => categoriaDe(e) === categoria) }))
    .filter(g => g.elementos.length > 0)
}

function ContadorCantidad({ valor, onCambiar, disabled }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" disabled={disabled} onClick={() => onCambiar(Math.max(0, (valor || 0) - 1))} className="w-11 h-11 rounded-lg text-lg bg-gray-100 text-gray-600 font-bold disabled:opacity-40">−</button>
      <span className="w-8 text-center text-sm font-medium text-gray-800">{valor || 0}</span>
      <button type="button" disabled={disabled} onClick={() => onCambiar((valor || 0) + 1)} className="w-11 h-11 rounded-lg text-lg bg-gray-100 text-gray-600 font-bold disabled:opacity-40">+</button>
    </div>
  )
}

function ActaEvento() {
  const { eventoId } = useParams()
  const [cargando, setCargando] = useState(true)
  const [evento, setEvento] = useState(null)
  const [itemsCatalogo, setItemsCatalogo] = useState([])
  const [filasActa, setFilasActa] = useState([])
  const [tab, setTab] = useState('entrega')
  const [entregas, setEntregas] = useState({})
  const [retornos, setRetornos] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [toast, setToast] = useState(null)
  const [confirmar, dialogoConfirmacion] = useConfirmar()

  function mostrarToast(mensaje, tipo = 'exito') {
    setToast({ mensaje, tipo })
  }

  // Recarga solo cuando cambia el evento
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargarDatos() }, [eventoId])

  async function cargarDatos() {
    setCargando(true)
    const { data, error } = await obtenerDatosActaEvento(eventoId)
    if (!error) {
      setEvento(data.evento)
      setItemsCatalogo(data.itemsCatalogo)
      setFilasActa(data.filasActa)

      const draftEntregas = {}
      data.itemsCatalogo.forEach(item => { draftEntregas[item.id] = 0 })
      data.filasActa.forEach(fila => { draftEntregas[fila.item_id] = fila.cantidad_entregada })
      setEntregas(draftEntregas)

      const draftRetornos = {}
      data.filasActa.forEach(fila => {
        draftRetornos[fila.id] = { cantidad_devuelta: fila.cantidad_devuelta, cantidad_rota: fila.cantidad_rota }
      })
      setRetornos(draftRetornos)
    } else {
      mostrarToast('Error al cargar el acta del evento', 'error')
    }
    setCargando(false)
  }

  const actaCerrada = filasActa.length > 0 && filasActa.every(f => f.cerrado)

  // Ítems disponibles para la entrega: catálogo activo + cualquier ítem ya usado aunque se haya dado de baja después
  const itemsPorEntrega = (() => {
    const mapa = new Map(itemsCatalogo.map(i => [i.id, i]))
    filasActa.forEach(f => {
      if (!mapa.has(f.item_id) && f.inventario_items) {
        mapa.set(f.item_id, { id: f.item_id, ...f.inventario_items })
      }
    })
    return Array.from(mapa.values()).sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nombre.localeCompare(b.nombre))
  })()

  function cambiarEntrega(itemId, valor) {
    setEntregas({ ...entregas, [itemId]: valor })
  }

  async function handleGuardarEntrega() {
    setGuardando(true)
    const filas = itemsPorEntrega.map(item => ({ item_id: item.id, cantidad_entregada: entregas[item.id] || 0 }))
    const { error } = await guardarEntregaEvento(eventoId, filas)
    if (!error) {
      mostrarToast('Entrega registrada correctamente')
      cargarDatos()
    } else {
      mostrarToast('Error al guardar la entrega', 'error')
    }
    setGuardando(false)
  }

  function cambiarRetorno(filaId, campo, valor) {
    setRetornos({ ...retornos, [filaId]: { ...retornos[filaId], [campo]: valor } })
  }

  function filaConCalculo(fila) {
    const draft = retornos[fila.id] || { cantidad_devuelta: fila.cantidad_devuelta, cantidad_rota: fila.cantidad_rota }
    const precio_unitario = fila.inventario_items?.precio_unitario || 0
    const { faltante, monto_cobro } = calcularComparacionFila({
      cantidad_entregada: fila.cantidad_entregada,
      cantidad_devuelta: draft.cantidad_devuelta,
      cantidad_rota: draft.cantidad_rota,
      precio_unitario
    })
    return { ...fila, ...draft, faltante, monto_cobro, precio_unitario }
  }

  const filasEntregadas = filasActa.filter(f => f.cantidad_entregada > 0).map(filaConCalculo)
  const totalCobro = calcularTotalCobro(filasEntregadas)

  // Lo que se muestra en la lista debe ser lo ya guardado: si hay cambios sin guardar, se pide guardar antes
  const entregaSinGuardar = itemsPorEntrega.some(item => {
    const guardada = filasActa.find(f => f.item_id === item.id)?.cantidad_entregada || 0
    return (entregas[item.id] || 0) !== guardada
  })
  const gruposParaMensaje = agruparPorCategoria(filasEntregadas, f => f.inventario_items?.categoria)
    .map(g => ({ titulo: g.titulo, items: g.elementos.map(f => ({ nombre: f.inventario_items?.nombre, cantidad: f.cantidad_entregada })).sort((a, b) => a.nombre.localeCompare(b.nombre)) }))

  function filaConExceso(fila) {
    return (Number(fila.cantidad_devuelta) || 0) + (Number(fila.cantidad_rota) || 0) > fila.cantidad_entregada
  }
  const hayExceso = filasEntregadas.some(filaConExceso)

  async function handleGuardarRetorno() {
    if (hayExceso) {
      mostrarToast('Revisá las cantidades: devuelto + roto no puede superar lo entregado', 'error')
      return
    }
    setGuardando(true)
    const filas = filasEntregadas.map(f => ({
      id: f.id,
      cantidad_entregada: f.cantidad_entregada,
      cantidad_devuelta: f.cantidad_devuelta,
      cantidad_rota: f.cantidad_rota,
      precio_unitario: f.precio_unitario
    }))
    const { error } = await guardarRetornoEvento(filas)
    if (!error) {
      mostrarToast('Retorno guardado correctamente')
      cargarDatos()
    } else {
      mostrarToast('Error al guardar el retorno', 'error')
    }
    setGuardando(false)
  }

  async function handleConfirmarCierre() {
    if (hayExceso) {
      mostrarToast('Revisá las cantidades: devuelto + roto no puede superar lo entregado', 'error')
      return
    }
    if (!(await confirmar(`¿Confirmar el retorno y cerrar el acta? Esto va a descontar del inventario las pérdidas y ya no se va a poder editar.${totalCobro > 0 ? ` Se van a sumar Bs. ${totalCobro.toFixed(2)} al saldo del evento.` : ''}`, { titulo: 'Cerrar acta', textoConfirmar: 'Cerrar acta', peligro: false }))) return
    setGuardando(true)
    const filas = filasEntregadas.map(f => ({
      id: f.id,
      cantidad_entregada: f.cantidad_entregada,
      cantidad_devuelta: f.cantidad_devuelta,
      cantidad_rota: f.cantidad_rota,
      precio_unitario: f.precio_unitario
    }))
    const { error: errorRetorno } = await guardarRetornoEvento(filas)
    if (errorRetorno) {
      mostrarToast('Error al guardar el retorno', 'error')
      setGuardando(false)
      return
    }
    const { error: errorCierre, cobro } = await cerrarActaEvento(eventoId)
    if (!errorCierre) {
      mostrarToast(cobro > 0 ? `Acta cerrada — se sumaron Bs. ${cobro.toFixed(2)} al saldo del evento` : 'Acta cerrada — inventario actualizado')
      cargarDatos()
    } else {
      mostrarToast('Error al cerrar el acta', 'error')
    }
    setGuardando(false)
  }

  if (cargando) {
    return <div className="p-4 md:p-6"><p className="text-gray-400 text-sm">Cargando acta...</p></div>
  }

  if (!evento) {
    return (
      <div className="p-4 md:p-6">
        <p className="text-gray-400 text-sm mb-2">No se encontró el evento.</p>
        <Link to="/alquiler" className="text-blue-600 text-sm font-medium">‹ Volver a Alquiler</Link>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      <Link to="/alquiler" className="text-sm text-blue-600 font-medium">‹ Volver a Alquiler</Link>
      <h1 className="text-xl md:text-2xl font-bold text-gray-800 mt-2">Acta de inventario</h1>
      <p className="text-gray-500 mt-1 mb-4 text-sm">
        {evento.clientes?.nombre} — {etiquetaTipoEvento(evento.tipo_evento)} — {formatearRangoFechas(evento.fecha, evento.fecha_fin)}
      </p>

      {actaCerrada && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-start gap-3 mb-4">
          <span className="mt-0.5">✓</span>
          <p className="text-sm text-green-700">Acta cerrada. El inventario ya fue actualizado y no se puede editar.</p>
        </div>
      )}

      <div className="flex gap-2 mb-4 overflow-x-auto">
        <button onClick={() => setTab('entrega')} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${tab === 'entrega' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>Entrega</button>
        <button onClick={() => setTab('retorno')} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${tab === 'retorno' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>Retorno / Comparación</button>
      </div>

      {tab === 'entrega' && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="text-base font-semibold text-gray-700 mb-3">Ítems entregados</h2>
          {itemsPorEntrega.length === 0 ? (
            <p className="text-gray-400 text-sm">No hay ítems activos en el catálogo. Agregalos desde el módulo de Inventario.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {agruparPorCategoria(itemsPorEntrega, i => i.categoria).map(grupo => (
                <div key={grupo.categoria}>
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">{grupo.titulo}</h3>
                  <div className="flex flex-col gap-2">
                    {grupo.elementos.map(item => (
                      <div key={item.id} className="flex items-center justify-between border border-gray-100 bg-gray-50 rounded-lg p-3">
                        <p className="text-sm font-medium text-gray-800">{item.nombre}</p>
                        <ContadorCantidad
                          valor={entregas[item.id] || 0}
                          onCambiar={v => cambiarEntrega(item.id, v)}
                          disabled={actaCerrada}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {!actaCerrada && (
            <button onClick={handleGuardarEntrega} disabled={guardando} className="w-full mt-4 bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {guardando ? 'Guardando...' : 'Guardar entrega'}
            </button>
          )}
          {filasEntregadas.length > 0 && (
            <div className="mt-3">
              <a
                href={entregaSinGuardar ? undefined : enlaceWhatsApp(telefonoParaWhatsApp(evento.clientes), mensajeActaEntrega(evento, gruposParaMensaje))}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={entregaSinGuardar}
                className={`block w-full text-center py-3 rounded-xl text-sm font-medium ${entregaSinGuardar ? 'bg-gray-100 text-gray-400 pointer-events-none' : 'bg-green-600 text-white hover:bg-green-700'}`}
              >
                Enviar lista por WhatsApp
              </a>
              <p className="text-xs text-gray-400 mt-1 text-center">
                {entregaSinGuardar
                  ? 'Guardá la entrega para poder enviar la lista actualizada.'
                  : telefonoParaWhatsApp(evento.clientes) ? 'Se abre el chat del cliente con la lista ya escrita.' : 'El cliente no tiene celular registrado: elegís el contacto en WhatsApp.'}
              </p>
            </div>
          )}
        </div>
      )}

      {tab === 'retorno' && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="text-base font-semibold text-gray-700 mb-3">Comparación entrega vs. retorno</h2>
          {filasEntregadas.length === 0 ? (
            <p className="text-gray-400 text-sm">Todavía no se registró ninguna entrega para este evento.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {agruparPorCategoria(filasEntregadas, f => f.inventario_items?.categoria).map(grupo => (
                <div key={grupo.categoria} className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold text-gray-600">{grupo.titulo}</h3>
                  {grupo.elementos.map(fila => (
                <div key={fila.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{fila.inventario_items?.nombre}</p>
                      <p className="text-xs text-gray-400">Entregado: {fila.cantidad_entregada}</p>
                    </div>
                    {fila.monto_cobro > 0 && (
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-red-100 text-red-700 flex-shrink-0">Bs. {fila.monto_cobro.toFixed(2)}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 mb-2">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Devuelto (bueno)</p>
                      <ContadorCantidad valor={fila.cantidad_devuelta} onCambiar={v => cambiarRetorno(fila.id, 'cantidad_devuelta', v)} disabled={actaCerrada} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Roto</p>
                      <ContadorCantidad valor={fila.cantidad_rota} onCambiar={v => cambiarRetorno(fila.id, 'cantidad_rota', v)} disabled={actaCerrada} />
                    </div>
                  </div>
                  {filaConExceso(fila) && (
                    <p className="text-sm text-red-600 mb-2">Devuelto + roto supera lo entregado ({fila.cantidad_entregada}). Corregilo para poder guardar.</p>
                  )}
                  <p className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                    Faltante: <span className={`font-medium ${fila.faltante > 0 ? 'text-red-600' : 'text-gray-600'}`}>{fila.faltante}</span>
                  </p>
                </div>
                  ))}
                </div>
              ))}

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex justify-between items-center">
                <p className="text-sm font-medium text-blue-700">Total a cobrar</p>
                <p className="text-lg font-bold text-blue-700">Bs. {totalCobro.toFixed(2)}</p>
              </div>

              {!actaCerrada && (
                <div className="flex flex-col md:flex-row gap-3">
                  <button onClick={handleGuardarRetorno} disabled={guardando} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl text-sm font-medium disabled:opacity-50">
                    {guardando ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                  <button onClick={handleConfirmarCierre} disabled={guardando} className="flex-1 bg-green-600 text-white py-3 rounded-xl text-sm font-medium disabled:opacity-50">
                    {guardando ? 'Procesando...' : 'Confirmar y cerrar acta'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {dialogoConfirmacion}
      {toast && <Toast mensaje={toast.mensaje} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}

export default ActaEvento

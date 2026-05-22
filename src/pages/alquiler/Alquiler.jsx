import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'

function obtenerFechaLimite() {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() + 7)
  return fecha.toISOString().split('T')[0]
}

function Alquiler() {
  const [eventos, setEventos] = useState([])
  const [garantiasPorEvento, setGarantiasPorEvento] = useState({})
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('reservas')
  const [editandoEvento, setEditandoEvento] = useState(null)
  const [modalGarantia, setModalGarantia] = useState(null)
  const [formGarantia, setFormGarantia] = useState({
    cajas_llevadas: '',
    botellas_llevadas: '',
    monto_garantia: '',
    fecha_limite: obtenerFechaLimite(),
    observaciones: ''
  })
  const [form, setForm] = useState({
    nombre: '',
    ci_nit: '',
    telefono: '',
    telefono2: '',
    tipo_evento: '',
    fecha: '',
    dos_dias: false,
    fecha_fin: '',
    observaciones: '',
    monto_total: '',
    adelanto: '',
    incluye_lavado: false,
    monto_lavado: ''
  })

  useEffect(() => { cargarEventos() }, [])

  async function cargarEventos() {
    const { data } = await supabase
      .from('eventos')
      .select('*, clientes(id, nombre, ci_nit, telefono, telefono2)')
      .order('fecha', { ascending: true })
    if (data) {
      setEventos(data)
      cargarGarantias(data)
    }
  }

  async function cargarGarantias(eventosData) {
    const ids = eventosData.map(e => e.id)
    if (ids.length === 0) return
    const { data } = await supabase.from('garantias').select('*').in('evento_id', ids)
    if (data) {
      const porEvento = {}
      data.forEach(g => {
        if (!porEvento[g.evento_id]) porEvento[g.evento_id] = []
        porEvento[g.evento_id].push(g)
      })
      setGarantiasPorEvento(porEvento)
    }
  }

  function handleChange(e) {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm({ ...form, [e.target.name]: value })
  }

  function handleChangeEditar(e) {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setEditandoEvento({ ...editandoEvento, [e.target.name]: value })
  }

  function handleChangeGarantia(e) {
    setFormGarantia({ ...formGarantia, [e.target.name]: e.target.value })
  }

  const montoBase = parseFloat(form.monto_total) || 0
  const montoLavado = form.incluye_lavado ? (parseFloat(form.monto_lavado) || 0) : 0
  const montoTotalFinal = montoBase + montoLavado
  const adelanto = parseFloat(form.adelanto) || 0
  const saldoPendiente = montoTotalFinal - adelanto

  async function handleSubmit(e) {
  e.preventDefault()
  setLoading(true)

  // Verificar si la fecha ya está ocupada
  const { data: eventosExistentes } = await supabase
    .from('eventos')
    .select('id, fecha, fecha_fin, clientes(nombre)')
    .neq('estado', 'completado')

  const fechaInicio = form.fecha
  const fechaFin = form.dos_dias ? form.fecha_fin : form.fecha

  const conflicto = eventosExistentes?.find(e => {
    const eInicio = e.fecha
    const eFin = e.fecha_fin || e.fecha
    return fechaInicio <= eFin && fechaFin >= eInicio
  })

  if (conflicto) {
    alert(`❌ Fecha ocupada — Ya existe un evento de ${conflicto.clientes?.nombre} el ${conflicto.fecha}${conflicto.fecha_fin ? ` al ${conflicto.fecha_fin}` : ''}. Elegí otra fecha.`)
    setLoading(false)
    return
  }

  const { data: cliente, error: errorCliente } = await supabase
    .from('clientes')
    .insert({ nombre: form.nombre, ci_nit: form.ci_nit, telefono: form.telefono, telefono2: form.telefono2 || null })
    .select().single()
  if (errorCliente) { setLoading(false); return }

  await supabase.from('eventos').insert({
    cliente_id: cliente.id,
    tipo_evento: form.tipo_evento,
    fecha: form.fecha,
    fecha_fin: form.dos_dias ? form.fecha_fin : null,
    observaciones: form.observaciones,
    adelanto: adelanto,
    saldo_pendiente: saldoPendiente > 0 ? saldoPendiente : 0,
    estado: 'reservado'
  })

  setForm({ nombre: '', ci_nit: '', telefono: '', telefono2: '', tipo_evento: '', fecha: '', dos_dias: false, fecha_fin: '', observaciones: '', monto_total: '', adelanto: '', incluye_lavado: false, monto_lavado: '' })
  cargarEventos()
  setLoading(false)
}

  async function marcarPagado(eventoId) {
    await supabase.from('eventos').update({ saldo_pendiente: 0, estado: 'completado' }).eq('id', eventoId)
    cargarEventos()
  }

  async function eliminarEvento(eventoId) {
    if (!confirm('¿Seguro que querés eliminar este evento?')) return
    await supabase.from('garantias').delete().eq('evento_id', eventoId)
    await supabase.from('eventos').delete().eq('id', eventoId)
    cargarEventos()
  }

  async function guardarEdicionEvento() {
    setLoading(true)
    await supabase.from('clientes').update({
      nombre: editandoEvento.clientes.nombre,
      ci_nit: editandoEvento.clientes.ci_nit,
      telefono: editandoEvento.clientes.telefono,
      telefono2: editandoEvento.clientes.telefono2 || null
    }).eq('id', editandoEvento.clientes.id)
    await supabase.from('eventos').update({
      tipo_evento: editandoEvento.tipo_evento,
      fecha: editandoEvento.fecha,
      fecha_fin: editandoEvento.fecha_fin || null,
      observaciones: editandoEvento.observaciones,
      adelanto: parseFloat(editandoEvento.adelanto) || 0,
      saldo_pendiente: parseFloat(editandoEvento.saldo_pendiente) || 0,
      estado: editandoEvento.estado
    }).eq('id', editandoEvento.id)
    setEditandoEvento(null)
    cargarEventos()
    setLoading(false)
  }

  async function registrarGarantia(e) {
    e.preventDefault()
    setLoading(true)
    await supabase.from('garantias').insert({
      evento_id: modalGarantia.id,
      cliente_nombre: modalGarantia.clientes?.nombre,
      cajas_llevadas: parseInt(formGarantia.cajas_llevadas) || 0,
      botellas_llevadas: parseInt(formGarantia.botellas_llevadas) || 0,
      monto_garantia: parseFloat(formGarantia.monto_garantia) || 0,
      fecha_limite: formGarantia.fecha_limite,
      observaciones: formGarantia.observaciones,
      estado: 'pendiente'
    })
    setModalGarantia(null)
    setFormGarantia({ cajas_llevadas: '', botellas_llevadas: '', monto_garantia: '', fecha_limite: obtenerFechaLimite(), observaciones: '' })
    cargarEventos()
    setLoading(false)
  }

  async function marcarGarantiaDevuelta(id) {
    await supabase.from('garantias').update({ estado: 'devuelta' }).eq('id', id)
    cargarEventos()
  }

  async function eliminarGarantia(id) {
    if (!confirm('¿Eliminar esta garantía?')) return
    await supabase.from('garantias').delete().eq('id', id)
    cargarEventos()
  }

  const hoy = new Date().toISOString().split('T')[0]

  function diasRestantes(fechaLimite) {
    const dias = Math.ceil((new Date(fechaLimite) - new Date(hoy)) / (1000 * 60 * 60 * 24))
    if (dias < 0) return { texto: 'Vencida', color: 'text-red-600' }
    if (dias === 0) return { texto: 'Vence hoy', color: 'text-orange-600' }
    if (dias === 1) return { texto: 'Vence mañana', color: 'text-orange-500' }
    return { texto: `${dias} días restantes`, color: 'text-gray-500' }
  }

  const eventosProximos = eventos.filter(e => e.fecha >= hoy && e.estado === 'reservado')
  const eventosCompletados = eventos.filter(e => e.estado === 'completado')
  const totalSaldoPendiente = eventos.filter(e => e.estado === 'reservado').reduce((acc, e) => acc + Number(e.saldo_pendiente), 0)

  const opcionesTipoEvento = (
    <>
      <option value="">Seleccioná</option>
      <option value="cumpleaños">Cumpleaños</option>
      <option value="matrimonio_catolico">Matrimonio Católico</option>
      <option value="matrimonio_cristiano">Matrimonio Cristiano</option>
      <option value="bautizo">Bautizo</option>
      <option value="quinceañera">Quinceañera</option>
      <option value="reunion">Reunión</option>
      <option value="cabo_de_año">Cabo de Año</option>
      <option value="otro">Otro</option>
    </>
  )

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-xl md:text-2xl font-bold text-gray-800">Módulo de Alquiler</h1>
      <p className="text-gray-500 mt-1 mb-4 text-sm">Reservas y eventos del salón</p>

      <div className="grid grid-cols-3 gap-3 mb-4">
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
        <button onClick={() => setTab('reservas')} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${tab === 'reservas' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>Nueva reserva</button>
        <button onClick={() => setTab('eventos')} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${tab === 'eventos' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>Todos los eventos</button>
      </div>

      {tab === 'reservas' && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Registrar nueva reserva</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1">Nombre del cliente</label>
                <input
                  type="text"
                  name="nombre"
                  value={form.nombre}
                  onChange={e => setForm({...form, nombre: e.target.value.replace(/\b\w/g, l => l.toUpperCase())})}
                  placeholder="Ej: Juan Pérez"
                  required
                  autoCapitalize="words"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">CI / NIT</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  name="ci_nit"
                  value={form.ci_nit}
                  onChange={handleChange}
                  placeholder="Ej: 12345678"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Teléfono 1</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  name="telefono"
                  value={form.telefono}
                  onChange={handleChange}
                  placeholder="Ej: 70012345"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Teléfono 2 (opcional)</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  name="telefono2"
                  value={form.telefono2}
                  onChange={handleChange}
                  placeholder="Ej: 60098765"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Tipo de evento</label>
                <select name="tipo_evento" value={form.tipo_evento} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm">
                  {opcionesTipoEvento}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Monto del alquiler (Bs.)</label>
                <input type="number" name="monto_total" value={form.monto_total} onChange={handleChange} placeholder="Ej: 2000" required className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Fecha del evento</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Fecha inicio</label>
                  <input type="date" name="fecha" value={form.fecha} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <input type="checkbox" name="dos_dias" id="dos_dias" checked={form.dos_dias} onChange={handleChange} className="w-4 h-4 accent-blue-600" />
                    <label htmlFor="dos_dias" className="text-sm font-medium text-gray-700">Ocupa 2 días</label>
                  </div>
                  {form.dos_dias && (
                    <div>
                      <label className="text-sm text-gray-600 block mb-1">Fecha fin</label>
                      <input type="date" name="fecha_fin" value={form.fecha_fin} onChange={handleChange} required={form.dos_dias} min={form.fecha} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <input type="checkbox" name="incluye_lavado" id="incluye_lavado" checked={form.incluye_lavado} onChange={handleChange} className="w-4 h-4 accent-blue-600" />
                <label htmlFor="incluye_lavado" className="text-sm font-medium text-gray-700">Incluye servicio de lavado</label>
              </div>
              {form.incluye_lavado && (
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Monto del lavado (Bs.)</label>
                  <input type="number" name="monto_lavado" value={form.monto_lavado} onChange={handleChange} placeholder="Ej: 300" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-blue-500 font-medium">Total</p>
                  <p className="text-lg font-bold text-blue-700">Bs. {montoTotalFinal.toFixed(2)}</p>
                  {form.incluye_lavado && montoLavado > 0 && <p className="text-xs text-blue-400">Alquiler + lavado</p>}
                </div>
                <div>
                  <label className="text-xs text-blue-500 font-medium block mb-1">Adelanto (Bs.)</label>
                  <input type="number" name="adelanto" value={form.adelanto} onChange={handleChange} placeholder="0" className="w-full border border-blue-300 rounded-lg px-2 py-1.5 text-sm bg-white" />
                </div>
                <div>
                  <p className="text-xs text-blue-500 font-medium">Saldo</p>
                  <p className={`text-lg font-bold ${saldoPendiente > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                    Bs. {saldoPendiente > 0 ? saldoPendiente.toFixed(2) : '0.00'}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-600 block mb-1">Observaciones</label>
              <textarea name="observaciones" value={form.observaciones} onChange={handleChange} placeholder="Notas adicionales..." rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none" />
            </div>

            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Guardando...' : 'Registrar reserva'}
            </button>
          </form>
        </div>
      )}

      {tab === 'eventos' && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Todos los eventos</h2>
          {eventos.length === 0 ? (
            <p className="text-gray-400 text-sm">No hay eventos registrados.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {eventos.map(e => {
                const garantiasEvento = garantiasPorEvento[e.id] || []
                const garantiasPendientes = garantiasEvento.filter(g => g.estado === 'pendiente')
                return (
                  <div key={e.id} className={`border rounded-xl overflow-hidden ${e.estado === 'completado' ? 'border-green-200' : Number(e.saldo_pendiente) > 0 ? 'border-yellow-200' : 'border-gray-200'}`}>
                    <div className={`p-4 ${e.estado === 'completado' ? 'bg-green-50' : Number(e.saldo_pendiente) > 0 ? 'bg-yellow-50' : 'bg-white'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-medium text-gray-800">{e.clientes?.nombre}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{e.tipo_evento} — {e.fecha}{e.fecha_fin ? ` al ${e.fecha_fin}` : ''}</p>
                          <p className="text-xs text-gray-500">📞 {e.clientes?.telefono}{e.clientes?.telefono2 ? ` / ${e.clientes.telefono2}` : ''}</p>
                          {e.clientes?.ci_nit && <p className="text-xs text-gray-400">CI: {e.clientes.ci_nit}</p>}
                          {e.observaciones && <p className="text-xs text-gray-400 mt-1 italic">{e.observaciones}</p>}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${e.estado === 'completado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {e.estado === 'completado' ? '✓ Completado' : '⏳ Reservado'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                        <div>
                          <p className="text-xs text-gray-500">Adelanto: <span className="font-medium text-gray-700">Bs. {Number(e.adelanto).toFixed(2)}</span></p>
                          <p className="text-xs text-gray-500">Saldo: <span className={`font-medium ${Number(e.saldo_pendiente) > 0 ? 'text-yellow-700' : 'text-green-600'}`}>Bs. {Number(e.saldo_pendiente).toFixed(2)}</span></p>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-end">
                          {e.estado !== 'completado' && Number(e.saldo_pendiente) > 0 && (
                            <button onClick={() => marcarPagado(e.id)} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium">Pagado</button>
                          )}
                          <button onClick={() => { setModalGarantia(e); setFormGarantia({ cajas_llevadas: '', botellas_llevadas: '', monto_garantia: '', fecha_limite: obtenerFechaLimite(), observaciones: '' }) }} className="bg-purple-50 text-purple-600 px-3 py-1.5 rounded-lg text-xs font-medium">+ Garantía</button>
                          <button onClick={() => setEditandoEvento({...e, clientes: {...e.clientes}})} className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-medium">Editar</button>
                          <button onClick={() => eliminarEvento(e.id)} className="bg-red-50 text-red-500 px-3 py-1.5 rounded-lg text-xs font-medium">Eliminar</button>
                        </div>
                      </div>
                    </div>

                    {garantiasEvento.length > 0 && (
                      <div className="border-t border-gray-100 bg-gray-50 p-3">
                        <p className="text-xs font-medium text-gray-500 mb-2">🛡️ Garantías {garantiasPendientes.length > 0 && <span className="text-orange-500">({garantiasPendientes.length} pendiente{garantiasPendientes.length > 1 ? 's' : ''})</span>}</p>
                        <div className="flex flex-col gap-2">
                          {garantiasEvento.map(g => {
                            const dias = diasRestantes(g.fecha_limite)
                            return (
                              <div key={g.id} className={`rounded-lg p-3 border ${g.estado === 'devuelta' ? 'bg-green-50 border-green-200' : g.estado === 'ejecutada' ? 'bg-red-50 border-red-200' : 'bg-white border-orange-200'}`}>
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="flex gap-2 text-xs text-gray-600">
                                      {g.cajas_llevadas > 0 && <span>📦 {g.cajas_llevadas} cajas</span>}
                                      {g.botellas_llevadas > 0 && <span>🍾 {g.botellas_llevadas} botellas</span>}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">Garantía: <span className="font-medium">Bs. {Number(g.monto_garantia).toFixed(2)}</span></p>
                                    <p className="text-xs text-gray-400">Límite: {g.fecha_limite}</p>
                                    {g.estado === 'pendiente' && <p className={`text-xs font-medium ${dias.color}`}>{dias.texto}</p>}
                                    {g.observaciones && <p className="text-xs text-gray-400 italic">{g.observaciones}</p>}
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${g.estado === 'devuelta' ? 'bg-green-100 text-green-700' : g.estado === 'ejecutada' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                      {g.estado === 'devuelta' ? '✓ Devuelta' : g.estado === 'ejecutada' ? '⚡ Ejecutada' : '⏳ Pendiente'}
                                    </span>
                                    <div className="flex gap-1">
                                      {g.estado === 'pendiente' && (
                                        <button onClick={() => marcarGarantiaDevuelta(g.id)} className="bg-green-600 text-white px-2 py-1 rounded text-xs">✓</button>
                                      )}
                                      <button onClick={() => eliminarGarantia(g.id)} className="bg-red-50 text-red-500 px-2 py-1 rounded text-xs">✕</button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal nueva garantía */}
      {modalGarantia && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-end md:items-center justify-center z-50" onClick={() => setModalGarantia(null)}>
          <div className="bg-white rounded-t-2xl md:rounded-2xl p-6 w-full md:max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-lg font-bold text-gray-800">Nueva garantía</h3>
              <button onClick={() => setModalGarantia(null)} className="text-gray-400 text-xl font-bold">✕</button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Evento: <span className="font-medium text-gray-700">{modalGarantia.clientes?.nombre} — {modalGarantia.fecha}</span></p>
            <form onSubmit={registrarGarantia} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Cajas llevadas</label>
                  <input type="number" name="cajas_llevadas" value={formGarantia.cajas_llevadas} onChange={handleChangeGarantia} placeholder="0" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Botellas llevadas</label>
                  <input type="number" name="botellas_llevadas" value={formGarantia.botellas_llevadas} onChange={handleChangeGarantia} placeholder="0" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Monto garantía (Bs.)</label>
                  <input type="number" name="monto_garantia" value={formGarantia.monto_garantia} onChange={handleChangeGarantia} placeholder="Ej: 500" required className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Fecha límite</label>
                  <input type="date" name="fecha_limite" value={formGarantia.fecha_limite} onChange={handleChangeGarantia} required className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Observaciones</label>
                <textarea name="observaciones" value={formGarantia.observaciones} onChange={handleChangeGarantia} placeholder="Notas..." rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setModalGarantia(null)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl text-sm font-medium">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 bg-purple-600 text-white py-3 rounded-xl text-sm font-medium disabled:opacity-50">
                  {loading ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal editar evento */}
      {editandoEvento && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-end md:items-center justify-center z-50" onClick={() => setEditandoEvento(null)}>
          <div className="bg-white rounded-t-2xl md:rounded-2xl p-6 w-full md:max-w-lg max-h-screen overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Editar evento</h3>
              <button onClick={() => setEditandoEvento(null)} className="text-gray-400 text-xl font-bold">✕</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1">Nombre</label>
                <input
                  type="text"
                  value={editandoEvento.clientes?.nombre || ''}
                  onChange={e => setEditandoEvento({...editandoEvento, clientes: {...editandoEvento.clientes, nombre: e.target.value.replace(/\b\w/g, l => l.toUpperCase())}})}
                  autoCapitalize="words"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">CI / NIT</label>
                <input type="tel" inputMode="numeric" value={editandoEvento.clientes?.ci_nit || ''} onChange={e => setEditandoEvento({...editandoEvento, clientes: {...editandoEvento.clientes, ci_nit: e.target.value}})} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Teléfono 1</label>
                <input type="tel" inputMode="numeric" value={editandoEvento.clientes?.telefono || ''} onChange={e => setEditandoEvento({...editandoEvento, clientes: {...editandoEvento.clientes, telefono: e.target.value}})} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Teléfono 2</label>
                <input type="tel" inputMode="numeric" value={editandoEvento.clientes?.telefono2 || ''} onChange={e => setEditandoEvento({...editandoEvento, clientes: {...editandoEvento.clientes, telefono2: e.target.value}})} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Tipo de evento</label>
                <select name="tipo_evento" value={editandoEvento.tipo_evento} onChange={handleChangeEditar} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm">
                  {opcionesTipoEvento}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Estado</label>
                <select name="estado" value={editandoEvento.estado} onChange={handleChangeEditar} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm">
                  <option value="reservado">Reservado</option>
                  <option value="completado">Completado</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Fecha inicio</label>
                <input type="date" name="fecha" value={editandoEvento.fecha} onChange={handleChangeEditar} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Fecha fin (opcional)</label>
                <input type="date" name="fecha_fin" value={editandoEvento.fecha_fin || ''} onChange={handleChangeEditar} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Adelanto (Bs.)</label>
                <input type="number" name="adelanto" value={editandoEvento.adelanto} onChange={handleChangeEditar} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Saldo pendiente (Bs.)</label>
                <input type="number" name="saldo_pendiente" value={editandoEvento.saldo_pendiente} onChange={handleChangeEditar} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="text-sm text-gray-600 block mb-1">Observaciones</label>
                <textarea name="observaciones" value={editandoEvento.observaciones || ''} onChange={handleChangeEditar} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditandoEvento(null)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl text-sm font-medium">Cancelar</button>
              <button onClick={guardarEdicionEvento} disabled={loading} className="flex-1 bg-blue-600 text-white py-3 rounded-xl text-sm font-medium disabled:opacity-50">
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Alquiler
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'

function obtenerFechaHoy() {
  return new Date().toISOString().split('T')[0]
}

function obtenerFechaLimite() {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() + 7)
  return fecha.toISOString().split('T')[0]
}

function Garantias() {
  const [garantias, setGarantias] = useState([])
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('registrar')
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({
    evento_id: '',
    cliente_nombre: '',
    cajas_llevadas: '',
    botellas_llevadas: '',
    monto_garantia: '',
    fecha_limite: obtenerFechaLimite(),
    observaciones: ''
  })

  useEffect(() => {
    cargarGarantias()
    cargarEventos()
    verificarVencidas()
  }, [])

  async function cargarGarantias() {
    const { data } = await supabase
      .from('garantias')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setGarantias(data)
  }

  async function cargarEventos() {
    const { data } = await supabase
      .from('eventos')
      .select('*, clientes(nombre)')
      .order('fecha', { ascending: false })
    if (data) setEventos(data)
  }

  async function verificarVencidas() {
    const hoy = obtenerFechaHoy()
    await supabase
      .from('garantias')
      .update({ estado: 'ejecutada' })
      .eq('estado', 'pendiente')
      .lt('fecha_limite', hoy)
    cargarGarantias()
  }

  function handleChange(e) {
    const { name, value } = e.target
    const nuevoForm = { ...form, [name]: value }
    if (name === 'evento_id') {
      const evento = eventos.find(ev => ev.id === value)
      if (evento) nuevoForm.cliente_nombre = evento.clientes?.nombre || ''
    }
    setForm(nuevoForm)
  }

  function handleChangeEditar(e) {
    setEditando({ ...editando, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('garantias').insert({
      evento_id: form.evento_id || null,
      cliente_nombre: form.cliente_nombre,
      cajas_llevadas: parseInt(form.cajas_llevadas) || 0,
      botellas_llevadas: parseInt(form.botellas_llevadas) || 0,
      monto_garantia: parseFloat(form.monto_garantia) || 0,
      fecha_limite: form.fecha_limite,
      observaciones: form.observaciones,
      estado: 'pendiente'
    })
    if (!error) {
      setForm({
        evento_id: '',
        cliente_nombre: '',
        cajas_llevadas: '',
        botellas_llevadas: '',
        monto_garantia: '',
        fecha_limite: obtenerFechaLimite(),
        observaciones: ''
      })
      cargarGarantias()
    }
    setLoading(false)
  }

  async function marcarDevuelta(id) {
    await supabase.from('garantias').update({ estado: 'devuelta' }).eq('id', id)
    cargarGarantias()
  }

  async function eliminarGarantia(id) {
    if (!confirm('¿Seguro que querés eliminar esta garantía?')) return
    await supabase.from('garantias').delete().eq('id', id)
    cargarGarantias()
  }

  async function guardarEdicion() {
    setLoading(true)
    await supabase.from('garantias').update({
      cliente_nombre: editando.cliente_nombre,
      cajas_llevadas: parseInt(editando.cajas_llevadas) || 0,
      botellas_llevadas: parseInt(editando.botellas_llevadas) || 0,
      monto_garantia: parseFloat(editando.monto_garantia) || 0,
      fecha_limite: editando.fecha_limite,
      observaciones: editando.observaciones,
      estado: editando.estado
    }).eq('id', editando.id)
    setEditando(null)
    cargarGarantias()
    setLoading(false)
  }

  const pendientes = garantias.filter(g => g.estado === 'pendiente')
  const ejecutadas = garantias.filter(g => g.estado === 'ejecutada')
  const devueltas = garantias.filter(g => g.estado === 'devuelta')
  const hoy = obtenerFechaHoy()
  const porVencer = pendientes.filter(g => {
    const dias = Math.ceil((new Date(g.fecha_limite) - new Date(hoy)) / (1000 * 60 * 60 * 24))
    return dias <= 2 && dias >= 0
  })

  function diasRestantes(fechaLimite) {
    const dias = Math.ceil((new Date(fechaLimite) - new Date(hoy)) / (1000 * 60 * 60 * 24))
    if (dias < 0) return 'Vencida'
    if (dias === 0) return 'Vence hoy'
    if (dias === 1) return 'Vence mañana'
    return `${dias} días restantes`
  }

  function colorEstado(g) {
    if (g.estado === 'devuelta') return 'border-green-200 bg-green-50'
    if (g.estado === 'ejecutada') return 'border-red-200 bg-red-50'
    const dias = Math.ceil((new Date(g.fecha_limite) - new Date(hoy)) / (1000 * 60 * 60 * 24))
    if (dias <= 2) return 'border-orange-200 bg-orange-50'
    return 'border-yellow-200 bg-yellow-50'
  }

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-xl md:text-2xl font-bold text-gray-800">Garantías Post-Evento</h1>
      <p className="text-gray-500 mt-1 mb-4 text-sm">Control de cajas y botellas llevadas por clientes</p>

      {/* Alertas por vencer */}
      {porVencer.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-start gap-3 mb-4">
          <span className="mt-0.5">⏰</span>
          <p className="text-sm text-orange-700"><strong>{porVencer.length} garantía{porVencer.length > 1 ? 's' : ''}</strong> por vencer en los próximos 2 días</p>
        </div>
      )}

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
          <p className="text-xs text-yellow-600 font-medium">Pendientes</p>
          <p className="text-2xl font-bold text-yellow-700">{pendientes.length}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-xs text-red-600 font-medium">Ejecutadas</p>
          <p className="text-2xl font-bold text-red-700">{ejecutadas.length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3">
          <p className="text-xs text-green-600 font-medium">Devueltas</p>
          <p className="text-2xl font-bold text-green-700">{devueltas.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        <button onClick={() => setTab('registrar')} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${tab === 'registrar' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>Nueva garantía</button>
        <button onClick={() => setTab('historial')} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${tab === 'historial' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>Historial</button>
      </div>

      {tab === 'registrar' && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Registrar nueva garantía</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm text-gray-600 block mb-1">Evento asociado (opcional)</label>
                <select name="evento_id" value={form.evento_id} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm">
                  <option value="">Sin evento asociado</option>
                  {eventos.map(ev => (
                    <option key={ev.id} value={ev.id}>
                      {ev.fecha} — {ev.clientes?.nombre} ({ev.tipo_evento})
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-gray-600 block mb-1">Nombre del cliente</label>
                <input type="text" name="cliente_nombre" value={form.cliente_nombre} onChange={handleChange} placeholder="Ej: Juan Pérez" required className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Cajas llevadas</label>
                <input type="number" name="cajas_llevadas" value={form.cajas_llevadas} onChange={handleChange} placeholder="Ej: 10" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Botellas llevadas</label>
                <input type="number" name="botellas_llevadas" value={form.botellas_llevadas} onChange={handleChange} placeholder="Ej: 5" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Monto de garantía (Bs.)</label>
                <input type="number" name="monto_garantia" value={form.monto_garantia} onChange={handleChange} placeholder="Ej: 500" required className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Fecha límite de devolución</label>
                <input type="date" name="fecha_limite" value={form.fecha_limite} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-gray-600 block mb-1">Observaciones</label>
                <textarea name="observaciones" value={form.observaciones} onChange={handleChange} placeholder="Notas adicionales..." rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Guardando...' : 'Registrar garantía'}
            </button>
          </form>
        </div>
      )}

      {tab === 'historial' && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Historial de garantías</h2>
          {garantias.length === 0 ? (
            <p className="text-gray-400 text-sm">No hay garantías registradas.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {garantias.map(g => (
                <div key={g.id} className={`border rounded-xl p-4 ${colorEstado(g)}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-gray-800">{g.cliente_nombre}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {g.cajas_llevadas > 0 && `📦 ${g.cajas_llevadas} cajas`}
                        {g.cajas_llevadas > 0 && g.botellas_llevadas > 0 && ' — '}
                        {g.botellas_llevadas > 0 && `🍾 ${g.botellas_llevadas} botellas`}
                      </p>
                      <p className="text-xs text-gray-500">Garantía: <span className="font-medium">Bs. {Number(g.monto_garantia).toFixed(2)}</span></p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${
                      g.estado === 'devuelta' ? 'bg-green-100 text-green-700' :
                      g.estado === 'ejecutada' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {g.estado === 'devuelta' ? '✓ Devuelta' : g.estado === 'ejecutada' ? '⚡ Ejecutada' : '⏳ Pendiente'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <div>
                      <p className="text-xs text-gray-500">Límite: {g.fecha_limite}</p>
                      {g.estado === 'pendiente' && (
                        <p className={`text-xs font-medium ${
                          diasRestantes(g.fecha_limite) === 'Vencida' ? 'text-red-600' :
                          diasRestantes(g.fecha_limite).includes('hoy') || diasRestantes(g.fecha_limite).includes('mañana') ? 'text-orange-600' :
                          'text-gray-500'
                        }`}>
                          {diasRestantes(g.fecha_limite)}
                        </p>
                      )}
                      {g.observaciones && <p className="text-xs text-gray-400 italic mt-0.5">{g.observaciones}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                      {g.estado === 'pendiente' && (
                        <button onClick={() => marcarDevuelta(g.id)} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium">Devuelta ✓</button>
                      )}
                      <button onClick={() => setEditando({...g})} className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-medium">Editar</button>
                      <button onClick={() => eliminarGarantia(g.id)} className="bg-red-50 text-red-500 px-3 py-1.5 rounded-lg text-xs font-medium">Eliminar</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal editar */}
      {editando && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-end md:items-center justify-center z-50" onClick={() => setEditando(null)}>
          <div className="bg-white rounded-t-2xl md:rounded-2xl p-6 w-full md:max-w-md max-h-screen overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Editar garantía</h3>
              <button onClick={() => setEditando(null)} className="text-gray-400 text-xl font-bold">✕</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm text-gray-600 block mb-1">Nombre del cliente</label>
                <input type="text" name="cliente_nombre" value={editando.cliente_nombre} onChange={handleChangeEditar} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Cajas llevadas</label>
                <input type="number" name="cajas_llevadas" value={editando.cajas_llevadas} onChange={handleChangeEditar} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Botellas llevadas</label>
                <input type="number" name="botellas_llevadas" value={editando.botellas_llevadas} onChange={handleChangeEditar} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Monto garantía (Bs.)</label>
                <input type="number" name="monto_garantia" value={editando.monto_garantia} onChange={handleChangeEditar} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Fecha límite</label>
                <input type="date" name="fecha_limite" value={editando.fecha_limite} onChange={handleChangeEditar} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Estado</label>
                <select name="estado" value={editando.estado} onChange={handleChangeEditar} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm">
                  <option value="pendiente">Pendiente</option>
                  <option value="devuelta">Devuelta</option>
                  <option value="ejecutada">Ejecutada</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-gray-600 block mb-1">Observaciones</label>
                <textarea name="observaciones" value={editando.observaciones || ''} onChange={handleChangeEditar} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditando(null)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl text-sm font-medium">Cancelar</button>
              <button onClick={guardarEdicion} disabled={loading} className="flex-1 bg-blue-600 text-white py-3 rounded-xl text-sm font-medium disabled:opacity-50">
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Garantias
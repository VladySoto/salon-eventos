import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'

function Alquiler() {
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('reservas')
  const [editandoEvento, setEditandoEvento] = useState(null)
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

  useEffect(() => {
    cargarEventos()
  }, [])

  async function cargarEventos() {
    const { data } = await supabase
      .from('eventos')
      .select('*, clientes(id, nombre, ci_nit, telefono, telefono2)')
      .order('fecha', { ascending: true })
    if (data) setEventos(data)
  }

  function handleChange(e) {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm({ ...form, [e.target.name]: value })
  }

  function handleChangeEditar(e) {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setEditandoEvento({ ...editandoEvento, [e.target.name]: value })
  }

  const montoBase = parseFloat(form.monto_total) || 0
  const montoLavado = form.incluye_lavado ? (parseFloat(form.monto_lavado) || 0) : 0
  const montoTotalFinal = montoBase + montoLavado
  const adelanto = parseFloat(form.adelanto) || 0
  const saldoPendiente = montoTotalFinal - adelanto

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
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

  const hoy = new Date().toISOString().split('T')[0]
  const eventosProximos = eventos.filter(e => e.fecha >= hoy && e.estado === 'reservado')
  const eventosCompletados = eventos.filter(e => e.estado === 'completado')
  const totalSaldoPendiente = eventos.filter(e => e.estado === 'reservado').reduce((acc, e) => acc + Number(e.saldo_pendiente), 0)

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800">Módulo de Alquiler</h1>
      <p className="text-gray-500 mt-1 mb-6">Reservas y eventos del salón</p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-600 font-medium">Eventos próximos</p>
          <p className="text-3xl font-bold text-blue-700">{eventosProximos.length}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-sm text-yellow-600 font-medium">Saldo pendiente total</p>
          <p className="text-3xl font-bold text-yellow-700">Bs. {totalSaldoPendiente.toFixed(2)}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm text-green-600 font-medium">Eventos completados</p>
          <p className="text-3xl font-bold text-green-700">{eventosCompletados.length}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('reservas')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'reservas' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>Nueva reserva</button>
        <button onClick={() => setTab('eventos')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'eventos' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>Todos los eventos</button>
      </div>

      {tab === 'reservas' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Registrar nueva reserva</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 block mb-1">Nombre del cliente</label>
              <input type="text" name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ej: Juan Pérez" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">CI / NIT</label>
              <input type="text" name="ci_nit" value={form.ci_nit} onChange={handleChange} placeholder="Ej: 12345678" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Teléfono 1</label>
              <input type="text" name="telefono" value={form.telefono} onChange={handleChange} placeholder="Ej: 70012345" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Teléfono 2 (opcional)</label>
              <input type="text" name="telefono2" value={form.telefono2} onChange={handleChange} placeholder="Ej: 60098765" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Tipo de evento</label>
              <select name="tipo_evento" value={form.tipo_evento} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Seleccioná</option>
                <option value="cumpleaños">Cumpleaños</option>
                <option value="boda">Boda</option>
                <option value="bautizo">Bautizo</option>
                <option value="quinceañera">Quinceañera</option>
                <option value="reunion">Reunión</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Monto del alquiler (Bs.)</label>
              <input type="number" name="monto_total" value={form.monto_total} onChange={handleChange} placeholder="Ej: 2000" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>

            <div className="col-span-2 bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Fecha del evento</label>
                  <input type="date" name="fecha" value={form.fecha} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" />
                </div>
                <div className="flex flex-col justify-end">
                  <div className="flex items-center gap-3 mb-2">
                    <input type="checkbox" name="dos_dias" id="dos_dias" checked={form.dos_dias} onChange={handleChange} className="w-4 h-4 accent-blue-600" />
                    <label htmlFor="dos_dias" className="text-sm font-medium text-gray-700">Ocupa 2 días</label>
                  </div>
                  {form.dos_dias && (
                    <div>
                      <label className="text-sm text-gray-600 block mb-1">Fecha fin</label>
                      <input type="date" name="fecha_fin" value={form.fecha_fin} onChange={handleChange} required={form.dos_dias} min={form.fecha} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-span-2 bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <input type="checkbox" name="incluye_lavado" id="incluye_lavado" checked={form.incluye_lavado} onChange={handleChange} className="w-4 h-4 accent-blue-600" />
                <label htmlFor="incluye_lavado" className="text-sm font-medium text-gray-700">Incluye servicio de lavado</label>
              </div>
              {form.incluye_lavado && (
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Monto del lavado (Bs.)</label>
                  <input type="number" name="monto_lavado" value={form.monto_lavado} onChange={handleChange} placeholder="Ej: 300" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              )}
            </div>

            <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-xl p-4 grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-blue-500 font-medium">Monto total</p>
                <p className="text-xl font-bold text-blue-700">Bs. {montoTotalFinal.toFixed(2)}</p>
                {form.incluye_lavado && montoLavado > 0 && <p className="text-xs text-blue-400">Alquiler + lavado</p>}
              </div>
              <div>
                <label className="text-xs text-blue-500 font-medium block mb-1">Adelanto (Bs.)</label>
                <input type="number" name="adelanto" value={form.adelanto} onChange={handleChange} placeholder="0" className="w-full border border-blue-300 rounded-lg px-3 py-1.5 text-sm bg-white" />
              </div>
              <div>
                <p className="text-xs text-blue-500 font-medium">Saldo pendiente</p>
                <p className={`text-xl font-bold ${saldoPendiente > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                  Bs. {saldoPendiente > 0 ? saldoPendiente.toFixed(2) : '0.00'}
                </p>
              </div>
            </div>

            <div className="col-span-2">
              <label className="text-sm text-gray-600 block mb-1">Observaciones</label>
              <textarea name="observaciones" value={form.observaciones} onChange={handleChange} placeholder="Notas adicionales..." rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
            </div>
            <div className="col-span-2">
              <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'Guardando...' : 'Registrar reserva'}
              </button>
            </div>
          </form>
        </div>
      )}

      {tab === 'eventos' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Todos los eventos</h2>
          {eventos.length === 0 ? (
            <p className="text-gray-400 text-sm">No hay eventos registrados.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {eventos.map(e => (
                <div key={e.id} className={`border rounded-xl p-4 ${e.estado === 'completado' ? 'border-green-200 bg-green-50' : Number(e.saldo_pendiente) > 0 ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-800">{e.clientes?.nombre}</p>
                      <p className="text-sm text-gray-500">{e.tipo_evento} — {e.fecha}{e.fecha_fin ? ` al ${e.fecha_fin}` : ''}</p>
                      <p className="text-sm text-gray-500">Tel: {e.clientes?.telefono}{e.clientes?.telefono2 ? ` / ${e.clientes.telefono2}` : ''}{e.clientes?.ci_nit ? ` | CI: ${e.clientes.ci_nit}` : ''}</p>
                      {e.observaciones && <p className="text-sm text-gray-400 mt-1">{e.observaciones}</p>}
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${e.estado === 'completado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {e.estado === 'completado' ? 'Completado' : 'Reservado'}
                      </span>
                      <p className="text-sm mt-2 text-gray-600">Adelanto: Bs. {Number(e.adelanto).toFixed(2)}</p>
                      <p className={`text-sm font-medium ${Number(e.saldo_pendiente) > 0 ? 'text-yellow-700' : 'text-green-600'}`}>
                        Saldo: Bs. {Number(e.saldo_pendiente).toFixed(2)}
                      </p>
                      <div className="flex gap-2 mt-2 justify-end">
                        {e.estado !== 'completado' && Number(e.saldo_pendiente) > 0 && (
                          <button onClick={() => marcarPagado(e.id)} className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-green-700">Pagado</button>
                        )}
                        <button onClick={() => setEditandoEvento({...e, clientes: {...e.clientes}})} className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-xs font-medium hover:bg-blue-100">Editar</button>
                        <button onClick={() => eliminarEvento(e.id)} className="bg-red-50 text-red-500 px-3 py-1 rounded-lg text-xs font-medium hover:bg-red-100">Eliminar</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal editar evento */}
      {editandoEvento && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 overflow-y-auto py-6" onClick={() => setEditandoEvento(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Editar evento</h3>
              <button onClick={() => setEditandoEvento(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1">Nombre</label>
                <input type="text" name="nombre" value={editandoEvento.clientes?.nombre || ''} onChange={e => setEditandoEvento({...editandoEvento, clientes: {...editandoEvento.clientes, nombre: e.target.value}})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">CI / NIT</label>
                <input type="text" name="ci_nit" value={editandoEvento.clientes?.ci_nit || ''} onChange={e => setEditandoEvento({...editandoEvento, clientes: {...editandoEvento.clientes, ci_nit: e.target.value}})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Teléfono 1</label>
                <input type="text" name="telefono" value={editandoEvento.clientes?.telefono || ''} onChange={e => setEditandoEvento({...editandoEvento, clientes: {...editandoEvento.clientes, telefono: e.target.value}})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Teléfono 2</label>
                <input type="text" name="telefono2" value={editandoEvento.clientes?.telefono2 || ''} onChange={e => setEditandoEvento({...editandoEvento, clientes: {...editandoEvento.clientes, telefono2: e.target.value}})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Tipo de evento</label>
                <select name="tipo_evento" value={editandoEvento.tipo_evento} onChange={handleChangeEditar} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="cumpleaños">Cumpleaños</option>
                  <option value="boda">Boda</option>
                  <option value="bautizo">Bautizo</option>
                  <option value="quinceañera">Quinceañera</option>
                  <option value="reunion">Reunión</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Estado</label>
                <select name="estado" value={editandoEvento.estado} onChange={handleChangeEditar} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="reservado">Reservado</option>
                  <option value="completado">Completado</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Fecha inicio</label>
                <input type="date" name="fecha" value={editandoEvento.fecha} onChange={handleChangeEditar} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Fecha fin (opcional)</label>
                <input type="date" name="fecha_fin" value={editandoEvento.fecha_fin || ''} onChange={handleChangeEditar} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Adelanto (Bs.)</label>
                <input type="number" name="adelanto" value={editandoEvento.adelanto} onChange={handleChangeEditar} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Saldo pendiente (Bs.)</label>
                <input type="number" name="saldo_pendiente" value={editandoEvento.saldo_pendiente} onChange={handleChangeEditar} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="text-sm text-gray-600 block mb-1">Observaciones</label>
                <textarea name="observaciones" value={editandoEvento.observaciones || ''} onChange={handleChangeEditar} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditandoEvento(null)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl text-sm font-medium hover:bg-gray-200">Cancelar</button>
              <button onClick={guardarEdicionEvento} disabled={loading} className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Alquiler
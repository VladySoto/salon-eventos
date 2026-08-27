import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import Toast from '../../components/Toast'

function obtenerFechaHoy() {
  return new Date().toISOString().split('T')[0]
}

function Cervezas() {
  const [compras, setCompras] = useState([])
  const [cajas, setCajas] = useState([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('compras')
  const [form, setForm] = useState({
    fecha: obtenerFechaHoy(),
    cantidad_cajas: '',
    precio_unitario: '',
    monto_pagado: ''
  })
  const [formCajas, setFormCajas] = useState({
    fecha: obtenerFechaHoy(),
    tipo: '',
    cajas_recibidas: '',
    monto: ''
  })
  const [editandoCompra, setEditandoCompra] = useState(null)
  const [editandoCaja, setEditandoCaja] = useState(null)

  useEffect(() => {
    cargarCompras()
    cargarCajas()
  }, [])

  const [toast, setToast] = useState(null)

  function mostrarToast(mensaje, tipo = 'exito') {
  setToast({ mensaje, tipo })
  }

  async function cargarCompras() {
    const { data } = await supabase.from('compras_cerveza').select('*').order('created_at', { ascending: false })
    if (data) setCompras(data)
  }

  async function cargarCajas() {
    const { data } = await supabase.from('cajas_vacias').select('*').order('created_at', { ascending: false })
    if (data) setCajas(data)
  }

  function handleChange(e) { setForm({ ...form, [e.target.name]: e.target.value }) }
  function handleChangeCajas(e) { setFormCajas({ ...formCajas, [e.target.name]: e.target.value }) }
  function handleChangeEditar(e) { setEditandoCompra({ ...editandoCompra, [e.target.name]: e.target.value }) }
  function handleChangeEditarCaja(e) { setEditandoCaja({ ...editandoCaja, [e.target.name]: e.target.value }) }

  async function handleSubmitCompra(e) {
    e.preventDefault()
    setLoading(true)
    const cantidad = parseInt(form.cantidad_cajas)
    const precio = parseFloat(form.precio_unitario)
    const pagado = parseFloat(form.monto_pagado) || 0
    const total = cantidad * precio
    const deuda = total - pagado
    const { error } = await supabase.from('compras_cerveza').insert({
      fecha: form.fecha, cantidad_cajas: cantidad, precio_unitario: precio, total, monto_pagado: pagado, deuda_pendiente: deuda
    })
    if (!error) {
  setForm({ fecha: obtenerFechaHoy(), cantidad_cajas: '', precio_unitario: '', monto_pagado: '' })
  cargarCompras()
  mostrarToast('Compra registrada correctamente')
} else {
  mostrarToast('Error al registrar la compra', 'error')
}
    setLoading(false)
  }

  async function handleSubmitCajas(e) {
    e.preventDefault()
    setLoading(true)
    const recibidas = parseInt(formCajas.cajas_recibidas)
    const devueltas = formCajas.tipo === 'devolucion' ? recibidas : 0
    const pendientes = formCajas.tipo === 'debe' ? recibidas : 0
    const { error } = await supabase.from('cajas_vacias').insert({
      fecha: formCajas.fecha, tipo: formCajas.tipo, cajas_recibidas: recibidas, cajas_devueltas: devueltas, cajas_pendientes: pendientes, monto: parseFloat(formCajas.monto) || 0
    })
    if (!error) {
  setFormCajas({ fecha: obtenerFechaHoy(), tipo: '', cajas_recibidas: '', monto: '' })
  cargarCajas()
  mostrarToast('Movimiento de cajas registrado')
} else {
  mostrarToast('Error al registrar', 'error')
}
    setLoading(false)
  }

  async function guardarEdicionCompra() {
    setLoading(true)
    const cantidad = parseInt(editandoCompra.cantidad_cajas)
    const precio = parseFloat(editandoCompra.precio_unitario)
    const pagado = parseFloat(editandoCompra.monto_pagado) || 0
    const total = cantidad * precio
    const deuda = total - pagado
    await supabase.from('compras_cerveza').update({
      fecha: editandoCompra.fecha, cantidad_cajas: cantidad, precio_unitario: precio, total, monto_pagado: pagado, deuda_pendiente: deuda
    }).eq('id', editandoCompra.id)
    setEditandoCompra(null)
    cargarCompras()
    mostrarToast('Compra actualizada correctamente')
    setLoading(false)
  }

  async function guardarEdicionCaja() {
    setLoading(true)
    const recibidas = parseInt(editandoCaja.cajas_recibidas)
    const devueltas = editandoCaja.tipo === 'devolucion' ? recibidas : 0
    const pendientes = editandoCaja.tipo === 'debe' ? recibidas : 0
    await supabase.from('cajas_vacias').update({
      fecha: editandoCaja.fecha, tipo: editandoCaja.tipo, cajas_recibidas: recibidas, cajas_devueltas: devueltas, cajas_pendientes: pendientes, monto: parseFloat(editandoCaja.monto) || 0
    }).eq('id', editandoCaja.id)
    setEditandoCaja(null)
    cargarCajas()
    mostrarToast('Registro actualizado correctamente')
    setLoading(false)
  }

  async function eliminarCompra(id) {
    if (!confirm('¿Seguro que querés eliminar esta compra?')) return
    await supabase.from('compras_cerveza').delete().eq('id', id)
cargarCompras()
mostrarToast('Compra eliminada', 'alerta')
  }

  async function eliminarCaja(id) {
    if (!confirm('¿Seguro que querés eliminar este registro?')) return
    await supabase.from('cajas_vacias').delete().eq('id', id)
cargarCajas()
mostrarToast('Registro eliminado', 'alerta')
  }

  const totalDeuda = compras.reduce((acc, c) => acc + Number(c.deuda_pendiente), 0)
  const totalDebe = cajas.filter(c => c.tipo === 'debe').reduce((acc, c) => acc + Number(c.cajas_recibidas), 0)
  const totalDevuelto = cajas.filter(c => c.tipo === 'devolucion').reduce((acc, c) => acc + Number(c.cajas_recibidas), 0)
  const totalCajasPendientes = totalDebe - totalDevuelto

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-xl md:text-2xl font-bold text-gray-800">Módulo de Cervezas</h1>
      <p className="text-gray-500 mt-1 mb-4 text-sm">Control de compras, cajas y deudas</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-600 font-medium">Deuda con distribuidor</p>
          <p className="text-2xl font-bold text-red-700">Bs. {totalDeuda.toFixed(2)}</p>
        </div>
        <div className={`border rounded-xl p-4 ${totalCajasPendientes > 100 ? 'bg-orange-50 border-orange-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <p className={`text-sm font-medium ${totalCajasPendientes > 100 ? 'text-orange-600' : 'text-yellow-600'}`}>Cajas vacías pendientes</p>
          <p className={`text-2xl font-bold ${totalCajasPendientes > 100 ? 'text-orange-700' : 'text-yellow-700'}`}>{totalCajasPendientes} cajas</p>
          {totalCajasPendientes > 100 && <p className="text-xs text-orange-500 mt-1">⚠️ Muchas cajas pendientes</p>}
        </div>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        <button onClick={() => setTab('compras')} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${tab === 'compras' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>Compras al distribuidor</button>
        <button onClick={() => setTab('cajas')} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${tab === 'cajas' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>Cajas vacías</button>
      </div>

      {tab === 'compras' && (
        <>
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
            <h2 className="text-base font-semibold text-gray-700 mb-4">Registrar nueva compra</h2>
            <form onSubmit={handleSubmitCompra} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1">Fecha</label>
                <input type="date" name="fecha" value={form.fecha} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Cantidad de cajas</label>
                <input type="number" min="0" name="cantidad_cajas" value={form.cantidad_cajas} onChange={handleChange} placeholder="Ej: 100" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Precio por caja (Bs.)</label>
                <input type="number" min="0" name="precio_unitario" value={form.precio_unitario} onChange={handleChange} placeholder="Ej: 120" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Monto pagado (Bs.)</label>
                <input type="number" min="0" name="monto_pagado" value={form.monto_pagado} onChange={handleChange} placeholder="0 si es todo a deuda" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="col-span-1 md:col-span-2">
                <button type="submit" disabled={loading} className="w-full md:w-auto bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {loading ? 'Guardando...' : 'Registrar compra'}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h2 className="text-base font-semibold text-gray-700 mb-4">Historial de compras</h2>
            {compras.length === 0 ? (
              <p className="text-gray-400 text-sm">No hay compras registradas.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {compras.map(c => (
                  <div key={c.id} className="border border-gray-100 rounded-xl p-3 bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{c.fecha}</p>
                        <p className="text-xs text-gray-500">{c.cantidad_cajas} cajas — Bs. {Number(c.total).toFixed(2)}</p>
                      </div>
                      <span className={`text-sm font-bold ${Number(c.deuda_pendiente) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        Deuda: Bs. {Number(c.deuda_pendiente).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-gray-500">Pagado: Bs. {Number(c.monto_pagado).toFixed(2)}</p>
                      <div className="flex gap-2">
                        <button onClick={() => setEditandoCompra({...c})} className="text-blue-600 text-xs font-medium bg-blue-50 px-2 py-1 rounded-lg">Editar</button>
                        <button onClick={() => eliminarCompra(c.id)} className="text-red-500 text-xs font-medium bg-red-50 px-2 py-1 rounded-lg">Eliminar</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'cajas' && (
        <>
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
            <h2 className="text-base font-semibold text-gray-700 mb-4">Registrar movimiento de cajas</h2>
            <form onSubmit={handleSubmitCajas} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1">Fecha</label>
                <input type="date" name="fecha" value={formCajas.fecha} onChange={handleChangeCajas} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Tipo</label>
                <select name="tipo" value={formCajas.tipo} onChange={handleChangeCajas} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Seleccioná</option>
                  <option value="debe">Debe (cajas recibidas a devolver)</option>
                  <option value="devolucion">Devolución (cajas que devolví)</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Cantidad de cajas</label>
                <input type="number" min="0" name="cajas_recibidas" value={formCajas.cajas_recibidas} onChange={handleChangeCajas} placeholder="Ej: 71" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Monto (Bs.)</label>
                <input type="number" min="0" name="monto" value={formCajas.monto} onChange={handleChangeCajas} placeholder="Ej: 13260" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="col-span-1 md:col-span-2">
                <button type="submit" disabled={loading} className="w-full md:w-auto bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {loading ? 'Guardando...' : 'Registrar movimiento'}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h2 className="text-base font-semibold text-gray-700 mb-4">Historial de cajas</h2>
            {cajas.length === 0 ? (
              <p className="text-gray-400 text-sm">No hay movimientos registrados.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {cajas.map(c => (
                  <div key={c.id} className="border border-gray-100 rounded-xl p-3 bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{c.fecha}</p>
                        <p className="text-xs text-gray-500">{c.cajas_recibidas} cajas</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${c.tipo === 'debe' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {c.tipo === 'debe' ? 'Debe' : 'Devolución'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-gray-500">Monto: Bs. {Number(c.monto || 0).toFixed(2)}</p>
                      <div className="flex gap-2">
                        <button onClick={() => setEditandoCaja({...c})} className="text-blue-600 text-xs font-medium bg-blue-50 px-2 py-1 rounded-lg">Editar</button>
                        <button onClick={() => eliminarCaja(c.id)} className="text-red-500 text-xs font-medium bg-red-50 px-2 py-1 rounded-lg">Eliminar</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal editar compra */}
      {editandoCompra && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-end md:items-center justify-center z-50" onClick={() => setEditandoCompra(null)}>
          <div className="bg-white rounded-t-2xl md:rounded-2xl p-6 w-full md:max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Editar compra</h3>
              <button onClick={() => setEditandoCompra(null)} className="text-gray-400 text-xl font-bold">✕</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1">Fecha</label>
                <input type="date" name="fecha" value={editandoCompra.fecha} onChange={handleChangeEditar} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Cantidad de cajas</label>
                <input type="number" min="0" name="cantidad_cajas" value={editandoCompra.cantidad_cajas} onChange={handleChangeEditar} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Precio por caja (Bs.)</label>
                <input type="number" min="0" name="precio_unitario" value={editandoCompra.precio_unitario} onChange={handleChangeEditar} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Monto pagado (Bs.)</label>
                <input type="number" min="0" name="monto_pagado" value={editandoCompra.monto_pagado} onChange={handleChangeEditar} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditandoCompra(null)} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm font-medium">Cancelar</button>
              <button onClick={guardarEdicionCompra} disabled={loading} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50">
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar caja */}
      {editandoCaja && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-end md:items-center justify-center z-50" onClick={() => setEditandoCaja(null)}>
          <div className="bg-white rounded-t-2xl md:rounded-2xl p-6 w-full md:max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Editar cajas</h3>
              <button onClick={() => setEditandoCaja(null)} className="text-gray-400 text-xl font-bold">✕</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1">Fecha</label>
                <input type="date" name="fecha" value={editandoCaja.fecha} onChange={handleChangeEditarCaja} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Tipo</label>
                <select name="tipo" value={editandoCaja.tipo} onChange={handleChangeEditarCaja} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="debe">Debe</option>
                  <option value="devolucion">Devolución</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Cantidad de cajas</label>
                <input type="number" min="0" name="cajas_recibidas" value={editandoCaja.cajas_recibidas} onChange={handleChangeEditarCaja} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Monto (Bs.)</label>
                <input type="number" min="0" name="monto" value={editandoCaja.monto} onChange={handleChangeEditarCaja} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditandoCaja(null)} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm font-medium">Cancelar</button>
              <button onClick={guardarEdicionCaja} disabled={loading} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50">
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && <Toast mensaje={toast.mensaje} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}

export default Cervezas
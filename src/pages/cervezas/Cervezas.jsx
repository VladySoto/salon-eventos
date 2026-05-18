import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'

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

  async function cargarCompras() {
    const { data } = await supabase.from('compras_cerveza').select('*').order('created_at', { ascending: false })
    if (data) setCompras(data)
  }

  async function cargarCajas() {
    const { data } = await supabase.from('cajas_vacias').select('*').order('created_at', { ascending: false })
    if (data) setCajas(data)
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function handleChangeCajas(e) {
    setFormCajas({ ...formCajas, [e.target.name]: e.target.value })
  }

  function handleChangeEditar(e) {
    setEditandoCompra({ ...editandoCompra, [e.target.name]: e.target.value })
  }

  function handleChangeEditarCaja(e) {
    setEditandoCaja({ ...editandoCaja, [e.target.name]: e.target.value })
  }

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
    setLoading(false)
  }

  async function eliminarCompra(id) {
    if (!confirm('¿Seguro que querés eliminar esta compra?')) return
    await supabase.from('compras_cerveza').delete().eq('id', id)
    cargarCompras()
  }

  async function eliminarCaja(id) {
    if (!confirm('¿Seguro que querés eliminar este registro?')) return
    await supabase.from('cajas_vacias').delete().eq('id', id)
    cargarCajas()
  }

  const totalDeuda = compras.reduce((acc, c) => acc + Number(c.deuda_pendiente), 0)
  const totalDebe = cajas.filter(c => c.tipo === 'debe').reduce((acc, c) => acc + Number(c.cajas_recibidas), 0)
  const totalDevuelto = cajas.filter(c => c.tipo === 'devolucion').reduce((acc, c) => acc + Number(c.cajas_recibidas), 0)
  const totalCajasPendientes = totalDebe - totalDevuelto

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800">Módulo de Cervezas</h1>
      <p className="text-gray-500 mt-1 mb-6">Control de compras, cajas y deudas</p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-600 font-medium">Deuda con distribuidor</p>
          <p className="text-3xl font-bold text-red-700">Bs. {totalDeuda.toFixed(2)}</p>
        </div>
        <div className={`border rounded-xl p-4 ${totalCajasPendientes > 100 ? 'bg-orange-50 border-orange-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <p className={`text-sm font-medium ${totalCajasPendientes > 100 ? 'text-orange-600' : 'text-yellow-600'}`}>Cajas vacías pendientes</p>
          <p className={`text-3xl font-bold ${totalCajasPendientes > 100 ? 'text-orange-700' : 'text-yellow-700'}`}>{totalCajasPendientes} cajas</p>
          {totalCajasPendientes > 100 && <p className="text-xs text-orange-500 mt-1">⚠️ Muchas cajas pendientes</p>}
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('compras')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'compras' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>Compras al distribuidor</button>
        <button onClick={() => setTab('cajas')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'cajas' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>Cajas vacías</button>
      </div>

      {tab === 'compras' && (
        <>
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Registrar nueva compra</h2>
            <form onSubmit={handleSubmitCompra} className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1">Fecha</label>
                <input type="date" name="fecha" value={form.fecha} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Cantidad de cajas</label>
                <input type="number" name="cantidad_cajas" value={form.cantidad_cajas} onChange={handleChange} placeholder="Ej: 100" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Precio por caja (Bs.)</label>
                <input type="number" name="precio_unitario" value={form.precio_unitario} onChange={handleChange} placeholder="Ej: 120" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Monto pagado (Bs.)</label>
                <input type="number" name="monto_pagado" value={form.monto_pagado} onChange={handleChange} placeholder="0 si es todo a deuda" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="col-span-2">
                <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {loading ? 'Guardando...' : 'Registrar compra'}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Historial de compras</h2>
            {compras.length === 0 ? (
              <p className="text-gray-400 text-sm">No hay compras registradas.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="pb-2">Fecha</th>
                    <th className="pb-2">Cajas</th>
                    <th className="pb-2">Total</th>
                    <th className="pb-2">Pagado</th>
                    <th className="pb-2">Deuda</th>
                    <th className="pb-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {compras.map(c => (
                    <tr key={c.id} className="border-b border-gray-50">
                      <td className="py-2">{c.fecha}</td>
                      <td className="py-2">{c.cantidad_cajas}</td>
                      <td className="py-2">Bs. {Number(c.total).toFixed(2)}</td>
                      <td className="py-2">Bs. {Number(c.monto_pagado).toFixed(2)}</td>
                      <td className="py-2">
                        <span className={`font-medium ${Number(c.deuda_pendiente) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          Bs. {Number(c.deuda_pendiente).toFixed(2)}
                        </span>
                      </td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          <button onClick={() => setEditandoCompra({...c})} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Editar</button>
                          <button onClick={() => eliminarCompra(c.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {tab === 'cajas' && (
        <>
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Registrar movimiento de cajas</h2>
            <form onSubmit={handleSubmitCajas} className="grid grid-cols-2 gap-4">
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
                <input type="number" name="cajas_recibidas" value={formCajas.cajas_recibidas} onChange={handleChangeCajas} placeholder="Ej: 71" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Monto (Bs.)</label>
                <input type="number" name="monto" value={formCajas.monto} onChange={handleChangeCajas} placeholder="Ej: 13260" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="col-span-2">
                <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {loading ? 'Guardando...' : 'Registrar movimiento'}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Historial de cajas</h2>
            {cajas.length === 0 ? (
              <p className="text-gray-400 text-sm">No hay movimientos registrados.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="pb-2">Fecha</th>
                    <th className="pb-2">Tipo</th>
                    <th className="pb-2">Cajas</th>
                    <th className="pb-2">Monto</th>
                    <th className="pb-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cajas.map(c => (
                    <tr key={c.id} className="border-b border-gray-50">
                      <td className="py-2">{c.fecha}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.tipo === 'debe' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {c.tipo === 'debe' ? 'Debe' : 'Devolución'}
                        </span>
                      </td>
                      <td className="py-2">{c.cajas_recibidas}</td>
                      <td className="py-2">Bs. {Number(c.monto || 0).toFixed(2)}</td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          <button onClick={() => setEditandoCaja({...c})} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Editar</button>
                          <button onClick={() => eliminarCaja(c.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Modal editar compra */}
      {editandoCompra && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setEditandoCompra(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Editar compra</h3>
              <button onClick={() => setEditandoCompra(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1">Fecha</label>
                <input type="date" name="fecha" value={editandoCompra.fecha} onChange={handleChangeEditar} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Cantidad de cajas</label>
                <input type="number" name="cantidad_cajas" value={editandoCompra.cantidad_cajas} onChange={handleChangeEditar} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Precio por caja (Bs.)</label>
                <input type="number" name="precio_unitario" value={editandoCompra.precio_unitario} onChange={handleChangeEditar} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Monto pagado (Bs.)</label>
                <input type="number" name="monto_pagado" value={editandoCompra.monto_pagado} onChange={handleChangeEditar} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditandoCompra(null)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl text-sm font-medium hover:bg-gray-200">Cancelar</button>
              <button onClick={guardarEdicionCompra} disabled={loading} className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar caja */}
      {editandoCaja && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setEditandoCaja(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Editar movimiento de cajas</h3>
              <button onClick={() => setEditandoCaja(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
                <input type="number" name="cajas_recibidas" value={editandoCaja.cajas_recibidas} onChange={handleChangeEditarCaja} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Monto (Bs.)</label>
                <input type="number" name="monto" value={editandoCaja.monto} onChange={handleChangeEditarCaja} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditandoCaja(null)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl text-sm font-medium hover:bg-gray-200">Cancelar</button>
              <button onClick={guardarEdicionCaja} disabled={loading} className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Cervezas
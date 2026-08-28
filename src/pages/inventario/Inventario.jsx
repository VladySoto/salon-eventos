import { useState, useEffect } from 'react'
import Toast from '../../components/Toast'
import {
  CATEGORIAS_INVENTARIO,
  listarItemsInventario,
  crearItemInventario,
  actualizarItemInventario,
  desactivarItemInventario
} from '../../services/inventarioService'

const ETIQUETA_CATEGORIA = { cocina: 'Cocina', bar: 'Bar' }

function formVacio() {
  return { nombre: '', categoria: 'cocina', cantidad_actual: '', precio_unitario: '', activo: true }
}

function Inventario() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('catalogo')
  const [modalItem, setModalItem] = useState(null)
  const [form, setForm] = useState(formVacio())
  const [toast, setToast] = useState(null)

  function mostrarToast(mensaje, tipo = 'exito') {
    setToast({ mensaje, tipo })
  }

  useEffect(() => { cargarItems() }, [])

  async function cargarItems() {
    const { data, error } = await listarItemsInventario()
    if (!error) setItems(data || [])
  }

  function handleChange(e) {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm({ ...form, [e.target.name]: value })
  }

  function abrirNuevo() {
    setForm(formVacio())
    setModalItem({})
  }

  function abrirEditar(item) {
    setForm({
      nombre: item.nombre,
      categoria: item.categoria,
      cantidad_actual: item.cantidad_actual,
      precio_unitario: item.precio_unitario,
      activo: item.activo
    })
    setModalItem(item)
  }

  async function guardarItem(e) {
    e.preventDefault()
    setLoading(true)
    const esEdicion = Boolean(modalItem?.id)
    const { error } = esEdicion
      ? await actualizarItemInventario(modalItem.id, form)
      : await crearItemInventario(form)
    if (!error) {
      setModalItem(null)
      cargarItems()
      mostrarToast(esEdicion ? 'Ítem actualizado correctamente' : 'Ítem creado correctamente')
    } else {
      mostrarToast(esEdicion ? 'Error al actualizar el ítem' : 'Error al crear el ítem', 'error')
    }
    setLoading(false)
  }

  async function darDeBaja(item) {
    if (!confirm(`¿Dar de baja "${item.nombre}"? Ya no va a aparecer para nuevas actas de entrega.`)) return
    const { error } = await desactivarItemInventario(item.id)
    if (!error) {
      cargarItems()
      mostrarToast('Ítem dado de baja', 'alerta')
    } else {
      mostrarToast('Error al dar de baja el ítem', 'error')
    }
  }

  const itemsPorCategoria = CATEGORIAS_INVENTARIO.map(categoria => ({
    categoria,
    items: items.filter(i => i.categoria === categoria)
  }))

  const itemsActivos = items.filter(i => i.activo)
  const valorTotalStock = itemsActivos.reduce((acc, i) => acc + Number(i.cantidad_actual) * Number(i.precio_unitario), 0)

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-xl md:text-2xl font-bold text-gray-800">Inventario de Cocina y Bar</h1>
      <p className="text-gray-500 mt-1 mb-4 text-sm">Catálogo de ítems y stock actual</p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <p className="text-xs text-blue-600 font-medium">Ítems activos</p>
          <p className="text-2xl font-bold text-blue-700">{itemsActivos.length}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
          <p className="text-xs text-purple-600 font-medium">Valor total en stock</p>
          <p className="text-lg font-bold text-purple-700">Bs. {valorTotalStock.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        <button onClick={() => setTab('catalogo')} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${tab === 'catalogo' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>Catálogo</button>
        <button onClick={() => setTab('stock')} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${tab === 'stock' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>Stock actual</button>
      </div>

      {tab === 'catalogo' && (
        <div className="flex flex-col gap-4">
          <button onClick={abrirNuevo} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium self-start">+ Nuevo ítem</button>

          {itemsPorCategoria.map(({ categoria, items: itemsCategoria }) => (
            <div key={categoria} className="bg-white border border-gray-200 rounded-xl p-4">
              <h2 className="text-base font-semibold text-gray-700 mb-3">{ETIQUETA_CATEGORIA[categoria]}</h2>
              {itemsCategoria.length === 0 ? (
                <p className="text-gray-400 text-sm">No hay ítems en esta categoría.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {itemsCategoria.map(item => (
                    <div key={item.id} className={`flex items-center justify-between border border-gray-100 bg-gray-50 rounded-lg p-3 ${!item.activo ? 'opacity-50' : ''}`}>
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {item.nombre}
                          {!item.activo && <span className="ml-2 text-xs text-gray-400 font-normal">(inactivo)</span>}
                        </p>
                        <p className="text-xs text-gray-500">Stock: {item.cantidad_actual} — Bs. {Number(item.precio_unitario).toFixed(2)} c/u</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => abrirEditar(item)} className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-medium">Editar</button>
                        {item.activo && (
                          <button onClick={() => darDeBaja(item)} className="bg-red-50 text-red-500 px-3 py-1.5 rounded-lg text-xs font-medium">Dar de baja</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'stock' && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Stock actual</h2>
          {itemsActivos.length === 0 ? (
            <p className="text-gray-400 text-sm">No hay ítems activos registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                    <th className="py-2 pr-2">Ítem</th>
                    <th className="py-2 pr-2">Categoría</th>
                    <th className="py-2 pr-2 text-right">Cantidad</th>
                    <th className="py-2 pr-2 text-right">Precio</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsActivos.map(item => (
                    <tr key={item.id} className="border-b border-gray-50">
                      <td className="py-2 pr-2 text-gray-800">{item.nombre}</td>
                      <td className="py-2 pr-2 text-gray-500">{ETIQUETA_CATEGORIA[item.categoria]}</td>
                      <td className={`py-2 pr-2 text-right font-medium ${Number(item.cantidad_actual) === 0 ? 'text-red-600' : 'text-gray-800'}`}>{item.cantidad_actual}</td>
                      <td className="py-2 pr-2 text-right text-gray-500">Bs. {Number(item.precio_unitario).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal alta/edición de ítem */}
      {modalItem && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-end md:items-center justify-center z-50" onClick={() => setModalItem(null)}>
          <div className="bg-white rounded-t-2xl md:rounded-2xl p-6 w-full md:max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">{modalItem.id ? 'Editar ítem' : 'Nuevo ítem'}</h3>
              <button onClick={() => setModalItem(null)} className="text-gray-400 text-xl font-bold">✕</button>
            </div>
            <form onSubmit={guardarItem} className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1">Nombre</label>
                <input type="text" name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ej: Copa de vidrio" required className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Categoría</label>
                <select name="categoria" value={form.categoria} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm">
                  {CATEGORIAS_INVENTARIO.map(c => <option key={c} value={c}>{ETIQUETA_CATEGORIA[c]}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Cantidad {modalItem.id ? 'actual' : 'inicial'}</label>
                  <input type="number" min="0" name="cantidad_actual" value={form.cantidad_actual} onChange={handleChange} placeholder="0" required className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Precio unitario (Bs.)</label>
                  <input type="number" min="0" name="precio_unitario" value={form.precio_unitario} onChange={handleChange} placeholder="0" required className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
                </div>
              </div>
              {modalItem.id && (
                <div className="flex items-center gap-3">
                  <input type="checkbox" name="activo" id="activo" checked={form.activo} onChange={handleChange} className="w-4 h-4 accent-blue-600" />
                  <label htmlFor="activo" className="text-sm font-medium text-gray-700">Activo</label>
                </div>
              )}
              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setModalItem(null)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl text-sm font-medium">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white py-3 rounded-xl text-sm font-medium disabled:opacity-50">
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <Toast mensaje={toast.mensaje} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}

export default Inventario

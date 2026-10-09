import { useState, useEffect } from 'react'
import Toast from '../../components/Toast'
import AvisoCarga from '../../components/AvisoCarga'
import CampoCantidad from '../../components/CampoCantidad'
import Modal from '../../components/ui/Modal'
import Campo, { Entrada, Selector } from '../../components/ui/Campo'
import Boton from '../../components/ui/Boton'
import { useConfirmar } from '../../hooks/useConfirmar'
import { fechaLocalISO, formatearFecha } from '../../utils/fechas'
import { TIPOS_MOVIMIENTO_CAJAS, UMBRAL_CAJAS_PENDIENTES, LIMITE_HISTORIAL } from '../../constants'
import {
  cargarDatosCervezas,
  registrarCompra,
  actualizarCompra,
  eliminarCompra,
  registrarMovimientoCajas,
  actualizarMovimientoCajas,
  eliminarMovimientoCajas
} from '../../services/cervezasService'

function formCompraVacio() {
  return { fecha: fechaLocalISO(), cantidad_cajas: '', precio_unitario: '', monto_pagado: '' }
}

function formCajasVacio() {
  return { fecha: fechaLocalISO(), tipo: '', cajas_recibidas: '', monto: '' }
}

function claseTab(activa) {
  return `px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap ${activa ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`
}

function Cervezas() {
  const [compras, setCompras] = useState([])
  const [cajas, setCajas] = useState([])
  const [resumen, setResumen] = useState({ deuda: 0, cajasPendientes: 0 })
  const [guardando, setGuardando] = useState(false)
  const [tab, setTab] = useState('compras')
  const [form, setForm] = useState(formCompraVacio)
  const [formCajas, setFormCajas] = useState(formCajasVacio)
  const [editandoCompra, setEditandoCompra] = useState(null)
  const [editandoCaja, setEditandoCaja] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState(false)
  const [intento, setIntento] = useState(0)
  const [toast, setToast] = useState(null)
  const [confirmar, dialogoConfirmacion] = useConfirmar()

  function mostrarToast(mensaje, tipo = 'exito') {
    setToast({ mensaje, tipo })
  }

  function aplicarDatos(resultado) {
    setCompras(resultado.compras)
    setCajas(resultado.cajas)
    setResumen(resultado.resumen)
  }

  // Recarga después de guardar algo
  async function cargarDatos() {
    const resultado = await cargarDatosCervezas()
    if (!resultado.error) aplicarDatos(resultado)
  }

  useEffect(() => {
    let activo = true
    cargarDatosCervezas().then(resultado => {
      if (!activo) return
      if (resultado.error) {
        setErrorCarga(true)
      } else {
        setErrorCarga(false)
        aplicarDatos(resultado)
      }
      setCargando(false)
    })
    return () => { activo = false }
  }, [intento])

  function reintentarCarga() {
    setCargando(true)
    setErrorCarga(false)
    setIntento(n => n + 1)
  }

  // Muestra el error si lo hubo; si no, recarga los datos y muestra el aviso de éxito.
  async function terminar(error, mensajeExito, tipoExito = 'exito') {
    if (error) {
      mostrarToast(error, 'error')
      return false
    }
    await cargarDatos()
    mostrarToast(mensajeExito, tipoExito)
    return true
  }

  function handleChange(e) { setForm({ ...form, [e.target.name]: e.target.value }) }
  function handleChangeCajas(e) { setFormCajas({ ...formCajas, [e.target.name]: e.target.value }) }
  function handleChangeEditar(e) { setEditandoCompra({ ...editandoCompra, [e.target.name]: e.target.value }) }
  function handleChangeEditarCaja(e) { setEditandoCaja({ ...editandoCaja, [e.target.name]: e.target.value }) }

  async function handleSubmitCompra(e) {
    e.preventDefault()
    setGuardando(true)
    const { error } = await registrarCompra(form)
    setGuardando(false)
    if (await terminar(error, 'Compra registrada correctamente')) setForm(formCompraVacio())
  }

  async function handleSubmitCajas(e) {
    e.preventDefault()
    setGuardando(true)
    const { error } = await registrarMovimientoCajas(formCajas)
    setGuardando(false)
    if (await terminar(error, 'Movimiento de cajas registrado')) setFormCajas(formCajasVacio())
  }

  async function guardarEdicionCompra() {
    setGuardando(true)
    const { error } = await actualizarCompra(editandoCompra)
    setGuardando(false)
    if (await terminar(error, 'Compra actualizada correctamente')) setEditandoCompra(null)
  }

  async function guardarEdicionCaja() {
    setGuardando(true)
    const { error } = await actualizarMovimientoCajas(editandoCaja)
    setGuardando(false)
    if (await terminar(error, 'Registro actualizado correctamente')) setEditandoCaja(null)
  }

  async function handleEliminarCompra(id) {
    if (!(await confirmar('¿Seguro que querés eliminar esta compra?', { titulo: 'Eliminar compra', textoConfirmar: 'Eliminar' }))) return
    const { error } = await eliminarCompra(id)
    terminar(error, 'Compra eliminada', 'alerta')
  }

  async function handleEliminarCaja(id) {
    if (!(await confirmar('¿Seguro que querés eliminar este registro?', { titulo: 'Eliminar registro', textoConfirmar: 'Eliminar' }))) return
    const { error } = await eliminarMovimientoCajas(id)
    terminar(error, 'Registro eliminado', 'alerta')
  }

  const hayMuchasCajas = resumen.cajasPendientes > UMBRAL_CAJAS_PENDIENTES

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-xl md:text-2xl font-bold text-gray-800">Módulo de Cervezas</h1>
      <p className="text-gray-500 mt-1 mb-4 text-sm">Control de compras, cajas y deudas</p>

      <AvisoCarga cargando={cargando} error={errorCarga} onReintentar={reintentarCarga} texto="Cargando compras y cajas..." />

      <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 ${cargando ? 'opacity-40' : ''}`}>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-600 font-medium">Deuda con distribuidor</p>
          <p className="text-2xl font-bold text-red-700">Bs. {resumen.deuda.toFixed(2)}</p>
        </div>
        <div className={`border rounded-xl p-4 ${hayMuchasCajas ? 'bg-orange-50 border-orange-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <p className={`text-sm font-medium ${hayMuchasCajas ? 'text-orange-600' : 'text-yellow-600'}`}>Cajas vacías pendientes</p>
          <p className={`text-2xl font-bold ${hayMuchasCajas ? 'text-orange-700' : 'text-yellow-700'}`}>{resumen.cajasPendientes} cajas</p>
          {hayMuchasCajas && <p className="text-xs text-orange-500 mt-1">⚠️ Muchas cajas pendientes</p>}
        </div>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        <button onClick={() => setTab('compras')} className={claseTab(tab === 'compras')}>Compras al distribuidor</button>
        <button onClick={() => setTab('cajas')} className={claseTab(tab === 'cajas')}>Cajas vacías</button>
      </div>

      {tab === 'compras' && (
        <>
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
            <h2 className="text-base font-semibold text-gray-700 mb-4">Registrar nueva compra</h2>
            <form onSubmit={handleSubmitCompra} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Campo etiqueta="Fecha">
                <Entrada type="date" name="fecha" value={form.fecha} onChange={handleChange} required />
              </Campo>
              <Campo etiqueta="Cantidad de cajas">
                <CampoCantidad name="cantidad_cajas" value={form.cantidad_cajas} onChange={handleChange} placeholder="Ej: 100" required />
              </Campo>
              <Campo etiqueta="Precio por caja (Bs.)">
                <Entrada type="number" min="0" step="0.01" name="precio_unitario" value={form.precio_unitario} onChange={handleChange} placeholder="Ej: 120" required />
              </Campo>
              <Campo etiqueta="Monto pagado (Bs.)">
                <Entrada type="number" min="0" step="0.01" name="monto_pagado" value={form.monto_pagado} onChange={handleChange} placeholder="0 si es todo a deuda" />
              </Campo>
              <div className="col-span-1 md:col-span-2">
                <Boton type="submit" cargando={guardando} className="w-full md:w-auto px-6">Registrar compra</Boton>
              </div>
            </form>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h2 className="text-base font-semibold text-gray-700 mb-4">Historial de compras</h2>
            {cargando || errorCarga ? null : compras.length === 0 ? (
              <p className="text-gray-400 text-sm">No hay compras registradas.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {compras.map(c => (
                  <div key={c.id} className="border border-gray-100 rounded-xl p-3 bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{formatearFecha(c.fecha)}</p>
                        <p className="text-sm text-gray-600">{c.cantidad_cajas} cajas — Bs. {Number(c.total).toFixed(2)}</p>
                      </div>
                      <span className={`text-sm font-bold ${Number(c.deuda_pendiente) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        Deuda: Bs. {Number(c.deuda_pendiente).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-600">Pagado: Bs. {Number(c.monto_pagado).toFixed(2)}</p>
                      <div className="flex gap-2">
                        <Boton variante="suave" onClick={() => setEditandoCompra({ ...c })}>Editar</Boton>
                        <Boton variante="peligro" onClick={() => handleEliminarCompra(c.id)}>Eliminar</Boton>
                      </div>
                    </div>
                  </div>
                ))}
                {compras.length >= LIMITE_HISTORIAL && (
                  <p className="text-xs text-gray-400 text-center">Se muestran las últimas {LIMITE_HISTORIAL} compras. Los totales incluyen todo el historial.</p>
                )}
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
              <Campo etiqueta="Fecha">
                <Entrada type="date" name="fecha" value={formCajas.fecha} onChange={handleChangeCajas} required />
              </Campo>
              <Campo etiqueta="Tipo">
                <Selector name="tipo" value={formCajas.tipo} onChange={handleChangeCajas} required>
                  <option value="">Seleccioná</option>
                  <option value={TIPOS_MOVIMIENTO_CAJAS.DEBE}>Debe (cajas recibidas a devolver)</option>
                  <option value={TIPOS_MOVIMIENTO_CAJAS.DEVOLUCION}>Devolución (cajas que devolví)</option>
                </Selector>
              </Campo>
              <Campo etiqueta="Cantidad de cajas">
                <CampoCantidad name="cajas_recibidas" value={formCajas.cajas_recibidas} onChange={handleChangeCajas} placeholder="Ej: 71" required />
              </Campo>
              <Campo etiqueta="Monto (Bs.)">
                <Entrada type="number" min="0" step="0.01" name="monto" value={formCajas.monto} onChange={handleChangeCajas} placeholder="Ej: 13260" />
              </Campo>
              <div className="col-span-1 md:col-span-2">
                <Boton type="submit" cargando={guardando} className="w-full md:w-auto px-6">Registrar movimiento</Boton>
              </div>
            </form>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h2 className="text-base font-semibold text-gray-700 mb-4">Historial de cajas</h2>
            {cargando || errorCarga ? null : cajas.length === 0 ? (
              <p className="text-gray-400 text-sm">No hay movimientos registrados.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {cajas.map(c => (
                  <div key={c.id} className="border border-gray-100 rounded-xl p-3 bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{formatearFecha(c.fecha)}</p>
                        <p className="text-sm text-gray-600">{c.cajas_recibidas} cajas</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${c.tipo === TIPOS_MOVIMIENTO_CAJAS.DEBE ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {c.tipo === TIPOS_MOVIMIENTO_CAJAS.DEBE ? 'Debe' : 'Devolución'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-600">Monto: Bs. {Number(c.monto || 0).toFixed(2)}</p>
                      <div className="flex gap-2">
                        <Boton variante="suave" onClick={() => setEditandoCaja({ ...c })}>Editar</Boton>
                        <Boton variante="peligro" onClick={() => handleEliminarCaja(c.id)}>Eliminar</Boton>
                      </div>
                    </div>
                  </div>
                ))}
                {cajas.length >= LIMITE_HISTORIAL && (
                  <p className="text-xs text-gray-400 text-center">Se muestran los últimos {LIMITE_HISTORIAL} movimientos. Los totales incluyen todo el historial.</p>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {editandoCompra && (
        <Modal titulo="Editar compra" onCerrar={() => setEditandoCompra(null)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Campo etiqueta="Fecha">
              <Entrada type="date" name="fecha" value={editandoCompra.fecha} onChange={handleChangeEditar} />
            </Campo>
            <Campo etiqueta="Cantidad de cajas">
              <CampoCantidad name="cantidad_cajas" value={editandoCompra.cantidad_cajas} onChange={handleChangeEditar} />
            </Campo>
            <Campo etiqueta="Precio por caja (Bs.)">
              <Entrada type="number" min="0" step="0.01" name="precio_unitario" value={editandoCompra.precio_unitario} onChange={handleChangeEditar} />
            </Campo>
            <Campo etiqueta="Monto pagado (Bs.)">
              <Entrada type="number" min="0" step="0.01" name="monto_pagado" value={editandoCompra.monto_pagado} onChange={handleChangeEditar} />
            </Campo>
          </div>
          <div className="flex gap-3 mt-6">
            <Boton variante="secundario" onClick={() => setEditandoCompra(null)} className="flex-1">Cancelar</Boton>
            <Boton cargando={guardando} onClick={guardarEdicionCompra} className="flex-1">Guardar</Boton>
          </div>
        </Modal>
      )}

      {editandoCaja && (
        <Modal titulo="Editar cajas" onCerrar={() => setEditandoCaja(null)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Campo etiqueta="Fecha">
              <Entrada type="date" name="fecha" value={editandoCaja.fecha} onChange={handleChangeEditarCaja} />
            </Campo>
            <Campo etiqueta="Tipo">
              <Selector name="tipo" value={editandoCaja.tipo} onChange={handleChangeEditarCaja}>
                <option value={TIPOS_MOVIMIENTO_CAJAS.DEBE}>Debe</option>
                <option value={TIPOS_MOVIMIENTO_CAJAS.DEVOLUCION}>Devolución</option>
              </Selector>
            </Campo>
            <Campo etiqueta="Cantidad de cajas">
              <CampoCantidad name="cajas_recibidas" value={editandoCaja.cajas_recibidas} onChange={handleChangeEditarCaja} />
            </Campo>
            <Campo etiqueta="Monto (Bs.)">
              <Entrada type="number" min="0" step="0.01" name="monto" value={editandoCaja.monto ?? ''} onChange={handleChangeEditarCaja} />
            </Campo>
          </div>
          <div className="flex gap-3 mt-6">
            <Boton variante="secundario" onClick={() => setEditandoCaja(null)} className="flex-1">Cancelar</Boton>
            <Boton cargando={guardando} onClick={guardarEdicionCaja} className="flex-1">Guardar</Boton>
          </div>
        </Modal>
      )}

      {dialogoConfirmacion}
      {toast && <Toast mensaje={toast.mensaje} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}

export default Cervezas

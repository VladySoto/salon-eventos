import { useState } from 'react'
import { TIPOS_EVENTO } from '../../constants'
import { calcularMontosReserva } from '../../utils/calculos'
import Campo, { Entrada, Selector, AreaTexto } from '../../components/ui/Campo'
import Boton from '../../components/ui/Boton'

function formVacio() {
  return {
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
  }
}

// onRegistrar(form) debe devolver true si la reserva se guardó (entonces se limpia el formulario)
function FormularioReserva({ onRegistrar, guardando }) {
  const [form, setForm] = useState(formVacio)
  const { montoLavado, montoTotal, saldo } = calcularMontosReserva(form)

  function handleChange(e) {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm({ ...form, [e.target.name]: value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (await onRegistrar(form)) setForm(formVacio())
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <h2 className="text-base font-semibold text-gray-700 mb-4">Registrar nueva reserva</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Campo etiqueta="Nombre del cliente">
            <Entrada
              type="text"
              name="nombre"
              value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value.replace(/\b\w/g, l => l.toUpperCase()) })}
              placeholder="Ej: Juan Pérez"
              required
              autoCapitalize="words"
            />
          </Campo>
          <Campo etiqueta="CI / NIT">
            <Entrada type="tel" inputMode="numeric" name="ci_nit" value={form.ci_nit} onChange={handleChange} placeholder="Ej: 12345678" />
          </Campo>
          <Campo etiqueta="Teléfono 1">
            <Entrada type="tel" inputMode="numeric" name="telefono" value={form.telefono} onChange={handleChange} placeholder="Ej: 70012345" required pattern="[0-9]{7,8}" title="7 u 8 dígitos" />
          </Campo>
          <Campo etiqueta="Teléfono 2 (opcional)">
            <Entrada type="tel" inputMode="numeric" name="telefono2" value={form.telefono2} onChange={handleChange} placeholder="Ej: 60098765" pattern="[0-9]{7,8}" title="7 u 8 dígitos" />
          </Campo>
          <Campo etiqueta="Tipo de evento">
            <Selector name="tipo_evento" value={form.tipo_evento} onChange={handleChange} required>
              <option value="">Seleccioná</option>
              {TIPOS_EVENTO.map(t => <option key={t.valor} value={t.valor}>{t.etiqueta}</option>)}
            </Selector>
          </Campo>
          <Campo etiqueta="Monto del alquiler (Bs.)">
            <Entrada type="number" min="0" step="0.01" name="monto_total" value={form.monto_total} onChange={handleChange} placeholder="Ej: 2000" required />
          </Campo>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Fecha del evento</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Campo etiqueta="Fecha inicio">
              <Entrada type="date" name="fecha" value={form.fecha} onChange={handleChange} required className="bg-white" />
            </Campo>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <input type="checkbox" name="dos_dias" id="dos_dias" checked={form.dos_dias} onChange={handleChange} className="w-4 h-4 accent-blue-600" />
                <label htmlFor="dos_dias" className="text-sm font-medium text-gray-700">Ocupa 2 días</label>
              </div>
              {form.dos_dias && (
                <Campo etiqueta="Fecha fin">
                  <Entrada type="date" name="fecha_fin" value={form.fecha_fin} onChange={handleChange} required min={form.fecha} className="bg-white" />
                </Campo>
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
            <Campo etiqueta="Monto del lavado (Bs.)">
              <Entrada type="number" min="0" step="0.01" name="monto_lavado" value={form.monto_lavado} onChange={handleChange} placeholder="Ej: 300" />
            </Campo>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-blue-500 font-medium">Total</p>
              <p className="text-lg font-bold text-blue-700">Bs. {montoTotal.toFixed(2)}</p>
              {form.incluye_lavado && montoLavado > 0 && <p className="text-xs text-blue-400">Alquiler + lavado</p>}
            </div>
            <div>
              <label className="text-xs text-blue-500 font-medium block mb-1">Adelanto (Bs.)</label>
              <input type="number" min="0" step="0.01" name="adelanto" value={form.adelanto} onChange={handleChange} placeholder="0" className="w-full border border-blue-300 rounded-lg px-2 py-1.5 text-sm bg-white" />
            </div>
            <div>
              <p className="text-xs text-blue-500 font-medium">Saldo</p>
              <p className={`text-lg font-bold ${saldo > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                Bs. {saldo > 0 ? saldo.toFixed(2) : '0.00'}
              </p>
            </div>
          </div>
        </div>

        <Campo etiqueta="Observaciones">
          <AreaTexto name="observaciones" value={form.observaciones} onChange={handleChange} placeholder="Notas adicionales..." rows={3} />
        </Campo>

        <Boton type="submit" cargando={guardando} className="w-full px-6">Registrar reserva</Boton>
      </form>
    </div>
  )
}

export default FormularioReserva

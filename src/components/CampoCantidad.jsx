// Campo numérico entero con botones − y +, pensado para usar con el dedo.
// onChange recibe un objeto con la forma { target: { name, value, type } },
// igual que un evento normal, así sirve con los handleChange existentes.
function CampoCantidad({ name, value, onChange, min = 0, placeholder = '0', required = false }) {
  const actual = parseInt(value, 10) || 0

  function cambiarA(numero) {
    onChange({ target: { name, value: String(numero), type: 'number' } })
  }

  const clasesBoton = 'w-11 flex-shrink-0 rounded-lg bg-gray-100 text-gray-700 text-xl font-bold active:bg-gray-200'

  return (
    <div className="flex items-stretch gap-2">
      <button type="button" aria-label="Restar uno" onClick={() => cambiarA(Math.max(min, actual - 1))} className={clasesBoton}>−</button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="min-w-0 flex-1 border border-gray-300 rounded-lg px-2 py-2.5 text-sm text-center"
      />
      <button type="button" aria-label="Sumar uno" onClick={() => cambiarA(actual + 1)} className={clasesBoton}>+</button>
    </div>
  )
}

export default CampoCantidad

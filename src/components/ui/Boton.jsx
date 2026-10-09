import { CLASES_BOTON } from './estilos'

// Botón con tamaño táctil (44 px de alto). variante: primario | secundario | exito | peligro | morado | suave
function Boton({ variante = 'primario', cargando = false, textoCargando = 'Guardando...', className = '', type = 'button', disabled, children, ...props }) {
  return (
    <button
      type={type}
      disabled={disabled || cargando}
      className={`py-3 px-4 rounded-xl text-sm font-medium disabled:opacity-50 ${CLASES_BOTON[variante]} ${className}`}
      {...props}
    >
      {cargando ? textoCargando : children}
    </button>
  )
}

export default Boton

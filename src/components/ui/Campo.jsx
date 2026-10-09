import { CLASE_ENTRADA } from './estilos'

// Etiqueta + control de formulario
function Campo({ etiqueta, htmlFor, className = '', children }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="text-sm text-gray-600 block mb-1">{etiqueta}</label>
      {children}
    </div>
  )
}

export function Entrada({ className = '', ...props }) {
  return <input className={`${CLASE_ENTRADA} ${className}`} {...props} />
}

export function Selector({ className = '', children, ...props }) {
  return <select className={`${CLASE_ENTRADA} ${className}`} {...props}>{children}</select>
}

export function AreaTexto({ className = '', ...props }) {
  return <textarea className={`${CLASE_ENTRADA} resize-none ${className}`} {...props} />
}

export default Campo

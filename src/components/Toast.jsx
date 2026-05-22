import { useEffect } from 'react'

function Toast({ mensaje, tipo = 'exito', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [])

  const estilos = {
    exito: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    alerta: 'bg-yellow-500 text-white'
  }

  const iconos = {
    exito: '✓',
    error: '✕',
    alerta: '⚠️'
  }

  return (
    <div className={`fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-lg flex items-center gap-3 text-sm font-medium animate-bounce-in ${estilos[tipo]}`}
      style={{ minWidth: '260px', maxWidth: '90vw' }}>
      <span className="text-base">{iconos[tipo]}</span>
      <span>{mensaje}</span>
      <button onClick={onClose} className="ml-auto opacity-70 hover:opacity-100 text-lg leading-none">✕</button>
    </div>
  )
}

export default Toast
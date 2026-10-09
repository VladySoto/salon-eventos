import { useEffect } from 'react'

// Ventana que sube desde abajo en el celular y se centra en pantallas grandes.
// Se cierra tocando fuera, con la ✕ o con la tecla Escape.
function Modal({ titulo, subtitulo, ancho = 'md', onCerrar, children }) {
  useEffect(() => {
    function alPresionar(e) {
      if (e.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', alPresionar)
    return () => document.removeEventListener('keydown', alPresionar)
  }, [onCerrar])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-end md:items-center justify-center z-50" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        className={`bg-white rounded-t-2xl md:rounded-2xl p-6 w-full max-h-screen overflow-y-auto ${ancho === 'lg' ? 'md:max-w-lg' : 'md:max-w-md'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className={`flex justify-between items-center ${subtitulo ? 'mb-1' : 'mb-4'}`}>
          <h3 className="text-lg font-bold text-gray-800">{titulo}</h3>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="text-gray-400 text-xl font-bold p-2 -m-2">✕</button>
        </div>
        {subtitulo && <p className="text-sm text-gray-500 mb-4">{subtitulo}</p>}
        {children}
      </div>
    </div>
  )
}

export default Modal

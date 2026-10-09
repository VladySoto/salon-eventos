// Muestra "Cargando..." o un mensaje de error con botón para reintentar.
// No dibuja nada cuando los datos ya cargaron bien.
function AvisoCarga({ cargando, error, onReintentar, texto = 'Cargando datos...' }) {
  if (cargando) {
    return (
      <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4" role="status">
        <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-500">{texto}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4" role="alert">
        <p className="text-sm text-red-700">No se pudieron cargar los datos. Revisá tu conexión.</p>
        <button
          type="button"
          onClick={onReintentar}
          className="flex-shrink-0 bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return null
}

export default AvisoCarga

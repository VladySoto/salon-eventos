function ConfirmDialog({ titulo, mensaje, textoConfirmar = 'Aceptar', peligro = true, onConfirmar, onCancelar }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-end md:items-center justify-center z-[60]" onClick={onCancelar}>
      <div
        role="alertdialog"
        aria-modal="true"
        className="bg-white rounded-t-2xl md:rounded-2xl p-6 w-full md:max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-gray-800 mb-2">{titulo}</h3>
        <p className="text-sm text-gray-600 mb-6">{mensaje}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancelar}
            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            className={`flex-1 text-white py-3 rounded-xl text-sm font-medium ${peligro ? 'bg-red-600' : 'bg-blue-600'}`}
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog

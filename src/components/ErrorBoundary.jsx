import { Component } from 'react'

// Evita la pantalla en blanco si una pantalla no se pudo cargar. Pasa, por ejemplo, cuando se
// publicó una versión nueva de la app y el celular todavía tiene abierta la anterior.
class ErrorBoundary extends Component {
  state = { hayError: false }

  static getDerivedStateFromError() {
    return { hayError: true }
  }

  render() {
    if (!this.state.hayError) return this.props.children
    return (
      <div className="p-4 md:p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-4">
          <p className="text-sm text-red-700 mb-3">No se pudo cargar esta pantalla. Puede que haya una versión nueva de la app o que no tengas conexión.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-4 py-3 rounded-xl text-sm font-medium"
          >
            Recargar
          </button>
        </div>
      </div>
    )
  }
}

export default ErrorBoundary

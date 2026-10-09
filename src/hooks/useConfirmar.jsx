import { useState, useRef } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'

// Reemplaza a window.confirm con un diálogo propio.
// Uso:
//   const [confirmar, dialogoConfirmacion] = useConfirmar()
//   if (!(await confirmar('¿Eliminar?', { titulo: 'Eliminar', textoConfirmar: 'Eliminar' }))) return
//   ...y renderizar {dialogoConfirmacion} dentro del componente.
export function useConfirmar() {
  const [estado, setEstado] = useState(null)
  const resolver = useRef(null)

  function confirmar(mensaje, { titulo = 'Confirmar', textoConfirmar = 'Aceptar', peligro = true } = {}) {
    return new Promise(resolve => {
      resolver.current = resolve
      setEstado({ mensaje, titulo, textoConfirmar, peligro })
    })
  }

  function cerrar(valor) {
    resolver.current?.(valor)
    resolver.current = null
    setEstado(null)
  }

  const dialogo = estado && (
    <ConfirmDialog
      {...estado}
      onConfirmar={() => cerrar(true)}
      onCancelar={() => cerrar(false)}
    />
  )

  return [confirmar, dialogo]
}

import { useState, useEffect } from 'react'

// Franja fija arriba que aparece cuando el celular pierde internet.
// Es importante porque los datos siempre se guardan en línea: sin internet no se registra nada.
function AvisoSinConexion() {
  const [enLinea, setEnLinea] = useState(() => navigator.onLine)

  useEffect(() => {
    const alConectar = () => setEnLinea(true)
    const alDesconectar = () => setEnLinea(false)
    window.addEventListener('online', alConectar)
    window.addEventListener('offline', alDesconectar)
    return () => {
      window.removeEventListener('online', alConectar)
      window.removeEventListener('offline', alDesconectar)
    }
  }, [])

  if (enLinea) return null

  return (
    <div role="status" className="bg-yellow-500 text-white text-sm font-medium text-center px-4 py-2">
      Sin conexión — no se puede guardar ni cargar información hasta que vuelva internet
    </div>
  )
}

export default AvisoSinConexion

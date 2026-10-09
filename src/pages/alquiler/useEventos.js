import { useState, useEffect, useCallback } from 'react'
import { listarEventos, actualizarEstadosAutomaticos } from '../../services/eventosService'

// Carga los eventos (con cliente y garantías) y expone lo necesario para la pantalla:
// recargar() después de guardar algo y reintentar() cuando falló la carga inicial.
export function useEventos() {
  const [eventos, setEventos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState(false)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let activo = true
    actualizarEstadosAutomaticos()
      .then(() => listarEventos())
      .then(({ data, error }) => {
        if (!activo) return
        if (error || !data) {
          setErrorCarga(true)
        } else {
          setErrorCarga(false)
          setEventos(data)
        }
        setCargando(false)
      })
      .catch(() => {
        if (!activo) return
        setErrorCarga(true)
        setCargando(false)
      })
    return () => { activo = false }
  }, [intento])

  const recargar = useCallback(async () => {
    const { data, error } = await listarEventos()
    if (!error && data) {
      setErrorCarga(false)
      setEventos(data)
    }
  }, [])

  function reintentar() {
    setCargando(true)
    setErrorCarga(false)
    setIntento(n => n + 1)
  }

  return { eventos, cargando, errorCarga, recargar, reintentar }
}

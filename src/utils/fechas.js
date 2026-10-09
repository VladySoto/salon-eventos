// Fechas en hora local (Bolivia). No usar toISOString(): devuelve la fecha en UTC
// y desde las 20:00 hora local ya marca el día siguiente.

function aISO(fecha) {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

export function fechaLocalISO(fecha = new Date()) {
  return aISO(fecha)
}

export function sumarDiasISO(dias, desde = new Date()) {
  const fecha = new Date(desde)
  fecha.setDate(fecha.getDate() + dias)
  return aISO(fecha)
}

export function inicioMesISO(fecha = new Date()) {
  return aISO(new Date(fecha.getFullYear(), fecha.getMonth(), 1))
}

// '2026-06-08' -> '08/06/2026'
export function formatearFecha(iso) {
  if (!iso) return ''
  const [anio, mes, dia] = String(iso).slice(0, 10).split('-')
  return `${dia}/${mes}/${anio}`
}

export function formatearRangoFechas(inicio, fin) {
  return fin ? `${formatearFecha(inicio)} al ${formatearFecha(fin)}` : formatearFecha(inicio)
}

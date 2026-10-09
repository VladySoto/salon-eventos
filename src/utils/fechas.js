// Fechas en hora local (Bolivia). No usar toISOString(): devuelve la fecha en UTC
// y desde las 20:00 hora local ya marca el día siguiente.

export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
export const DIAS_SEMANA_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

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

// Suma días a una fecha 'AAAA-MM-DD' y devuelve otra 'AAAA-MM-DD'
export function sumarDiasAFecha(iso, dias) {
  const [anio, mes, dia] = iso.split('-').map(Number)
  return sumarDiasISO(dias, new Date(anio, mes - 1, dia))
}

export function inicioMesISO(fecha = new Date()) {
  return aISO(new Date(fecha.getFullYear(), fecha.getMonth(), 1))
}

// 'AAAA-MM-DD' de un año, mes (0-11) y día
export function aFechaISO(anio, mes, dia) {
  return `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

// Días de un mes empezando en lunes (null = casillas vacías antes del día 1)
export function diasDelMes(anio, mes) {
  const dias = []
  const primerDia = new Date(anio, mes, 1).getDay()
  const vacias = primerDia === 0 ? 6 : primerDia - 1
  const total = new Date(anio, mes + 1, 0).getDate()
  for (let i = 0; i < vacias; i++) dias.push(null)
  for (let i = 1; i <= total; i++) dias.push(i)
  return dias
}

// 'AAAA-MM' -> 'Octubre 2026'
export function formatearMes(mesISO) {
  const [anio, mes] = mesISO.split('-').map(Number)
  return `${MESES[mes - 1]} ${anio}`
}

// Los últimos meses (el actual primero) para elegir en un selector: [{ valor: '2026-10', etiqueta: 'Octubre 2026' }]
export function mesesRecientes(cantidad = 24, desde = new Date()) {
  const lista = []
  for (let i = 0; i < cantidad; i++) {
    const fecha = new Date(desde.getFullYear(), desde.getMonth() - i, 1)
    const valor = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
    lista.push({ valor, etiqueta: formatearMes(valor) })
  }
  return lista
}

// Primer y último día de un mes 'AAAA-MM'
export function limitesDelMes(mesISO) {
  const [anio, mes] = mesISO.split('-').map(Number)
  const ultimo = new Date(anio, mes, 0).getDate()
  return { inicio: `${mesISO}-01`, fin: `${mesISO}-${String(ultimo).padStart(2, '0')}`, siguiente: aISO(new Date(anio, mes, 1)) }
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

// '2026-10-10' -> 'sáb 10/10'
export function formatearDiaCorto(iso) {
  const [anio, mes, dia] = iso.split('-').map(Number)
  const nombre = DIAS_SEMANA_CORTOS[new Date(anio, mes - 1, dia).getDay()]
  return `${nombre} ${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}`
}

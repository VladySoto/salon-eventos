import { ESTADOS_GARANTIA, etiquetaTipoEvento } from '../constants'
import { fechaFinEvento, esEventoProximo } from './calculos'
import { formatearMes } from './fechas'

export const FILTROS_EVENTOS = [
  { id: 'todos', etiqueta: 'Todos' },
  { id: 'proximos', etiqueta: 'Próximos' },
  { id: 'saldo', etiqueta: 'Con saldo' },
  { id: 'garantias', etiqueta: 'Garantías pendientes' },
  { id: 'pasados', etiqueta: 'Pasados' }
]

// Minúsculas y sin tildes, para que "Perez" encuentre "Pérez"
export function normalizar(texto) {
  return String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function textoBuscable(evento) {
  const c = evento.clientes || {}
  return normalizar([c.nombre, c.telefono, c.telefono2, c.ci_nit, etiquetaTipoEvento(evento.tipo_evento), evento.observaciones].join(' '))
}

function cumpleFiltro(evento, filtro, hoy) {
  switch (filtro) {
    case 'proximos': return esEventoProximo(evento, hoy)
    case 'saldo': return Number(evento.saldo_pendiente) > 0
    case 'garantias': return (evento.garantias || []).some(g => g.estado === ESTADOS_GARANTIA.PENDIENTE)
    case 'pasados': return fechaFinEvento(evento) < hoy
    default: return true
  }
}

// busqueda: { texto, filtro, mes } donde mes es 'AAAA-MM' o '' para todos
export function filtrarEventos(eventos, { texto = '', filtro = 'todos', mes = '' }, hoy) {
  const palabras = normalizar(texto).split(/\s+/).filter(Boolean)
  return eventos.filter(e => {
    if (!cumpleFiltro(e, filtro, hoy)) return false
    if (mes && e.fecha.slice(0, 7) !== mes) return false
    if (palabras.length === 0) return true
    const buscable = textoBuscable(e)
    return palabras.every(p => buscable.includes(p))
  })
}

// Primero los que todavía no terminaron (el más cercano arriba) y después los pasados (el más reciente arriba)
export function ordenarEventos(eventos, hoy) {
  const vigentes = eventos.filter(e => fechaFinEvento(e) >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha))
  const pasados = eventos.filter(e => fechaFinEvento(e) < hoy).sort((a, b) => b.fecha.localeCompare(a.fecha))
  return [...vigentes, ...pasados]
}

// Meses que tienen eventos, del más reciente al más antiguo
export function mesesConEventos(eventos) {
  const meses = [...new Set(eventos.map(e => e.fecha.slice(0, 7)))].sort().reverse()
  return meses.map(valor => ({ valor, etiqueta: formatearMes(valor) }))
}

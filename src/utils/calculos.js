import { TIPOS_MOVIMIENTO_CAJAS, ESTADOS_EVENTO } from '../constants'

// Cajas vacías que todavía se deben al distribuidor: lo que se debe menos lo que se devolvió
export function calcularCajasPendientes(cajas) {
  return cajas.reduce((total, c) => {
    if (c.tipo === TIPOS_MOVIMIENTO_CAJAS.DEBE) return total + Number(c.cajas_recibidas)
    if (c.tipo === TIPOS_MOVIMIENTO_CAJAS.DEVOLUCION) return total - Number(c.cajas_recibidas)
    return total
  }, 0)
}

// Montos de una reserva a partir de lo escrito en el formulario
export function calcularMontosReserva(form) {
  const montoBase = parseFloat(form.monto_total) || 0
  const montoLavado = form.incluye_lavado ? (parseFloat(form.monto_lavado) || 0) : 0
  const montoTotal = montoBase + montoLavado
  const adelanto = parseFloat(form.adelanto) || 0
  const saldo = montoTotal - adelanto
  return { montoBase, montoLavado, montoTotal, adelanto, saldo }
}

export function fechaFinEvento(evento) {
  return evento.fecha_fin || evento.fecha
}

// Evento reservado que todavía no terminó (incluye los de varios días que ya empezaron)
export function esEventoProximo(evento, hoy) {
  return fechaFinEvento(evento) >= hoy && evento.estado === ESTADOS_EVENTO.RESERVADO
}

// ¿El evento ocupa ese día? (fecha en formato AAAA-MM-DD)
export function eventoOcupaFecha(evento, fecha) {
  if (!evento.fecha) return false
  return fecha >= evento.fecha && fecha <= fechaFinEvento(evento)
}

// Un evento completado que ya pasó libera su fecha; los demás la siguen ocupando
// (incluso uno pagado por adelantado que todavía no se realizó).
export function eventoBloqueaFecha(evento, hoy) {
  return !(evento.estado === ESTADOS_EVENTO.COMPLETADO && fechaFinEvento(evento) < hoy)
}

// Busca un evento que ocupe alguna de las fechas del rango (AAAA-MM-DD)
export function buscarEventoQueOcupa(eventos, fechaInicio, fechaFin, hoy, excluirId = null) {
  return eventos.find(ev => (
    ev.id !== excluirId &&
    eventoBloqueaFecha(ev, hoy) &&
    fechaInicio <= fechaFinEvento(ev) &&
    fechaFin >= ev.fecha
  ))
}

export function sumarSaldosPendientes(eventos) {
  return eventos.reduce((total, e) => total + (Number(e.saldo_pendiente) > 0 ? Number(e.saldo_pendiente) : 0), 0)
}

// Texto y color para el plazo de una garantía
export function diasRestantesGarantia(fechaLimite, hoy) {
  const dias = Math.ceil((new Date(fechaLimite) - new Date(hoy)) / (1000 * 60 * 60 * 24))
  if (dias < 0) return { texto: 'Vencida', color: 'text-red-600' }
  if (dias === 0) return { texto: 'Vence hoy', color: 'text-orange-600' }
  if (dias === 1) return { texto: 'Vence mañana', color: 'text-orange-500' }
  return { texto: `${dias} días restantes`, color: 'text-gray-500' }
}

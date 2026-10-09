import { ESTADOS_GARANTIA } from '../constants'
import { fechaFinEvento } from './calculos'
import { sumarDiasAFecha } from './fechas'

export const DIAS_PANEL_SEMANA = 7

// Lo que hay que atender en los próximos 7 días (contando hoy):
// eventos, saldos por cobrar de esos eventos y garantías que vencen.
export function resumenSemana(eventos, hoy) {
  const ultimoDia = sumarDiasAFecha(hoy, DIAS_PANEL_SEMANA - 1)

  const eventosSemana = eventos
    .filter(e => fechaFinEvento(e) >= hoy && e.fecha <= ultimoDia)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  const cobros = eventosSemana.filter(e => Number(e.saldo_pendiente) > 0)

  // Garantías pendientes con fecha límite hasta el último día del panel (incluye las ya vencidas)
  const garantias = []
  for (const evento of eventos) {
    for (const garantia of evento.garantias || []) {
      if (garantia.estado === ESTADOS_GARANTIA.PENDIENTE && garantia.fecha_limite <= ultimoDia) {
        garantias.push({ evento, garantia })
      }
    }
  }
  garantias.sort((a, b) => a.garantia.fecha_limite.localeCompare(b.garantia.fecha_limite))

  return { eventosSemana, cobros, garantias, ultimoDia }
}

import { ESTADOS_GARANTIA, etiquetaTipoEvento } from '../constants'
import { formatearFecha } from './fechas'
import { soloDigitos } from './validaciones'

const CODIGO_PAIS = '591' // Bolivia

// Los celulares de Bolivia tienen 8 dígitos y empiezan con 6 o 7. Los fijos (7 dígitos) no tienen WhatsApp.
export function esCelular(telefono) {
  return /^[67]\d{7}$/.test(soloDigitos(telefono))
}

// Devuelve el primer teléfono del cliente que sirva para WhatsApp, o null
export function telefonoParaWhatsApp(cliente) {
  return [cliente?.telefono, cliente?.telefono2].map(soloDigitos).find(esCelular) || null
}

// Abre la conversación con el mensaje ya escrito; la persona decide si lo envía
export function enlaceWhatsApp(telefono, mensaje) {
  return `https://wa.me/${CODIGO_PAIS}${soloDigitos(telefono)}?text=${encodeURIComponent(mensaje)}`
}

function nombreCorto(cliente) {
  return (cliente?.nombre || '').trim()
}

export function mensajeCobro(evento) {
  const tipo = etiquetaTipoEvento(evento.tipo_evento).toLowerCase()
  const saldo = Number(evento.saldo_pendiente).toFixed(2)
  return `Hola ${nombreCorto(evento.clientes)}, le escribimos del salón Rey Illampu. Le recordamos que tiene un saldo pendiente de Bs. ${saldo} por su ${tipo} del ${formatearFecha(evento.fecha)}. Cualquier consulta, estamos a su disposición. ¡Gracias!`
}

export function mensajeGarantia(evento, garantia) {
  const tipo = etiquetaTipoEvento(evento.tipo_evento).toLowerCase()
  const llevado = []
  if (garantia.cajas_llevadas > 0) llevado.push(`${garantia.cajas_llevadas} cajas`)
  if (garantia.botellas_llevadas > 0) llevado.push(`${garantia.botellas_llevadas} botellas`)
  const detalle = llevado.length > 0 ? ` (${llevado.join(' y ')})` : ''
  return `Hola ${nombreCorto(evento.clientes)}, le escribimos del salón Rey Illampu. Le recordamos la devolución de lo que se llevó de su ${tipo}${detalle} hasta el ${formatearFecha(garantia.fecha_limite)}. ¡Gracias!`
}

export function mensajeGeneral(evento) {
  const tipo = etiquetaTipoEvento(evento.tipo_evento).toLowerCase()
  return `Hola ${nombreCorto(evento.clientes)}, le escribimos del salón Rey Illampu respecto a su ${tipo} del ${formatearFecha(evento.fecha)}.`
}

// Elige el mensaje según lo que haya pendiente: primero el cobro, luego una garantía, si no uno general
export function mensajeParaEvento(evento) {
  if (Number(evento.saldo_pendiente) > 0) return mensajeCobro(evento)
  const garantia = (evento.garantias || []).find(g => g.estado === ESTADOS_GARANTIA.PENDIENTE)
  if (garantia) return mensajeGarantia(evento, garantia)
  return mensajeGeneral(evento)
}

export const TIPOS_EVENTO = [
  { valor: 'cumpleaños', etiqueta: 'Cumpleaños' },
  { valor: 'matrimonio_catolico', etiqueta: 'Matrimonio Católico' },
  { valor: 'matrimonio_cristiano', etiqueta: 'Matrimonio Cristiano' },
  { valor: 'bautizo', etiqueta: 'Bautizo' },
  { valor: 'quinceañera', etiqueta: 'Quinceañera' },
  { valor: 'reunion', etiqueta: 'Reunión' },
  { valor: 'cabo_de_año', etiqueta: 'Cabo de Año' },
  { valor: 'otro', etiqueta: 'Otro' }
]

export function etiquetaTipoEvento(valor) {
  return TIPOS_EVENTO.find(t => t.valor === valor)?.etiqueta || valor || ''
}

// Valores que se guardan en la base de datos
export const ESTADOS_EVENTO = {
  RESERVADO: 'reservado',
  COMPLETADO: 'completado'
}

export const ESTADOS_GARANTIA = {
  PENDIENTE: 'pendiente',
  DEVUELTA: 'devuelta',
  EJECUTADA: 'ejecutada'
}

export const TIPOS_MOVIMIENTO_CAJAS = {
  DEBE: 'debe',
  DEVOLUCION: 'devolucion'
}

// Desde cuántas cajas vacías pendientes se muestra la alerta
export const UMBRAL_CAJAS_PENDIENTES = 100

// Días de plazo que se sugieren por defecto para devolver una garantía
export const DIAS_PLAZO_GARANTIA = 7

// Cantidad máxima de registros que se traen en los historiales de cervezas
export const LIMITE_HISTORIAL = 100

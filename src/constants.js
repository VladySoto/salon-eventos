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

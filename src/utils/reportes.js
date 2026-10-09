import { ESTADOS_EVENTO, TIPOS_MOVIMIENTO_CAJAS, etiquetaTipoEvento } from '../constants'
import { formatearFecha, formatearMes } from './fechas'

const FORMATO_DINERO = '#,##0.00'

function sumar(lista, campo) {
  return lista.reduce((total, item) => total + (Number(item[campo]) || 0), 0)
}

// Calcula los números del reporte de un mes ('AAAA-MM') a partir de los datos que trae reportesService.
//
// Nota sobre los ingresos: se calculan igual que en el Dashboard, con los adelantos de las reservas
// hechas en el mes y los saldos cobrados en el mes. Si luego se edita o borra un evento, ese número cambia.
export function armarReporte({ eventos, compras, cajas, inventario }, mes) {
  const delMes = eventos.filter(e => e.fecha.slice(0, 7) === mes)

  const porTipo = {}
  for (const e of delMes) {
    const etiqueta = etiquetaTipoEvento(e.tipo_evento) || 'Sin tipo'
    porTipo[etiqueta] = (porTipo[etiqueta] || 0) + 1
  }

  const conMonto = delMes.filter(e => e.monto_total != null)
  const contratado = conMonto.reduce((total, e) => total + Number(e.monto_total) + Number(e.monto_lavado || 0), 0)

  const adelantos = sumar(eventos.filter(e => e.created_at?.slice(0, 7) === mes), 'adelanto')
  const saldosCobrados = sumar(eventos.filter(e => e.fecha_pago?.slice(0, 7) === mes), 'monto_saldo_cobrado')

  const debe = cajas.filter(c => c.tipo === TIPOS_MOVIMIENTO_CAJAS.DEBE)
  const devoluciones = cajas.filter(c => c.tipo === TIPOS_MOVIMIENTO_CAJAS.DEVOLUCION)
  const cerradas = inventario.filter(i => i.cerrado)

  return {
    mes,
    eventos: {
      cantidad: delMes.length,
      completados: delMes.filter(e => e.estado === ESTADOS_EVENTO.COMPLETADO).length,
      pagados: delMes.filter(e => e.pagado).length,
      porTipo,
      contratado,
      sinMonto: delMes.length - conMonto.length,
      saldoPendiente: sumar(delMes.filter(e => Number(e.saldo_pendiente) > 0), 'saldo_pendiente')
    },
    ingresos: { adelantos, saldosCobrados, total: adelantos + saldosCobrados },
    cervezas: {
      compras: compras.length,
      cajasCompradas: sumar(compras, 'cantidad_cajas'),
      totalCompras: sumar(compras, 'total'),
      pagado: sumar(compras, 'monto_pagado'),
      deuda: sumar(compras, 'deuda_pendiente'),
      cajasDebe: sumar(debe, 'cajas_recibidas'),
      cajasDevueltas: sumar(devoluciones, 'cajas_recibidas')
    },
    inventario: {
      cobroRotoFaltante: sumar(cerradas, 'monto_cobro'),
      itemsRotos: sumar(cerradas, 'cantidad_rota')
    }
  }
}

// ---------- Hojas del archivo Excel ----------

const negrita = valor => ({ value: valor, fontWeight: 'bold' })
const dinero = valor => ({ value: Number(valor) || 0, format: FORMATO_DINERO })
const encabezado = valor => ({ value: valor, fontWeight: 'bold', backgroundColor: '#dbeafe' })

export function construirHojasExcel(reporte, { eventos, compras, cajas }, mes) {
  const e = reporte.eventos
  const delMes = eventos.filter(ev => ev.fecha.slice(0, 7) === mes)

  const resumen = [
    [{ value: `Reporte de ${formatearMes(mes)} — Rey Illampu`, fontWeight: 'bold', fontSize: 14 }],
    [],
    [negrita('EVENTOS')],
    ['Eventos del mes', e.cantidad],
    ['Completados', e.completados],
    ['Pagados', e.pagados],
    ['Monto contratado (Bs.)', dinero(e.contratado)],
    ['Saldo pendiente de esos eventos (Bs.)', dinero(e.saldoPendiente)],
    ...Object.entries(e.porTipo).map(([tipo, cantidad]) => [`  ${tipo}`, cantidad]),
    [],
    [negrita('INGRESOS')],
    ['Adelantos de reservas hechas en el mes (Bs.)', dinero(reporte.ingresos.adelantos)],
    ['Saldos cobrados en el mes (Bs.)', dinero(reporte.ingresos.saldosCobrados)],
    [negrita('Total ingresos (Bs.)'), { value: reporte.ingresos.total, format: FORMATO_DINERO, fontWeight: 'bold' }],
    [],
    [negrita('CERVEZAS')],
    ['Compras al distribuidor', reporte.cervezas.compras],
    ['Cajas compradas', reporte.cervezas.cajasCompradas],
    ['Total comprado (Bs.)', dinero(reporte.cervezas.totalCompras)],
    ['Pagado (Bs.)', dinero(reporte.cervezas.pagado)],
    ['Deuda de esas compras (Bs.)', dinero(reporte.cervezas.deuda)],
    ['Cajas vacías que se deben (movimientos)', reporte.cervezas.cajasDebe],
    ['Cajas vacías devueltas', reporte.cervezas.cajasDevueltas],
    [],
    [negrita('INVENTARIO')],
    ['Cobro por roto o faltante (Bs.)', dinero(reporte.inventario.cobroRotoFaltante)],
    ['Ítems rotos', reporte.inventario.itemsRotos]
  ]

  const filasEventos = [
    ['Inicio', 'Fin', 'Cliente', 'Teléfono', 'Tipo', 'Estado', 'Pagado', 'Total (Bs.)', 'Adelanto (Bs.)', 'Saldo (Bs.)'].map(encabezado),
    ...delMes.map(ev => [
      formatearFecha(ev.fecha),
      ev.fecha_fin ? formatearFecha(ev.fecha_fin) : '',
      ev.clientes?.nombre || '',
      { value: ev.clientes?.telefono || '', type: String },
      etiquetaTipoEvento(ev.tipo_evento),
      ev.estado === ESTADOS_EVENTO.COMPLETADO ? 'Completado' : 'Reservado',
      ev.pagado ? 'Sí' : 'No',
      ev.monto_total != null ? dinero(Number(ev.monto_total) + Number(ev.monto_lavado || 0)) : '',
      dinero(ev.adelanto),
      dinero(ev.saldo_pendiente)
    ])
  ]

  const filasCervezas = [
    [negrita('Compras al distribuidor')],
    ['Fecha', 'Cajas', 'Precio por caja (Bs.)', 'Total (Bs.)', 'Pagado (Bs.)', 'Deuda (Bs.)'].map(encabezado),
    ...compras.map(c => [formatearFecha(c.fecha), Number(c.cantidad_cajas), dinero(c.precio_unitario), dinero(c.total), dinero(c.monto_pagado), dinero(c.deuda_pendiente)]),
    [],
    [negrita('Movimientos de cajas vacías')],
    ['Fecha', 'Tipo', 'Cajas', 'Monto (Bs.)'].map(encabezado),
    ...cajas.map(c => [formatearFecha(c.fecha), c.tipo === TIPOS_MOVIMIENTO_CAJAS.DEBE ? 'Debe' : 'Devolución', Number(c.cajas_recibidas), dinero(c.monto)])
  ]

  return [
    { sheet: 'Resumen', data: resumen, columns: [{ width: 46 }, { width: 16 }] },
    { sheet: 'Eventos', data: filasEventos, columns: [{ width: 12 }, { width: 12 }, { width: 28 }, { width: 14 }, { width: 22 }, { width: 12 }, { width: 9 }, { width: 14 }, { width: 14 }, { width: 14 }] },
    { sheet: 'Cervezas', data: filasCervezas, columns: [{ width: 14 }, { width: 14 }, { width: 20 }, { width: 14 }, { width: 14 }, { width: 14 }] }
  ]
}

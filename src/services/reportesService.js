import { supabase } from '../supabase'
import { limitesDelMes } from '../utils/fechas'

const COLUMNAS_EVENTO = 'id, tipo_evento, fecha, fecha_fin, adelanto, saldo_pendiente, estado, pagado, created_at, fecha_pago, monto_saldo_cobrado, monto_total, monto_lavado'

// Trae todo lo necesario para el reporte de un mes ('AAAA-MM'): eventos que ocurren, se reservan
// o se cobran en ese mes, compras y cajas de cervezas, y los cobros de inventario del mes.
export async function cargarDatosReporte(mes) {
  const { inicio, fin, siguiente } = limitesDelMes(mes)

  const [eventos, compras, cajas, inventario] = await Promise.all([
    supabase
      .from('eventos')
      .select(`${COLUMNAS_EVENTO}, clientes(nombre, telefono)`)
      .or(`and(fecha.gte.${inicio},fecha.lte.${fin}),and(created_at.gte.${inicio},created_at.lt.${siguiente}),and(fecha_pago.gte.${inicio},fecha_pago.lte.${fin})`)
      .order('fecha', { ascending: true }),
    supabase
      .from('compras_cerveza')
      .select('id, fecha, cantidad_cajas, precio_unitario, total, monto_pagado, deuda_pendiente')
      .gte('fecha', inicio).lte('fecha', fin)
      .order('fecha', { ascending: true }),
    supabase
      .from('cajas_vacias')
      .select('id, fecha, tipo, cajas_recibidas, monto')
      .gte('fecha', inicio).lte('fecha', fin)
      .order('fecha', { ascending: true }),
    supabase
      .from('evento_inventario')
      .select('monto_cobro, cantidad_rota, cerrado, eventos!inner(fecha)')
      .gte('eventos.fecha', inicio).lte('eventos.fecha', fin)
  ])

  if (eventos.error || compras.error || cajas.error || inventario.error) return { error: true }
  return {
    error: false,
    eventos: eventos.data,
    compras: compras.data,
    cajas: cajas.data,
    inventario: inventario.data
  }
}

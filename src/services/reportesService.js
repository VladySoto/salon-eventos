import { supabase } from '../supabase'
import { limitesDelMes } from '../utils/fechas'

const COLUMNAS_EVENTO = 'id, tipo_evento, fecha, fecha_fin, adelanto, saldo_pendiente, estado, pagado, monto_total, monto_lavado'

// Trae todo lo necesario para el reporte de un mes ('AAAA-MM'): los eventos que ocurren en ese mes,
// los pagos cobrados en el mes (los ingresos), compras y cajas de cervezas, y los cobros de inventario.
export async function cargarDatosReporte(mes) {
  const { inicio, fin } = limitesDelMes(mes)

  const [eventos, pagos, compras, cajas, inventario] = await Promise.all([
    supabase
      .from('eventos')
      .select(`${COLUMNAS_EVENTO}, clientes(nombre, telefono)`)
      .gte('fecha', inicio).lte('fecha', fin)
      .order('fecha', { ascending: true }),
    supabase
      .from('pagos')
      .select('id, monto, fecha, tipo, descripcion, nota')
      .gte('fecha', inicio).lte('fecha', fin)
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

  if (eventos.error || pagos.error || compras.error || cajas.error || inventario.error) return { error: true }
  return {
    error: false,
    eventos: eventos.data,
    pagos: pagos.data,
    compras: compras.data,
    cajas: cajas.data,
    inventario: inventario.data
  }
}

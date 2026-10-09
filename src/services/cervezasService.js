import { supabase } from '../supabase'
import { TIPOS_MOVIMIENTO_CAJAS, LIMITE_HISTORIAL } from '../constants'

// Las funciones que guardan devuelven { error: 'mensaje listo para mostrar' } o { error: null }.

const COLUMNAS_COMPRA = 'id, fecha, cantidad_cajas, precio_unitario, total, monto_pagado, deuda_pendiente'
const COLUMNAS_CAJA = 'id, fecha, tipo, cajas_recibidas, monto'

// Historiales (los últimos registros) y totales. Los totales los calcula la base de datos
// con la vista resumen_cerveza (sql/fase5_rendimiento.sql), así no hay que bajar todo el historial.
export async function cargarDatosCervezas() {
  const [compras, cajas, resumen] = await Promise.all([
    supabase.from('compras_cerveza').select(COLUMNAS_COMPRA).order('created_at', { ascending: false }).limit(LIMITE_HISTORIAL),
    supabase.from('cajas_vacias').select(COLUMNAS_CAJA).order('created_at', { ascending: false }).limit(LIMITE_HISTORIAL),
    supabase.from('resumen_cerveza').select('deuda_distribuidor, cajas_pendientes').single()
  ])
  if (compras.error || cajas.error || resumen.error) return { error: true }
  return {
    error: false,
    compras: compras.data,
    cajas: cajas.data,
    resumen: {
      deuda: Number(resumen.data.deuda_distribuidor) || 0,
      cajasPendientes: Number(resumen.data.cajas_pendientes) || 0
    }
  }
}

// ---------- Compras al distribuidor ----------

function prepararCompra(datos) {
  const cantidad = parseInt(datos.cantidad_cajas)
  const precio = parseFloat(datos.precio_unitario)
  const pagado = parseFloat(datos.monto_pagado) || 0

  if (!Number.isInteger(cantidad) || cantidad <= 0) return { error: 'La cantidad de cajas debe ser mayor que 0' }
  if (!(precio >= 0)) return { error: 'Ingresá un precio válido' }
  if (pagado < 0) return { error: 'El monto pagado no puede ser negativo' }
  const total = cantidad * precio
  if (pagado > total) return { error: `El monto pagado no puede superar el total (Bs. ${total.toFixed(2)})` }

  return {
    datos: {
      fecha: datos.fecha,
      cantidad_cajas: cantidad,
      precio_unitario: precio,
      total,
      monto_pagado: pagado,
      deuda_pendiente: total - pagado
    }
  }
}

export async function registrarCompra(datos) {
  const { error: errorValidacion, datos: fila } = prepararCompra(datos)
  if (errorValidacion) return { error: errorValidacion }
  const { error } = await supabase.from('compras_cerveza').insert(fila)
  return { error: error ? 'Error al registrar la compra' : null }
}

export async function actualizarCompra(compra) {
  const { error: errorValidacion, datos: fila } = prepararCompra(compra)
  if (errorValidacion) return { error: errorValidacion }
  const { error } = await supabase.from('compras_cerveza').update(fila).eq('id', compra.id)
  return { error: error ? 'Error al actualizar la compra' : null }
}

export async function eliminarCompra(id) {
  const { error } = await supabase.from('compras_cerveza').delete().eq('id', id)
  return { error: error ? 'No se pudo eliminar la compra' : null }
}

// ---------- Cajas vacías ----------

function prepararMovimientoCajas(datos) {
  const recibidas = parseInt(datos.cajas_recibidas)
  if (!(recibidas > 0)) return { error: 'La cantidad de cajas debe ser mayor que 0' }
  return {
    datos: {
      fecha: datos.fecha,
      tipo: datos.tipo,
      cajas_recibidas: recibidas,
      cajas_devueltas: datos.tipo === TIPOS_MOVIMIENTO_CAJAS.DEVOLUCION ? recibidas : 0,
      cajas_pendientes: datos.tipo === TIPOS_MOVIMIENTO_CAJAS.DEBE ? recibidas : 0,
      monto: parseFloat(datos.monto) || 0
    }
  }
}

export async function registrarMovimientoCajas(datos) {
  const { error: errorValidacion, datos: fila } = prepararMovimientoCajas(datos)
  if (errorValidacion) return { error: errorValidacion }
  const { error } = await supabase.from('cajas_vacias').insert(fila)
  return { error: error ? 'Error al registrar' : null }
}

export async function actualizarMovimientoCajas(movimiento) {
  const { error: errorValidacion, datos: fila } = prepararMovimientoCajas(movimiento)
  if (errorValidacion) return { error: errorValidacion }
  const { error } = await supabase.from('cajas_vacias').update(fila).eq('id', movimiento.id)
  return { error: error ? 'Error al actualizar el registro' : null }
}

export async function eliminarMovimientoCajas(id) {
  const { error } = await supabase.from('cajas_vacias').delete().eq('id', id)
  return { error: error ? 'No se pudo eliminar el registro' : null }
}

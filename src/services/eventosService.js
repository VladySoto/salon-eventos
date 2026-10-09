import { supabase } from '../supabase'
import { fechaLocalISO, formatearFecha } from '../utils/fechas'
import { ESTADOS_EVENTO, ESTADOS_GARANTIA } from '../constants'
import { soloDigitos, telefonosValidos, limpiarParaFiltro, MENSAJE_TELEFONO } from '../utils/validaciones'
import { calcularMontosReserva, buscarEventoQueOcupa } from '../utils/calculos'

// Las funciones que guardan devuelven { error: 'mensaje listo para mostrar' } o { error: null }.

const MENSAJE_DISPONIBILIDAD = 'No se pudo verificar la disponibilidad de la fecha. Intentá de nuevo'
const MENSAJE_FECHAS = 'La fecha fin no puede ser anterior a la de inicio'

const COLUMNAS_EVENTO = 'id, cliente_id, tipo_evento, fecha, fecha_fin, observaciones, adelanto, saldo_pendiente, estado, pagado, fecha_pago, monto_saldo_cobrado, monto_total, incluye_lavado, monto_lavado'
const COLUMNAS_CLIENTE = 'id, nombre, ci_nit, telefono, telefono2'
const COLUMNAS_GARANTIA = 'id, cajas_llevadas, botellas_llevadas, monto_garantia, fecha_limite, observaciones, estado'
const COLUMNAS_PAGO = 'id, monto, fecha, tipo, nota'

// ---------- Lectura ----------

// Trae los eventos con su cliente, garantías y pagos en una sola consulta
export async function listarEventos() {
  return supabase
    .from('eventos')
    .select(`${COLUMNAS_EVENTO}, clientes(${COLUMNAS_CLIENTE}), garantias(${COLUMNAS_GARANTIA}), pagos(${COLUMNAS_PAGO})`)
    .order('fecha', { ascending: true })
}

// Un solo evento con su cliente y garantías (para el recibo)
export async function obtenerEvento(id) {
  return supabase
    .from('eventos')
    .select(`${COLUMNAS_EVENTO}, clientes(${COLUMNAS_CLIENTE}), garantias(${COLUMNAS_GARANTIA}), pagos(${COLUMNAS_PAGO})`)
    .eq('id', id)
    .single()
}

// Pone al día lo que depende de la fecha: garantías vencidas pasan a "ejecutada" y los
// eventos ya pagados cuya fecha pasó pasan a "completado".
export async function actualizarEstadosAutomaticos() {
  const hoy = fechaLocalISO()
  await supabase
    .from('garantias')
    .update({ estado: ESTADOS_GARANTIA.EJECUTADA })
    .eq('estado', ESTADOS_GARANTIA.PENDIENTE)
    .lt('fecha_limite', hoy)
  await supabase
    .from('eventos')
    .update({ estado: ESTADOS_EVENTO.COMPLETADO })
    .eq('estado', ESTADOS_EVENTO.RESERVADO)
    .eq('pagado', true)
    .or(`fecha_fin.lt.${hoy},and(fecha_fin.is.null,fecha.lt.${hoy})`)
}

// Busca un evento que ocupe alguna de las fechas. Un evento completado solo libera su
// fecha cuando ya pasó (uno pagado por adelantado sigue ocupando el día).
async function buscarConflicto(fechaInicio, fechaFin, excluirId = null) {
  const { data: existentes, error } = await supabase
    .from('eventos')
    .select('id, fecha, fecha_fin, estado, clientes(nombre)')
  if (error || !existentes) return { error: error || new Error('sin datos') }

  const conflicto = buscarEventoQueOcupa(existentes, fechaInicio, fechaFin, fechaLocalISO(), excluirId)
  return { conflicto }
}

function mensajeConflicto(conflicto) {
  return `Fecha ocupada — ya hay un evento de ${conflicto.clientes?.nombre} el ${formatearFecha(conflicto.fecha)}`
}

// ---------- Reservas ----------

export async function registrarReserva(form) {
  const fechaInicio = form.fecha
  const fechaFin = form.dos_dias ? form.fecha_fin : form.fecha
  const telefono = soloDigitos(form.telefono)
  const telefono2 = soloDigitos(form.telefono2)

  if (!telefonosValidos(telefono, telefono2)) return { error: MENSAJE_TELEFONO }
  if (fechaFin < fechaInicio) return { error: MENSAJE_FECHAS }

  const { conflicto, error: errorDisponibilidad } = await buscarConflicto(fechaInicio, fechaFin)
  if (errorDisponibilidad) return { error: MENSAJE_DISPONIBILIDAD }
  if (conflicto) return { error: mensajeConflicto(conflicto) }

  // Cliente: se reutiliza si ya existe (mismo teléfono o CI)
  const filtrosCliente = [`telefono.eq.${telefono}`, `telefono2.eq.${telefono}`]
  const ciFiltro = limpiarParaFiltro(form.ci_nit)
  if (ciFiltro) filtrosCliente.push(`ci_nit.eq.${ciFiltro}`)
  const { data: clienteExistente } = await supabase
    .from('clientes')
    .select('*')
    .or(filtrosCliente.join(','))
    .limit(1)
    .maybeSingle()

  let cliente
  const clienteCreado = !clienteExistente
  let clienteModificado = false

  if (clienteExistente) {
    // No se pisan el nombre ni el teléfono guardados; solo se completan datos que estaban vacíos
    const datosFaltantes = {}
    if (!clienteExistente.ci_nit && form.ci_nit) datosFaltantes.ci_nit = form.ci_nit
    if (!clienteExistente.telefono2 && telefono2 && telefono2 !== clienteExistente.telefono) datosFaltantes.telefono2 = telefono2

    if (Object.keys(datosFaltantes).length > 0) {
      const { data: clienteActualizado, error } = await supabase
        .from('clientes')
        .update(datosFaltantes)
        .eq('id', clienteExistente.id)
        .select().single()
      if (error) return { error: 'Error al actualizar el cliente' }
      cliente = clienteActualizado
      clienteModificado = true
    } else {
      cliente = clienteExistente
    }
  } else {
    const { data: clienteNuevo, error } = await supabase
      .from('clientes')
      .insert({ nombre: form.nombre, ci_nit: form.ci_nit, telefono, telefono2: telefono2 || null })
      .select().single()
    if (error) return { error: 'Error al registrar el cliente' }
    cliente = clienteNuevo
  }

  const { montoBase, montoLavado, adelanto, saldo } = calcularMontosReserva(form)
  const { error: errorEvento } = await supabase.from('eventos').insert({
    cliente_id: cliente.id,
    tipo_evento: form.tipo_evento,
    fecha: form.fecha,
    fecha_fin: form.dos_dias ? form.fecha_fin : null,
    observaciones: form.observaciones,
    monto_total: montoBase,
    incluye_lavado: form.incluye_lavado,
    monto_lavado: montoLavado,
    adelanto,
    saldo_pendiente: saldo > 0 ? saldo : 0,
    pagado: saldo <= 0,
    estado: ESTADOS_EVENTO.RESERVADO
  })

  if (errorEvento) {
    // Revertir el cliente para no dejar datos huérfanos o modificados sin reserva
    if (clienteCreado) {
      await supabase.from('clientes').delete().eq('id', cliente.id)
    } else if (clienteModificado) {
      await supabase.from('clientes').update({
        ci_nit: clienteExistente.ci_nit,
        telefono2: clienteExistente.telefono2
      }).eq('id', clienteExistente.id)
    }
    return { error: 'Error al registrar la reserva' }
  }
  return { error: null }
}

// Cobra todo o parte del saldo. La base de datos guarda el pago y baja el saldo en una sola transacción
// (función registrar_pago de sql/fase5b_pagos.sql).
export async function registrarPago(evento, monto, nota) {
  const saldo = Number(evento.saldo_pendiente) || 0
  if (!(monto > 0)) return { error: 'El monto debe ser mayor que 0' }
  if (monto > saldo) return { error: `El monto supera el saldo pendiente (Bs. ${saldo.toFixed(2)})` }

  const { error } = await supabase.rpc('registrar_pago', { p_evento_id: evento.id, p_monto: monto, p_nota: nota || null })
  if (error) {
    // Los errores que levanta la función (P0001) ya traen un mensaje listo para mostrar
    return { error: error.code === 'P0001' ? error.message : 'No se pudo registrar el pago' }
  }
  return { error: null }
}

// `original` es el evento como estaba guardado; `editado` es la copia con los cambios del formulario.
export async function guardarEdicionEvento(original, editado) {
  const telefono = soloDigitos(editado.clientes.telefono)
  const telefono2 = soloDigitos(editado.clientes.telefono2)
  if (!telefonosValidos(telefono, telefono2)) return { error: MENSAJE_TELEFONO }

  const fechaInicio = editado.fecha
  const fechaFin = editado.fecha_fin || editado.fecha
  if (fechaFin < fechaInicio) return { error: MENSAJE_FECHAS }

  const saldoNuevo = parseFloat(editado.saldo_pendiente) || 0
  if (saldoNuevo < 0 || (parseFloat(editado.adelanto) || 0) < 0) return { error: 'Los montos no pueden ser negativos' }

  // Solo se revisa la disponibilidad si cambiaron las fechas, para no bloquear ediciones
  // de eventos que ya se solapaban antes.
  const cambioFechas = fechaInicio !== original?.fecha || (editado.fecha_fin || null) !== (original?.fecha_fin || null)
  if (cambioFechas) {
    const { conflicto, error } = await buscarConflicto(fechaInicio, fechaFin, editado.id)
    if (error) return { error: MENSAJE_DISPONIBILIDAD }
    if (conflicto) return { error: mensajeConflicto(conflicto) }
  }

  const { error: errorCliente } = await supabase.from('clientes').update({
    nombre: editado.clientes.nombre,
    ci_nit: editado.clientes.ci_nit,
    telefono,
    telefono2: telefono2 || null
  }).eq('id', editado.clientes.id)
  if (errorCliente) return { error: 'Error al actualizar el cliente' }

  // El adelanto lo registra solo la base de datos: si cambia, queda una corrección con la fecha de hoy.
  // El saldo se baja cobrando con registrarPago(), no editándolo, para que el ingreso quede anotado.
  const { error: errorEvento } = await supabase.from('eventos').update({
    tipo_evento: editado.tipo_evento,
    fecha: editado.fecha,
    fecha_fin: editado.fecha_fin || null,
    observaciones: editado.observaciones,
    adelanto: parseFloat(editado.adelanto) || 0,
    saldo_pendiente: saldoNuevo,
    pagado: saldoNuevo === 0,
    estado: editado.estado
  }).eq('id', editado.id)
  if (errorEvento) return { error: 'Error al actualizar el evento' }
  return { error: null }
}

export async function eliminarEvento(evento) {
  const MENSAJE = 'No se pudo eliminar el evento'

  const { data: garantiasPrevias, error: errorLeer } = await supabase.from('garantias').select('*').eq('evento_id', evento.id)
  if (errorLeer) return { error: MENSAJE }

  if (garantiasPrevias.length > 0) {
    const { error } = await supabase.from('garantias').delete().eq('evento_id', evento.id)
    if (error) return { error: MENSAJE }
  }

  const { error: errorEvento } = await supabase.from('eventos').delete().eq('id', evento.id)
  if (errorEvento) {
    // Se devuelven las garantías para no perderlas si el evento no se pudo borrar
    if (garantiasPrevias.length > 0) await supabase.from('garantias').insert(garantiasPrevias)
    return { error: `${MENSAJE}. Puede tener un acta de inventario registrada` }
  }

  // Si el cliente no tiene más eventos, se borra también
  if (evento.cliente_id) {
    const { count } = await supabase
      .from('eventos')
      .select('id', { count: 'exact', head: true })
      .eq('cliente_id', evento.cliente_id)
    if (count === 0) await supabase.from('clientes').delete().eq('id', evento.cliente_id)
  }
  return { error: null }
}

// ---------- Garantías ----------

export async function registrarGarantia(evento, form) {
  const { error } = await supabase.from('garantias').insert({
    evento_id: evento.id,
    cliente_nombre: evento.clientes?.nombre,
    cajas_llevadas: parseInt(form.cajas_llevadas) || 0,
    botellas_llevadas: parseInt(form.botellas_llevadas) || 0,
    monto_garantia: parseFloat(form.monto_garantia) || 0,
    fecha_limite: form.fecha_limite,
    observaciones: form.observaciones,
    estado: ESTADOS_GARANTIA.PENDIENTE
  })
  return { error: error ? 'Error al registrar la garantía' : null }
}

export async function marcarGarantiaDevuelta(id) {
  const { error } = await supabase.from('garantias').update({ estado: ESTADOS_GARANTIA.DEVUELTA }).eq('id', id)
  return { error: error ? 'No se pudo marcar la garantía como devuelta' : null }
}

export async function eliminarGarantia(id) {
  const { error } = await supabase.from('garantias').delete().eq('id', id)
  return { error: error ? 'No se pudo eliminar la garantía' : null }
}

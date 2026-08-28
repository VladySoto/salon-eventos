import { supabase } from '../supabase'

export const CATEGORIAS_INVENTARIO = ['cocina', 'bar']

// ---------- Catálogo maestro ----------

export async function listarItemsInventario({ soloActivos = false } = {}) {
  let query = supabase.from('inventario_items').select('*').order('categoria').order('nombre')
  if (soloActivos) query = query.eq('activo', true)
  return query
}

export async function crearItemInventario(datos) {
  return supabase.from('inventario_items').insert({
    nombre: datos.nombre,
    categoria: datos.categoria,
    cantidad_actual: Number(datos.cantidad_actual) || 0,
    precio_unitario: Number(datos.precio_unitario) || 0
  }).select().single()
}

export async function actualizarItemInventario(id, datos) {
  return supabase.from('inventario_items').update({
    nombre: datos.nombre,
    categoria: datos.categoria,
    cantidad_actual: Number(datos.cantidad_actual) || 0,
    precio_unitario: Number(datos.precio_unitario) || 0,
    activo: datos.activo
  }).eq('id', id).select().single()
}

export async function desactivarItemInventario(id) {
  return supabase.from('inventario_items').update({ activo: false }).eq('id', id)
}

// ---------- Acta de entrega/retorno por evento ----------

export async function obtenerDatosActaEvento(eventoId) {
  const [
    { data: evento, error: errorEvento },
    { data: itemsCatalogo, error: errorItems },
    { data: filasActa, error: errorFilas }
  ] = await Promise.all([
    supabase.from('eventos').select('id, tipo_evento, fecha, fecha_fin, clientes(nombre)').eq('id', eventoId).single(),
    supabase.from('inventario_items').select('*').eq('activo', true).order('categoria').order('nombre'),
    supabase.from('evento_inventario').select('*, inventario_items(nombre, categoria, precio_unitario)').eq('evento_id', eventoId)
  ])

  const error = errorEvento || errorItems || errorFilas
  return { data: { evento, itemsCatalogo: itemsCatalogo || [], filasActa: filasActa || [] }, error }
}

// filas: [{ item_id, cantidad_entregada }]
export async function guardarEntregaEvento(eventoId, filas) {
  const { data: existentes, error: errorExistentes } = await supabase
    .from('evento_inventario')
    .select('id, item_id')
    .eq('evento_id', eventoId)
  if (errorExistentes) return { error: errorExistentes }

  const idPorItem = new Map((existentes || []).map(r => [r.item_id, r.id]))
  const aInsertar = []
  const actualizaciones = []

  for (const fila of filas) {
    const cantidad = Number(fila.cantidad_entregada) || 0
    const idExistente = idPorItem.get(fila.item_id)
    if (idExistente) {
      actualizaciones.push(
        supabase.from('evento_inventario').update({ cantidad_entregada: cantidad }).eq('id', idExistente)
      )
    } else if (cantidad > 0) {
      aInsertar.push({ evento_id: eventoId, item_id: fila.item_id, cantidad_entregada: cantidad })
    }
  }

  if (aInsertar.length > 0) {
    const { error } = await supabase.from('evento_inventario').insert(aInsertar)
    if (error) return { error }
  }

  if (actualizaciones.length > 0) {
    const resultados = await Promise.all(actualizaciones)
    const errorActualizacion = resultados.find(r => r.error)?.error
    if (errorActualizacion) return { error: errorActualizacion }
  }

  return { error: null }
}

// fila: { cantidad_entregada, cantidad_devuelta, cantidad_rota, precio_unitario }
export function calcularComparacionFila(fila) {
  const entregada = Number(fila.cantidad_entregada) || 0
  const devuelta = Number(fila.cantidad_devuelta) || 0
  const rota = Number(fila.cantidad_rota) || 0
  const precio = Number(fila.precio_unitario) || 0
  const faltante = Math.max(entregada - devuelta - rota, 0)
  const monto_cobro = (rota + faltante) * precio
  return { faltante, monto_cobro }
}

export function calcularTotalCobro(filas) {
  return filas.reduce((acc, f) => acc + (Number(f.monto_cobro) || 0), 0)
}

// filas: [{ id (evento_inventario.id), cantidad_entregada, cantidad_devuelta, cantidad_rota, precio_unitario }]
export async function guardarRetornoEvento(filas) {
  const actualizaciones = filas.map(fila => {
    const { monto_cobro } = calcularComparacionFila(fila)
    return supabase.from('evento_inventario').update({
      cantidad_devuelta: Number(fila.cantidad_devuelta) || 0,
      cantidad_rota: Number(fila.cantidad_rota) || 0,
      monto_cobro
    }).eq('id', fila.id)
  })
  const resultados = await Promise.all(actualizaciones)
  const error = resultados.find(r => r.error)?.error
  return { error: error || null }
}

// Descuenta del catálogo maestro (rota + faltante) por ítem y marca el acta como cerrada.
// Solo procesa filas que todavía no estén cerradas, para que llamarla dos veces no descuente doble.
export async function cerrarActaEvento(eventoId) {
  const { data: filas, error: errorFilas } = await supabase
    .from('evento_inventario')
    .select('id, item_id, cantidad_entregada, cantidad_devuelta, cantidad_rota')
    .eq('evento_id', eventoId)
    .eq('cerrado', false)
  if (errorFilas) return { error: errorFilas }
  if (!filas || filas.length === 0) return { error: null }

  for (const fila of filas) {
    const { faltante } = calcularComparacionFila(fila)
    const perdida = (Number(fila.cantidad_rota) || 0) + faltante
    if (perdida > 0) {
      const { data: item, error: errorItem } = await supabase
        .from('inventario_items')
        .select('cantidad_actual')
        .eq('id', fila.item_id)
        .single()
      if (errorItem) return { error: errorItem }

      const nuevaCantidad = Math.max((item?.cantidad_actual || 0) - perdida, 0)
      const { error: errorUpdate } = await supabase
        .from('inventario_items')
        .update({ cantidad_actual: nuevaCantidad })
        .eq('id', fila.item_id)
      if (errorUpdate) return { error: errorUpdate }
    }
  }

  const { error: errorCerrar } = await supabase
    .from('evento_inventario')
    .update({ cerrado: true })
    .eq('evento_id', eventoId)
    .eq('cerrado', false)

  return { error: errorCerrar || null }
}

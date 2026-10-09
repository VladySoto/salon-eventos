import { supabase } from '../supabase'
import { fechaLocalISO, limitesDelMes } from '../utils/fechas'

const COLUMNAS_EVENTO = 'id, tipo_evento, fecha, fecha_fin, observaciones, adelanto, saldo_pendiente, estado, pagado, monto_total, monto_lavado'

// Trae lo que necesita el Dashboard: los totales de cervezas (calculados por la base de datos
// con la vista resumen_cerveza), los eventos con las columnas que se usan y los pagos del mes.
export async function cargarDatosDashboard() {
  const { inicio, fin } = limitesDelMes(fechaLocalISO().slice(0, 7))
  const [resumen, pagos, eventos] = await Promise.all([
    supabase.from('resumen_cerveza').select('deuda_distribuidor, cajas_pendientes').single(),
    supabase.from('pagos').select('monto').gte('fecha', inicio).lte('fecha', fin),
    supabase.from('eventos').select(`${COLUMNAS_EVENTO}, clientes(nombre, telefono, telefono2, ci_nit), garantias(id, estado, fecha_limite, monto_garantia, cajas_llevadas, botellas_llevadas)`).order('fecha', { ascending: true })
  ])
  if (resumen.error || pagos.error || eventos.error) return { error: true }
  return {
    error: false,
    deudaDistribuidor: Number(resumen.data.deuda_distribuidor) || 0,
    cajasPendientes: Number(resumen.data.cajas_pendientes) || 0,
    ingresosMes: pagos.data.reduce((total, p) => total + Number(p.monto), 0),
    eventos: eventos.data || []
  }
}

import { supabase } from '../supabase'

const COLUMNAS_EVENTO = 'id, tipo_evento, fecha, fecha_fin, observaciones, adelanto, saldo_pendiente, estado, pagado, created_at, fecha_pago, monto_saldo_cobrado, monto_total, monto_lavado'

// Trae lo que necesita el Dashboard: los totales de cervezas (calculados por la base de datos
// con la vista resumen_cerveza) y los eventos, solo con las columnas que se usan.
export async function cargarDatosDashboard() {
  const [resumen, eventos] = await Promise.all([
    supabase.from('resumen_cerveza').select('deuda_distribuidor, cajas_pendientes').single(),
    supabase.from('eventos').select(`${COLUMNAS_EVENTO}, clientes(nombre, telefono, telefono2, ci_nit), garantias(id, estado, fecha_limite, monto_garantia, cajas_llevadas, botellas_llevadas)`).order('fecha', { ascending: true })
  ])
  if (resumen.error || eventos.error) return { error: true }
  return {
    error: false,
    deudaDistribuidor: Number(resumen.data.deuda_distribuidor) || 0,
    cajasPendientes: Number(resumen.data.cajas_pendientes) || 0,
    eventos: eventos.data || []
  }
}

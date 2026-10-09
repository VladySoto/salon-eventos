export const MENSAJE_TELEFONO = 'El teléfono debe tener 7 u 8 dígitos'

export function soloDigitos(texto) {
  return String(texto || '').replace(/\D/g, '')
}

// Celulares de 8 dígitos y fijos de 7
export function telefonoValido(telefono) {
  return /^\d{7,8}$/.test(telefono)
}

// El teléfono 1 es obligatorio; el 2 es opcional pero, si se escribe, también debe ser válido
export function telefonosValidos(telefono, telefono2) {
  return telefonoValido(telefono) && (!telefono2 || telefonoValido(telefono2))
}

// Deja solo caracteres seguros para armar el filtro .or() de Supabase
export function limpiarParaFiltro(texto) {
  return String(texto || '').replace(/[^0-9A-Za-z-]/g, '')
}

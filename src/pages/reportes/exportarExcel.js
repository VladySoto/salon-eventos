import { armarReporte, construirHojasExcel } from '../../utils/reportes'

// Genera y descarga el archivo .xlsx del reporte. La librería se carga recién al tocar el botón,
// así no pesa en el resto de la app.
export async function descargarReporteExcel(datos, mes) {
  const { default: writeExcelFile } = await import('write-excel-file/browser')
  const reporte = armarReporte(datos, mes)
  const hojas = construirHojasExcel(reporte, datos, mes)
  await writeExcelFile(hojas).toFile(`reporte-${mes}.xlsx`)
}

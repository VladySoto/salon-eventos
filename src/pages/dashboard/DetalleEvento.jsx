import { ESTADOS_EVENTO, etiquetaTipoEvento } from '../../constants'
import { formatearRangoFechas } from '../../utils/fechas'

function Fila({ etiqueta, children }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-sm text-gray-500">{etiqueta}</span>
      <span className="text-sm text-gray-800 text-right">{children}</span>
    </div>
  )
}

function DetalleEvento({ evento }) {
  const completado = evento.estado === ESTADOS_EVENTO.COMPLETADO
  const tieneSaldo = Number(evento.saldo_pendiente) > 0

  return (
    <div className="flex flex-col gap-3">
      <Fila etiqueta="Cliente"><span className="font-medium">{evento.clientes?.nombre}</span></Fila>
      <Fila etiqueta="CI / NIT">{evento.clientes?.ci_nit || '—'}</Fila>
      <Fila etiqueta="Teléfono">{evento.clientes?.telefono}</Fila>
      {evento.clientes?.telefono2 && <Fila etiqueta="Teléfono 2">{evento.clientes.telefono2}</Fila>}
      <Fila etiqueta="Tipo">{etiquetaTipoEvento(evento.tipo_evento)}</Fila>
      <Fila etiqueta="Fecha">{formatearRangoFechas(evento.fecha, evento.fecha_fin)}</Fila>
      <Fila etiqueta="Adelanto">Bs. {Number(evento.adelanto).toFixed(2)}</Fila>
      <Fila etiqueta="Saldo">
        <span className={`font-medium ${tieneSaldo ? 'text-yellow-600' : 'text-green-600'}`}>Bs. {Number(evento.saldo_pendiente).toFixed(2)}</span>
      </Fila>
      <Fila etiqueta="Estado">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${completado ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
          {completado ? 'Completado' : 'Reservado'}
        </span>
        {evento.pagado && <span className="ml-1 text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">Pagado</span>}
      </Fila>
      {evento.observaciones && <Fila etiqueta="Notas">{evento.observaciones}</Fila>}
    </div>
  )
}

export default DetalleEvento

import { FILTROS_EVENTOS } from '../../utils/filtrosEventos'
import { Entrada, Selector } from '../../components/ui/Campo'

// busqueda: { texto, filtro, mes }. onCambiar recibe los campos que cambian.
function FiltrosEventos({ busqueda, onCambiar, meses, total, mostrados }) {
  const hayFiltros = busqueda.texto || busqueda.filtro !== 'todos' || busqueda.mes

  return (
    <div className="flex flex-col gap-3 mb-4">
      <Entrada
        type="search"
        value={busqueda.texto}
        onChange={e => onCambiar({ texto: e.target.value })}
        placeholder="Buscar por nombre, teléfono, CI o tipo..."
        aria-label="Buscar eventos"
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTROS_EVENTOS.map(f => (
          <button
            key={f.id}
            type="button"
            onClick={() => onCambiar({ filtro: f.id })}
            className={`px-4 py-3 rounded-full text-sm font-medium whitespace-nowrap ${busqueda.filtro === f.id ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
          >
            {f.etiqueta}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Selector value={busqueda.mes} onChange={e => onCambiar({ mes: e.target.value })} aria-label="Filtrar por mes" className="flex-1">
          <option value="">Todos los meses</option>
          {meses.map(m => <option key={m.valor} value={m.valor}>{m.etiqueta}</option>)}
        </Selector>
        <p className="text-sm text-gray-500 whitespace-nowrap">{mostrados} de {total}</p>
        {hayFiltros && (
          <button
            type="button"
            onClick={() => onCambiar({ texto: '', filtro: 'todos', mes: '' })}
            className="text-sm font-medium text-blue-600 px-2 py-3 whitespace-nowrap"
          >
            Limpiar
          </button>
        )}
      </div>
    </div>
  )
}

export default FiltrosEventos

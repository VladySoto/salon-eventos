import { useState } from 'react'
import { ESTADOS_EVENTO } from '../../constants'
import { eventoOcupaFecha } from '../../utils/calculos'
import { fechaLocalISO } from '../../utils/fechas'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

function aFechaISO(anio, mes, dia) {
  return `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

// Lista de días del mes empezando en lunes (null = casillas vacías al comienzo)
function diasDelMes(anio, mes) {
  const dias = []
  const primerDia = new Date(anio, mes, 1).getDay()
  const vacias = primerDia === 0 ? 6 : primerDia - 1
  const total = new Date(anio, mes + 1, 0).getDate()
  for (let i = 0; i < vacias; i++) dias.push(null)
  for (let i = 1; i <= total; i++) dias.push(i)
  return dias
}

// Casilla de un día. En el celular mide 40 px para poder tocarla; en pantallas grandes es pequeña.
const TAMANO_DIA = 'w-10 h-10 text-sm md:w-[18px] md:h-[18px] md:text-[10px]'

function Dia({ dia, esHoy, tieneCompletado, tienePendiente, onClick, titulo }) {
  const tieneEvento = tieneCompletado || tienePendiente

  let clases = `flex items-center justify-center mx-auto ${TAMANO_DIA} `
  if (esHoy) clases += 'rounded-full bg-blue-600 text-white font-medium'
  else if (tieneCompletado) clases += 'rounded-md bg-green-100 text-green-800 font-medium'
  else if (tienePendiente) clases += 'rounded-md bg-yellow-100 text-yellow-800 font-medium'
  else clases += 'rounded-md text-gray-600'

  if (!tieneEvento) return <div className={clases}>{dia}</div>
  return (
    <button type="button" onClick={onClick} title={titulo} className={`${clases} cursor-pointer`}>
      {dia}
    </button>
  )
}

// En el celular muestra un mes a la vez con flechas; en pantallas grandes, los 12 meses del año.
function Calendario({ eventos, onSeleccionarDia }) {
  const hoy = new Date()
  const hoyISO = fechaLocalISO(hoy)
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [mes, setMes] = useState(hoy.getMonth())

  function cambiarMes(cambio) {
    const nuevo = mes + cambio
    if (nuevo < 0) { setMes(11); setAnio(a => a - 1) }
    else if (nuevo > 11) { setMes(0); setAnio(a => a + 1) }
    else setMes(nuevo)
  }

  const clasesFlecha = 'border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 w-11 h-11 md:w-7 md:h-7 text-lg md:text-sm'

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-700">
            <span className="hidden md:inline">Calendario {anio}</span>
            <span className="md:hidden">{MESES[mes]} {anio}</span>
          </h2>
          <div className="flex gap-2 md:hidden">
            <button type="button" onClick={() => cambiarMes(-1)} aria-label="Mes anterior" className={clasesFlecha}>‹</button>
            <button type="button" onClick={() => cambiarMes(1)} aria-label="Mes siguiente" className={clasesFlecha}>›</button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-3">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-green-600"></div><span className="text-xs text-gray-500">Completado</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-yellow-500"></div><span className="text-xs text-gray-500">Pendiente</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div><span className="text-xs text-gray-500">Hoy</span></div>
          </div>
          <div className="hidden md:flex gap-1">
            <button type="button" onClick={() => setAnio(a => a - 1)} aria-label="Año anterior" className={clasesFlecha}>‹</button>
            <button type="button" onClick={() => setAnio(a => a + 1)} aria-label="Año siguiente" className={clasesFlecha}>›</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {MESES.map((nombre, mesIdx) => (
          <div
            key={nombre}
            className={`rounded-xl border border-gray-100 p-2 ${mesIdx === mes ? 'block' : 'hidden md:block'}`}
            style={{ boxShadow: '0px 2px 1.5px 0px #A5AEB852 inset' }}
          >
            <p className="hidden md:block text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 px-1">{nombre}</p>
            <div className="grid grid-cols-7 gap-1 md:gap-px">
              {DIAS_SEMANA.map((d, i) => (
                <div key={`${nombre}-${i}`} className="text-center text-gray-400 md:text-gray-300 font-medium text-xs md:text-[9px] py-1 md:py-px">{d}</div>
              ))}
              {diasDelMes(anio, mesIdx).map((dia, i) => {
                if (!dia) return <div key={i} className={`${TAMANO_DIA} mx-auto`} />
                const fecha = aFechaISO(anio, mesIdx, dia)
                const delDia = eventos.filter(e => eventoOcupaFecha(e, fecha))
                return (
                  <Dia
                    key={i}
                    dia={dia}
                    esHoy={fecha === hoyISO}
                    tieneCompletado={delDia.some(e => e.estado === ESTADOS_EVENTO.COMPLETADO)}
                    tienePendiente={delDia.some(e => e.estado === ESTADOS_EVENTO.RESERVADO)}
                    titulo={delDia.map(e => e.clientes?.nombre).join(', ')}
                    onClick={() => onSeleccionarDia(delDia)}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Calendario

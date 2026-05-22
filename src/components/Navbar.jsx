import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'

const links = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/cervezas', label: 'Cervezas', icon: '🍺' },
  { to: '/alquiler', label: 'Alquiler', icon: '🏛️' },
  { to: '/garantias', label: 'Garantías', icon: '🛡️' },

]

function Navbar() {
  const location = useLocation()
  const [menuAbierto, setMenuAbierto] = useState(false)

  return (
    <>
      {/* Navbar desktop */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3 hidden md:flex items-center gap-2">
        <span className="font-bold text-gray-800 mr-4 text-sm">Salón de Eventos</span>
        {links.map(link => (
          <Link
            key={link.to}
            to={link.to}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${location.pathname === link.to ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <span>{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        ))}
      </nav>

      {/* Navbar mobile — top bar */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3 flex md:hidden items-center justify-between">
        <span className="font-bold text-gray-800 text-sm">Salón de Eventos</span>
        <button
          onClick={() => setMenuAbierto(!menuAbierto)}
          className="text-gray-600 text-xl p-1"
        >
          {menuAbierto ? '✕' : '☰'}
        </button>
      </nav>

      {/* Menu desplegable mobile */}
      {menuAbierto && (
        <div className="md:hidden bg-white border-b border-gray-200 px-4 py-2 flex flex-col gap-1">
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMenuAbierto(false)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${location.pathname === link.to ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
        </div>
      )}

      {/* Bottom navigation mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-40">
        {links.map(link => (
          <Link
            key={link.to}
            to={link.to}
            className={`flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors
              ${location.pathname === link.to ? 'text-blue-600' : 'text-gray-400'}`}
          >
            <span className="text-xl mb-0.5">{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        ))}
      </div>
    </>
  )
}

export default Navbar
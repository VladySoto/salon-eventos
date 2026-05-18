import { Link, useLocation } from 'react-router-dom'

const links = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/cervezas', label: 'Cervezas', icon: '🍺' },
  { to: '/alquiler', label: 'Alquiler', icon: '🏛️' },
]

function Navbar() {
  const location = useLocation()

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-2">
      <span className="font-bold text-gray-800 mr-4 text-sm">Salón de Eventos</span>
      {links.map(link => (
        <Link
          key={link.to}
          to={link.to}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
            ${location.pathname === link.to
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-600 hover:bg-gray-100'
            }`}
        >
          <span>{link.icon}</span>
          <span>{link.label}</span>
        </Link>
      ))}
    </nav>
  )
}

export default Navbar
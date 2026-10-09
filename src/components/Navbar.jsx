import { Link, useLocation } from 'react-router-dom'

const links = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/cervezas', label: 'Cervezas', icon: '🍺' },
  { to: '/alquiler', label: 'Alquiler', icon: '🏛️' },
  { to: '/inventario', label: 'Inventario', icon: '📋' },
]

function Navbar() {
  const location = useLocation()

  function esActivo(to) {
    return to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
  }

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
              ${esActivo(link.to) ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <span>{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        ))}
      </nav>

      {/* Barra superior mobile: solo el título; la navegación está abajo */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex md:hidden items-center">
        <span className="font-bold text-gray-800 text-sm">Salón de Eventos</span>
      </header>

      {/* Navegación inferior mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-40">
        {links.map(link => (
          <Link
            key={link.to}
            to={link.to}
            className={`flex-1 flex flex-col items-center justify-center min-h-[56px] py-2 text-xs font-medium transition-colors
              ${esActivo(link.to) ? 'text-blue-600' : 'text-gray-500'}`}
          >
            <span className="text-xl mb-0.5">{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}

export default Navbar

import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import AvisoSinConexion from './components/AvisoSinConexion'
import AvisoCarga from './components/AvisoCarga'
import ErrorBoundary from './components/ErrorBoundary'

// Cada pantalla se descarga solo cuando se entra por primera vez
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'))
const Cervezas = lazy(() => import('./pages/cervezas/Cervezas'))
const Alquiler = lazy(() => import('./pages/alquiler/Alquiler'))
const Inventario = lazy(() => import('./pages/inventario/Inventario'))
const ActaEvento = lazy(() => import('./pages/inventario/ActaEvento'))
const Recibo = lazy(() => import('./pages/recibo/Recibo'))
const Reportes = lazy(() => import('./pages/reportes/Reportes'))

document.addEventListener('wheel', function() {
  if (document.activeElement.type === 'number') {
    document.activeElement.blur()
  }
}, { passive: false })

function Pantallas() {
  const location = useLocation()
  return (
    // key: al cambiar de pantalla se reinicia el aviso de error
    <ErrorBoundary key={location.pathname}>
      <Suspense fallback={<div className="p-4 md:p-6"><AvisoCarga cargando texto="Cargando..." /></div>}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/cervezas" element={<Cervezas />} />
          <Route path="/alquiler" element={<Alquiler />} />
          <Route path="/inventario" element={<Inventario />} />
          <Route path="/inventario/evento/:eventoId" element={<ActaEvento />} />
          <Route path="/recibo/:eventoId" element={<Recibo />} />
          <Route path="/reportes" element={<Reportes />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <AvisoSinConexion />
        <Navbar />
        <main className="max-w-5xl mx-auto pb-20 md:pb-0">
          <Pantallas />
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App

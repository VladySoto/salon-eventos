import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Dashboard from './pages/dashboard/Dashboard'
import Cervezas from './pages/cervezas/Cervezas'
import Alquiler from './pages/alquiler/Alquiler'
import Garantias from './pages/garantias/Garantias'

document.addEventListener('wheel', function(e) {
  if (document.activeElement.type === 'number') {
    document.activeElement.blur()
  }
}, { passive: false })

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-5xl mx-auto pb-20 md:pb-0">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/cervezas" element={<Cervezas />} />
            <Route path="/alquiler" element={<Alquiler />} />
            <Route path="/garantias" element={<Garantias />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
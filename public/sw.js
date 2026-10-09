// Service worker de Rey Illampu.
// - Guarda la "cáscara" de la app (HTML, JS, CSS, íconos) para que abra sin internet.
// - Los DATOS (Supabase y cualquier otro dominio) NUNCA se guardan en caché: siempre van a la red.
//   Sin internet la app abre y muestra los avisos de "no se pudieron cargar los datos".
// - BUILD lo reemplaza vite.config.js en cada compilación, así cada despliegue renueva la caché.
const BUILD = '__BUILD__'
const CACHE = `rey-illampu-${BUILD}`

const ARCHIVOS_BASE = [
  '/',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png'
]

self.addEventListener('install', evento => {
  evento.waitUntil((async () => {
    const cache = await caches.open(CACHE)
    await cache.addAll(ARCHIVOS_BASE)

    // Precarga también los JS/CSS que usa el index.html, para que la 2.ª visita ya funcione sin internet
    try {
      const respuesta = await fetch('/', { cache: 'reload' })
      const html = await respuesta.text()
      const recursos = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(m => m[1])
      await Promise.all(recursos.map(url => cache.add(url).catch(() => {})))
    } catch {
      // Si falla, los archivos se guardan igual la primera vez que se usen
    }
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', evento => {
  evento.waitUntil((async () => {
    const nombres = await caches.keys()
    await Promise.all(nombres.filter(n => n.startsWith('rey-illampu-') && n !== CACHE).map(n => caches.delete(n)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', evento => {
  const { request } = evento
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // Datos y servicios externos (Supabase, etc.): sin caché
  if (url.origin !== self.location.origin) return

  // Navegación: primero la red (para tener siempre la versión nueva); sin internet, la app guardada
  if (request.mode === 'navigate') {
    evento.respondWith((async () => {
      try {
        const respuesta = await fetch(request)
        if (respuesta.ok) {
          const cache = await caches.open(CACHE)
          cache.put('/', respuesta.clone())
        }
        return respuesta
      } catch {
        const guardada = await caches.match('/', { ignoreVary: true })
        return guardada || new Response('Sin conexión', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
      }
    })())
    return
  }

  // Archivos estáticos: primero la caché; si no está, red y se guarda
  evento.respondWith((async () => {
    // ignoreVary: los módulos JS se piden con cabecera Origin y el servidor puede responder
    // "Vary: Origin"; sin esto la caché no reconoce el archivo guardado al instalar.
    const guardada = await caches.match(request, { ignoreVary: true })
    if (guardada) return guardada
    const respuesta = await fetch(request)
    if (respuesta.ok && respuesta.type === 'basic') {
      const cache = await caches.open(CACHE)
      cache.put(request, respuesta.clone())
    }
    return respuesta
  })())
})

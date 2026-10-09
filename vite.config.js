import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Cada compilación estampa una versión distinta en el service worker (public/sw.js),
// así los celulares renuevan su caché cuando hay un despliegue nuevo.
function versionarServiceWorker() {
  let config
  return {
    name: 'versionar-service-worker',
    apply: 'build',
    configResolved(resolved) {
      config = resolved
    },
    closeBundle() {
      const ruta = resolve(config.root, config.build.outDir, 'sw.js')
      if (!existsSync(ruta)) return
      const version = Date.now().toString(36)
      writeFileSync(ruta, readFileSync(ruta, 'utf-8').replace('__BUILD__', version))
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), versionarServiceWorker()],
})

// Genera los íconos de la app (PWA) en public/icons/. Sin dependencias externas.
// Uso: node scripts/generar-iconos.mjs
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const salida = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')
mkdirSync(salida, { recursive: true })

const FONDO = [37, 99, 235]        // #2563eb
const PICO_ATRAS = [191, 219, 254] // #bfdbfe
const PICO_FRENTE = [255, 255, 255]
const SOL = [253, 230, 138]        // #fde68a

// Dibujo en coordenadas 0..1. Cada forma: { tipo, color, ... }
const formas = [
  { tipo: 'circulo', color: SOL, cx: 0.74, cy: 0.3, r: 0.07 },
  { tipo: 'poligono', color: PICO_ATRAS, puntos: [[0.1, 0.74], [0.32, 0.46], [0.54, 0.74]] },
  { tipo: 'poligono', color: PICO_FRENTE, puntos: [[0.2, 0.74], [0.5, 0.26], [0.8, 0.74]] },
  { tipo: 'poligono', color: PICO_ATRAS, puntos: [[0.5, 0.26], [0.4, 0.42], [0.46, 0.4], [0.5, 0.45], [0.55, 0.4], [0.6, 0.42]] }
]

function dentroPoligono(x, y, puntos) {
  let dentro = false
  for (let i = 0, j = puntos.length - 1; i < puntos.length; j = i++) {
    const [xi, yi] = puntos[i]
    const [xj, yj] = puntos[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro
  }
  return dentro
}

function dentroRectRedondeado(x, y, radio) {
  const cx = Math.min(Math.max(x, radio), 1 - radio)
  const cy = Math.min(Math.max(y, radio), 1 - radio)
  return (x - cx) ** 2 + (y - cy) ** 2 <= radio ** 2
}

// opciones.esquinas: radio del fondo (0 = a sangre, sin esquinas redondeadas)
// opciones.escala: tamaño del dibujo respecto al lienzo (los íconos "maskable" necesitan margen)
function crearIcono(tamano, { esquinas, escala }) {
  const pixeles = Buffer.alloc(tamano * tamano * 4)
  const muestras = 4
  for (let py = 0; py < tamano; py++) {
    for (let px = 0; px < tamano; px++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let sy = 0; sy < muestras; sy++) {
        for (let sx = 0; sx < muestras; sx++) {
          const x = (px + (sx + 0.5) / muestras) / tamano
          const y = (py + (sy + 0.5) / muestras) / tamano
          if (esquinas > 0 && !dentroRectRedondeado(x, y, esquinas)) continue
          let color = FONDO
          const dx = 0.5 + (x - 0.5) / escala
          const dy = 0.5 + (y - 0.5) / escala
          for (const forma of formas) {
            const toca = forma.tipo === 'circulo'
              ? (dx - forma.cx) ** 2 + (dy - forma.cy) ** 2 <= forma.r ** 2
              : dentroPoligono(dx, dy, forma.puntos)
            if (toca) color = forma.color
          }
          r += color[0]; g += color[1]; b += color[2]; a += 255
        }
      }
      const total = muestras * muestras
      const i = (py * tamano + px) * 4
      pixeles[i] = a ? Math.round(r / (a / 255)) : 0
      pixeles[i + 1] = a ? Math.round(g / (a / 255)) : 0
      pixeles[i + 2] = a ? Math.round(b / (a / 255)) : 0
      pixeles[i + 3] = Math.round(a / total)
    }
  }
  return pixeles
}

// --- Codificador PNG mínimo (RGBA, 8 bits) ---
const tablaCrc = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = tablaCrc[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function trozo(tipo, datos) {
  const largo = Buffer.alloc(4)
  largo.writeUInt32BE(datos.length)
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(cuerpo))
  return Buffer.concat([largo, cuerpo, crc])
}
function codificarPng(tamano, pixeles) {
  const cabecera = Buffer.alloc(13)
  cabecera.writeUInt32BE(tamano, 0)
  cabecera.writeUInt32BE(tamano, 4)
  cabecera[8] = 8   // bits por canal
  cabecera[9] = 6   // RGBA
  const filas = Buffer.alloc((tamano * 4 + 1) * tamano)
  for (let y = 0; y < tamano; y++) {
    pixeles.copy(filas, y * (tamano * 4 + 1) + 1, y * tamano * 4, (y + 1) * tamano * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozo('IHDR', cabecera),
    trozo('IDAT', deflateSync(filas)),
    trozo('IEND', Buffer.alloc(0))
  ])
}

const iconos = [
  { archivo: 'icon-192.png', tamano: 192, esquinas: 0.2, escala: 1 },
  { archivo: 'icon-512.png', tamano: 512, esquinas: 0.2, escala: 1 },
  // "maskable": el sistema recorta el ícono con su propia forma, el dibujo va dentro de la zona segura
  { archivo: 'icon-maskable-512.png', tamano: 512, esquinas: 0, escala: 0.72 },
  // iOS aplica sus propias esquinas redondeadas
  { archivo: 'apple-touch-icon.png', tamano: 180, esquinas: 0, escala: 0.9 }
]

for (const { archivo, tamano, esquinas, escala } of iconos) {
  writeFileSync(join(salida, archivo), codificarPng(tamano, crearIcono(tamano, { esquinas, escala })))
  console.log('creado', archivo)
}

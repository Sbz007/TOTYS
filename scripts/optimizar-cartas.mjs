// Convierte tus cartas originales (PNG/JPG pesados) a WebP livianos.
//
// Uso:
//   1) Pon tus imágenes originales en la carpeta  cartas-originales/
//      con los mismos nombres de siempre (por-1.png, def-3.png, ...)
//   2) npm install        (una vez, instala "sharp")
//   3) npm run optimizar
//   4) En src/players.js cambia  const EXT = 'png'  por  const EXT = 'webp'
//
// Resultado: public/cartas/*.webp  (unos 15–40 KB cada una en vez de cientos de KB)
import sharp from 'sharp'
import { readdir, mkdir, stat } from 'node:fs/promises'
import path from 'node:path'

const ENTRADA = 'cartas-originales'
const SALIDA = 'public/cartas'
const ANCHO = 480 // suficiente para la cancha y la imagen descargada (se ve a ~270 px)
const CALIDAD = 82

await mkdir(SALIDA, { recursive: true })
const archivos = (await readdir(ENTRADA)).filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
if (!archivos.length) {
  console.log(`No hay imágenes en ${ENTRADA}/. Copia ahí tus cartas originales.`)
  process.exit(0)
}

let antes = 0
let despues = 0
for (const f of archivos) {
  const origen = path.join(ENTRADA, f)
  const destino = path.join(SALIDA, f.replace(/\.[^.]+$/, '.webp'))
  await sharp(origen)
    .resize({ width: ANCHO, withoutEnlargement: true })
    .webp({ quality: CALIDAD, alphaQuality: 90 })
    .toFile(destino)
  const a = (await stat(origen)).size
  const d = (await stat(destino)).size
  antes += a
  despues += d
  console.log(`${f}  ${(a / 1024).toFixed(0)} KB -> ${(d / 1024).toFixed(0)} KB`)
}
console.log(
  `\nListo: ${archivos.length} imágenes. ${(antes / 1048576).toFixed(1)} MB -> ${(despues / 1048576).toFixed(1)} MB`
)

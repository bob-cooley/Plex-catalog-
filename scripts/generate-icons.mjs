/**
 * Generates PNG icons at all required Chrome extension sizes.
 * Extracts the film and TV icons from plex-icons-source.png,
 * recolors them to Plex yellow on dark background, composes them
 * side by side with a downward arrow, and scales to all sizes.
 *
 * Run with: node scripts/generate-icons.mjs
 */

import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const sourcePath = resolve(root, 'src/icons/plex-icons-source.png')
const outDir = resolve(root, 'public/icons')

mkdirSync(outDir, { recursive: true })

const SIZES = [16, 32, 48, 128]
const CANVAS = 128
const BG = { r: 31, g: 31, b: 31 }
const YELLOW_R = 229, YELLOW_G = 160, YELLOW_B = 13

// ---------------------------------------------------------------------------
// Extract raw pixels from source
// ---------------------------------------------------------------------------
const { data: srcRaw, info } = await sharp(sourcePath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

const { width: srcW, height: srcH, channels } = info
const halfH = Math.floor(srcH / 2)

// ---------------------------------------------------------------------------
// Recolor: light pixels -> Plex yellow, dark pixels -> background
// Output is always 3-channel RGB
// ---------------------------------------------------------------------------
function recolorPixels(src, w, h) {
  const out = Buffer.alloc(w * h * 3)
  for (let i = 0; i < w * h; i++) {
    const s = i * channels
    const d = i * 3
    const lum = 0.299 * src[s] + 0.587 * src[s + 1] + 0.114 * src[s + 2]
    if (lum > 80) {
      out[d] = YELLOW_R; out[d + 1] = YELLOW_G; out[d + 2] = YELLOW_B
    } else {
      out[d] = BG.r; out[d + 1] = BG.g; out[d + 2] = BG.b
    }
  }
  return out
}

// Top half = film strip icon
const topRaw = srcRaw.subarray(0, srcW * halfH * channels)
const filmPixels = recolorPixels(topRaw, srcW, halfH)

// Bottom half = TV/monitor icon
const botRaw = srcRaw.subarray(srcW * halfH * channels)
const tvPixels = recolorPixels(botRaw, srcW, srcH - halfH, channels)

// ---------------------------------------------------------------------------
// Scale each icon to fit in a 52x52 box
// ---------------------------------------------------------------------------
// Trim dark padding from each icon, then scale up to fill available space.
// Icons sit in the upper portion; arrow takes the bottom 36px.
const ARROW_H = 30
const ARROW_TOP = CANVAS - ARROW_H - 2
const ICON_W = Math.round(60 * 0.85)                       // 51px
const ICON_H = Math.round((ARROW_TOP - 4) * 0.85)          // ~78px

// Center icons horizontally and vertically in the space above the arrow
const GAP = Math.round((CANVAS - ICON_W * 2) / 3)          // ~8px
const ICON_LEFT_FILM = GAP
const ICON_LEFT_TV = GAP + ICON_W + GAP
const ICON_TOP = Math.round((ARROW_TOP - ICON_H) / 2)

// Convert raw pixels to PNG, trim background padding, resize to target
async function prepareIcon(pixels, w, h) {
  const png = await sharp(pixels, { raw: { width: w, height: h, channels: 3 } })
    .png()
    .toBuffer()

  return sharp(png)
    .trim({ background: { r: BG.r, g: BG.g, b: BG.b }, threshold: 10 })
    .resize(ICON_W, ICON_H, { fit: 'contain', background: BG })
    .raw()
    .toBuffer()
}

const filmBuf = await prepareIcon(filmPixels, srcW, halfH)
const tvBuf = await prepareIcon(tvPixels, srcW, srcH - halfH)

// ---------------------------------------------------------------------------
// Compose the 128x128 icon
// Layout:
//   Film icon:  top-left  (4, 4)
//   TV icon:    top-right (68, 4)
//   Arrow:      bottom — pure triangle, no stem
// ---------------------------------------------------------------------------

// Wide downward arrow — triangle only, no stem
const arrowSvg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="${ARROW_H}">
  <polygon points="0,0 120,0 60,${ARROW_H}" fill="#E5A00D"/>
</svg>`)

// Rounded dark background
const bgMask = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}">
  <rect width="${CANVAS}" height="${CANVAS}" rx="18" ry="18" fill="#1F1F1F"/>
</svg>`)

const icon128 = await sharp(bgMask)
  .resize(CANVAS, CANVAS)
  .composite([
    {
      input: filmBuf,
      raw: { width: ICON_W, height: ICON_H, channels: 3 },
      top: ICON_TOP,
      left: ICON_LEFT_FILM,
    },
    {
      input: tvBuf,
      raw: { width: ICON_W, height: ICON_H, channels: 3 },
      top: ICON_TOP,
      left: ICON_LEFT_TV,
    },
    {
      input: arrowSvg,
      top: ARROW_TOP,
      left: 4,
    },
  ])
  .png()
  .toBuffer()

// ---------------------------------------------------------------------------
// Scale to all required sizes
// ---------------------------------------------------------------------------
for (const size of SIZES) {
  const outPath = resolve(outDir, `icon${size}.png`)
  await sharp(icon128).resize(size, size).png().toFile(outPath)
  console.log(`Generated ${size}x${size} -> public/icons/icon${size}.png`)
}

console.log('Done.')

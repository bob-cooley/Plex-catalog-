/**
 * Generates PNG icons at all required Chrome extension sizes from the source SVG.
 * Run with: node scripts/generate-icons.mjs
 */

import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const svgPath = resolve(root, 'src/icons/icon.svg')
const outDir = resolve(root, 'public/icons')

const sizes = [16, 32, 48, 128]

mkdirSync(outDir, { recursive: true })

for (const size of sizes) {
  const outPath = resolve(outDir, `icon${size}.png`)
  await sharp(svgPath).resize(size, size).png().toFile(outPath)
  console.log(`Generated ${size}x${size} -> public/icons/icon${size}.png`)
}

console.log('Done.')

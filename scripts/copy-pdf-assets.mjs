import { cpSync, mkdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const srcDir = path.join(root, 'node_modules', 'pdfjs-dist')
const destBase = path.join(root, 'public', 'pdf')

const folders = ['cmaps', 'standard_fonts', 'wasm', 'iccs']

mkdirSync(destBase, { recursive: true })

let copied = 0
for (const folder of folders) {
  const from = path.join(srcDir, folder)
  const to = path.join(destBase, folder)
  if (existsSync(from)) {
    cpSync(from, to, { recursive: true })
    copied++
  }
}

console.log(`[bookreader] copied ${copied}/${folders.length} pdfjs asset folders -> ${destBase}`)

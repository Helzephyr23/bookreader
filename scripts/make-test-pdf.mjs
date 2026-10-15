import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const outDir = path.join(root, 'test')
mkdirSync(outDir, { recursive: true })

const N = 5
const esc = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')

// Object map: 1 catalog, 2 pages, 3 font, then pairs of (page, content).
const M = 3 + N * 2
const objects = []

objects[1] = '<< /Type /Catalog /Pages 2 0 R >>'
const kids = []
for (let i = 0; i < N; i++) kids.push(`${4 + 2 * i} 0 R`)
objects[2] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${N} >>`
objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'

for (let i = 0; i < N; i++) {
  const pageNo = 4 + 2 * i
  const contentNo = 5 + 2 * i
  objects[pageNo] =
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ` +
    `/Contents ${contentNo} 0 R /Resources << /Font << /F1 3 0 R >> >> >>`
  const text =
    `BT /F1 44 Tf 72 690 Td (${esc('Sample Book')}) Tj ET\n` +
    `BT /F1 20 Tf 72 640 Td (${esc('A cozy PDF for testing BookReader')}) Tj ET\n` +
    `BT /F1 28 Tf 72 560 Td (${esc(`Chapter  ${i + 1}`)}) Tj ET\n` +
    `BT /F1 16 Tf 72 510 Td (${esc(`This is page ${i + 1} of ${N}.`)}) Tj ET\n`
  objects[contentNo] = `<< /Length ${Buffer.byteLength(text, 'latin1')} >>\nstream\n${text}endstream`
}

const chunks = []
let offset = 0
const push = (str, enc = 'latin1') => {
  const buf = Buffer.from(str, enc)
  chunks.push(buf)
  offset += buf.length
}

push('%PDF-1.4\n')
push('%\xe2\xe3\xcf\xd3\n')

const offsets = []
for (let n = 1; n <= M; n++) {
  offsets[n] = offset
  push(`${n} 0 obj\n${objects[n]}\nendobj\n`)
}

const xrefOffset = offset
push(`xref\n0 ${M + 1}\n`)
push('0000000000 65535 f \n')
for (let n = 1; n <= M; n++) {
  push(`${String(offsets[n]).padStart(10, '0')} 00000 n \n`)
}
push(`trailer\n<< /Size ${M + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`)

const outFile = path.join(outDir, 'sample.pdf')
writeFileSync(outFile, Buffer.concat(chunks))
console.log(`[bookreader] wrote ${outFile} (${N} pages, ${offset} bytes)`)

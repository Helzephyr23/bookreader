import * as pdfjsLib from 'pdfjs-dist'
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker'

pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker()

export type PdfLoadingTask = ReturnType<typeof pdfjsLib.getDocument>
export type PdfDocument = Awaited<PdfLoadingTask['promise']>
export type PdfPage = Awaited<ReturnType<PdfDocument['getPage']>>

const asset = (folder: string) => `book://assets/${folder}/`

export const bookUrl = (filePath: string) =>
  `book://file/?p=${encodeURIComponent(filePath)}`

export function getPdfLoadingTask(filePath: string): PdfLoadingTask {
  return pdfjsLib.getDocument({
    url: bookUrl(filePath),
    cMapUrl: asset('cmaps'),
    cMapPacked: true,
    standardFontDataUrl: asset('standard_fonts'),
    wasmUrl: asset('wasm'),
    iccUrl: asset('iccs'),
  })
}

export { pdfjsLib }

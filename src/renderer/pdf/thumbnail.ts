import { getPdfLoadingTask } from './pdfjs'
import { renderPageToDataURL } from './renderPage'

export interface CoverResult {
  numPages: number
  cover: string
}

/**
 * Load a PDF just far enough to grab its page count and a cover image of the
 * first page. The document is destroyed afterwards to free memory.
 */
export async function makeCover(filePath: string, targetWidth = 300): Promise<CoverResult> {
  const task = getPdfLoadingTask(filePath)
  const doc = await task.promise
  try {
    const page = await doc.getPage(1)
    const base = page.getViewport({ scale: 1 })
    const scale = targetWidth / base.width
    const cover = await renderPageToDataURL(doc, 1, scale)
    return { numPages: doc.numPages, cover }
  } finally {
    try {
      await task.destroy()
    } catch {
      /* ignore */
    }
  }
}

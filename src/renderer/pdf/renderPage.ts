import type { PdfDocument, PdfPage } from './pdfjs'

export interface PageSize {
  width: number
  height: number
}

export interface RenderTaskLike {
  cancel: () => void
  promise: Promise<void>
}

function dprFactor(): number {
  return window.devicePixelRatio || 1
}

export async function getPageSize(doc: PdfDocument, pageNumber: number): Promise<PageSize> {
  const page = await doc.getPage(pageNumber)
  const viewport = page.getViewport({ scale: 1 })
  return { width: viewport.width, height: viewport.height }
}

/**
 * Render a page into the given canvas at `scale` (CSS pixels), accounting for
 * device pixel ratio so the result is crisp on high-DPI displays.
 */
export async function renderToCanvas(
  page: PdfPage,
  scale: number,
  canvas: HTMLCanvasElement,
): Promise<RenderTaskLike> {
  const viewport = page.getViewport({ scale })
  const dpr = dprFactor()

  canvas.width = Math.floor(viewport.width * dpr)
  canvas.height = Math.floor(viewport.height * dpr)
  canvas.style.width = `${viewport.width}px`
  canvas.style.height = `${viewport.height}px`

  return page.render({
    canvas,
    viewport,
    transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
  })
}

/**
 * Render a page offscreen and return a data URL. Used for the faces of the
 * page-flip leaf so the animation has real page content.
 */
export async function renderPageToDataURL(
  doc: PdfDocument,
  pageNumber: number,
  scale: number,
  paper = '#fbf5e9',
): Promise<string> {
  const page = await doc.getPage(pageNumber)
  const viewport = page.getViewport({ scale })
  const dpr = dprFactor()

  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(viewport.width * dpr)
  canvas.height = Math.floor(viewport.height * dpr)

  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = paper
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  await page.render({
    canvas,
    viewport,
    transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
  }).promise

  return canvas.toDataURL('image/png')
}

import { useEffect, useRef } from 'react'
import type { PdfDocument } from '@/pdf/pdfjs'
import { renderToCanvas, type RenderTaskLike } from '@/pdf/renderPage'

interface PageCanvasProps {
  doc: PdfDocument
  pageNumber: number
  scale: number
  className?: string
}

export function PageCanvas({ doc, pageNumber, scale, className }: PageCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let cancelled = false
    let task: RenderTaskLike | null = null

    const run = async () => {
      const canvas = ref.current
      if (!canvas) return
      const page = await doc.getPage(pageNumber)
      if (cancelled) return
      const rt = await renderToCanvas(page, scale, canvas)
      task = rt
      try {
        await rt.promise
      } catch (err) {
        if ((err as { name?: string })?.name !== 'RenderingCancelledException') {
          console.error('[bookreader] render failed', err)
        }
      }
    }

    void run()

    return () => {
      cancelled = true
      task?.cancel()
    }
  }, [doc, pageNumber, scale])

  return <canvas ref={ref} className={className} />
}

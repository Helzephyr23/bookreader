import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useReader } from '@/stores/readerStore'
import { getSpread, nextPage, prevPage, type Spread } from '@/pdf/pagination'
import { getPageSize, renderPageToDataURL } from '@/pdf/renderPage'
import { PageCanvas } from './PageCanvas'

const STAGE_PAD = 40
const GUTTER = 3
const FLIP_MS = 560
const SPREAD_MIN_WIDTH = 1080

interface Flip {
  dir: 'next' | 'prev'
  front: string
  back: string
  width: number
  height: number
}

export function BookView() {
  const doc = useReader((s) => s.doc)
  const numPages = useReader((s) => s.numPages)
  const currentPage = useReader((s) => s.currentPage)
  const fit = useReader((s) => s.fit)
  const scale = useReader((s) => s.scale)
  const viewMode = useReader((s) => s.viewMode)
  const effectiveSpread = useReader((s) => s.effectiveSpread)
  const setEffectiveSpread = useReader((s) => s.setEffectiveSpread)
  const setEffectiveScale = useReader((s) => s.setEffectiveScale)
  const setPageTurn = useReader((s) => s.setPageTurn)

  const stageRef = useRef<HTMLDivElement>(null)
  const [stage, setStage] = useState({ w: 0, h: 0 })

  const [pageSize, setPageSize] = useState<{ w: number; h: number } | null>(null)
  const [override, setOverride] = useState<Spread | null>(null)
  const [flip, setFlip] = useState<Flip | null>(null)
  const [flipped, setFlipped] = useState(false)
  const flipActive = useRef(false)

  // Measure the stage.
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const update = () => setStage({ w: el.clientWidth, h: el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Decide spread vs single from available width + user preference.
  useEffect(() => {
    if (!doc) return
    const recommended = stage.w >= SPREAD_MIN_WIDTH
    const wanted = viewMode === 'auto' ? recommended : viewMode === 'spread'
    if (wanted !== effectiveSpread) setEffectiveSpread(wanted)
  }, [doc, stage.w, viewMode, effectiveSpread, setEffectiveSpread])

  const basePage = useMemo(() => {
    const sp = getSpread(currentPage, effectiveSpread, numPages)
    return sp.left ?? sp.right ?? 1
  }, [currentPage, effectiveSpread, numPages])

  useEffect(() => {
    if (!doc) {
      setPageSize(null)
      return
    }
    let cancelled = false
    getPageSize(doc, basePage)
      .then((s) => {
        if (!cancelled) setPageSize({ w: s.width, h: s.height })
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [doc, basePage])

  const layout = useMemo(() => {
    if (!pageSize) return null
    const cols = effectiveSpread ? 2 : 1
    const availW = Math.max(80, stage.w - STAGE_PAD * 2 - (cols > 1 ? GUTTER : 0))
    const availH = Math.max(80, stage.h - STAGE_PAD * 2)
    const fitScale = Math.min(availW / (pageSize.w * cols), availH / pageSize.h)
    const s = fit ? fitScale : scale
    return { scale: s, width: pageSize.w * s, height: pageSize.h * s }
  }, [pageSize, stage, fit, scale, effectiveSpread])

  useEffect(() => {
    if (layout) setEffectiveScale(layout.scale)
  }, [layout, setEffectiveScale])

  const spread = useMemo(
    () => getSpread(currentPage, effectiveSpread, numPages),
    [currentPage, effectiveSpread, numPages],
  )
  const visible = override ?? spread

  const goNext = useCallback(async () => {
    const st = useReader.getState()
    if (!st.doc || flipActive.current) return
    const dest = nextPage(st.currentPage, st.effectiveSpread, st.numPages)
    if (dest === st.currentPage) return
    if (!st.effectiveSpread || !layout) {
      st.goToPage(dest)
      return
    }
    const oldS = getSpread(st.currentPage, true, st.numPages)
    const newS = getSpread(dest, true, st.numPages)
    if (oldS.right == null || newS.left == null) {
      st.goToPage(dest)
      return
    }
    flipActive.current = true
    try {
      const [front, back] = await Promise.all([
        renderPageToDataURL(st.doc, oldS.right, layout.scale),
        renderPageToDataURL(st.doc, newS.left, layout.scale),
      ])
      setOverride({ left: oldS.left, right: newS.right })
      setFlip({ dir: 'next', front, back, width: layout.width, height: layout.height })
      st.goToPage(dest)
      requestAnimationFrame(() => requestAnimationFrame(() => setFlipped(true)))
      window.setTimeout(() => {
        setFlip(null)
        setFlipped(false)
        setOverride(null)
        flipActive.current = false
      }, FLIP_MS + 40)
    } catch (err) {
      console.error('[bookreader] flip failed', err)
      setOverride(null)
      setFlip(null)
      flipActive.current = false
      st.goToPage(dest)
    }
  }, [layout])

  const goPrev = useCallback(async () => {
    const st = useReader.getState()
    if (!st.doc || flipActive.current) return
    const dest = prevPage(st.currentPage, st.effectiveSpread, st.numPages)
    if (dest === st.currentPage) return
    if (!st.effectiveSpread || !layout) {
      st.goToPage(dest)
      return
    }
    const oldS = getSpread(st.currentPage, true, st.numPages)
    const newS = getSpread(dest, true, st.numPages)
    if (oldS.left == null || newS.right == null) {
      st.goToPage(dest)
      return
    }
    flipActive.current = true
    try {
      const [front, back] = await Promise.all([
        renderPageToDataURL(st.doc, oldS.left, layout.scale),
        renderPageToDataURL(st.doc, newS.right, layout.scale),
      ])
      setOverride({ left: newS.left, right: oldS.right })
      setFlip({ dir: 'prev', front, back, width: layout.width, height: layout.height })
      st.goToPage(dest)
      requestAnimationFrame(() => requestAnimationFrame(() => setFlipped(true)))
      window.setTimeout(() => {
        setFlip(null)
        setFlipped(false)
        setOverride(null)
        flipActive.current = false
      }, FLIP_MS + 40)
    } catch (err) {
      console.error('[bookreader] flip failed', err)
      setOverride(null)
      setFlip(null)
      flipActive.current = false
      st.goToPage(dest)
    }
  }, [layout])

  // Expose the animated handlers to the toolbar and keyboard.
  useEffect(() => {
    setPageTurn({ next: () => void goNext(), prev: () => void goPrev() })
    return () => setPageTurn(null)
  }, [goNext, goPrev, setPageTurn])

  // Reset transient state when the document changes.
  useEffect(() => {
    setOverride(null)
    setFlip(null)
    setFlipped(false)
    flipActive.current = false
  }, [doc])

  return (
    <div className="book-stage" ref={stageRef}>
      {!effectiveSpread ? (
        <div className="page-single" key={`single-${currentPage}`}>
          {doc && layout && (
            <PageCanvas
              doc={doc}
              pageNumber={currentPage}
              scale={layout.scale}
              className="page-canvas"
            />
          )}
        </div>
      ) : (
        <div
          className="book"
          style={{ width: layout ? layout.width * 2 + GUTTER : undefined, height: layout?.height }}
        >
          <div className="book-half book-left" style={{ width: layout?.width, height: layout?.height }}>
            {doc && layout && visible.left != null && (
              <PageCanvas
                doc={doc}
                pageNumber={visible.left}
                scale={layout.scale}
                className="page-canvas"
              />
            )}
          </div>
          <div className="book-gutter" style={{ width: GUTTER }} />
          <div className="book-half book-right" style={{ width: layout?.width, height: layout?.height }}>
            {doc && layout && visible.right != null && (
              <PageCanvas
                doc={doc}
                pageNumber={visible.right}
                scale={layout.scale}
                className="page-canvas"
              />
            )}
          </div>

          {flip && layout && (
            <div
              className={`flip-leaf ${flip.dir} ${flipped ? 'is-flipped' : ''}`}
              style={{
                width: flip.width,
                height: flip.height,
                left: flip.dir === 'next' ? layout.width + GUTTER : 0,
                transformOrigin: flip.dir === 'next' ? 'left center' : 'right center',
              }}
            >
              <div
                className="flip-face flip-front"
                style={{
                  backgroundImage: `linear-gradient(${
                    flip.dir === 'next' ? '90deg' : '270deg'
                  }, rgba(0,0,0,0.22), rgba(0,0,0,0) 45%), url(${flip.front})`,
                }}
              />
              <div
                className="flip-face flip-back"
                style={{ backgroundImage: `url(${flip.back})` }}
              />
            </div>
          )}
        </div>
      )}

      <div className="click-zone click-zone-left" onClick={() => void goPrev()} />
      <div className="click-zone click-zone-right" onClick={() => void goNext()} />
    </div>
  )
}

import type { ReactNode } from 'react'
import { useReader } from '@/stores/readerStore'
import { useUi } from '@/stores/uiStore'
import { useLibrary } from '@/stores/libraryStore'
import { ThemeButton } from '@/components/ThemeButton'

function IconButton({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  title: string
  children: ReactNode
}) {
  return (
    <button className="tb-btn" onClick={onClick} disabled={disabled} title={title}>
      {children}
    </button>
  )
}

export async function openPdfViaDialog() {
  const result = await window.bookreader.openPdfDialog()
  if (result) {
    await useLibrary.getState().openByPath(result.path, result.name)
  }
}

export function Toolbar() {
  const numPages = useReader((s) => s.numPages)
  const currentPage = useReader((s) => s.currentPage)
  const effectiveScale = useReader((s) => s.effectiveScale)
  const fit = useReader((s) => s.fit)
  const viewMode = useReader((s) => s.viewMode)

  const activeBookId = useLibrary((s) => s.activeBookId)
  const bookmarks = useLibrary((s) => s.books.find((b) => b.id === s.activeBookId)?.bookmarks) ?? null
  const bookmarksOpen = useUi((s) => s.bookmarksOpen)
  const tocOpen = useUi((s) => s.tocOpen)

  const hasDoc = numPages > 0
  const inLibrary = activeBookId != null
  const isBookmarked = !!(bookmarks as any[])?.some((b: any) => b.page === currentPage)

  const turnBack = () => {
    const st = useReader.getState()
    st.pageTurn ? st.pageTurn.prev() : st.prev()
  }
  const turnForward = () => {
    const st = useReader.getState()
    st.pageTurn ? st.pageTurn.next() : st.next()
  }
  const cycleView = () => {
    const order = ['auto', 'single', 'spread'] as const
    const st = useReader.getState()
    const idx = order.indexOf(st.viewMode)
    st.setViewMode(order[(idx + 1) % order.length])
  }

  return (
    <div className="toolbar">
      <div className="tb-group">
        <button
          className="tb-btn tb-home"
          onClick={() => {
            useReader.getState().close()
            useUi.getState().setView('library')
          }}
          title="Back to library"
        >
          Library
        </button>
        <button className="tb-open" onClick={openPdfViaDialog} title="Open a PDF (Ctrl+O)">
          Open PDF
        </button>
      </div>

      <div className="tb-group tb-pager">
        <IconButton onClick={turnBack} disabled={!hasDoc || currentPage <= 1} title="Previous page">
          ‹
        </IconButton>
        <span className="tb-pageno">
          <input
            className="tb-page-input"
            type="number"
            min={1}
            max={numPages || 1}
            value={hasDoc ? currentPage : 0}
            disabled={!hasDoc}
            onChange={(e) => useReader.getState().goToPage(Number(e.target.value))}
          />
          <span className="tb-total">/ {numPages || 0}</span>
        </span>
        <IconButton
          onClick={turnForward}
          disabled={!hasDoc || currentPage >= numPages}
          title="Next page"
        >
          ›
        </IconButton>
      </div>

      <div className="tb-group tb-bookmark">
        <button
          className={`tb-btn tb-marks ${useReader.getState().searchOpen ? 'is-on' : ''}`}
          onClick={() => useReader.getState().setSearchOpen(!useReader.getState().searchOpen)}
          disabled={!hasDoc}
          title="Search in document"
        >
          🔍
        </button>
        <button
          className={`tb-btn tb-marks ${tocOpen ? 'is-on' : ''}`}
          onClick={() => useUi.getState().toggleToc()}
          disabled={!hasDoc}
          title="Table of contents"
        >
          TOC
        </button>
        <button
          className={`tb-btn tb-mark ${isBookmarked ? 'is-on' : ''}`}
          onClick={() => {
            if (activeBookId) void useLibrary.getState().toggleBookmark(activeBookId, currentPage)
          }}
          disabled={!hasDoc || !inLibrary}
          title={
            inLibrary
              ? isBookmarked
                ? 'Remove bookmark on this page'
                : 'Bookmark this page'
              : 'Add this book to your library to bookmark'
          }
        >
          {isBookmarked ? '🔖' : '📑'}
        </button>
        <button
          className={`tb-btn tb-marks ${bookmarksOpen ? 'is-on' : ''}`}
          onClick={() => useUi.getState().toggleBookmarks()}
          disabled={!hasDoc}
          title="Show bookmarks"
        >
          Marks{bookmarks && bookmarks.length > 0 ? ` (${bookmarks.length})` : ''}
        </button>
      </div>

      <div className="tb-group tb-zoom">
        <ThemeButton />
        <button
          className="tb-btn tb-view"
          onClick={cycleView}
          title="View: auto / single page / two-page spread"
        >
          {viewMode === 'auto' ? 'Auto' : viewMode === 'single' ? 'Single' : 'Spread'}
        </button>
        <IconButton onClick={() => useReader.getState().zoomOut()} disabled={!hasDoc} title="Zoom out">
          −
        </IconButton>
        <button
          className={`tb-btn tb-fit ${fit ? 'is-on' : ''}`}
          onClick={() => useReader.getState().toggleFit()}
          disabled={!hasDoc}
          title="Toggle fit to window"
        >
          {fit ? 'Fit' : 'Free'}
        </button>
        <span className="tb-zoom-label">{Math.round(effectiveScale * 100)}%</span>
        <IconButton onClick={() => useReader.getState().zoomIn()} disabled={!hasDoc} title="Zoom in">
          +
        </IconButton>
      </div>
    </div>
  )
}

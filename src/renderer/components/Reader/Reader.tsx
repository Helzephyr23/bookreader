import { useEffect } from 'react'
import { useReader } from '@/stores/readerStore'
import { BookView } from './BookView'
import { Toolbar, openPdfViaDialog } from './Toolbar'
import { ProgressTracker } from './ProgressTracker'
import { BookmarksPanel } from './BookmarksPanel'
import { TocPanel } from './TocPanel'
import { SearchPanel } from './SearchPanel'

function EmptyState() {
  return (
    <div className="reader-empty">
      <div className="reader-empty-icon">📖</div>
      <h2>No book open</h2>
      <p>Pick a PDF to start reading.</p>
      <button className="btn-primary" onClick={openPdfViaDialog}>
        Open a PDF
      </button>
    </div>
  )
}

export function Reader() {
  const doc = useReader((s) => s.doc)
  const loading = useReader((s) => s.loading)
  const error = useReader((s) => s.error)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return

      if (e.ctrlKey && e.key.toLowerCase() === 'o') {
        e.preventDefault()
        void openPdfViaDialog()
        return
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        useReader.getState().setSearchOpen(true)
        return
      }

      const st = useReader.getState()
      const turn = st.pageTurn
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        turn ? turn.prev() : st.prev()
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault()
        turn ? turn.next() : st.next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const showBook = doc && !loading && !error

  return (
    <div className="reader">
      <ProgressTracker />
      <Toolbar />
      <SearchPanel />
      <div className="reader-stage">
        {loading && <div className="reader-status">Opening…</div>}
        {error && !loading && (
          <div className="reader-error">
            <div className="reader-empty-icon">⚠️</div>
            <h2>Couldn't open that file</h2>
            <p>{error}</p>
          </div>
        )}
        {!loading && !error && !doc && <EmptyState />}
        {showBook && <BookView />}
      </div>
      <SearchPanel />
      <BookmarksPanel />
      <TocPanel />
    </div>
  )
}

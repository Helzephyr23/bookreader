import { useReader } from '@/stores/readerStore'
import { useUi } from '@/stores/uiStore'
import { useLibrary } from '@/stores/libraryStore'

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function BookmarksPanel() {
  const open = useUi((s) => s.bookmarksOpen)
  const setOpen = useUi((s) => s.setBookmarksOpen)
  const activeBookId = useLibrary((s) => s.activeBookId)
  const book = useLibrary((s) => s.books.find((b) => b.id === s.activeBookId) ?? null)
  const currentPage = useReader((s) => s.currentPage)

  if (!open) return null

  const bookmarks = book?.bookmarks ?? []

  return (
    <aside className={`bookmarks-panel ${open ? 'open' : ''}`}>
      <header className="bm-head">
        <span>Bookmarks</span>
        <button className="bm-close" onClick={() => setOpen(false)} title="Close">
          ×
        </button>
      </header>

      {!activeBookId ? (
        <p className="bm-hint">This book isn't in your library yet, so bookmarks can't be saved.</p>
      ) : bookmarks.length === 0 ? (
        <p className="bm-hint">No bookmarks yet. Use the bookmark button in the toolbar.</p>
      ) : (
        <>
          <ul className="bm-list">
            {bookmarks.map((bm) => (
              <li key={bm.page}>
                <button
                  className={`bm-item ${bm.page === currentPage ? 'is-current' : ''}`}
                  onClick={() => useReader.getState().goToPage(bm.page)}
                >
                  <span className="bm-page">Page {bm.page}</span>
                  <span className="bm-date">{formatDate(bm.createdAt)}</span>
                </button>
                <button
                  className="bm-del"
                  title="Remove bookmark"
                  onClick={() => void useLibrary.getState().removeBookmark(activeBookId, bm.page)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <footer className="bm-foot">
            <button
              className="bm-clear"
              onClick={() => void useLibrary.getState().clearBookmarks(activeBookId)}
            >
              Clear all
            </button>
          </footer>
        </>
      )}
    </aside>
  )
}

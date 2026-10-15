import { useEffect } from 'react'
import { useLibrary } from '@/stores/libraryStore'
import { ThemeButton } from '@/components/ThemeButton'
import { BookCard } from './BookCard'

export function Library() {
  const books = useLibrary((s) => s.books)
  const loaded = useLibrary((s) => s.loaded)
  const importing = useLibrary((s) => s.importing)
  const progress = useLibrary((s) => s.importProgress)
  const load = useLibrary((s) => s.load)
  const importBooks = useLibrary((s) => s.importBooks)
  const removeBook = useLibrary((s) => s.removeBook)
  const openBook = useLibrary((s) => s.openBook)

  useEffect(() => {
    if (!loaded) void load()
  }, [loaded, load])

  return (
    <div className="library">
      <header className="lib-header">
        <div className="lib-brand">
          <span className="lib-logo">📖</span>
          <span>BookReader</span>
        </div>
        <div className="lib-header-right">
          <ThemeButton className="tb-btn tb-theme" />
          <button
            className="btn-primary"
            onClick={() => void importBooks()}
            disabled={importing}
          >
            {importing ? 'Importing…' : '+ Add books'}
          </button>
        </div>
      </header>

      {importing && progress && (
        <div className="lib-importbar">
          Preparing covers… {progress.done}/{progress.total}
        </div>
      )}

      {loaded && books.length === 0 ? (
        <div className="library-empty">
          <div className="reader-empty-icon">🎑</div>
          <h2>Your shelf is empty</h2>
          <p>Add some PDF books to build your library.</p>
          <button className="btn-primary" onClick={() => void importBooks()}>
            + Add books
          </button>
        </div>
      ) : (
        <div className="shelf">
          <div className="shelf-grid">
            {books.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onOpen={() => void openBook(book)}
                onRemove={() => void removeBook(book.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

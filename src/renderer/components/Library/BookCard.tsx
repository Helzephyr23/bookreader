interface BookCardProps {
  book: StoredBook
  onOpen: () => void
  onRemove: () => void
}

export function BookCard({ book, onOpen, onRemove }: BookCardProps) {
  const progress = book.numPages > 0 ? Math.min(1, book.lastPage / book.numPages) : 0

  return (
    <div className="book-card" onClick={onOpen} title={book.name}>
      <button
        className="book-remove"
        title="Remove from library"
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
      >
        ×
      </button>
      <div className="book-cover">
        <span className="book-spine" />
        {book.cover ? (
          <img src={book.cover} alt="" draggable={false} />
        ) : (
          <div className="book-cover-empty">📕</div>
        )}
      </div>
      <div className="book-meta">
        <div className="book-title">{book.title}</div>
        <div className="book-sub">{book.numPages} pages</div>
        <div className="book-progress">
          <span style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      </div>
    </div>
  )
}

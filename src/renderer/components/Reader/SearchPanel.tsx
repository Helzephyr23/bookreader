import { useEffect, useRef } from 'react'
import { useReader } from '@/stores/readerStore'

export function SearchPanel() {
  const open = useReader((s) => s.searchOpen)
  const query = useReader((s) => s.searchQuery)
  const matches = useReader((s) => s.searchMatches)
  const index = useReader((s) => s.searchIndex)
  const searching = useReader((s) => s.searching)
  const error = useReader((s) => s.searchError)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  if (!open) return null

  return (
    <div className="search-panel">
      <div className="search-row">
        <input
          ref={inputRef}
          className="search-input"
          type="text"
          placeholder="Search in document..."
          value={query}
          onChange={(e) => useReader.getState().setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void useReader.getState().startSearch(query)
            } else if (e.key === 'Escape') {
              useReader.getState().setSearchOpen(false)
            }
          }}
        />
        <button
          className="tb-btn"
          disabled={!query.trim() || searching}
          onClick={() => void useReader.getState().startSearch(query)}
          title="Find"
        >
          {searching ? '…' : 'Find'}
        </button>
        <button
          className="tb-btn"
          onClick={() => useReader.getState().prevMatch()}
          disabled={matches.length === 0}
          title="Previous match"
        >
          ↑
        </button>
        <button
          className="tb-btn"
          onClick={() => useReader.getState().nextMatch()}
          disabled={matches.length === 0}
          title="Next match"
        >
          ↓
        </button>
        <span className="search-count">
          {matches.length === 0 ? '0/0' : `${index + 1}/${matches.length}`}
        </span>
        <button
          className="bm-close"
          onClick={() => {
            useReader.getState().setSearchOpen(false)
            useReader.getState().clearSearch()
          }}
          title="Close"
        >
          ×
        </button>
      </div>
      {error && <div className="search-error">{error}</div>}
    </div>
  )
}

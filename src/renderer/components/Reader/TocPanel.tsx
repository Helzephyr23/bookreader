import { useReader } from '@/stores/readerStore'
import { useUi } from '@/stores/uiStore'

interface TocNodeProps {
  item: import('@/stores/readerStore').TocItem
}

function TocNode({ item }: TocNodeProps) {
  const jump = useReader((s) => s.jumpToDest)

  return (
    <div className="toc-node" style={{ paddingLeft: `${item.depth * 16}px` }}>
      <button
        className="toc-item"
        onClick={() => void jump(item.dest)}
        title={item.title}
      >
        <span className="toc-title">{item.title || 'Untitled'}</span>
        {item.pageNumber > 0 && <span className="toc-page">{item.pageNumber}</span>}
      </button>
      {item.children?.map((c, i) => (
        <TocNode key={`${c.title}-${i}`} item={c} />
      ))}
    </div>
  )
}

export function TocPanel() {
  const open = useUi((s) => s.tocOpen)
  const setOpen = useUi((s) => s.setTocOpen)
  const toc = useReader((s) => s.toc)
  const loading = useReader((s) => s.tocLoading)
  const error = useReader((s) => s.tocError)
  const hasDoc = useReader((s) => s.doc !== null)

  if (!open) return null

  return (
    <aside className="bookmarks-panel toc-panel">
      <header className="bm-head">
        <span>Table of Contents</span>
        <button className="bm-close" onClick={() => setOpen(false)} title="Close">
          ×
        </button>
      </header>

      {!hasDoc ? (
        <p className="bm-hint">No document open.</p>
      ) : loading ? (
        <p className="bm-hint">Loading TOC…</p>
      ) : error ? (
        <p className="bm-hint">{error}</p>
      ) : !toc || toc.length === 0 ? (
        <p className="bm-hint">This PDF has no table of contents.</p>
      ) : (
        <div className="bm-list toc-list">
          {toc.map((t, i) => (
            <TocNode key={`${t.title}-${i}`} item={t} />
          ))}
        </div>
      )}
    </aside>
  )
}

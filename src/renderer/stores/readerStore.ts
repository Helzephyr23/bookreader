import { create } from 'zustand'
import { getPdfLoadingTask, type PdfDocument, type PdfLoadingTask } from '@/pdf/pdfjs'
import { nextPage, prevPage } from '@/pdf/pagination'
import { useUi } from './uiStore'

export type ViewMode = 'auto' | 'single' | 'spread'

export interface SearchRect {
  left: number
  top: number
  width: number
  height: number
}

export interface SearchMatch {
  page: number
  index: number
  text: string
  rects: SearchRect[]
}

export interface TocItem {
  title: string
  pageNumber: number
  depth: number
  children?: TocItem[]
  dest?: unknown
}

interface ReaderState {
  doc: PdfDocument | null
  loadingTask: PdfLoadingTask | null
  filePath: string | null
  fileName: string
  numPages: number
  currentPage: number
  loading: boolean
  error: string | null

  fit: boolean
  scale: number
  effectiveScale: number

  viewMode: ViewMode
  effectiveSpread: boolean

  pageTurn: { next: () => void; prev: () => void } | null
  setPageTurn: (handlers: { next: () => void; prev: () => void } | null) => void

  toc: TocItem[] | null
  tocLoading: boolean
  tocError: string | null

  setEffectiveScale: (value: number) => void
  setEffectiveSpread: (value: boolean) => void
  setViewMode: (mode: ViewMode) => void
  openFile: (filePath: string, name: string, startPage?: number) => Promise<void>
  close: () => void
  goToPage: (page: number) => void
  next: () => void
  prev: () => void
  toggleFit: () => void
  zoomIn: () => void
  zoomOut: () => void
  loadToc: () => Promise<void>
  jumpToDest: (dest: unknown) => Promise<void>

  searchQuery: string
  searchMatches: SearchMatch[]
  searchIndex: number
  searching: boolean
  searchError: string | null
  searchOpen: boolean
  setSearchOpen: (open: boolean) => void
  setSearchQuery: (q: string) => void
  clearSearch: () => void
  startSearch: (q: string) => Promise<void>
  goToMatch: (index: number) => void
  nextMatch: () => void
  prevMatch: () => void
}

const MIN_SCALE = 0.25
const MAX_SCALE = 6
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export const useReader = create<ReaderState>((set, get) => ({
  doc: null,
  loadingTask: null,
  filePath: null,
  fileName: '',
  numPages: 0,
  currentPage: 1,
  loading: false,
  error: null,

  fit: true,
  scale: 1,
  effectiveScale: 1,

  viewMode: 'auto',
  effectiveSpread: false,

  pageTurn: null,
  setPageTurn: (handlers) => set({ pageTurn: handlers }),

  toc: null,
  tocLoading: false,
  tocError: null,

  searchQuery: '',
  searchMatches: [],
  searchIndex: -1,
  searching: false,
  searchError: null,
  searchOpen: false,

  setEffectiveScale: (value) => set({ effectiveScale: value }),
  setEffectiveSpread: (value) => set({ effectiveSpread: value }),
  setViewMode: (mode) => set({ viewMode: mode }),

  openFile: async (filePath, name, startPage) => {
    const prevTask = get().loadingTask
    if (prevTask) {
      try {
        await prevTask.destroy()
      } catch {
        /* ignore */
      }
    }
    set({
      loading: true,
      error: null,
      fileName: name,
      filePath,
      doc: null,
      loadingTask: null,
      numPages: 0,
      currentPage: 1,
    })
    try {
      const task = getPdfLoadingTask(filePath)
      const doc = await task.promise
      const page = clamp(Math.round(startPage ?? 1), 1, doc.numPages)
      set({
        doc,
        loadingTask: task,
        numPages: doc.numPages,
        currentPage: page,
        loading: false,
        fit: true,
      })
      void get().loadToc()
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to open this PDF.',
      })
    }
  },

  close: () => {
    const task = get().loadingTask
    if (task) {
      try {
        void task.destroy()
      } catch {
        /* ignore */
      }
    }
    set({
      doc: null,
      loadingTask: null,
      filePath: null,
      fileName: '',
      numPages: 0,
      currentPage: 1,
      error: null,
      loading: false,
      toc: null,
      tocLoading: false,
      tocError: null,
      searchMatches: [],
      searchQuery: '',
      searchIndex: -1,
      searching: false,
      searchError: null,
      searchOpen: false,
    })
  },

  goToPage: (page) => {
    const { numPages } = get()
    if (numPages === 0) return
    set({ currentPage: clamp(Math.round(page), 1, numPages) })
  },

  next: () => {
    const { currentPage, numPages, effectiveSpread } = get()
    if (numPages === 0) return
    const target = nextPage(currentPage, effectiveSpread, numPages)
    if (target !== currentPage) set({ currentPage: target })
  },

  prev: () => {
    const { currentPage, numPages, effectiveSpread } = get()
    if (numPages === 0) return
    const target = prevPage(currentPage, effectiveSpread, numPages)
    if (target !== currentPage) set({ currentPage: target })
  },

  toggleFit: () => set((s) => ({ fit: !s.fit })),

  zoomIn: () =>
    set((s) => ({ fit: false, scale: clamp(s.effectiveScale * 1.2, MIN_SCALE, MAX_SCALE) })),

  zoomOut: () =>
    set((s) => ({ fit: false, scale: clamp(s.effectiveScale / 1.2, MIN_SCALE, MAX_SCALE) })),

  loadToc: async () => {
    const doc = get().doc
    if (!doc) {
      set({ toc: null, tocLoading: false, tocError: null })
      return
    }
    set({ tocLoading: true, tocError: null })
    try {
      const outline = await doc.getOutline().catch(() => null)
      if (!outline || outline.length === 0) {
        set({ toc: [], tocLoading: false })
        return
      }
      const convert = async (items: Array<any>, depth = 0): Promise<TocItem[]> => {
        const result: TocItem[] = []
        for (const it of items) {
          let pageNumber = 0
          if (it.dest) {
            try {
              const dest = typeof it.dest === 'string' ? await doc.getDestination(it.dest) : it.dest
              if (Array.isArray(dest) && dest[0] != null) {
                const ref = dest[0]
                const page = await doc.getPageIndex(ref)
                pageNumber = page + 1
              }
            } catch {
              /* ignore */
            }
          }
          const children = Array.isArray(it.items) && it.items.length > 0 ? await convert(it.items, depth + 1) : undefined
          result.push({
            title: String(it.title ?? ''),
            pageNumber,
            depth,
            children,
            dest: it.dest,
          })
        }
        return result
      }
      const toc = await convert(outline)
      set({ toc, tocLoading: false })
    } catch (err) {
      set({
        toc: [],
        tocLoading: false,
        tocError: err instanceof Error ? err.message : 'Failed to load TOC',
      })
    }
  },

  jumpToDest: async (dest: unknown) => {
    const doc = get().doc
    if (!doc || !dest) return
    try {
      const resolved = typeof dest === 'string' ? await doc.getDestination(dest) : (dest as any)
      if (Array.isArray(resolved) && resolved[0] != null) {
        const page = await doc.getPageIndex(resolved[0])
        get().goToPage(page + 1)
        useUi.getState().setTocOpen(false)
      }
    } catch {
      /* ignore */
    }
  },

  setSearchOpen: (open) => set({ searchOpen: open }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  clearSearch: () => set({ searchMatches: [], searchIndex: -1, searchError: null, searching: false }),
  startSearch: async (q) => {
    const doc = get().doc
    if (!doc) return
    const query = q.trim()
    if (!query) {
      get().clearSearch()
      return
    }
    set({ searching: true, searchError: null, searchQuery: query, searchMatches: [], searchIndex: -1 })
    try {
      const matches: SearchMatch[] = []
      for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
        const page = await doc.getPage(pageNum)
        const text = await page.getTextContent()
        const items = text.items as Array<any>
        const full = items.map((i) => i.str).join(' ')
        const re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
        let m: RegExpExecArray | null
        re.lastIndex = 0
        while ((m = re.exec(full)) !== null) {
          matches.push({ page: pageNum, index: matches.length, text: m[0], rects: [] })
          if (re.lastIndex === m.index) re.lastIndex++
          if (matches.length > 1000) break
        }
        page.cleanup()
        if (matches.length > 1000) break
      }
      set({ searchMatches: matches, searchIndex: matches.length > 0 ? 0 : -1, searching: false })
      if (matches.length > 0) get().goToPage(matches[0].page)
    } catch (err) {
      set({ searching: false, searchError: err instanceof Error ? err.message : 'Search failed' })
    }
  },
  goToMatch: (index) => {
    const list = get().searchMatches
    if (list.length === 0) return
    const i = ((index % list.length) + list.length) % list.length
    set({ searchIndex: i })
    get().goToPage(list[i].page)
  },
  nextMatch: () => get().goToMatch(get().searchIndex + 1),
  prevMatch: () => get().goToMatch(get().searchIndex - 1),
}))

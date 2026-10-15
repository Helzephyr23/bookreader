import { create } from 'zustand'
import { makeCover } from '@/pdf/thumbnail'
import { useUi } from './uiStore'
import { useReader } from './readerStore'

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`

interface LibraryState {
  books: StoredBook[]
  loaded: boolean
  importing: boolean
  importProgress: { done: number; total: number } | null
  activeBookId: string | null

  load: () => Promise<void>
  importBooks: () => Promise<void>
  removeBook: (id: string) => Promise<void>
  openBook: (book: StoredBook) => Promise<void>
  openByPath: (path: string, name: string) => Promise<void>
  setActiveBook: (id: string | null) => void
  touchBook: (id: string, patch: Partial<StoredBook>) => Promise<void>
  saveProgress: (id: string, page: number) => Promise<void>
  toggleBookmark: (id: string, page: number) => Promise<void>
  removeBookmark: (id: string, page: number) => Promise<void>
  clearBookmarks: (id: string) => Promise<void>
}

async function persist(books: StoredBook[]) {
  await window.bookreader.saveLibrary(books)
}

function withBook(
  books: StoredBook[],
  id: string,
  fn: (book: StoredBook) => StoredBook,
): StoredBook[] {
  return books.map((b) => (b.id === id ? fn(b) : b))
}

export const useLibrary = create<LibraryState>((set, get) => ({
  books: [],
  loaded: false,
  importing: false,
  importProgress: null,
  activeBookId: null,

  load: async () => {
    const books = await window.bookreader.loadLibrary()
    set({ books, loaded: true })
  },

  importBooks: async () => {
    if (get().importing) return
    const picked = await window.bookreader.pickPdfs()
    if (picked.length === 0) return

    const existing = get().books
    const knownPaths = new Set(existing.map((b) => b.path))
    const queue = picked.filter((p) => !knownPaths.has(p.path))
    if (queue.length === 0) return

    set({ importing: true, importProgress: { done: 0, total: queue.length } })
    const added: StoredBook[] = []

    for (let i = 0; i < queue.length; i++) {
      const file = queue[i]
      try {
        const { numPages, cover } = await makeCover(file.path)
        added.push({
          id: newId(),
          path: file.path,
          name: file.name,
          title: file.name.replace(/\.pdf$/i, ''),
          numPages,
          cover,
          addedAt: Date.now(),
          lastOpenedAt: null,
          lastPage: 1,
          bookmarks: [],
        })
      } catch (err) {
        console.warn('[bookreader] could not import', file.path, err)
      }
      set({ importProgress: { done: i + 1, total: queue.length } })
    }

    const books = [...existing, ...added]
    set({ books, importing: false, importProgress: null })
    await persist(books)
  },

  removeBook: async (id) => {
    const books = get().books.filter((b) => b.id !== id)
    const active = get().activeBookId === id ? null : get().activeBookId
    set({ books, activeBookId: active })
    await persist(books)
  },

  openBook: async (book) => {
    await get().openByPath(book.path, book.name)
  },

  openByPath: async (path, name) => {
    const match = get().books.find((b) => b.path === path)
    const reader = useReader.getState()
    await reader.openFile(path, name, match?.lastPage ?? 1)
    set({ activeBookId: match?.id ?? null })
    if (match) {
      const books = withBook(get().books, match.id, (b) => ({
        ...b,
        lastOpenedAt: Date.now(),
      }))
      set({ books })
      void persist(books)
    }
    useUi.getState().setView('reader')
  },

  setActiveBook: (id) => set({ activeBookId: id }),

  touchBook: async (id, patch) => {
    const books = withBook(get().books, id, (b) => ({ ...b, ...patch }))
    set({ books })
    await persist(books)
  },

  saveProgress: async (id, page) => {
    const book = get().books.find((b) => b.id === id)
    if (!book || book.lastPage === page) return
    const books = withBook(get().books, id, (b) => ({ ...b, lastPage: page }))
    set({ books })
    await persist(books)
  },

  toggleBookmark: async (id, page) => {
    const book = get().books.find((b) => b.id === id)
    if (!book) return
    const exists = book.bookmarks.some((bm) => bm.page === page)
    const books = withBook(get().books, id, (b) => ({
      ...b,
      bookmarks: exists
        ? b.bookmarks.filter((bm) => bm.page !== page)
        : [...b.bookmarks, { page, createdAt: Date.now() }].sort((a, z) => a.page - z.page),
    }))
    set({ books })
    await persist(books)
  },

  removeBookmark: async (id, page) => {
    const books = withBook(get().books, id, (b) => ({
      ...b,
      bookmarks: b.bookmarks.filter((bm) => bm.page !== page),
    }))
    set({ books })
    await persist(books)
  },

  clearBookmarks: async (id) => {
    const books = withBook(get().books, id, (b) => ({ ...b, bookmarks: [] }))
    set({ books })
    await persist(books)
  },
}))

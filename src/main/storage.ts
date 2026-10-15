import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

export interface Bookmark {
  page: number
  createdAt: number
}

export interface StoredBook {
  id: string
  path: string
  name: string
  title: string
  numPages: number
  cover: string | null
  addedAt: number
  lastOpenedAt: number | null
  lastPage: number
  bookmarks: Bookmark[]
}

interface LibraryFile {
  books: StoredBook[]
}

function libraryPath(): string {
  return path.join(app.getPath('userData'), 'library.json')
}

function normalize(book: Partial<StoredBook>): StoredBook {
  return {
    id: String(book.id ?? ''),
    path: String(book.path ?? ''),
    name: String(book.name ?? ''),
    title: String(book.title ?? book.name ?? 'Untitled'),
    numPages: Number(book.numPages ?? 0),
    cover: typeof book.cover === 'string' ? book.cover : null,
    addedAt: Number(book.addedAt ?? Date.now()),
    lastOpenedAt: book.lastOpenedAt == null ? null : Number(book.lastOpenedAt),
    lastPage: Number(book.lastPage ?? 1),
    bookmarks: Array.isArray(book.bookmarks) ? book.bookmarks : [],
  }
}

export function readLibrary(): StoredBook[] {
  try {
    const raw = fs.readFileSync(libraryPath(), 'utf8')
    const parsed = JSON.parse(raw) as Partial<LibraryFile>
    if (!Array.isArray(parsed.books)) return []
    return parsed.books.map(normalize)
  } catch {
    return []
  }
}

export function writeLibrary(books: StoredBook[]): void {
  const file = libraryPath()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(
    file,
    JSON.stringify({ books: books.map(normalize) } satisfies LibraryFile, null, 2),
    'utf8',
  )
}

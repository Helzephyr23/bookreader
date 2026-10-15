/// <reference types="vite/client" />

declare global {
  interface OpenPdfResult {
    path: string
    name: string
  }

  interface Bookmark {
    page: number
    createdAt: number
  }

  interface StoredBook {
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

  interface BookReaderApi {
    platform: string
    ping: () => Promise<string>
    openPdfDialog: () => Promise<OpenPdfResult | null>
    getInitialFile: () => Promise<OpenPdfResult | null>
    pickPdfs: () => Promise<OpenPdfResult[]>
    loadLibrary: () => Promise<StoredBook[]>
    saveLibrary: (books: StoredBook[]) => Promise<boolean>
  }

  interface Window {
    bookreader: BookReaderApi
  }
}

export {}

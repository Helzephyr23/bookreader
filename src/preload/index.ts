import { contextBridge, ipcRenderer } from 'electron'

export interface OpenPdfResult {
  path: string
  name: string
}

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

const api = {
  platform: process.platform,
  ping: (): Promise<string> => ipcRenderer.invoke('app:ping'),
  openPdfDialog: (): Promise<OpenPdfResult | null> => ipcRenderer.invoke('dialog:open-pdf'),
  getInitialFile: (): Promise<OpenPdfResult | null> => ipcRenderer.invoke('app:get-initial-file'),
  pickPdfs: (): Promise<OpenPdfResult[]> => ipcRenderer.invoke('library:pick-files'),
  loadLibrary: (): Promise<StoredBook[]> => ipcRenderer.invoke('library:load'),
  saveLibrary: (books: StoredBook[]): Promise<boolean> => ipcRenderer.invoke('library:save', books),
}

contextBridge.exposeInMainWorld('bookreader', api)

export type BookReaderApi = typeof api

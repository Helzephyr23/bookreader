import { create } from 'zustand'

export type AppView = 'library' | 'reader'

interface UiState {
  view: AppView
  setView: (view: AppView) => void
  bookmarksOpen: boolean
  toggleBookmarks: () => void
  setBookmarksOpen: (open: boolean) => void
  tocOpen: boolean
  toggleToc: () => void
  setTocOpen: (open: boolean) => void
}

export const useUi = create<UiState>((set) => ({
  view: 'library',
  setView: (view) => set({ view }),
  bookmarksOpen: false,
  toggleBookmarks: () => set((s) => ({ bookmarksOpen: !s.bookmarksOpen })),
  setBookmarksOpen: (open) => set({ bookmarksOpen: open }),
  tocOpen: false,
  toggleToc: () => set((s) => ({ tocOpen: !s.tocOpen })),
  setTocOpen: (open) => set({ tocOpen: open }),
}))

import { create } from 'zustand'

export type Theme = 'dark' | 'sepia' | 'light'

const STORAGE_KEY = 'bookreader.theme'
const THEMES: Theme[] = ['dark', 'sepia', 'light']

function readStoredTheme(): Theme {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value === 'dark' || value === 'sepia' || value === 'light') return value
  } catch {
    /* ignore */
  }
  return 'dark'
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
}

interface SettingsState {
  theme: Theme
  setTheme: (theme: Theme) => void
  cycleTheme: () => void
}

const initial = readStoredTheme()
applyTheme(initial)

export const useSettings = create<SettingsState>((set, get) => ({
  theme: initial,
  setTheme: (theme) => {
    applyTheme(theme)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* ignore */
    }
    set({ theme })
  },
  cycleTheme: () => {
    const idx = THEMES.indexOf(get().theme)
    get().setTheme(THEMES[(idx + 1) % THEMES.length])
  },
}))

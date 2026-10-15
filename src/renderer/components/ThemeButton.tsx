import { useSettings, type Theme } from '@/stores/settingsStore'

const LABEL: Record<Theme, string> = {
  dark: '🌙 Dark',
  sepia: '📜 Sepia',
  light: '☀️ Light',
}

export function ThemeButton({ className }: { className?: string }) {
  const theme = useSettings((s) => s.theme)
  const cycleTheme = useSettings((s) => s.cycleTheme)

  return (
    <button
      className={className ?? 'tb-btn tb-theme'}
      onClick={cycleTheme}
      title="Switch reading theme"
    >
      {LABEL[theme]}
    </button>
  )
}

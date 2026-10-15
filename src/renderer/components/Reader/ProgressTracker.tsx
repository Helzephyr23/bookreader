import { useEffect } from 'react'
import { useReader } from '@/stores/readerStore'
import { useLibrary } from '@/stores/libraryStore'

export function ProgressTracker() {
  const currentPage = useReader((s) => s.currentPage)
  const activeBookId = useLibrary((s) => s.activeBookId)

  useEffect(() => {
    if (!activeBookId) return
    const timer = window.setTimeout(() => {
      void useLibrary.getState().saveProgress(activeBookId, currentPage)
    }, 600)
    return () => window.clearTimeout(timer)
  }, [activeBookId, currentPage])

  return null
}

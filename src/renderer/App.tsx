import { useEffect } from 'react'
import { Reader } from '@/components/Reader/Reader'
import { Library } from '@/components/Library/Library'
import { useLibrary } from '@/stores/libraryStore'
import { useUi } from '@/stores/uiStore'

export default function App() {
  const view = useUi((s) => s.view)

  useEffect(() => {
    void (async () => {
      if (!useLibrary.getState().loaded) {
        await useLibrary.getState().load()
      }
      const file = await window.bookreader.getInitialFile()
      if (file) {
        await useLibrary.getState().openByPath(file.path, file.name)
      }
    })()
  }, [])

  return view === 'reader' ? <Reader /> : <Library />
}

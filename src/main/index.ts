import { app, BrowserWindow, dialog, ipcMain, net, protocol, shell } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { readLibrary, writeLibrary, type StoredBook } from './storage'

const RENDERER_DIST = path.join(__dirname, '../../dist')
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL
const SMOKE_OUT = process.env.BOOKREADER_SMOKE_OUT

function findInitialFile(): { path: string; name: string } | null {
  const candidates = [process.env.BOOKREADER_OPEN, ...process.argv.slice(1)].filter(
    (v): v is string => typeof v === 'string' && v.length > 0,
  )
  for (const candidate of candidates) {
    if (candidate.toLowerCase().endsWith('.pdf') && fs.existsSync(candidate)) {
      const resolved = path.resolve(candidate)
      return { path: resolved, name: path.basename(resolved) }
    }
  }
  return null
}

const initialFile = findInitialFile()

const ASSETS_DIR = app.isPackaged
  ? path.join(process.resourcesPath, 'pdf-assets')
  : path.join(app.getAppPath(), 'public', 'pdf')

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'book',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
      bypassCSP: true,
    },
  },
])

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 940,
    minHeight: 640,
    backgroundColor: '#1c1712',
    show: false,
    autoHideMenuBar: true,
    title: 'BookReader',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())

  if (SMOKE_OUT) {
    mainWindow.webContents.once('did-finish-load', async () => {
      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
      const turns = Number(process.env.BOOKREADER_SMOKE_TURNS || '0')
      const clickSelector = process.env.BOOKREADER_SMOKE_CLICK
      await delay(1800)
      if (clickSelector) {
        try {
          await mainWindow?.webContents.executeJavaScript(
            `document.querySelector(${JSON.stringify(clickSelector)})?.click()`,
          )
        } catch (err) {
          console.log('[smoke] click failed', String(err))
        }
        await delay(2000)
      }
      for (let i = 0; i < turns; i++) {
        mainWindow?.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Right' })
        mainWindow?.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Right' })
        await delay(1100)
      }
      await delay(1200)
      if (!mainWindow) return
      try {
        const info = await mainWindow.webContents.executeJavaScript(
          `JSON.stringify({
            theme: document.documentElement.getAttribute('data-theme'),
            cards: document.querySelectorAll('.book-card').length,
            libraryEmpty: !!document.querySelector('.library-empty'),
            reader: !!document.querySelector('.reader'),
            bookHalves: document.querySelectorAll('.book-half').length,
            canvases: document.querySelectorAll('canvas').length,
            bookmarkOn: !!document.querySelector('.tb-mark.is-on'),
            bookmarksText: (document.querySelector('.tb-marks')?.textContent || '').trim(),
            panelOpen: !!document.querySelector('.bookmarks-panel') || !!document.querySelector('.toc-panel'),
          })`,
        )
        console.log('[smoke]', info)
      } catch (err) {
        console.log('[smoke] dom query failed', String(err))
      }
      const image = await mainWindow.webContents.capturePage()
      fs.writeFileSync(SMOKE_OUT, image.toPNG())
      app.quit()
    })
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (DEV_SERVER_URL) {
    mainWindow.loadURL(DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function registerProtocol() {
  protocol.handle('book', (request) => {
    const url = new URL(request.url)

    if (url.hostname === 'assets') {
      const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '')
      const full = path.join(ASSETS_DIR, rel)
      if (!full.startsWith(ASSETS_DIR)) {
        return new Response('forbidden', { status: 403 })
      }
      return net.fetch(pathToFileURL(full).toString())
    }

    if (url.hostname === 'file') {
      const filePath = url.searchParams.get('p')
      if (!filePath) return new Response('missing path', { status: 400 })
      return net.fetch(pathToFileURL(filePath).toString())
    }

    return new Response('not found', { status: 404 })
  })
}

function registerIpc() {
  ipcMain.handle('app:ping', () => 'pong')
  ipcMain.handle('app:get-initial-file', () => initialFile)

  ipcMain.handle('dialog:open-pdf', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Open PDF',
      properties: ['openFile'],
      filters: [{ name: 'PDF books', extensions: ['pdf'] }],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const filePath = result.filePaths[0]
    return { path: filePath, name: path.basename(filePath) }
  })

  ipcMain.handle('library:pick-files', async () => {
    if (!mainWindow) return []
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Add books to your library',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'PDF books', extensions: ['pdf'] }],
    })
    if (result.canceled) return []
    return result.filePaths.map((p) => ({ path: p, name: path.basename(p) }))
  })

  ipcMain.handle('library:load', () => readLibrary())

  ipcMain.handle('library:save', (_event, books: StoredBook[]) => {
    writeLibrary(Array.isArray(books) ? books : [])
    return true
  })
}

app.whenReady().then(() => {
  registerProtocol()
  registerIpc()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

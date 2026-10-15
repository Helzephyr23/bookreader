import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

export interface WindowState {
  x?: number
  y?: number
  width?: number
  height?: number
  isMaximized?: boolean
}

function windowStatePath(): string {
  return path.join(app.getPath('userData'), 'window.json')
}

export function readWindowState(): WindowState {
  try {
    const raw = fs.readFileSync(windowStatePath(), 'utf8')
    const parsed = JSON.parse(raw) as WindowState
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function writeWindowState(state: WindowState): void {
  try {
    const file = windowStatePath()
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, JSON.stringify(state, null, 2), 'utf8')
  } catch {
    /* ignore */
  }
}

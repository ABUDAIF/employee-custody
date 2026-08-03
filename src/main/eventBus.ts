import { EventEmitter } from 'events'
import { BrowserWindow } from 'electron'

class SystemEventBus extends EventEmitter {
  private mainWindow: BrowserWindow | null = null

  public setMainWindow(win: BrowserWindow) {
    this.mainWindow = win
  }

  public broadcast(channel: string, payload?: any) {
    // 1. Internal Event Bus emit
    this.emit(channel, payload)

    // 2. Broadcast via IPC to Renderer Process
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, payload)
    }
  }
}

export const eventBus = new SystemEventBus()

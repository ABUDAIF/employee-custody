import path from 'path'

// Electron ASAR Unpacked Module Resolution for Prisma (.prisma/client)
try {
  const Module = require('module')
  if (process.resourcesPath) {
    const unpackedModules = path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules')
    if (Module.globalPaths && !Module.globalPaths.includes(unpackedModules)) {
      Module.globalPaths.unshift(unpackedModules)
    }
    if (require.main && require.main.paths && !require.main.paths.includes(unpackedModules)) {
      require.main.paths.unshift(unpackedModules)
    }
  }
} catch (e) {
  console.error('Module paths resolution fix warning:', e)
}

import { app, BrowserWindow } from 'electron'

if (app) {
  process.env.USER_DATA_PATH = app.getPath('userData')
}
import { initDatabase } from '../services/db/prismaClient'
import { registerIpcHandlers } from './ipcHandlers'
import { eventBus } from './eventBus'
import { telegramBotService } from '../services/telegram/botService'
import { AutoBackupService } from './autoBackup'
import { autoOffloaderService } from '../services/storage/AutoOffloaderService'
import { initAutoUpdater } from './autoUpdater'

let mainWindow: BrowserWindow | null = null

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'نظام إدارة العهد المالية للموظفين — Employee Custody System',
    frame: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  eventBus.setMainWindow(mainWindow)

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    const indexPath = path.join(__dirname, '../../dist/index.html')
    await mainWindow.loadFile(indexPath)
  }

  if (mainWindow && !mainWindow.isVisible()) {
    mainWindow.show()
  }
}

app.whenReady().then(async () => {
  try {
    await initDatabase()
  } catch (err) {
    console.error('Database init warning:', err)
  }

  try {
    registerIpcHandlers()
  } catch (err) {
    console.error('IPC Handlers registration warning:', err)
  }

  try {
    await telegramBotService.initBot()
  } catch (err) {
    console.error('Telegram Bot init warning:', err)
  }

  try {
    AutoBackupService.initAutoBackupScheduler()
  } catch (err) {
    console.error('Auto Backup scheduler warning:', err)
  }

  try {
    autoOffloaderService.start()
  } catch (err) {
    console.error('Auto Offloader warning:', err)
  }

  await createWindow()

  if (mainWindow) {
    try {
      initAutoUpdater(mainWindow)
    } catch (err) {
      console.error('Auto Updater initialization warning:', err)
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  autoOffloaderService.stop()
  if (process.platform !== 'darwin') app.quit()
})

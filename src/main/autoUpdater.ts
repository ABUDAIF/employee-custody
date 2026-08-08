import { autoUpdater } from 'electron-updater'
import { BrowserWindow, ipcMain } from 'electron'

export function initAutoUpdater(mainWindow: BrowserWindow) {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  // Check for updates 5 seconds after startup
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.log('Auto-updater background check info:', err?.message || err)
    })
  }, 5000)

  // Check for updates every 2 hours while app is open
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.log('Auto-updater background check info:', err?.message || err)
    })
  }, 2 * 60 * 60 * 1000)

  autoUpdater.on('update-available', (info) => {
    console.log('✨ New update available:', info.version)
    mainWindow.webContents.send('update:available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes
    })
  })

  autoUpdater.on('download-progress', (progressObj) => {
    mainWindow.webContents.send('update:download-progress', {
      percent: Math.round(progressObj.percent),
      bytesPerSecond: progressObj.bytesPerSecond
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    console.log('✅ Update downloaded and ready to install:', info.version)
    mainWindow.webContents.send('update:downloaded', {
      version: info.version
    })
  })

  autoUpdater.on('error', (err) => {
    console.log('Auto-updater info:', err?.message || err)
  })

  ipcMain.handle('update:checkNow', async () => {
    try {
      const result = await autoUpdater.checkForUpdates()
      return { success: true, updateInfo: result?.updateInfo }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('update:restartAndInstall', () => {
    autoUpdater.quitAndInstall(false, true)
  })
}

import fs from 'fs'
import path from 'path'
import { FileManager } from '../services/storage/fileManager'
import { settingsRepository } from '../services/repositories/SettingsRepository'

export class AutoBackupService {
  private static timer: NodeJS.Timeout | null = null

  public static async createBackup(): Promise<string> {
    const dbPath = path.join(process.cwd(), 'storage', 'database.sqlite')
    if (!fs.existsSync(dbPath)) {
      throw new Error('ملف قاعدة البيانات غير موجود.')
    }

    const todayStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const backupFileName = `backup_${todayStr}.sqlite`
    const backupDir = FileManager.getBackupsDir()
    const targetPath = path.join(backupDir, backupFileName)

    fs.copyFileSync(dbPath, targetPath)
    await settingsRepository.updateLastBackupTimestamp()

    console.log(`💾 Backup created successfully: ${backupFileName}`)
    return backupFileName
  }

  public static async getBackupList(): Promise<Array<{ fileName: string; size: number; createdAt: Date }>> {
    const backupDir = FileManager.getBackupsDir()
    if (!fs.existsSync(backupDir)) return []

    const files = fs.readdirSync(backupDir)
    const result = []

    for (const file of files) {
      if (file.endsWith('.sqlite')) {
        const filePath = path.join(backupDir, file)
        const stat = fs.statSync(filePath)
        result.push({
          fileName: file,
          size: stat.size,
          createdAt: stat.birthtime
        })
      }
    }

    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  public static async restoreBackup(backupFileName: string): Promise<void> {
    const backupDir = FileManager.getBackupsDir()
    const backupPath = path.join(backupDir, backupFileName)
    if (!fs.existsSync(backupPath)) {
      throw new Error('ملف النسخة الاحتياطية غير موجود.')
    }

    const dbPath = path.join(process.cwd(), 'storage', 'database.sqlite')
    fs.copyFileSync(backupPath, dbPath)
    console.log(`🔄 Database restored from: ${backupFileName}`)
  }

  public static initAutoBackupScheduler() {
    if (this.timer) clearInterval(this.timer)

    // Check once every 24 hours (86400000 ms)
    this.timer = setInterval(async () => {
      try {
        const settings = await settingsRepository.getSettings()
        if (settings.autoBackupEnabled) {
          await this.createBackup()
        }
      } catch (err) {
        console.error('Error during auto-backup process:', err)
      }
    }, 24 * 60 * 60 * 1000)

    // Initial check on launch
    setTimeout(async () => {
      try {
        const settings = await settingsRepository.getSettings()
        if (settings.autoBackupEnabled) {
          await this.createBackup()
        }
      } catch (err) {
        console.error('Initial auto-backup error:', err)
      }
    }, 5000)
  }
}

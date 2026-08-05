import fs from 'fs'
import path from 'path'
import { FileManager } from '../services/storage/fileManager'
import { settingsRepository } from '../services/repositories/SettingsRepository'
import { prisma } from '../services/db/prismaClient'

export class AutoBackupService {
  private static timer: NodeJS.Timeout | null = null

  public static async createBackup(): Promise<string> {
    try {
      // Export complete Cloud PostgreSQL Database tables
      const [
        employees,
        activationRequests,
        ledgerEntries,
        ledgerAttachments,
        monthSnapshots,
        employeeMonthSnapshots,
        settings
      ] = await Promise.all([
        prisma.employee.findMany(),
        prisma.activationRequest.findMany(),
        prisma.ledgerEntry.findMany(),
        prisma.ledgerAttachment.findMany(),
        prisma.monthSnapshot.findMany(),
        prisma.employeeMonthSnapshot.findMany(),
        prisma.settings.findMany()
      ])

      const backupData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        tables: {
          employees,
          activationRequests,
          ledgerEntries,
          ledgerAttachments,
          monthSnapshots,
          employeeMonthSnapshots,
          settings
        }
      }

      const todayStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const backupFileName = `backup_${todayStr}.json`
      const backupDir = FileManager.getBackupsDir()
      const targetPath = path.join(backupDir, backupFileName)

      fs.writeFileSync(targetPath, JSON.stringify(backupData, null, 2), 'utf8')
      await settingsRepository.updateLastBackupTimestamp()

      console.log(`💾 Cloud PostgreSQL Backup created successfully: ${backupFileName}`)
      return backupFileName
    } catch (err: any) {
      console.error('❌ Failed to create cloud backup:', err)
      throw new Error(`فشل إنشاء النسخة الاحتياطية: ${err.message}`)
    }
  }

  public static async getBackupList(): Promise<Array<{ fileName: string; size: number; createdAt: Date }>> {
    const backupDir = FileManager.getBackupsDir()
    if (!fs.existsSync(backupDir)) return []

    const files = fs.readdirSync(backupDir)
    const result = []

    for (const file of files) {
      if (file.endsWith('.json') || file.endsWith('.sqlite')) {
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

    if (backupFileName.endsWith('.json')) {
      const content = fs.readFileSync(backupPath, 'utf8')
      const backup = JSON.parse(content)

      if (!backup.tables) {
        throw new Error('ملف النسخة الاحتياطية غير صريح أو تالف.')
      }

      const { tables } = backup

      // Restore to Supabase Cloud PostgreSQL in transaction
      if (tables.employees) {
        for (const emp of tables.employees) {
          const { createdAt, updatedAt, ...empData } = emp
          await prisma.employee.upsert({
            where: { id: emp.id },
            update: empData,
            create: empData
          })
        }
      }

      if (tables.activationRequests) {
        for (const act of tables.activationRequests) {
          const { createdAt, updatedAt, ...actData } = act
          await prisma.activationRequest.upsert({
            where: { id: act.id },
            update: actData,
            create: actData
          })
        }
      }

      if (tables.monthSnapshots) {
        for (const snap of tables.monthSnapshots) {
          const { closedAt, ...snapData } = snap
          await prisma.monthSnapshot.upsert({
            where: { id: snap.id },
            update: snapData,
            create: snapData
          })
        }
      }

      if (tables.ledgerEntries) {
        for (const entry of tables.ledgerEntries) {
          const { createdAt, updatedAt, date, ...entryData } = entry
          await prisma.ledgerEntry.upsert({
            where: { id: entry.id },
            update: { ...entryData, date: new Date(date) },
            create: { ...entryData, date: new Date(date) }
          })
        }
      }

      if (tables.ledgerAttachments) {
        for (const att of tables.ledgerAttachments) {
          const { uploadedAt, ...attData } = att
          await prisma.ledgerAttachment.upsert({
            where: { id: att.id },
            update: attData,
            create: attData
          })
        }
      }

      if (tables.settings && tables.settings.length > 0) {
        for (const set of tables.settings) {
          const { updatedAt, ...setData } = set
          await prisma.settings.upsert({
            where: { id: set.id },
            update: setData,
            create: setData
          })
        }
      }

      console.log(`🔄 Database restored successfully from JSON backup: ${backupFileName}`)
    } else {
      throw new Error('تتطلب استعادة ملفات SQLite القديمة محولاً خاصاً، يرجى استخدام ملفات .json.')
    }
  }

  public static initAutoBackupScheduler() {
    if (this.timer) clearInterval(this.timer)

    // Check once every 24 hours
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

    // Initial check on launch after 10s
    setTimeout(async () => {
      try {
        const settings = await settingsRepository.getSettings()
        if (settings.autoBackupEnabled) {
          await this.createBackup()
        }
      } catch (err) {
        console.error('Initial auto-backup error:', err)
      }
    }, 10000)
  }
}

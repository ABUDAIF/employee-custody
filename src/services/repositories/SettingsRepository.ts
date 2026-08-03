import { prisma } from '../db/prismaClient'
import { FileManager } from '../storage/fileManager'
import { Settings } from '@prisma/client'

export class SettingsRepository {
  public async getSettings(): Promise<Settings> {
    let settings = await prisma.settings.findUnique({
      where: { id: 1 }
    })

    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          id: 1,
          companyName: 'شركة العهد المالية',
          autoBackupEnabled: true
        }
      })
    }

    return settings
  }

  public async updateSettings(data: {
    companyName?: string
    companyLogoBuffer?: Buffer
    logoExt?: string
    telegramBotToken?: string
    autoBackupEnabled?: boolean
  }): Promise<Settings> {
    await this.getSettings() // Ensure row exists

    let logoPath: string | undefined = undefined
    if (data.companyLogoBuffer && data.logoExt) {
      const fileName = `logo_${Date.now()}.${data.logoExt}`
      logoPath = FileManager.saveFile('company', fileName, data.companyLogoBuffer)
    }

    return await prisma.settings.update({
      where: { id: 1 },
      data: {
        ...(data.companyName && { companyName: data.companyName }),
        ...(logoPath && { companyLogo: logoPath }),
        ...(data.telegramBotToken !== undefined && { telegramBotToken: data.telegramBotToken }),
        ...(data.autoBackupEnabled !== undefined && { autoBackupEnabled: data.autoBackupEnabled })
      }
    })
  }

  public async updateLastBackupTimestamp(): Promise<void> {
    await prisma.settings.update({
      where: { id: 1 },
      data: { lastBackupAt: new Date() }
    })
  }
}

export const settingsRepository = new SettingsRepository()

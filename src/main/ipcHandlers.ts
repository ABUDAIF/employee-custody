import { ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'
import { employeeRepository } from '../services/repositories/EmployeeRepository'
import { activationRepository } from '../services/repositories/ActivationRepository'
import { ledgerRepository } from '../services/repositories/LedgerRepository'
import { monthCloseRepository } from '../services/repositories/MonthCloseRepository'
import { settingsRepository } from '../services/repositories/SettingsRepository'
import { telegramBotService } from '../services/telegram/botService'
import { ExcelGenerator } from '../services/excel/ExcelGenerator'
import { getPermanentStorageDir } from '../services/db/prismaClient'

export function registerIpcHandlers() {
  // Employee Handlers
  ipcMain.handle('employee:getAll', async () => {
    return await employeeRepository.getAllEmployees()
  })

  ipcMain.handle('employee:getById', async (_, id: string) => {
    return await employeeRepository.getEmployeeById(id)
  })

  ipcMain.handle('employee:create', async (_, data: any) => {
    return await employeeRepository.createEmployee(data)
  })

  ipcMain.handle('employee:update', async (_, id: string, data: any) => {
    return await employeeRepository.updateEmployee(id, data)
  })

  ipcMain.handle('employee:delete', async (_, id: string) => {
    return await employeeRepository.deleteEmployee(id)
  })

  ipcMain.handle('employee:getMetrics', async (_, employeeId: string) => {
    return await employeeRepository.calculateEmployeeMetrics(employeeId)
  })

  // Ledger Handlers
  ipcMain.handle('ledger:getAll', async (_, options: any) => {
    return await ledgerRepository.getAllEntries(options)
  })

  ipcMain.handle('ledger:getEmployeeTimeline', async (_, employeeId: string) => {
    return await ledgerRepository.getEmployeeTimeline(employeeId)
  })

  ipcMain.handle('ledger:createDeposit', async (_, data: any) => {
    return await ledgerRepository.createDeposit(data)
  })

  ipcMain.handle('ledger:createExpense', async (_, data: any) => {
    return await ledgerRepository.createExpense(data)
  })

  ipcMain.handle('ledger:getDashboardMetrics', async () => {
    return await ledgerRepository.getDashboardMetrics()
  })

  ipcMain.handle('ledger:globalSearch', async (_, query: string) => {
    return await ledgerRepository.globalSearch(query)
  })

  ipcMain.handle('ledger:addAdjustment', async (_, data: any) => {
    return await ledgerRepository.addAdjustment(data)
  })

  ipcMain.handle('ledger:deleteEntry', async (_, id: string) => {
    return await ledgerRepository.deleteEntry(id)
  })

  ipcMain.handle('ledger:deleteAttachment', async (_, attachmentId: string) => {
    return await ledgerRepository.deleteAttachment(attachmentId)
  })

  // Activation Handlers
  ipcMain.handle('activation:getPending', async () => {
    return await activationRepository.getPendingRequests()
  })

  ipcMain.handle('activation:generateOtp', async (_, requestId: string, employeeId: string) => {
    return await activationRepository.generateOtpForEmployee(requestId, employeeId)
  })

  // Dialog & Shell IPCs
  ipcMain.handle('dialog:showSaveDialog', async (_, options: any) => {
    const { dialog } = await import('electron')
    return await dialog.showSaveDialog(options)
  })

  ipcMain.handle('shell:openPath', async (_, relativeOrAbsolutePath: string, fileName?: string) => {
    const { shell } = await import('electron')
    let fullPath = relativeOrAbsolutePath
    let isBase64 = false

    // 1. Auto-reconstruct Base64 attachments uploaded from Telegram Cloud Bot
    if (relativeOrAbsolutePath && relativeOrAbsolutePath.startsWith('data:')) {
      isBase64 = true
      try {
        const matches = relativeOrAbsolutePath.match(/^data:([^;]+);base64,(.+)$/)
        if (matches) {
          const mimeType = matches[1]
          const base64Data = matches[2]
          const ext = mimeType.includes('pdf') ? '.pdf' : mimeType.includes('png') ? '.png' : '.jpg'
          const safeName = fileName || `receipt_${Date.now()}${ext}`
          const storageDir = path.join(getPermanentStorageDir(), 'receipts')
          if (!fs.existsSync(storageDir)) {
            fs.mkdirSync(storageDir, { recursive: true })
          }
          fullPath = path.join(storageDir, safeName)
          fs.writeFileSync(fullPath, Buffer.from(base64Data, 'base64'))
        }
      } catch (e: any) {
        console.error('Failed to reconstruct Base64 attachment:', e)
        return {
          success: false,
          isBase64: true,
          fullPath: relativeOrAbsolutePath,
          message: `خطأ في فك تشفير المرفق السحابي: ${e.message}`
        }
      }
    } else if (!path.isAbsolute(fullPath)) {
      // Clean duplicate "storage/" prefix to fix double storage path duplication
      const cleanRelPath = relativeOrAbsolutePath.replace(/^storage[/\\]/i, '')
      fullPath = path.join(getPermanentStorageDir(), cleanRelPath)
    }

    // Candidate fallback paths if path doesn't exist
    if (!fs.existsSync(fullPath)) {
      const baseUserDir = path.dirname(getPermanentStorageDir())
      const altPath1 = path.join(baseUserDir, relativeOrAbsolutePath)
      const altPath2 = path.join(getPermanentStorageDir(), 'receipts', path.basename(relativeOrAbsolutePath))
      const altPath3 = path.join(getPermanentStorageDir(), path.basename(relativeOrAbsolutePath))

      if (fs.existsSync(altPath1)) fullPath = altPath1
      else if (fs.existsSync(altPath2)) fullPath = altPath2
      else if (fs.existsSync(altPath3)) fullPath = altPath3
    }

    if (fs.existsSync(fullPath)) {
      await shell.openPath(fullPath)
      return { success: true, fullPath, isBase64 }
    } else {
      return {
        success: false,
        isBase64,
        fullPath,
        dbPath: relativeOrAbsolutePath,
        message: isBase64
          ? 'تعذر بناء الملف السحابي على الجهاز.'
          : `الملف غير موجود على هذا الجهاز. (مسار الداتابيز: ${relativeOrAbsolutePath} | المسار المستهدف على الجهاز: ${fullPath})`
      }
    }
  })

  // Reports, Settlement & Month Close Handlers
  ipcMain.handle('report:exportExcel', async (_, options: any) => {
    const entriesResult = await ledgerRepository.getAllEntries({
      startDate: options.startDate ? new Date(options.startDate) : undefined,
      endDate: options.endDate ? new Date(options.endDate) : undefined,
      limit: 100000
    })

    const employeeSummaries = await employeeRepository.getAllEmployees()
    const settings = await settingsRepository.getSettings()

    return await ExcelGenerator.generateReport({
      entries: entriesResult.items,
      employeeSummaries,
      periodTitle: options.periodTitle || 'الفترة المحددة',
      companyName: settings.companyName,
      targetFilePath: options.targetFilePath
    })
  })

  ipcMain.handle('report:exportMasterExcel', async (_, options: any) => {
    const entriesResult = await ledgerRepository.getAllEntries({ limit: 100000 })
    const employeeSummaries = await employeeRepository.getAllEmployees()
    const settings = await settingsRepository.getSettings()

    return await ExcelGenerator.generateMasterReport({
      entries: entriesResult.items,
      employeeSummaries,
      companyName: settings.companyName,
      targetFilePath: options.targetFilePath
    })
  })

  ipcMain.handle('settlement:liquidate', async (_, data: any) => {
    return await monthCloseRepository.liquidateEmployee(data)
  })

  ipcMain.handle('month:getClosed', async () => {
    return await monthCloseRepository.getClosedMonths()
  })

  ipcMain.handle('month:close', async (_, monthKey: string) => {
    return await monthCloseRepository.closeMonth(monthKey)
  })

  ipcMain.handle('month:regenerate', async (_, monthKey: string) => {
    return await monthCloseRepository.regenerateMonthReport(monthKey)
  })

  // Settings & Bot Handlers
  ipcMain.handle('settings:get', async () => {
    return await settingsRepository.getSettings()
  })

  ipcMain.handle('settings:update', async (_, data: any) => {
    const updated = await settingsRepository.updateSettings(data)
    if (data.telegramBotToken) {
      await telegramBotService.initBot(data.telegramBotToken)
    }
    return updated
  })

  ipcMain.handle('bot:getStatus', async () => {
    return await telegramBotService.getBotStatus()
  })

  ipcMain.handle('bot:connect', async (_, token: string) => {
    const cleanToken = (token || '').trim().replace(/^bot/i, '').replace(/["'\s]/g, '')
    await settingsRepository.updateSettings({ telegramBotToken: cleanToken })
    const res = await telegramBotService.initBot(cleanToken)
    return res
  })

  // Backup IPCs
  ipcMain.handle('backup:create', async () => {
    return await settingsRepository.createBackup()
  })

  ipcMain.handle('backup:getList', async () => {
    return await settingsRepository.getBackupList()
  })

  ipcMain.handle('backup:restore', async (_, fileName: string) => {
    return await settingsRepository.restoreBackup(fileName)
  })
}

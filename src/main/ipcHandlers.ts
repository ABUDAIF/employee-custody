import { ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'
import { employeeRepository } from '../services/repositories/EmployeeRepository'
import { ledgerRepository } from '../services/repositories/LedgerRepository'
import { activationRepository } from '../services/repositories/ActivationRepository'
import { monthCloseRepository } from '../services/repositories/MonthCloseRepository'
import { settingsRepository } from '../services/repositories/SettingsRepository'
import { telegramBotService } from '../services/telegram/botService'
import { ExcelGenerator } from '../services/excel/excelGenerator'
import { QRGenerator } from '../services/pdf/qrGenerator'
import { AutoBackupService } from './autoBackup'
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

  // Ledger Handlers
  ipcMain.handle('ledger:getAll', async (_, options?: any) => {
    return await ledgerRepository.getAllEntries(options)
  })

  ipcMain.handle('ledger:getEmployeeTimeline', async (_, employeeId: string) => {
    return await ledgerRepository.getEmployeeTimeline(employeeId)
  })

  ipcMain.handle('ledger:createDeposit', async (_, data: any) => {
    const entry = await ledgerRepository.createDeposit(data)
    if (entry.employee && entry.employee.phone) {
      const empFull = await employeeRepository.getEmployeeById(entry.employeeId)
      if (empFull && empFull.telegramId) {
        telegramBotService.sendNotification(
          empFull.telegramId,
          `📥 **تم إضافة عهدة جديدة بقيمة ${data.amount} ج.م.**\n` +
            `📝 **الوصف:** ${data.description}\n` +
            `🔢 **رقم العملية:** \`${entry.operationNo}\`\n` +
            `----------------------------------\n` +
            `💵 **رصيدك الحالي:** *${empFull.balance.toLocaleString('ar-EG')} ج.م*`
        )
      }
    }
    return entry
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

  ipcMain.handle('ledger:generateQRCode', async (_, opNo: string) => {
    return await QRGenerator.generateDataUrl(opNo)
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

  ipcMain.handle('shell:openPath', async (_, relativeOrAbsolutePath: string) => {
    const { shell } = await import('electron')
    let fullPath = relativeOrAbsolutePath
    if (!path.isAbsolute(fullPath)) {
      fullPath = path.join(getPermanentStorageDir(), relativeOrAbsolutePath)
    }
    if (fs.existsSync(fullPath)) {
      await shell.openPath(fullPath)
      return { success: true }
    } else {
      return { success: false, message: 'الملف غير موجود على القرص المحلي.' }
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

  // Backup Handlers
  ipcMain.handle('backup:create', async () => {
    return await AutoBackupService.createBackup()
  })

  ipcMain.handle('backup:getList', async () => {
    return await AutoBackupService.getBackupList()
  })

  ipcMain.handle('backup:restore', async (_, fileName: string) => {
    return await AutoBackupService.restoreBackup(fileName)
  })
}

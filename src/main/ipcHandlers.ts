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
import { getPermanentStorageDir, prisma } from '../services/db/prismaClient'
import { AutoBackupService } from './autoBackup'

function getBroadcastHistoryFilePath(): string {
  return path.join(getPermanentStorageDir(), 'broadcast_history.json')
}

function getBroadcastHistory(): any[] {
  try {
    const file = getBroadcastHistoryFilePath()
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8')
      return JSON.parse(content)
    }
  } catch {}
  return []
}

function saveBroadcastHistory(history: any[]) {
  try {
    const file = getBroadcastHistoryFilePath()
    fs.writeFileSync(file, JSON.stringify(history, null, 2), 'utf8')
  } catch (e) {
    console.error('Failed to save broadcast history:', e)
  }
}

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

  // Attachment Direct Base64 & SaveAs Handlers
  ipcMain.handle('attachment:getBase64', async (_, relativeOrAbsolutePath: string) => {
    if (!relativeOrAbsolutePath) return null
    if (relativeOrAbsolutePath.startsWith('data:')) return relativeOrAbsolutePath

    let fullPath = relativeOrAbsolutePath
    if (!path.isAbsolute(fullPath)) {
      const cleanRelPath = relativeOrAbsolutePath.replace(/^storage[/\\]/i, '')
      fullPath = path.join(getPermanentStorageDir(), cleanRelPath)
    }

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
      const buffer = fs.readFileSync(fullPath)
      const ext = path.extname(fullPath).toLowerCase()
      const mime = ext === '.pdf' ? 'application/pdf' : ext === '.png' ? 'image/png' : 'image/jpeg'
      return `data:${mime};base64,${buffer.toString('base64')}`
    }
    return null
  })

  ipcMain.handle('attachment:saveAs', async (_, relativeOrAbsolutePath: string, defaultFileName: string) => {
    const { dialog } = await import('electron')
    let base64Data: string | null = null

    if (relativeOrAbsolutePath && relativeOrAbsolutePath.startsWith('data:')) {
      const matches = relativeOrAbsolutePath.match(/^data:([^;]+);base64,(.+)$/)
      if (matches) base64Data = matches[2]
    } else {
      let fullPath = relativeOrAbsolutePath
      if (!path.isAbsolute(fullPath)) {
        const cleanRelPath = relativeOrAbsolutePath.replace(/^storage[/\\]/i, '')
        fullPath = path.join(getPermanentStorageDir(), cleanRelPath)
      }
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
        base64Data = fs.readFileSync(fullPath).toString('base64')
      }
    }

    if (!base64Data) {
      return { success: false, message: 'تعذر العثور على ملف المستند للحفظ.' }
    }

    const ext = defaultFileName.split('.').pop() || 'jpg'
    const saveRes = await dialog.showSaveDialog({
      title: 'حفظ المستند على الكمبيوتر',
      defaultPath: defaultFileName || 'receipt_document.jpg',
      filters: [{ name: 'مستندات وفواتير', extensions: [ext, 'jpg', 'png', 'pdf'] }]
    })

    if (!saveRes.canceled && saveRes.filePath) {
      fs.writeFileSync(saveRes.filePath, Buffer.from(base64Data, 'base64'))
      return { success: true, filePath: saveRes.filePath }
    }

    return { success: false, message: 'تم إلغاء عملية الحفظ.' }
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
      const cleanRelPath = relativeOrAbsolutePath.replace(/^storage[/\\]/i, '')
      fullPath = path.join(getPermanentStorageDir(), cleanRelPath)
    }

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

  // Backup IPCs (Uses AutoBackupService)
  ipcMain.handle('backup:create', async () => {
    return await AutoBackupService.createBackup()
  })

  ipcMain.handle('backup:getList', async () => {
    return await AutoBackupService.getBackupList()
  })

  ipcMain.handle('backup:restore', async (_, fileName: string) => {
    return await AutoBackupService.restoreBackup(fileName)
  })

  // Telegram Broadcast & Direct Messaging IPC
  ipcMain.handle('telegram:broadcastMessage', async (_, options: { employeeId?: string; message: string }) => {
    const currentSettings = await settingsRepository.getSettings()
    const token = currentSettings.telegramBotToken
    if (!token) {
      return { success: false, message: 'لم يتم تعيين Telegram Bot Token في الإعدادات.' }
    }

    let targetEmployees: any[] = []
    let targetTitle = 'جميع الموظفين المفعّلين'

    if (options.employeeId && options.employeeId !== 'ALL') {
      const emp = await prisma.employee.findUnique({ where: { id: options.employeeId } })
      if (emp && emp.telegramId) {
        targetEmployees.push(emp)
        targetTitle = emp.name
      }
    } else {
      targetEmployees = await prisma.employee.findMany({
        where: { telegramId: { not: null }, status: 'ACTIVE' }
      })
    }

    if (targetEmployees.length === 0) {
      return { success: false, message: 'لم يتم العثور على موظفين مفعّلين يملكون حسابات تليجرام مرتبطة.' }
    }

    let successCount = 0
    let failCount = 0
    const sentItems: Array<{ telegramId: string; messageId: number }> = []

    for (const emp of targetEmployees) {
      if (!emp.telegramId) continue
      try {
        const text = `📢 **تنبيه وإشعار من إدارة الحسابات (${currentSettings.companyName})**\n\n${options.message}`
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: emp.telegramId,
            text,
            parse_mode: 'Markdown'
          })
        })
        const data: any = await res.json()
        if (data.ok && data.result) {
          successCount++
          sentItems.push({ telegramId: emp.telegramId, messageId: data.result.message_id })
        } else {
          failCount++
        }
      } catch {
        failCount++
      }
    }

    // Save Record to Broadcast History for Message Deletion Capabilities
    if (sentItems.length > 0) {
      const record = {
        id: `broadcast_${Date.now()}`,
        sentAt: new Date().toISOString(),
        text: options.message,
        target: targetTitle,
        sentItems
      }
      const history = getBroadcastHistory()
      history.unshift(record)
      saveBroadcastHistory(history.slice(0, 50))
    }

    return {
      success: true,
      message: `تم إرسال الرسالة بنجاح إلى ${successCount} موظف${failCount > 0 ? ` (وفشل الإرسال لـ ${failCount})` : ''}.`,
      successCount,
      failCount
    }
  })

  // Get Telegram Broadcast History
  ipcMain.handle('telegram:getBroadcastHistory', async () => {
    return getBroadcastHistory()
  })

  // Delete / Revoke Telegram Sent Message for Everyone
  ipcMain.handle('telegram:deleteBroadcastMessage', async (_, broadcastId: string) => {
    const currentSettings = await settingsRepository.getSettings()
    const token = currentSettings.telegramBotToken
    if (!token) {
      return { success: false, message: 'لم يتم تعيين Telegram Bot Token في الإعدادات.' }
    }

    const history = getBroadcastHistory()
    const recordIndex = history.findIndex((h: any) => h.id === broadcastId)
    if (recordIndex === -1) {
      return { success: false, message: 'لم يتم العثور على سجل هذه الرسالة في الأرشيف.' }
    }

    const record = history[recordIndex]
    let deletedCount = 0
    let failCount = 0

    for (const item of record.sentItems) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: item.telegramId,
            message_id: item.messageId
          })
        })
        const data: any = await res.json()
        if (data.ok) deletedCount++
        else failCount++
      } catch {
        failCount++
      }
    }

    // Remove record from history after deletion attempt
    history.splice(recordIndex, 1)
    saveBroadcastHistory(history)

    return {
      success: true,
      message: `تم حذف وسحب الرسالة بنجاح من هواتف ${deletedCount} موظف${failCount > 0 ? ` (وتعذر الحذف لـ ${failCount})` : ''}.`,
      deletedCount,
      failCount
    }
  })
}

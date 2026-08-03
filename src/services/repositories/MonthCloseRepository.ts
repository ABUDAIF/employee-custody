import { prisma } from '../db/prismaClient'
import { ExcelGenerator } from '../excel/excelGenerator'
import { employeeRepository } from './EmployeeRepository'
import { settingsRepository } from './SettingsRepository'
import { eventBus } from '../../main/eventBus'

export class MonthCloseRepository {
  public async getClosedMonths() {
    return await prisma.monthSnapshot.findMany({
      orderBy: { monthKey: 'desc' },
      include: {
        employeeSummaries: {
          include: {
            employee: {
              select: { id: true, name: true, jobTitle: true, phone: true }
            }
          }
        }
      }
    })
  }

  public async closeMonth(monthKey: string) {
    // monthKey format: YYYY-MM
    const [year, month] = monthKey.split('-').map(Number)
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59, 999)

    // Check if already closed
    const existing = await prisma.monthSnapshot.findUnique({
      where: { monthKey }
    })
    if (existing) {
      throw new Error(`الشهر ${monthKey} مقفل بالفعل. يمكنك استخدام خيار إعادة الاحتساب لتحديثه.`)
    }

    // Get all ledger entries in this month
    const entries = await prisma.ledgerEntry.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        employee: {
          select: { id: true, name: true, jobTitle: true, avatar: true, phone: true }
        },
        attachments: true
      }
    })

    const employees = await employeeRepository.getAllEmployees()

    let totalDeposits = 0
    let totalExpenses = 0

    for (const e of entries) {
      if (e.type === 'DEPOSIT' || e.type === 'OPENING_BALANCE') totalDeposits += e.amount
      else if (e.type === 'EXPENSE') totalExpenses += e.amount
    }

    const remainingBalance = totalDeposits - totalExpenses

    const settings = await settingsRepository.getSettings()

    // Generate Excel Report
    const reportRes = await ExcelGenerator.generateReport({
      entries,
      employeeSummaries: employees,
      periodTitle: `شهر ${monthKey}`,
      companyName: settings.companyName
    })

    // Save Snapshot
    const snapshot = await prisma.monthSnapshot.create({
      data: {
        monthKey,
        totalDeposits,
        totalExpenses,
        remainingBalance,
        excelReportPath: reportRes.filePath,
        isLocked: false,
        employeeSummaries: {
          create: employees.map((emp) => ({
            employeeId: emp.id,
            totalCustody: emp.totalCustody,
            totalExpenses: emp.totalExpenses,
            closingBalance: emp.balance,
            transactionCount: emp.transactionCount
          }))
        }
      },
      include: {
        employeeSummaries: true
      }
    })

    eventBus.broadcast('month:closed', snapshot)
    eventBus.broadcast('activity:new', {
      type: 'MONTH_CLOSE',
      title: 'إقفال شهر جديد',
      description: `تم إقفال شهر ${monthKey} وتصدير التقرير المحاسبي تلقائياً`,
      createdAt: new Date()
    })

    return snapshot
  }

  public async regenerateMonthReport(monthKey: string) {
    const snapshot = await prisma.monthSnapshot.findUnique({
      where: { monthKey }
    })
    if (!snapshot) {
      throw new Error(`لم يتم العثور على شهر مقفل برقم ${monthKey}`)
    }

    const [year, month] = monthKey.split('-').map(Number)
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59, 999)

    const entries = await prisma.ledgerEntry.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        employee: {
          select: { id: true, name: true, jobTitle: true, avatar: true, phone: true }
        },
        attachments: true
      }
    })

    const employees = await employeeRepository.getAllEmployees()

    let totalDeposits = 0
    let totalExpenses = 0

    for (const e of entries) {
      if (e.type === 'DEPOSIT' || e.type === 'OPENING_BALANCE') totalDeposits += e.amount
      else if (e.type === 'EXPENSE') totalExpenses += e.amount
    }

    const remainingBalance = totalDeposits - totalExpenses
    const settings = await settingsRepository.getSettings()

    const reportRes = await ExcelGenerator.generateReport({
      entries,
      employeeSummaries: employees,
      periodTitle: `شهر ${monthKey} (محدث)`,
      companyName: settings.companyName
    })

    // Update snapshot
    await prisma.employeeMonthSnapshot.deleteMany({
      where: { monthSnapshotId: snapshot.id }
    })

    const updatedSnapshot = await prisma.monthSnapshot.update({
      where: { monthKey },
      data: {
        totalDeposits,
        totalExpenses,
        remainingBalance,
        excelReportPath: reportRes.filePath,
        employeeSummaries: {
          create: employees.map((emp) => ({
            employeeId: emp.id,
            totalCustody: emp.totalCustody,
            totalExpenses: emp.totalExpenses,
            closingBalance: emp.balance,
            transactionCount: emp.transactionCount
          }))
        }
      },
      include: {
        employeeSummaries: true
      }
    })

    eventBus.broadcast('month:regenerated', updatedSnapshot)
    return updatedSnapshot
  }

  public async liquidateEmployee(data: { employeeId: string; rolloverBalance: boolean }) {
    const employee = await prisma.employee.findUnique({ where: { id: data.employeeId } })
    if (!employee) throw new Error('الموظف غير موجود.')

    const metrics = await employeeRepository.calculateEmployeeMetrics(data.employeeId)
    const currentBalance = metrics.balance

    const entries = await prisma.ledgerEntry.findMany({
      where: { employeeId: data.employeeId }
    })

    if (entries.length === 0) {
      throw new Error('لا توجد حركات تسليمه أو مصروفات مسجلة لهذا الموظف لتصفيتها.')
    }

    // Clear current entries for employee to settle period
    await prisma.ledgerEntry.deleteMany({
      where: { employeeId: data.employeeId }
    })

    let newOpeningEntry = null
    if (data.rolloverBalance && currentBalance > 0) {
      const today = new Date()
      const yyyy = today.getFullYear()
      const mm = String(today.getMonth() + 1).padStart(2, '0')
      const dd = String(today.getDate()).padStart(2, '0')
      const datePrefix = `${yyyy}${mm}${dd}`

      const countToday = await prisma.ledgerEntry.count({
        where: { operationNo: { startsWith: datePrefix } }
      })

      const sequence = String(countToday + 1).padStart(6, '0')
      const operationNo = `${datePrefix}${sequence}`

      const dateStr = new Date().toLocaleDateString('ar-EG')

      newOpeningEntry = await prisma.ledgerEntry.create({
        data: {
          operationNo,
          employeeId: data.employeeId,
          type: 'OPENING_BALANCE',
          amount: currentBalance,
          category: 'عهدة افتتاحية',
          description: `رصيد عهدة مرحل من تصفية الفترة السابقة بتاريخ ${dateStr}`,
          createdBy: 'المحاسب (تصفية)'
        }
      })
    }

    if (employee.telegramId) {
      const { telegramBotService } = await import('../telegram/botService')
      if (data.rolloverBalance && currentBalance > 0) {
        await telegramBotService.sendNotification(
          employee.telegramId,
          `⚖️ **تم تصفية حسابك بالفترة الحالية بنجاح!**\n\n` +
            `👤 **الموظف:** ${employee.name}\n` +
            `📥 **إجمالي العهد السابقة:** ${metrics.totalCustody} ج.م\n` +
            `📤 **إجمالي المصروفات:** ${metrics.totalExpenses} ج.م\n` +
            `----------------------------------\n` +
            `🔄 **الرصيد المرحل كعهدة جديدة:** *${currentBalance} ج.م*`
        )
      } else {
        await telegramBotService.sendNotification(
          employee.telegramId,
          `⚖️ **تم تصفية حسابك بالفترة الحالية بنجاح!**\n\n` +
            `👤 **الموظف:** ${employee.name}\n` +
            `📥 **إجمالي العهد السابقة:** ${metrics.totalCustody} ج.م\n` +
            `📤 **إجمالي المصروفات:** ${metrics.totalExpenses} ج.م\n` +
            `----------------------------------\n` +
            `🏁 **الرصيد الجديد الحالي:** *0 ج.م*`
        )
      }
    }

    eventBus.broadcast('employee:liquidated', {
      employeeId: data.employeeId,
      currentBalance,
      rollover: data.rolloverBalance
    })
    eventBus.broadcast('activity:new', {
      type: 'SETTLEMENT',
      title: `تصفية حساب الموظف ${employee.name}`,
      description:
        data.rolloverBalance && currentBalance > 0
          ? `تمت التصفية وترحيل رصيد متبقي ${currentBalance} ج.م كعهدة افتتاحية للفترة الجديدة`
          : `تمت التصفية بالكامل وتصفير الرصيد إلى (0 ج.م)`,
      employeeName: employee.name,
      createdAt: new Date()
    })

    return { success: true, employee, currentBalance, newOpeningEntry }
  }
}

export const monthCloseRepository = new MonthCloseRepository()

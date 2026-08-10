import { prisma } from '../db/prismaClient'
import { FileManager } from '../storage/fileManager'
import { LedgerEntry, LedgerAttachment } from '@prisma/client'
import { eventBus } from '../../main/eventBus'
import { employeeRepository } from './EmployeeRepository'

export interface LedgerEntryWithDetails extends LedgerEntry {
  employee: {
    id: string
    name: string
    jobTitle: string
    avatar: string | null
    phone: string
    telegramId?: string | null
  }
  attachments: LedgerAttachment[]
}

export class LedgerRepository {
  public async generateOperationNo(): Promise<string> {
    try {
      const today = new Date()
      const yyyy = today.getFullYear()
      const mm = String(today.getMonth() + 1).padStart(2, '0')
      const dd = String(today.getDate()).padStart(2, '0')
      const datePrefix = `${yyyy}${mm}${dd}`

      const countToday = await prisma.ledgerEntry.count({
        where: {
          operationNo: {
            startsWith: datePrefix
          }
        }
      })

      const sequence = String(countToday + 1).padStart(6, '0')
      return `${datePrefix}${sequence}`
    } catch {
      return `${Date.now()}`
    }
  }

  public async createDeposit(data: {
    employeeId: string
    amount: number
    description: string
    createdBy?: string
  }): Promise<LedgerEntryWithDetails> {
    const operationNo = await this.generateOperationNo()

    const entry = await prisma.ledgerEntry.create({
      data: {
        operationNo,
        employeeId: data.employeeId,
        type: 'DEPOSIT',
        amount: data.amount,
        category: 'إيداع عهدة',
        description: data.description,
        createdBy: data.createdBy || 'المحاسب'
      },
      include: {
        employee: {
          select: { id: true, name: true, jobTitle: true, avatar: true, phone: true, telegramId: true }
        },
        attachments: true
      }
    })

    eventBus.broadcast('ledger:created', entry)
    eventBus.broadcast('activity:new', {
      type: 'DEPOSIT',
      title: 'إيداع عهدة جديد',
      description: `تم إيداع مبلغ ${data.amount} ج.م للموظف ${entry.employee.name}`,
      employeeName: entry.employee.name,
      createdAt: new Date()
    })

    // Instant Telegram Notification to Employee
    if (entry.employee && entry.employee.telegramId) {
      try {
        const metrics = await employeeRepository.calculateEmployeeMetrics(entry.employee.id)
        const currentSettings = await prisma.settings.findFirst()
        const token = currentSettings?.telegramBotToken
        const telegramId = entry.employee.telegramId

        if (token && telegramId) {
          const text =
            `📥 **تم إيداع عهدة جديدة لحسابك!**\n\n` +
            `👤 **الموظف:** ${entry.employee.name}\n` +
            `🔢 **رقم العملية:** \`${entry.operationNo}\`\n` +
            `💰 **مبلغ الإيداع:** ${entry.amount.toLocaleString('ar-EG')} ج.م\n` +
            `📝 **البيان:** ${entry.description}\n` +
            `----------------------------------\n` +
            `💵 **رصيدك الحالي المتبقي:** *${metrics.balance.toLocaleString('ar-EG')} ج.م*`

          fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramId,
              text,
              parse_mode: 'Markdown'
            })
          }).catch((err) => console.error('Deposit notification Telegram fetch warning:', err))
        }
      } catch (err: any) {
        console.error('Failed to notify employee on deposit:', err.message)
      }
    }

    return entry
  }

  public async createExpense(data: {
    employeeId: string
    amount: number
    category: string
    description: string
    createdBy?: string
    attachments?: Array<{
      fileName: string
      buffer: Buffer
      fileType: string
    }>
  }): Promise<LedgerEntryWithDetails> {
    const operationNo = await this.generateOperationNo()

    const attachmentData = []
    if (data.attachments && data.attachments.length > 0) {
      let idx = 1
      for (const att of data.attachments) {
        const ext = att.fileName.split('.').pop() || 'bin'
        const storedName = `${operationNo}_${idx}.${ext}`
        const relPath = FileManager.saveFile('receipts', storedName, att.buffer)

        attachmentData.push({
          fileName: att.fileName,
          filePath: relPath,
          fileType: att.fileType,
          fileSize: att.buffer.length
        })
        idx++
      }
    }

    const entry = await prisma.ledgerEntry.create({
      data: {
        operationNo,
        employeeId: data.employeeId,
        type: 'EXPENSE',
        amount: data.amount,
        category: data.category,
        description: data.description,
        createdBy: data.createdBy || 'الموظف (تليجرام)',
        attachments: {
          create: attachmentData
        }
      },
      include: {
        employee: {
          select: { id: true, name: true, jobTitle: true, avatar: true, phone: true, telegramId: true }
        },
        attachments: true
      }
    })

    eventBus.broadcast('ledger:created', entry)
    eventBus.broadcast('activity:new', {
      type: 'EXPENSE',
      title: 'تسجيل مصروف جديد',
      description: `تم تسجيل مصروف بقيمة ${data.amount} ج.م (${data.category}) للموظف ${entry.employee.name}`,
      employeeName: entry.employee.name,
      createdAt: new Date()
    })

    return entry
  }

  public async getEmployeeTimeline(employeeId: string): Promise<LedgerEntryWithDetails[]> {
    try {
      return await prisma.ledgerEntry.findMany({
        where: { employeeId },
        orderBy: { date: 'desc' },
        include: {
          employee: {
            select: { id: true, name: true, jobTitle: true, avatar: true, phone: true }
          },
          attachments: true
        }
      })
    } catch (err) {
      console.error(`Failed to fetch timeline for employee ${employeeId}:`, err)
      return []
    }
  }

  public async getAllEntries(options?: {
    page?: number
    limit?: number
    type?: string
    employeeId?: string
    startDate?: Date
    endDate?: Date
  }) {
    try {
      const page = options?.page || 1
      const limit = options?.limit || 20
      const skip = (page - 1) * limit

      const where: any = {}
      if (options?.type) where.type = options.type
      if (options?.employeeId) where.employeeId = options.employeeId
      if (options?.startDate || options?.endDate) {
        where.date = {}
        if (options?.startDate) where.date.gte = options.startDate
        if (options?.endDate) where.date.lte = options.endDate
      }

      const [items, total] = await Promise.all([
        prisma.ledgerEntry.findMany({
          where,
          skip,
          take: limit,
          orderBy: { date: 'desc' },
          include: {
            employee: {
              select: { id: true, name: true, jobTitle: true, avatar: true, phone: true }
            },
            attachments: true
          }
        }),
        prisma.ledgerEntry.count({ where })
      ])

      return {
        items: items || [],
        total: total || 0,
        page,
        totalPages: Math.ceil((total || 0) / limit) || 1
      }
    } catch (err) {
      console.error('Failed to get all ledger entries:', err)
      return { items: [], total: 0, page: 1, totalPages: 1 }
    }
  }

  public async globalSearch(query: string) {
    if (!query || query.trim() === '') {
      return { employees: [], ledgerEntries: [] }
    }

    try {
      const q = query.trim()
      const numericVal = parseFloat(q)
      const isNum = !isNaN(numericVal)

      const [employees, ledgerEntries] = await Promise.all([
        prisma.employee.findMany({
          where: {
            OR: [
              { name: { contains: q } },
              { jobTitle: { contains: q } },
              { phone: { contains: q } }
            ]
          },
          take: 10
        }),
        prisma.ledgerEntry.findMany({
          where: {
            OR: [
              { operationNo: { contains: q } },
              { description: { contains: q } },
              { category: { contains: q } },
              { employee: { name: { contains: q } } },
              ...(isNum ? [{ amount: { equals: numericVal } }] : []),
              { attachments: { some: { fileName: { contains: q } } } }
            ]
          },
          take: 30,
          orderBy: { date: 'desc' },
          include: {
            employee: {
              select: { id: true, name: true, jobTitle: true, avatar: true, phone: true }
            },
            attachments: true
          }
        })
      ])

      return { employees: employees || [], ledgerEntries: ledgerEntries || [] }
    } catch (err) {
      console.error('Global search error:', err)
      return { employees: [], ledgerEntries: [] }
    }
  }

  public async getDashboardMetrics() {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

      const [depositsAgg, expensesAgg, empCount, todayTxCount, monthTxCount, recentEntries] = await Promise.all([
        prisma.ledgerEntry.aggregate({
          where: {
            OR: [{ type: 'DEPOSIT' }, { type: 'OPENING_BALANCE' }]
          },
          _sum: { amount: true }
        }),
        prisma.ledgerEntry.aggregate({
          where: { type: 'EXPENSE' },
          _sum: { amount: true }
        }),
        prisma.employee.count({ where: { status: 'ACTIVE' } }),
        prisma.ledgerEntry.count({
          where: { date: { gte: today } }
        }),
        prisma.ledgerEntry.count({
          where: { date: { gte: firstDayOfMonth } }
        }),
        prisma.ledgerEntry.findMany({
          take: 10,
          orderBy: { date: 'desc' },
          include: {
            employee: {
              select: { id: true, name: true, jobTitle: true, avatar: true, phone: true }
            },
            attachments: true
          }
        })
      ])

      const totalCustody = depositsAgg._sum.amount || 0
      const totalExpenses = expensesAgg._sum.amount || 0
      const remainingBalance = totalCustody - totalExpenses

      return {
        totalCustody,
        totalExpenses,
        remainingBalance,
        employeeCount: empCount || 0,
        todayTxCount: todayTxCount || 0,
        monthTxCount: monthTxCount || 0,
        recentEntries: recentEntries || []
      }
    } catch (err) {
      console.error('Failed to calculate dashboard metrics:', err)
      return {
        totalCustody: 0,
        totalExpenses: 0,
        remainingBalance: 0,
        employeeCount: 0,
        todayTxCount: 0,
        monthTxCount: 0,
        recentEntries: []
      }
    }
  }
}

export const ledgerRepository = new LedgerRepository()

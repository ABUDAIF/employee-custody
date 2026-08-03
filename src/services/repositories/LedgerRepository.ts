import { prisma } from '../db/prismaClient'
import { FileManager } from '../storage/fileManager'
import { LedgerEntry, LedgerAttachment } from '@prisma/client'
import { eventBus } from '../../main/eventBus'

export interface LedgerEntryWithDetails extends LedgerEntry {
  employee: {
    id: string
    name: string
    jobTitle: string
    avatar: string | null
    phone: string
  }
  attachments: LedgerAttachment[]
}

export class LedgerRepository {
  public async generateOperationNo(): Promise<string> {
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
          select: { id: true, name: true, jobTitle: true, avatar: true, phone: true }
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
          select: { id: true, name: true, jobTitle: true, avatar: true, phone: true }
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
  }

  public async getAllEntries(options?: {
    page?: number
    limit?: number
    type?: string
    employeeId?: string
    startDate?: Date
    endDate?: Date
  }) {
    const page = options?.page || 1
    const limit = options?.limit || 50
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
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    }
  }

  public async globalSearch(query: string) {
    if (!query || query.trim() === '') {
      return { employees: [], ledgerEntries: [] }
    }

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

    return { employees, ledgerEntries }
  }

  public async getDashboardMetrics() {
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
      employeeCount: empCount,
      todayTxCount,
      monthTxCount,
      recentEntries
    }
  }
}

export const ledgerRepository = new LedgerRepository()

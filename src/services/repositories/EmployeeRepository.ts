import { prisma } from '../db/prismaClient'
import { FileManager } from '../storage/fileManager'
import { Employee } from '@prisma/client'

export interface EmployeeWithMetrics extends Employee {
  balance: number
  totalCustody: number
  totalExpenses: number
  transactionCount: number
  lastTransactionDate: Date | null
}

export class EmployeeRepository {
  public async calculateEmployeeMetrics(employeeId: string) {
    const agg = await prisma.ledgerEntry.groupBy({
      by: ['type'],
      where: { employeeId },
      _sum: { amount: true },
      _count: { _all: true }
    })

    let totalCustody = 0
    let totalExpenses = 0
    let transactionCount = 0

    for (const group of agg) {
      transactionCount += group._count._all
      const sum = group._sum.amount || 0
      if (group.type === 'DEPOSIT' || group.type === 'OPENING_BALANCE') {
        totalCustody += sum
      } else if (group.type === 'EXPENSE') {
        totalExpenses += sum
      } else if (group.type === 'ADJUSTMENT') {
        totalCustody += sum
      }
    }

    const lastTx = await prisma.ledgerEntry.findFirst({
      where: { employeeId },
      orderBy: { date: 'desc' },
      select: { date: true }
    })

    const balance = totalCustody - totalExpenses

    return {
      balance,
      totalCustody,
      totalExpenses,
      transactionCount,
      lastTransactionDate: lastTx ? lastTx.date : null
    }
  }

  public async getAllEmployees(): Promise<EmployeeWithMetrics[]> {
    const employees = await prisma.employee.findMany({
      orderBy: { createdAt: 'desc' }
    })

    const result: EmployeeWithMetrics[] = []
    for (const emp of employees) {
      const metrics = await this.calculateEmployeeMetrics(emp.id)
      result.push({
        ...emp,
        ...metrics
      })
    }
    return result
  }

  public async getEmployeeById(id: string): Promise<EmployeeWithMetrics | null> {
    const emp = await prisma.employee.findUnique({
      where: { id }
    })

    if (!emp) return null

    const metrics = await this.calculateEmployeeMetrics(emp.id)
    return {
      ...emp,
      ...metrics
    }
  }

  public async createEmployee(data: {
    name: string
    jobTitle: string
    phone: string
    avatarBuffer?: Buffer
    avatarExt?: string
  }): Promise<Employee> {
    let avatarPath: string | null = null

    if (data.avatarBuffer && data.avatarExt) {
      const fileName = `emp_${Date.now()}.${data.avatarExt}`
      avatarPath = FileManager.saveFile('employees', fileName, data.avatarBuffer)
    }

    return await prisma.employee.create({
      data: {
        name: data.name,
        jobTitle: data.jobTitle,
        phone: data.phone,
        avatar: avatarPath,
        status: 'PENDING_ACTIVATION'
      }
    })
  }

  public async updateEmployee(
    id: string,
    data: {
      name?: string
      jobTitle?: string
      phone?: string
      avatarBuffer?: Buffer
      avatarExt?: string
      status?: string
    }
  ): Promise<Employee> {
    let avatarPath: string | undefined = undefined

    if (data.avatarBuffer && data.avatarExt) {
      const fileName = `emp_${Date.now()}.${data.avatarExt}`
      avatarPath = FileManager.saveFile('employees', fileName, data.avatarBuffer)
    }

    return await prisma.employee.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.jobTitle && { jobTitle: data.jobTitle }),
        ...(data.phone && { phone: data.phone }),
        ...(avatarPath && { avatar: avatarPath }),
        ...(data.status && { status: data.status })
      }
    })
  }

  public async deleteEmployee(id: string): Promise<void> {
    await prisma.employee.delete({
      where: { id }
    })
  }
}

export const employeeRepository = new EmployeeRepository()

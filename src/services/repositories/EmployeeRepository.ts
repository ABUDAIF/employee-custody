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
    try {
      const entries = await prisma.ledgerEntry.findMany({
        where: { employeeId },
        orderBy: { date: 'desc' },
        select: { type: true, amount: true, date: true }
      })

      let totalCustody = 0
      let totalExpenses = 0
      let transactionCount = entries.length
      let lastTransactionDate: Date | null = entries.length > 0 ? entries[0].date : null

      for (const entry of entries) {
        if (entry.type === 'DEPOSIT' || entry.type === 'OPENING_BALANCE' || entry.type === 'ADJUSTMENT') {
          totalCustody += entry.amount
        } else if (entry.type === 'EXPENSE') {
          totalExpenses += entry.amount
        }
      }

      const balance = totalCustody - totalExpenses

      return {
        balance,
        totalCustody,
        totalExpenses,
        transactionCount,
        lastTransactionDate
      }
    } catch (err) {
      console.error(`Failed to calculate metrics for employee ${employeeId}:`, err)
      return {
        balance: 0,
        totalCustody: 0,
        totalExpenses: 0,
        transactionCount: 0,
        lastTransactionDate: null
      }
    }
  }

  public async getAllEmployees(): Promise<EmployeeWithMetrics[]> {
    try {
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
    } catch (err) {
      console.error('Failed to get all employees:', err)
      return []
    }
  }

  public async getEmployeeById(id: string): Promise<EmployeeWithMetrics | null> {
    try {
      const emp = await prisma.employee.findUnique({
        where: { id }
      })

      if (!emp) return null

      const metrics = await this.calculateEmployeeMetrics(emp.id)
      return {
        ...emp,
        ...metrics
      }
    } catch (err) {
      console.error(`Failed to get employee ${id}:`, err)
      return null
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

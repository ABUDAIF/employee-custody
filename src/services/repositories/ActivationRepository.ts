import { prisma } from '../db/prismaClient'
import { eventBus } from '../../main/eventBus'

export class ActivationRepository {
  public async getPendingRequests() {
    return await prisma.activationRequest.findMany({
      where: {
        status: { in: ['PENDING', 'CODE_GENERATED'] }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          select: { id: true, name: true, jobTitle: true, phone: true }
        }
      }
    })
  }

  public async getAllRequests() {
    return await prisma.activationRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          select: { id: true, name: true, jobTitle: true, phone: true }
        }
      }
    })
  }

  public async registerTelegramStart(data: {
    telegramId: string
    telegramName: string
    telegramUsername?: string
  }) {
    const existingEmployee = await prisma.employee.findUnique({
      where: { telegramId: data.telegramId }
    })

    if (existingEmployee) {
      return { isActivated: true, employee: existingEmployee, request: null }
    }

    let req = await prisma.activationRequest.findFirst({
      where: {
        telegramId: data.telegramId,
        status: { in: ['PENDING', 'CODE_GENERATED'] }
      }
    })

    if (!req) {
      req = await prisma.activationRequest.create({
        data: {
          telegramId: data.telegramId,
          telegramName: data.telegramName,
          telegramUsername: data.telegramUsername,
          status: 'PENDING'
        }
      })

      eventBus.broadcast('activation:new_request', req)
      eventBus.broadcast('activity:new', {
        type: 'ACTIVATION',
        title: 'طلب تفعيل تليجرام جديد',
        description: `طلب الموظف ${data.telegramName} (@${data.telegramUsername || 'لا يوجد'}) تفعيل حسابه`,
        employeeName: data.telegramName,
        createdAt: new Date()
      })
    }

    return { isActivated: false, employee: null, request: req }
  }

  public async generateOtpForEmployee(requestId: string, employeeId: string): Promise<string> {
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    await prisma.activationRequest.update({
      where: { id: requestId },
      data: {
        employeeId,
        otpCode,
        status: 'CODE_GENERATED',
        expiresAt
      }
    })

    eventBus.broadcast('activation:otp_generated', { requestId, employeeId, otpCode })
    return otpCode
  }

  public async verifyOtpAndBind(telegramId: string, otpCode: string) {
    const cleanCode = otpCode.trim()

    const req = await prisma.activationRequest.findFirst({
      where: {
        otpCode: cleanCode,
        status: 'CODE_GENERATED'
      },
      include: {
        employee: true
      }
    })

    if (!req || !req.employeeId) {
      return { success: false, message: 'كود التفعيل غير صحيح أو غير موجود.' }
    }

    if (req.expiresAt && req.expiresAt < new Date()) {
      await prisma.activationRequest.update({
        where: { id: req.id },
        data: { status: 'EXPIRED', otpCode: null }
      })
      return { success: false, message: 'عذراً، كود التفعيل انتهت صلاحيته (10 دقائق).' }
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id: req.employeeId },
      data: {
        telegramId: telegramId,
        status: 'ACTIVE'
      }
    })

    await prisma.activationRequest.update({
      where: { id: req.id },
      data: {
        status: 'ACTIVATED',
        otpCode: null
      }
    })

    eventBus.broadcast('activation:success', { employee: updatedEmployee, telegramId })
    eventBus.broadcast('activity:new', {
      type: 'ACTIVATION',
      title: 'تم تفعيل التليجرام بنجاح',
      description: `تم ربط حساب التليجرام بالموظف ${updatedEmployee.name}`,
      employeeName: updatedEmployee.name,
      createdAt: new Date()
    })

    return { success: true, employee: updatedEmployee }
  }
}

export const activationRepository = new ActivationRepository()

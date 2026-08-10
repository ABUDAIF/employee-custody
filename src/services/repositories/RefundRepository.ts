import { prisma } from '../db/prismaClient'
import { RefundRequest } from '@prisma/client'
import { employeeRepository } from './EmployeeRepository'
import { eventBus } from '../../main/eventBus'

export class RefundRepository {
  public async generateRequestNo(): Promise<string> {
    try {
      const today = new Date()
      const yyyy = today.getFullYear()
      const mm = String(today.getMonth() + 1).padStart(2, '0')
      const dd = String(today.getDate()).padStart(2, '0')
      const datePrefix = `REF${yyyy}${mm}${dd}`

      const countToday = await prisma.refundRequest.count({
        where: {
          requestNo: {
            startsWith: datePrefix
          }
        }
      })

      const sequence = String(countToday + 1).padStart(6, '0')
      return `${datePrefix}${sequence}`
    } catch {
      return `REF${Date.now()}`
    }
  }

  public async createRefundRequest(data: {
    employeeId: string
    operationNo: string
    reason: string
  }): Promise<{ success: boolean; message: string; refundRequest?: any }> {
    try {
      const cleanOpNo = data.operationNo.trim()
      const entry = await prisma.ledgerEntry.findUnique({
        where: { operationNo: cleanOpNo },
        include: { employee: true }
      })

      if (!entry) {
        return { success: false, message: `لم يتم العثور على أي عملية مسجلة برقم القيود (${cleanOpNo}).` }
      }

      if (entry.employeeId !== data.employeeId) {
        return { success: false, message: 'عذراً، هذه العملية لا تخص حسابك.' }
      }

      if (entry.type !== 'EXPENSE') {
        return { success: false, message: 'طلب الاسترداد ينطبق على حركات المصروفات فقط.' }
      }

      // Check if a pending request already exists for this operation
      const existingPending = await prisma.refundRequest.findFirst({
        where: {
          ledgerEntryId: entry.id,
          status: 'PENDING'
        }
      })

      if (existingPending) {
        return {
          success: false,
          message: `يوجد طلب استرداد قيد المراجعة بالفعل لهذه العملية رقم (${cleanOpNo}).`
        }
      }

      const requestNo = await this.generateRequestNo()

      const refundRequest = await prisma.refundRequest.create({
        data: {
          requestNo,
          employeeId: data.employeeId,
          ledgerEntryId: entry.id,
          operationNo: cleanOpNo,
          amount: entry.amount,
          reason: data.reason,
          status: 'PENDING'
        },
        include: {
          employee: true,
          ledgerEntry: true
        }
      })

      eventBus.broadcast('refund:new_request', refundRequest)
      eventBus.broadcast('refund:updated')

      return {
        success: true,
        message: `تم إرسال طلب الاسترداد للعملية (${cleanOpNo}) بقيمة ${entry.amount.toLocaleString('ar-EG')} ج.م بنجاح!`,
        refundRequest
      }
    } catch (err: any) {
      console.error('Failed to create refund request:', err)
      return { success: false, message: `خطأ أثناء إنشاء طلب الاسترداد: ${err.message}` }
    }
  }

  public async getAllRefundRequests(status?: string) {
    try {
      const where: any = {}
      if (status) where.status = status

      return await prisma.refundRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: {
            select: { id: true, name: true, jobTitle: true, avatar: true, phone: true, telegramId: true }
          },
          ledgerEntry: {
            include: {
              attachments: true
            }
          }
        }
      })
    } catch (err) {
      console.error('Failed to fetch refund requests:', err)
      return []
    }
  }

  public async getPendingCount(): Promise<number> {
    try {
      return await prisma.refundRequest.count({
        where: { status: 'PENDING' }
      })
    } catch {
      return 0
    }
  }

  public async processRefundRequest(data: {
    requestId: string
    status: 'APPROVED' | 'REJECTED'
    accountantNote?: string
  }): Promise<{ success: boolean; message: string }> {
    try {
      const request = await prisma.refundRequest.findUnique({
        where: { id: data.requestId },
        include: {
          employee: true,
          ledgerEntry: true
        }
      })

      if (!request) {
        return { success: false, message: 'تعذر العثور على طلب الاسترداد.' }
      }

      if (request.status !== 'PENDING') {
        return { success: false, message: 'تم اتخاذ قرار سابق بشأن هذا الطلب.' }
      }

      const note = data.accountantNote ? data.accountantNote.trim() : ''

      if (data.status === 'APPROVED') {
        // Create Refund Deposit in Ledger to return amount to employee balance
        const today = new Date()
        const yyyy = today.getFullYear()
        const mm = String(today.getMonth() + 1).padStart(2, '0')
        const dd = String(today.getDate()).padStart(2, '0')
        const datePrefix = `${yyyy}${mm}${dd}`

        const countToday = await prisma.ledgerEntry.count({
          where: { operationNo: { startsWith: datePrefix } }
        })
        const seq = String(countToday + 1).padStart(6, '0')
        const refundOpNo = `${datePrefix}${seq}`

        await prisma.$transaction([
          prisma.ledgerEntry.create({
            data: {
              operationNo: refundOpNo,
              employeeId: request.employeeId,
              type: 'DEPOSIT',
              amount: request.amount,
              category: 'استرداد مصروف / تعديل',
              description: `استرداد قيد المصروف رقم (${request.operationNo}): ${request.reason}`,
              createdBy: 'المحاسب (قبول طلب استرداد)'
            }
          }),
          prisma.refundRequest.update({
            where: { id: data.requestId },
            data: {
              status: 'APPROVED',
              accountantNote: note || 'تم قبول الاسترداد وإعادة المبلغ لرصيدك.',
              processedAt: new Date()
            }
          })
        ])
      } else {
        await prisma.refundRequest.update({
          where: { id: data.requestId },
          data: {
            status: 'REJECTED',
            accountantNote: note || 'تم مراجعة الطلب ورفض الاسترداد.',
            processedAt: new Date()
          }
        })
      }

      eventBus.broadcast('refund:updated')

      // Instant Telegram Notification to Employee
      if (request.employee && request.employee.telegramId) {
        try {
          const metrics = await employeeRepository.calculateEmployeeMetrics(request.employee.id)
          const currentSettings = await prisma.settings.findFirst()
          const token = currentSettings?.telegramBotToken

          if (token && request.employee.telegramId) {
            const isApproved = data.status === 'APPROVED'
            const notificationMsg = isApproved
              ? `✅ **تم قبول طلب الاسترداد لعميلتك!**\n\n` +
                `🔢 **رقم العملية:** \`${request.operationNo}\`\n` +
                `💰 **المبلغ المسترد لرصيدك:** ${request.amount.toLocaleString('ar-EG')} ج.م\n` +
                `📝 **سبب الطلب:** ${request.reason}\n` +
                (note ? `💬 **ملاحظة المحاسب:** ${note}\n` : '') +
                `----------------------------------\n` +
                `💵 **رصيدك الحالي المحدث:** *${metrics.balance.toLocaleString('ar-EG')} ج.م*`
              : `❌ **تم رفض طلب الاسترداد للعملية رقم (${request.operationNo})**\n\n` +
                `💰 **مبلغ العملية:** ${request.amount.toLocaleString('ar-EG')} ج.م\n` +
                `📝 **سبب طلبك:** ${request.reason}\n` +
                (note ? `💬 **سبب الرفض / ملاحظة المحاسب:** ${note}\n` : '') +
                `----------------------------------\n` +
                `💵 **رصيدك الحالي:** *${metrics.balance.toLocaleString('ar-EG')} ج.م*`

            fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: request.employee.telegramId,
                text: notificationMsg,
                parse_mode: 'Markdown'
              })
            }).catch((e) => console.error('Telegram notification error:', e))
          }
        } catch (e: any) {
          console.error('Failed to notify employee about refund request:', e.message)
        }
      }

      return {
        success: true,
        message: data.status === 'APPROVED'
          ? `تم قبول طلب الاسترداد وإرجاع مبلغ ${request.amount.toLocaleString('ar-EG')} ج.م لرصيد الموظف بنجاح!`
          : 'تم رفض طلب الاسترداد وإبلاغ الموظف بنجاح.'
      }
    } catch (err: any) {
      console.error('Failed to process refund request:', err)
      return { success: false, message: `خطأ في معالجة طلب الاسترداد: ${err.message}` }
    }
  }
}

export const refundRepository = new RefundRepository()

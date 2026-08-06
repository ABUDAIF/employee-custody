import TelegramBot from 'node-telegram-bot-api'
import { activationRepository } from '../repositories/ActivationRepository'
import { ledgerRepository } from '../repositories/LedgerRepository'
import { employeeRepository } from '../repositories/EmployeeRepository'
import { settingsRepository } from '../repositories/SettingsRepository'
import { eventBus } from '../../main/eventBus'

interface UserSession {
  step: 'IDLE' | 'AWAITING_AMOUNT' | 'AWAITING_CATEGORY' | 'AWAITING_DESCRIPTION' | 'AWAITING_ATTACHMENT_PROMPT' | 'AWAITING_ATTACHMENT'
  amount?: number
  category?: string
  description?: string
  attachments?: Array<{ fileName: string; buffer: Buffer; fileType: string }>
}

export class TelegramBotService {
  private bot: TelegramBot | null = null
  private userSessions: Map<string, UserSession> = new Map()

  private mainKeyboard = {
    reply_markup: {
      keyboard: [
        [{ text: '💰 رصيدي' }, { text: '➕ إضافة مصروف' }],
        [{ text: '📄 آخر العمليات' }, { text: '☎️ تواصل مع الحسابات' }]
      ],
      resize_keyboard: true,
      persistent: true
    }
  }

  public async initBot(token?: string, enableLocalPolling: boolean = false) {
    if (this.bot) {
      try {
        await this.bot.stopPolling()
      } catch (e) {}
      this.bot = null
    }

    const currentSettings = await settingsRepository.getSettings()
    let activeToken = (token || currentSettings.telegramBotToken || '').trim().replace(/^bot/i, '').replace(/["'\s]/g, '')

    const invertedMatch = activeToken.match(/^([A-Za-z0-9_-]+):(\d+)$/)
    if (invertedMatch) {
      activeToken = `${invertedMatch[2]}:${invertedMatch[1]}`
      console.log(`💡 Auto-corrected inverted Telegram Bot Token format to: ${activeToken}`)
    }

    if (!activeToken) {
      console.log('⚠️ No Telegram Bot Token configured.')
      eventBus.broadcast('telegram:status', { connected: false, message: 'لم يتم تعيين Telegram Bot Token.' })
      return { connected: false, message: 'لم يتم تعيين Telegram Bot Token.' }
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(`https://api.telegram.org/bot${activeToken}/getMe`, {
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      const data: any = await response.json()
      if (!response.ok || !data.ok) {
        const msg = data.description || 'التوكن غير صحيح أو غير صالح.'
        console.error('❌ Telegram Bot validation failed:', msg)
        eventBus.broadcast('telegram:status', { connected: false, message: msg })
        return { connected: false, message: msg }
      }

      const botInfo = data.result

      // If enableLocalPolling is true, start local polling (only if user explicitly forces local mode)
      if (enableLocalPolling) {
        this.bot = new TelegramBot(activeToken, { polling: true })
        this.bot.on('polling_error', (err) => {
          console.warn('Telegram Polling Warning:', err.message)
        })
        this.bot.on('error', (err) => {
          console.warn('Telegram Bot Warning:', err.message)
        })
        this.setupHandlers()
        console.log(`🤖 Telegram Bot Active with Local Polling: @${botInfo.username}`)
      } else {
        // Cloud 24/7 Railway Worker is active, so desktop app validates token via HTTP API without local polling collision
        console.log(`☁️ Telegram Bot Token verified! Cloud Railway Worker handles 24/7 polling for @${botInfo.username}`)
      }

      eventBus.broadcast('telegram:status', { connected: true, botInfo })
      return { connected: true, botInfo }
    } catch (err: any) {
      let errMsg = err.message
      if (err.name === 'AbortError') {
        errMsg = 'انتهت مهلة الاتصال بسيرفر تليجرام (تأكد من الاتصال بالإنترنت).'
      }
      console.error('❌ Failed to initialize Telegram Bot:', errMsg)
      eventBus.broadcast('telegram:status', { connected: false, message: errMsg })
      return { connected: false, message: errMsg }
    }
  }

  public async getBotStatus() {
    try {
      const currentSettings = await settingsRepository.getSettings()
      const token = (currentSettings.telegramBotToken || '').trim()
      if (!token) return { connected: false }

      const response = await fetch(`https://api.telegram.org/bot${token}/getMe`)
      const data: any = await response.json()
      if (data.ok) {
        return { connected: true, botInfo: data.result }
      }
      return { connected: false }
    } catch {
      return { connected: false }
    }
  }

  private setupHandlers() {
    if (!this.bot) return

    this.bot.on('message', async (msg) => {
      try {
        const chatId = msg.chat.id
        const telegramId = chatId.toString()
        const text = msg.text ? msg.text.trim() : ''
        const telegramName = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ') || 'موظف'
        const telegramUsername = msg.from?.username

        const startResult = await activationRepository.registerTelegramStart({
          telegramId,
          telegramName,
          telegramUsername
        })

        if (!startResult.isActivated) {
          if (/^\d{6}$/.test(text)) {
            const verify = await activationRepository.verifyOtpAndBind(telegramId, text)
            if (verify.success) {
              await this.bot?.sendMessage(
                chatId,
                `✅ **تم تفعيل حسابك بنجاح!**\nمرحباً بك يا ${verify.employee?.name}.\nيمكنك الآن استعراض رصيدك وتسجيل مصروفاتك بسهولة.`,
                { parse_mode: 'Markdown', ...this.mainKeyboard }
              )
            } else {
              await this.bot?.sendMessage(chatId, `❌ ${verify.message}`)
            }
            return
          }

          await this.bot?.sendMessage(
            chatId,
            `مرحباً بك يا **${telegramName}**!\n\n⚠️ **برجاء التواصل مع الحسابات للحصول على كود التفعيل.**\n📞 **الهاتف / الواتساب:** \`01030324187\``,
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '💬 تواصل عبر الواتساب', url: 'https://wa.me/201030324187' }
                  ]
                ]
              }
            }
          )
          return
        }

        const employee = startResult.employee!
        let session = this.userSessions.get(telegramId) || { step: 'IDLE' }

        if (text.includes('إلغاء') || text === '/cancel') {
          this.userSessions.delete(telegramId)
          await this.bot?.sendMessage(chatId, 'تم إلغاء العملية.', this.mainKeyboard)
          return
        }

        const isExplicitMenu = ['💰 رصيدي', '➕ إضافة مصروف', '📄 آخر العمليات', '☎️ تواصل مع الحسابات', 'إضافة مصروف', 'رصيدي'].some(m => text === m || text.includes(m))

        if (session.step === 'IDLE' || isExplicitMenu) {
          if (text.includes('رصيدي')) {
            this.userSessions.delete(telegramId)
            const metrics = await employeeRepository.calculateEmployeeMetrics(employee.id)
            await this.bot?.sendMessage(
              chatId,
              `📊 **بيان رصيدك الحالي:**\n\n` +
                `👤 **الموظف:** ${employee.name}\n` +
                `💼 **الوظيفة:** ${employee.jobTitle}\n` +
                `----------------------------------\n` +
                `📥 **إجمالي العهد:** ${metrics.totalCustody.toLocaleString('ar-EG')} ج.م\n` +
                `📤 **إجمالي المصروفات:** ${metrics.totalExpenses.toLocaleString('ar-EG')} ج.م\n` +
                `💰 **الرصيد المتبقي:** *${metrics.balance.toLocaleString('ar-EG')} ج.م*`,
              { parse_mode: 'Markdown', ...this.mainKeyboard }
            )
            return
          }

          if (text.includes('العمليات')) {
            this.userSessions.delete(telegramId)
            const timeline = await ledgerRepository.getEmployeeTimeline(employee.id)
            const recent = timeline.slice(0, 5)

            if (recent.length === 0) {
              await this.bot?.sendMessage(chatId, 'لا توجد حركات عهدة أو مصروفات مسجلة بعد.', this.mainKeyboard)
              return
            }

            let report = `📄 **آخر 5 حركات مسجلة:**\n\n`
            for (const item of recent) {
              const typeIcon = item.type === 'DEPOSIT' ? '⬆️' : '⬇️'
              const sign = item.type === 'DEPOSIT' ? '+' : '-'
              const dateStr = new Date(item.date).toLocaleDateString('ar-EG')
              report += `${typeIcon} *${sign}${item.amount} ج.م* | ${item.category || 'عام'}\n`
              report += `📝 ${item.description}\n`
              report += `🔢 #${item.operationNo} (${dateStr})\n`
              report += `----------------------------------\n`
            }

            await this.bot?.sendMessage(chatId, report, { parse_mode: 'Markdown', ...this.mainKeyboard })
            return
          }

          if (text.includes('الحسابات')) {
            this.userSessions.delete(telegramId)
            const settings = await settingsRepository.getSettings()
            await this.bot?.sendMessage(
              chatId,
              `🏢 **${settings.companyName}**\n\n` +
                `📞 **قسم الحسابات:** \`01030324187\`\n\n` +
                `لأي استفسار أو طلب تعزيز عهدة جديدة، يرجى الاتصال على الرقم أعلاه أو التواصل عبر الواتساب.`,
              {
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: '💬 تواصل عبر الواتساب', url: 'https://wa.me/201030324187' }
                    ]
                  ]
                }
              }
            )
            return
          }

          if (text.includes('مصروف')) {
            this.userSessions.set(telegramId, { step: 'AWAITING_AMOUNT' })
            await this.bot?.sendMessage(chatId, '💳 **أدخل قيمة المصروف بالجنيه:**\n(مثال: 150)', {
              reply_markup: {
                keyboard: [[{ text: 'إلغاء' }]],
                resize_keyboard: true
              }
            })
            return
          }
        }

        switch (session.step) {
          case 'AWAITING_AMOUNT': {
            const cleanNum = text.replace(/[^0-9.]/g, '')
            const num = parseFloat(cleanNum)
            if (isNaN(num) || num <= 0) {
              await this.bot?.sendMessage(chatId, '❌ يرجى إدخال مبلغ صحيح (رقم أكبر من 0):\nمثال: 150')
              return
            }
            session.amount = num
            session.step = 'AWAITING_CATEGORY'
            this.userSessions.set(telegramId, session)

            await this.bot?.sendMessage(chatId, `اختر **نوع المصروف** للمبلغ (${num} ج.م):`, {
              parse_mode: 'Markdown',
              reply_markup: {
                keyboard: [
                  [{ text: 'وقود' }, { text: 'صيانة' }],
                  [{ text: 'ضيافة' }, { text: 'مواصلات' }],
                  [{ text: 'مستلزمات مكتبية' }, { text: 'أخرى' }],
                  [{ text: 'إلغاء' }]
                ],
                resize_keyboard: true
              }
            })
            break
          }

          case 'AWAITING_CATEGORY': {
            session.category = text
            session.step = 'AWAITING_DESCRIPTION'
            this.userSessions.set(telegramId, session)

            await this.bot?.sendMessage(chatId, `📝 أدخل **وصف المصروف**:\n(مثال: بنزين للسيارة M-105)`, {
              reply_markup: {
                keyboard: [[{ text: 'إلغاء' }]],
                resize_keyboard: true
              }
            })
            break
          }

          case 'AWAITING_DESCRIPTION': {
            session.description = text
            session.step = 'AWAITING_ATTACHMENT_PROMPT'
            this.userSessions.set(telegramId, session)

            await this.bot?.sendMessage(chatId, `📎 **هل تريد إرفاق صورة فاتورة أو مستند PDF؟**`, {
              parse_mode: 'Markdown',
              reply_markup: {
                keyboard: [[{ text: 'نعم 📎' }, { text: 'لا (حفظ مباشرة) 🚀' }], [{ text: 'إلغاء' }]],
                resize_keyboard: true
              }
            })
            break
          }

          case 'AWAITING_ATTACHMENT_PROMPT': {
            if (text.includes('نعم')) {
              session.step = 'AWAITING_ATTACHMENT'
              this.userSessions.set(telegramId, session)
              await this.bot?.sendMessage(chatId, '📷 يرجى إرسال **صورة الفاتورة** أو **ملف PDF** الآن:', {
                reply_markup: {
                  keyboard: [[{ text: 'إلغاء' }]],
                  resize_keyboard: true
                }
              })
            } else {
              await this.finalizeExpense(chatId, telegramId, employee, session)
            }
            break
          }

          case 'AWAITING_ATTACHMENT': {
            let fileId: string | null = null
            let fileName = `receipt_${Date.now()}`
            let fileType = 'image/jpeg'

            if (msg.photo && msg.photo.length > 0) {
              const largest = msg.photo[msg.photo.length - 1]
              fileId = largest.file_id
              fileName += '.jpg'
              fileType = 'image/jpeg'
            } else if (msg.document) {
              fileId = msg.document.file_id
              fileName = msg.document.file_name || `${fileName}.pdf`
              fileType = msg.document.mime_type || 'application/pdf'
            }

            if (fileId) {
              try {
                const fileStream = this.bot.getFileStream(fileId)
                const chunks: Buffer[] = []
                for await (const chunk of fileStream) {
                  chunks.push(chunk)
                }
                const buffer = Buffer.concat(chunks)

                session.attachments = session.attachments || []
                session.attachments.push({ fileName, buffer, fileType })

                await this.finalizeExpense(chatId, telegramId, employee, session)
              } catch (err) {
                console.error('Failed to download file stream:', err)
                await this.bot?.sendMessage(chatId, '⚠️ حدث خطأ أثناء تحميل الفاتورة، سيتم حفظ المصروف بدون صورة.')
                await this.finalizeExpense(chatId, telegramId, employee, session)
              }
            } else {
              await this.bot?.sendMessage(chatId, '❌ لم نتمكن من التعرف على الصورة/الملف. يرجى إرسال صورة أو ملف PDF أو اضغط إلغاء.')
            }
            break
          }

          default: {
            await this.bot?.sendMessage(chatId, 'اختر من القائمة الرئيسية:', this.mainKeyboard)
            break
          }
        }
      } catch (err: any) {
        console.error('Telegram bot message handling error:', err)
        try {
          await this.bot?.sendMessage(msg.chat.id, '⚠️ حدث خطأ أثناء تنفيذ الطلب.', this.mainKeyboard)
        } catch (e) {}
      }
    })
  }

  private async finalizeExpense(chatId: number, telegramId: string, employee: any, session: UserSession) {
    try {
      const entry = await ledgerRepository.createExpense({
        employeeId: employee.id,
        amount: session.amount!,
        category: session.category!,
        description: session.description!,
        createdBy: `${employee.name} (تليجرام)`,
        attachments: session.attachments
      })

      const metrics = await employeeRepository.calculateEmployeeMetrics(employee.id)

      this.userSessions.delete(telegramId)

      await this.bot?.sendMessage(
        chatId,
        `✅ **تم تسجيل المصروف بنجاح!**\n\n` +
          `🔢 **رقم العملية:** \`${entry.operationNo}\`\n` +
          `💰 **المبلغ:** ${entry.amount} ج.م\n` +
          `🏷️ **الفئة:** ${entry.category}\n` +
          `📝 **الوصف:** ${entry.description}\n` +
          (entry.attachments.length > 0 ? `📎 **المرفقات:** ${entry.attachments.length} ملف مرفق\n` : '') +
          `----------------------------------\n` +
          `💵 **رصيدك الحالي:** *${metrics.balance.toLocaleString('ar-EG')} ج.م*`,
        { parse_mode: 'Markdown', ...this.mainKeyboard }
      )
    } catch (err: any) {
      console.error('Error finalizing expense:', err)
      this.userSessions.delete(telegramId)
      await this.bot?.sendMessage(chatId, '❌ حدث خطأ أثناء حفظ العملية. يرجى المحاولة مرة أخرى.', this.mainKeyboard)
    }
  }

  public async sendNotification(telegramId: string, message: string) {
    if (!this.bot) return
    try {
      await this.bot.sendMessage(telegramId, message, { parse_mode: 'Markdown' })
    } catch (err: any) {
      console.error(`Failed to send Telegram notification to ${telegramId}:`, err.message)
    }
  }
}

export const telegramBotService = new TelegramBotService()

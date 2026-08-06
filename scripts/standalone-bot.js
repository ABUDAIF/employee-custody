// Standalone Cloud Telegram Bot Worker for Railway / Render (Runs 24/7 - v2.0.4 2026-08-06)
const { PrismaClient } = require('@prisma/client')
const TelegramBot = require('node-telegram-bot-api')
const path = require('path')
const fs = require('fs')

const supabaseUrl = process.env.DATABASE_URL || "postgresql://postgres.rhvzptjnvzthormqxnkc:01150823229Ad@aws-1-eu-west-2.pooler.supabase.com:5432/postgres"

console.log("🚀 Starting Standalone Cloud Telegram Bot 24/7 Service (v2.0.4 Active)...")

const prisma = new PrismaClient({
  datasources: { db: { url: supabaseUrl } }
})

const mainKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '💰 رصيدي' }, { text: '➕ إضافة مصروف' }],
      [{ text: '📄 آخر العمليات' }, { text: '☎️ تواصل مع الحسابات' }]
    ],
    resize_keyboard: true,
    persistent: true
  }
}

const userSessions = new Map()

async function startBot() {
  const settings = await prisma.settings.findFirst()
  const token = (process.env.TELEGRAM_BOT_TOKEN || settings?.telegramBotToken || '').trim().replace(/^bot/i, '').replace(/["'\s]/g, '')

  if (!token) {
    console.error("❌ No Telegram Bot Token configured. Waiting for token in DB/Env...")
    setTimeout(startBot, 10000)
    return
  }

  console.log(`🤖 Telegram Bot connecting with Token: ${token.substring(0, 10)}...`)

  const bot = new TelegramBot(token, { polling: true })

  bot.on('polling_error', (err) => {
    console.warn("Telegram Polling Warning:", err.message)
  })

  bot.on('error', (err) => {
    console.warn("Telegram Bot Warning:", err.message)
  })

  bot.on('message', async (msg) => {
    try {
      const chatId = msg.chat.id
      const telegramId = chatId.toString()
      const text = msg.text ? msg.text.trim() : ''
      const telegramName = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ') || 'موظف'
      const telegramUsername = msg.from?.username

      // 1. Check employee activation status
      let employee = await prisma.employee.findUnique({ where: { telegramId } })
      let isActivated = employee && employee.status === 'ACTIVE'

      if (!isActivated) {
        // Find or create pending activation request
        let req = await prisma.activationRequest.findFirst({
          where: { telegramId, status: { in: ['PENDING', 'CODE_GENERATED'] } }
        })

        if (!req) {
          req = await prisma.activationRequest.create({
            data: { telegramId, telegramName, telegramUsername, status: 'PENDING' }
          })
        }

        // Check if message is a 6-digit OTP code
        if (/^\d{6}$/.test(text)) {
          const matchedReq = await prisma.activationRequest.findFirst({
            where: { otpCode: text, status: 'CODE_GENERATED' },
            include: { employee: true }
          })

          if (matchedReq && matchedReq.employee) {
            await prisma.employee.update({
              where: { id: matchedReq.employee.id },
              data: { telegramId, status: 'ACTIVE' }
            })

            await prisma.activationRequest.update({
              where: { id: matchedReq.id },
              data: { status: 'ACTIVATED' }
            })

            await bot.sendMessage(
              chatId,
              `✅ **تم تفعيل حسابك بنجاح!**\nمرحباً بك يا ${matchedReq.employee.name}.\nيمكنك الآن استعراض رصيدك وتسجيل مصروفاتك بسهولة.`,
              { parse_mode: 'Markdown', ...mainKeyboard }
            )
            return
          } else {
            await bot.sendMessage(chatId, '❌ كود التفعيل غير صحيح أو انتهت صلاحيته. برجاء التأكد من المحاسب.')
            return
          }
        }

        await bot.sendMessage(
          chatId,
          `مرحباً بك يا **${telegramName}**!\n\n⚠️ **برجاء التواصل مع الحسابات للحصول على كود التفعيل.**\n📞 **الهاتف / الواتساب:** \`01030324187\``,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '📞 اتصل بالحسابات الآن', url: 'tel:+201030324187' },
                  { text: '💬 تواصل عبر الواتساب', url: 'https://wa.me/201030324187' }
                ]
              ]
            }
          }
        )
        return
      }

      let session = userSessions.get(telegramId) || { step: 'IDLE' }

      if (text.includes('إلغاء') || text === '/cancel') {
        userSessions.delete(telegramId)
        await bot.sendMessage(chatId, 'تم إلغاء العملية.', mainKeyboard)
        return
      }

      const isExplicitMenu = ['💰 رصيدي', '➕ إضافة مصروف', '📄 آخر العمليات', '☎️ تواصل مع الحسابات', 'إضافة مصروف', 'رصيدي'].some(m => text === m || text.includes(m))

      if (session.step === 'IDLE' || isExplicitMenu) {
        if (text.includes('رصيدي')) {
          userSessions.delete(telegramId)

          const deposits = await prisma.ledgerEntry.aggregate({
            where: { employeeId: employee.id, type: 'DEPOSIT' },
            _sum: { amount: true }
          })
          const expenses = await prisma.ledgerEntry.aggregate({
            where: { employeeId: employee.id, type: 'EXPENSE' },
            _sum: { amount: true }
          })

          const totalCustody = deposits._sum.amount || 0
          const totalExpenses = expenses._sum.amount || 0
          const balance = totalCustody - totalExpenses

          await bot.sendMessage(
            chatId,
            `📊 **بيان رصيدك الحالي:**\n\n` +
              `👤 **الموظف:** ${employee.name}\n` +
              `💼 **الوظيفة:** ${employee.jobTitle}\n` +
              `----------------------------------\n` +
              `📥 **إجمالي العهد:** ${totalCustody.toLocaleString('ar-EG')} ج.م\n` +
              `📤 **إجمالي المصروفات:** ${totalExpenses.toLocaleString('ar-EG')} ج.م\n` +
              `💰 **الرصيد المتبقي:** *${balance.toLocaleString('ar-EG')} ج.م*`,
            { parse_mode: 'Markdown', ...mainKeyboard }
          )
          return
        }

        if (text.includes('العمليات')) {
          userSessions.delete(telegramId)
          const recent = await prisma.ledgerEntry.findMany({
            where: { employeeId: employee.id },
            orderBy: { date: 'desc' },
            take: 5
          })

          if (recent.length === 0) {
            await bot.sendMessage(chatId, 'لا توجد حركات عهدة أو مصروفات مسجلة بعد.', mainKeyboard)
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

          await bot.sendMessage(chatId, report, { parse_mode: 'Markdown', ...mainKeyboard })
          return
        }

        if (text.includes('الحسابات')) {
          userSessions.delete(telegramId)
          const currentSettings = await prisma.settings.findFirst()
          await bot.sendMessage(
            chatId,
            `🏢 **${currentSettings?.companyName || 'شركة العهد المالية'}**\n\n` +
              `📞 **قسم الحسابات:** \`01030324187\`\n\n` +
              `لأي استفسار أو طلب تعزيز عهدة جديدة، يرجى الاتصال مباشرة أو التواصل عبر الواتساب.`,
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '📞 اتصل بالحسابات الآن', url: 'tel:+201030324187' },
                    { text: '💬 تواصل عبر الواتساب', url: 'https://wa.me/201030324187' }
                  ]
                ]
              }
            }
          )
          return
        }

        if (text.includes('مصروف')) {
          userSessions.set(telegramId, { step: 'AWAITING_AMOUNT' })
          await bot.sendMessage(chatId, '💳 **أدخل قيمة المصروف بالجنيه:**\n(مثال: 150)', {
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
            await bot.sendMessage(chatId, '❌ يرجى إدخال مبلغ صحيح (رقم أكبر من 0):\nمثال: 150')
            return
          }
          session.amount = num
          session.step = 'AWAITING_CATEGORY'
          userSessions.set(telegramId, session)

          await bot.sendMessage(chatId, `اختر **نوع المصروف** للمبلغ (${num} ج.م):`, {
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
          userSessions.set(telegramId, session)

          await bot.sendMessage(chatId, `📝 أدخل **وصف المصروف**:\n(مثال: بنزين للسيارة M-105)`, {
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
          userSessions.set(telegramId, session)

          await bot.sendMessage(chatId, `📎 **هل تريد إرفاق صورة فاتورة أو مستند PDF؟**`, {
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
            userSessions.set(telegramId, session)
            await bot.sendMessage(chatId, '📷 يرجى إرسال **صورة الفاتورة** أو **ملف PDF** الآن:', {
              reply_markup: {
                keyboard: [[{ text: 'إلغاء' }]],
                resize_keyboard: true
              }
            })
          } else {
            await finalizeExpense(bot, chatId, telegramId, employee, session)
          }
          break
        }

        case 'AWAITING_ATTACHMENT': {
          let fileId = null
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
              const fileStream = bot.getFileStream(fileId)
              const chunks = []
              for await (const chunk of fileStream) {
                chunks.push(chunk)
              }
              const buffer = Buffer.concat(chunks)

              session.attachments = session.attachments || []
              session.attachments.push({ fileName, buffer, fileType })

              await finalizeExpense(bot, chatId, telegramId, employee, session)
            } catch (err) {
              console.error('Failed to download file stream:', err)
              await bot.sendMessage(chatId, '⚠️ حدث خطأ أثناء تحميل الفاتورة، سيتم حفظ المصروف بدون صورة.')
              await finalizeExpense(bot, chatId, telegramId, employee, session)
            }
          } else {
            await bot.sendMessage(chatId, '❌ لم نتمكن من التعرف على الصورة/الملف. يرجى إرسال صورة أو ملف PDF أو اضغط إلغاء.')
          }
          break
        }

        default: {
          await bot.sendMessage(chatId, 'اختر من القائمة الرئيسية:', mainKeyboard)
          break
        }
      }
    } catch (err) {
      console.error("Telegram bot error:", err)
      try {
        await bot.sendMessage(msg.chat.id, '⚠️ حدث خطأ أثناء تنفيذ الطلب.', mainKeyboard)
      } catch (e) {}
    }
  })
}

async function finalizeExpense(bot, chatId, telegramId, employee, session) {
  try {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const countToday = await prisma.ledgerEntry.count({
      where: {
        operationNo: { startsWith: todayStr }
      }
    })
    const seq = (countToday + 1).toString().padStart(6, '0')
    const operationNo = `${todayStr}${seq}`

    const entry = await prisma.ledgerEntry.create({
      data: {
        operationNo,
        employeeId: employee.id,
        type: 'EXPENSE',
        amount: session.amount,
        category: session.category,
        description: session.description,
        createdBy: `${employee.name} (تليجرام)`
      }
    })

    if (session.attachments && session.attachments.length > 0) {
      const storageDir = path.join(process.env.APPDATA || process.cwd(), 'employee-custody-app', 'storage', 'receipts')
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true })
      }

      for (const att of session.attachments) {
        const fullPath = path.join(storageDir, att.fileName)
        fs.writeFileSync(fullPath, att.buffer)

        await prisma.ledgerAttachment.create({
          data: {
            ledgerEntryId: entry.id,
            fileName: att.fileName,
            filePath: `storage/receipts/${att.fileName}`,
            fileType: att.fileType,
            fileSize: att.buffer.length
          }
        })
      }
    }

    const deposits = await prisma.ledgerEntry.aggregate({
      where: { employeeId: employee.id, type: 'DEPOSIT' },
      _sum: { amount: true }
    })
    const expenses = await prisma.ledgerEntry.aggregate({
      where: { employeeId: employee.id, type: 'EXPENSE' },
      _sum: { amount: true }
    })

    const balance = (deposits._sum.amount || 0) - (expenses._sum.amount || 0)

    userSessions.delete(telegramId)

    await bot.sendMessage(
      chatId,
      `✅ **تم تسجيل المصروف بنجاح!**\n\n` +
        `🔢 **رقم العملية:** \`${entry.operationNo}\`\n` +
        `💰 **المبلغ:** ${entry.amount} ج.م\n` +
        `🏷️ **الفئة:** ${entry.category}\n` +
        `📝 **الوصف:** ${entry.description}\n` +
        (session.attachments && session.attachments.length > 0 ? `📎 **المرفقات:** ${session.attachments.length} ملف مرفق\n` : '') +
        `----------------------------------\n` +
        `💵 **رصيدك الحالي:** *${balance.toLocaleString('ar-EG')} ج.م*`,
      { parse_mode: 'Markdown', ...mainKeyboard }
    )
  } catch (err) {
    console.error('Error finalizing expense:', err)
    userSessions.delete(telegramId)
    await bot.sendMessage(chatId, '❌ حدث خطأ أثناء حفظ العملية. يرجى المحاولة مرة أخرى.', mainKeyboard)
  }
}

startBot().catch(console.error)

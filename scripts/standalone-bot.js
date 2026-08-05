// Standalone Cloud Telegram Bot Worker for Railway / Render (Runs 24/7)
const { PrismaClient } = require('@prisma/client')
const TelegramBot = require('node-telegram-bot-api')

const supabaseUrl = process.env.DATABASE_URL || "postgresql://postgres.rhvzptjnvzthormqxnkc:01150823229Ad@aws-1-eu-west-2.pooler.supabase.com:5432/postgres"

console.log("🚀 Starting Standalone Cloud Telegram Bot 24/7 Service...")

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

  bot.on('polling_error', (err) => console.warn('Polling warning:', err.message))

  bot.on('message', async (msg) => {
    try {
      const chatId = msg.chat.id
      const telegramId = chatId.toString()
      const text = msg.text ? msg.text.trim() : ''
      const telegramName = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ') || 'موظف'
      const telegramUsername = msg.from?.username

      const existingEmployee = await prisma.employee.findUnique({
        where: { telegramId }
      })

      if (!existingEmployee) {
        if (/^\d{6}$/.test(text)) {
          const req = await prisma.activationRequest.findFirst({
            where: { otpCode: text, status: 'CODE_GENERATED' },
            include: { employee: true }
          })

          if (!req || !req.employeeId) {
            await bot.sendMessage(chatId, '❌ كود التفعيل غير صحيح أو انتهت صلاحيته.')
            return
          }

          const updatedEmployee = await prisma.employee.update({
            where: { id: req.employeeId },
            data: { telegramId, status: 'ACTIVE' }
          })

          await prisma.activationRequest.update({
            where: { id: req.id },
            data: { status: 'ACTIVATED', otpCode: null }
          })

          await bot.sendMessage(
            chatId,
            `✅ **تم تفعيل حسابك بنجاح!**\nمرحباً بك يا ${updatedEmployee.name}.\nيمكنك الآن استعراض رصيدك وتسجيل مصروفاتك بسهولة.`,
            { parse_mode: 'Markdown', ...mainKeyboard }
          )
          return
        }

        let pendingReq = await prisma.activationRequest.findFirst({
          where: { telegramId, status: { in: ['PENDING', 'CODE_GENERATED'] } }
        })

        if (!pendingReq) {
          await prisma.activationRequest.create({
            data: { telegramId, telegramName, telegramUsername, status: 'PENDING' }
          })
        }

        await bot.sendMessage(
          chatId,
          `مرحباً بك يا **${telegramName}**!\n\n⚠️ **برجاء التواصل مع الحسابات للحصول على كود التفعيل.**\n📞 **الهاتف:** \`+20 10 30324187\``,
          { parse_mode: 'Markdown' }
        )
        return
      }

      const employee = existingEmployee
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
          const entries = await prisma.ledgerEntry.findMany({ where: { employeeId: employee.id } })
          let custody = 0, expenses = 0
          for (const e of entries) {
            if (e.type === 'DEPOSIT' || e.type === 'OPENING_BALANCE') custody += e.amount
            else if (e.type === 'EXPENSE') expenses += e.amount
          }
          const balance = custody - expenses

          await bot.sendMessage(
            chatId,
            `📊 **بيان رصيدك الحالي:**\n\n` +
              `👤 **الموظف:** ${employee.name}\n` +
              `💼 **الوظيفة:** ${employee.jobTitle}\n` +
              `----------------------------------\n` +
              `📥 **إجمالي العهد:** ${custody.toLocaleString('ar-EG')} ج.م\n` +
              `📤 **إجمالي المصروفات:** ${expenses.toLocaleString('ar-EG')} ج.م\n` +
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
              `📞 **قسم الحسابات:** \`+20 10 30324187\`\n\n` +
              `لأي استفسار أو طلب تعزيز عهدة جديدة، يرجى التواصل مباشرة مع الرقم أعلاه.`,
            { parse_mode: 'Markdown', ...mainKeyboard }
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

          const entry = await prisma.ledgerEntry.create({
            data: {
              operationNo,
              employeeId: employee.id,
              type: 'EXPENSE',
              amount: session.amount,
              category: session.category,
              description: text,
              createdBy: `${employee.name} (تليجرام السحابي)`
            }
          })

          userSessions.delete(telegramId)

          const entries = await prisma.ledgerEntry.findMany({ where: { employeeId: employee.id } })
          let custody = 0, expenses = 0
          for (const e of entries) {
            if (e.type === 'DEPOSIT' || e.type === 'OPENING_BALANCE') custody += e.amount
            else if (e.type === 'EXPENSE') expenses += e.amount
          }
          const balance = custody - expenses

          await bot.sendMessage(
            chatId,
            `✅ **تم تسجيل المصروف بنجاح!**\n\n` +
              `🔢 **رقم العملية:** \`${entry.operationNo}\`\n` +
              `💰 **المبلغ:** ${entry.amount} ج.م\n` +
              `🏷️ **الفئة:** ${entry.category}\n` +
              `📝 **الوصف:** ${entry.description}\n` +
              `----------------------------------\n` +
              `💵 **رصيدك الحالي:** *${balance.toLocaleString('ar-EG')} ج.م*`,
            { parse_mode: 'Markdown', ...mainKeyboard }
          )
          break
        }

        default: {
          await bot.sendMessage(chatId, 'اختر من القائمة الرئيسية:', mainKeyboard)
          break
        }
      }
    } catch (err) {
      console.error('Standalone Bot Message Error:', err)
    }
  })
}

startBot()

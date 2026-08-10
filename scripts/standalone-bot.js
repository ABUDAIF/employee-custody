// Standalone Cloud Telegram Bot Worker for Railway / Render (v2.1.0 Active 2026-08-10)
const { PrismaClient } = require('@prisma/client')
const TelegramBot = require('node-telegram-bot-api')
const path = require('path')
const fs = require('fs')

const supabaseUrl = process.env.DATABASE_URL || "postgresql://postgres.rhvzptjnvzthormqxnkc:01150823229Ad@aws-1-eu-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true"

console.log("🚀 Starting Standalone Cloud Telegram Bot Worker v2.1.0 (Refund Requests Active)...")

const prisma = new PrismaClient({
  datasources: { db: { url: supabaseUrl } }
})

const mainKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '💰 رصيدي' }, { text: '➕ إضافة مصروف' }],
      [{ text: '📄 آخر العمليات' }, { text: '🔄 طلب استرداد' }],
      [{ text: '☎️ تواصل مع الحسابات' }]
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

      // Global Test / Version command
      if (text === '/test' || text === '/version') {
        await bot.sendMessage(chatId, `✅ **البوت يعمل بـ التحديث الجديد v2.1.0 بنجاح!**\n📞 **رقم المحاسب:** \`01030324187\``, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '💬 تواصل عبر الواتساب', url: 'https://wa.me/201030324187' }
              ]
            ]
          }
        })
        return
      }

      // Global Contact Accountant button
      if (text.includes('الحسابات') || text === '/contact') {
        userSessions.delete(telegramId)
        const currentSettings = await prisma.settings.findFirst()
        await bot.sendMessage(
          chatId,
          `🏢 **${currentSettings?.companyName || 'شركة العهد المالية'}**\n\n` +
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

      // Check employee activation status
      let employee = await prisma.employee.findUnique({ where: { telegramId } })
      let isActivated = employee && employee.status === 'ACTIVE'

      if (!isActivated) {
        if (text === '/start' || text.includes('تفعيل') || text.includes('كود')) {
          let req = await prisma.activationRequest.findFirst({
            where: { telegramId, status: { in: ['PENDING', 'CODE_GENERATED'] } }
          })

          if (!req) {
            req = await prisma.activationRequest.create({
              data: {
                telegramId,
                telegramName,
                telegramUsername,
                status: 'PENDING'
              }
            })
          }

          if (req.otpCode && req.status === 'CODE_GENERATED') {
            await bot.sendMessage(
              chatId,
              `🔑 **كود التفعيل الخاص بك:** \`${req.otpCode}\`\n\n` +
                `يرجى تسليم هذا الكود للمحاسب لتفعيل حسابك وإتاحة الوصول للخدمات التفاعلية.`,
              { parse_mode: 'Markdown' }
            )
          } else {
            await bot.sendMessage(
              chatId,
              `⏳ **تم تسجيل طلب تفعيل حسابك بنجاح!**\n\n` +
                `طلبك قيد المراجعة لدى المحاسب. بمجرد إصدار كود التفعيل، قم بإدخاله هنا لتنشيط الخدمة.`,
              { parse_mode: 'Markdown' }
            )
          }
          return
        }

        // Try OTP activation if text looks like numeric OTP
        if (text && /^\d{4,8}$/.test(text)) {
          const matchedReq = await prisma.activationRequest.findFirst({
            where: { otpCode: text, status: 'CODE_GENERATED' },
            include: { employee: true }
          })

          if (matchedReq && matchedReq.employee) {
            await prisma.employee.update({
              where: { id: matchedReq.employee.id },
              data: { status: 'ACTIVE', telegramId }
            })

            await prisma.activationRequest.update({
              where: { id: matchedReq.id },
              data: { status: 'ACTIVATED' }
            })

            await bot.sendMessage(
              chatId,
              `🎉 **مبروك ${matchedReq.employee.name}! تم تفعيل حسابك بنجاح.**\n\n` +
                `يمكنك الآن استخدام البوت لتسجيل المصروفات، تقديم طلبات الاسترداد، والاستعلام عن رصيدك 24/7.`,
              mainKeyboard
            )
            return
          }
        }

        await bot.sendMessage(
          chatId,
          `⚠️ **حسابك غير مفعّل حالياً.**\n\n` +
            `أرسل كلمة /start لتسجيل طلب التفعيل أو أرسل كود التفعيل المكون من أرقام المسلّم لك من المحاسب.`,
          { parse_mode: 'Markdown' }
        )
        return
      }

      // Check current active wizard step
      const session = userSessions.get(telegramId)

      // Handle Cancel / Cancel button
      if (text === 'إلغاء' || text === '/cancel') {
        userSessions.delete(telegramId)
        await bot.sendMessage(chatId, '❌ تم إلغاء العملية الحالية.', mainKeyboard)
        return
      }

      // Handle Balance Query
      if (text.includes('رصيدي') || text === '/balance') {
        userSessions.delete(telegramId)
        const deposits = await prisma.ledgerEntry.aggregate({
          where: { employeeId: employee.id, OR: [{ type: 'DEPOSIT' }, { type: 'OPENING_BALANCE' }] },
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
          `📊 **تقرير رصيدك الحالي:**\n\n` +
            `👤 **الموظف:** ${employee.name}\n` +
            `📥 **إجمالي العهد:** ${totalCustody.toLocaleString('ar-EG')} ج.م\n` +
            `📤 **إجمالي المصروفات:** ${totalExpenses.toLocaleString('ar-EG')} ج.م\n` +
            `----------------------------------\n` +
            `💰 **الرصيد المتبقي:** *${balance.toLocaleString('ar-EG')} ج.م*`,
          { parse_mode: 'Markdown', ...mainKeyboard }
        )
        return
      }

      // Handle Recent Transactions Query
      if (text.includes('آخر العمليات') || text === '/history') {
        userSessions.delete(telegramId)
        const recent = await prisma.ledgerEntry.findMany({
          where: { employeeId: employee.id },
          take: 5,
          orderBy: { date: 'desc' }
        })

        if (recent.length === 0) {
          await bot.sendMessage(chatId, 'ℹ️ لا توجد عمليات مسجلة بحسابك حتى الآن.', mainKeyboard)
          return
        }

        let historyMsg = `📄 **آخر 5 عمليات مسجلة بحسابك:**\n\n`
        recent.forEach((item) => {
          const typeSymbol = item.type === 'EXPENSE' ? '🔻' : '🟢'
          const typeName = item.type === 'EXPENSE' ? 'مصروف' : 'إيداع'
          historyMsg += `${typeSymbol} **${typeName}** | \`${item.operationNo}\`\n`
          historyMsg += `💰 **المبلغ:** ${item.amount.toLocaleString('ar-EG')} ج.م\n`
          historyMsg += `📝 **البيان:** ${item.description}\n`
          historyMsg += `----------------------------------\n`
        })

        await bot.sendMessage(chatId, historyMsg, { parse_mode: 'Markdown', ...mainKeyboard })
        return
      }

      // Handle Refund Request Wizard Trigger
      if (text.includes('طلب استرداد') || text === '/refund') {
        userSessions.set(telegramId, { step: 'AWAITING_REFUND_OP_NO' })
        await bot.sendMessage(
          chatId,
          `🔄 **تقديم طلب استرداد / إلغاء قيد خاطئ**\n\n` +
            `يرجى إدخال **رقم العملية** المراد طلب استرداد قيمتها (مثال: \`20260810000001\`):\n\n` +
            `💡 يمكنك العثور على رقم العملية من قائمة "📄 آخر العمليات".`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              keyboard: [[{ text: 'إلغاء' }]],
              resize_keyboard: true
            }
          }
        )
        return
      }

      // Handle Awaiting Refund Operation Number Step
      if (session && session.step === 'AWAITING_REFUND_OP_NO') {
        const entry = await prisma.ledgerEntry.findUnique({
          where: { operationNo: text },
          include: { employee: true }
        })

        if (!entry) {
          await bot.sendMessage(
            chatId,
            `⚠️ **رقم العملية غير صحيح!**\n\n` +
              `لم نتمكن من العثور على عملية برقم (\`${text}\`). يرجى التأكد وإعادة إدخال الرقم الصحيح أو إرسال "إلغاء":`,
            { parse_mode: 'Markdown' }
          )
          return
        }

        if (entry.employeeId !== employee.id) {
          await bot.sendMessage(
            chatId,
            `⚠️ **عذراً!** هذه العملية لا تخص حسابك الشخصي.\nيرجى إدخال رقم عملية مسجلة باسمك:`,
            { parse_mode: 'Markdown' }
          )
          return
        }

        if (entry.type !== 'EXPENSE') {
          await bot.sendMessage(
            chatId,
            `⚠️ **عذراً!** طلبات الاسترداد تنطبق على حركات المصروفات فقط وليس الإيداعات.`,
            { parse_mode: 'Markdown' }
          )
          return
        }

        // Save entry info and ask for reason
        userSessions.set(telegramId, {
          step: 'AWAITING_REFUND_REASON',
          ledgerEntry: entry
        })

        await bot.sendMessage(
          chatId,
          `✅ **تم العثور على العملية:**\n\n` +
            `🔢 **رقم العملية:** \`${entry.operationNo}\`\n` +
            `💰 **مبلغ المصروف:** ${entry.amount.toLocaleString('ar-EG')} ج.م\n` +
            `📝 **البيان الأصلي:** ${entry.description}\n\n` +
            `✏️ **الان أكتب سبب طلب الاسترداد** (مثال: تم إدخال المبلغ بالخطأ بدل 150 كتبت 1500):`,
          { parse_mode: 'Markdown' }
        )
        return
      }

      // Handle Awaiting Refund Reason Step
      if (session && session.step === 'AWAITING_REFUND_REASON') {
        const entry = session.ledgerEntry
        const reason = text

        const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
        const countToday = await prisma.refundRequest.count({
          where: { requestNo: { startsWith: `REF${todayStr}` } }
        })
        const seq = (countToday + 1).toString().padStart(6, '0')
        const requestNo = `REF${todayStr}${seq}`

        await prisma.refundRequest.create({
          data: {
            requestNo,
            employeeId: employee.id,
            ledgerEntryId: entry.id,
            operationNo: entry.operationNo,
            amount: entry.amount,
            reason,
            status: 'PENDING'
          }
        })

        userSessions.delete(telegramId)

        await bot.sendMessage(
          chatId,
          `🎉 **تم إرسال طلب الاسترداد بنجاح!**\n\n` +
            `🔢 **رقم طلب الاسترداد:** \`${requestNo}\`\n` +
            `🔢 **رقم العملية:** \`${entry.operationNo}\`\n` +
            `💰 **المبلغ المطلوب إرجاعه:** ${entry.amount.toLocaleString('ar-EG')} ج.م\n` +
            `📝 **سببك:** ${reason}\n\n` +
            `⏳ **الحالة:** قيد المراجعة لدى المحاسب.\n` +
            `سيتم مراجعة العملية وإشعارك فوراً بالقرار وإعادة المبلغ لرصيدك.`,
          { parse_mode: 'Markdown', ...mainKeyboard }
        )
        return
      }

      // Handle Add Expense Trigger
      if (text.includes('إضافة مصروف') || text === '/expense') {
        userSessions.set(telegramId, { step: 'AWAITING_AMOUNT' })
        await bot.sendMessage(
          chatId,
          `➕ **تسجيل مصروف جديد**\n\n` +
            `يرجى إدخال **المبلغ بالجنيه المصري (ج.م)** (أرقام فقط، مثال: 150):`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              keyboard: [[{ text: 'إلغاء' }]],
              resize_keyboard: true
            }
          }
        )
        return
      }

      // Step: Awaiting Expense Amount
      if (session && session.step === 'AWAITING_AMOUNT') {
        const amount = parseFloat(text)
        if (isNaN(amount) || amount <= 0) {
          await bot.sendMessage(chatId, '⚠️ يرجى إدخال مبلغ صحيح بالأرقام (أكبر من 0):')
          return
        }

        userSessions.set(telegramId, { step: 'AWAITING_CATEGORY', amount })
        await bot.sendMessage(
          chatId,
          `💰 المبلغ: **${amount.toLocaleString('ar-EG')} ج.م**\n\n` +
            `اختر أو اكتب **فئة المصروف** (مثال: وقود، صيانة، ضيافة، انتقال، نثرية):`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              keyboard: [
                [{ text: 'وقود' }, { text: 'صيانة' }],
                [{ text: 'ضيافة' }, { text: 'انتقالات' }],
                [{ text: 'نثريات' }, { text: 'إلغاء' }]
              ],
              resize_keyboard: true
            }
          }
        )
        return
      }

      // Step: Awaiting Expense Category
      if (session && session.step === 'AWAITING_CATEGORY') {
        userSessions.set(telegramId, {
          ...session,
          step: 'AWAITING_DESCRIPTION',
          category: text
        })

        await bot.sendMessage(
          chatId,
          `📌 الفئة: **${text}**\n\n` + `يرجى إدخال **الوصف والبيان** التفصيلي للمصروف:`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              keyboard: [[{ text: 'إلغاء' }]],
              resize_keyboard: true
            }
          }
        )
        return
      }

      // Step: Awaiting Expense Description
      if (session && session.step === 'AWAITING_DESCRIPTION') {
        userSessions.set(telegramId, {
          ...session,
          step: 'AWAITING_ATTACHMENT',
          description: text,
          attachments: []
        })

        await bot.sendMessage(
          chatId,
          `📝 البيان: **${text}**\n\n` +
            `📸 **يمكنك الآن إرسال صورة الفاتورة / لقطة الشاشة / مستند PDF**\n` +
            `أو اضغط على زر **"إنهاء بدون مرفق"** للحفظ الفوري.`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              keyboard: [[{ text: '✅ إنهاء وحفظ المصروف' }, { text: 'إلغاء' }]],
              resize_keyboard: true
            }
          }
        )
        return
      }

      // Step: Awaiting Attachment / Finalize
      if (session && session.step === 'AWAITING_ATTACHMENT') {
        if (text === '✅ إنهاء وحفظ المصروف' || text.includes('إنهاء')) {
          await finalizeExpense(bot, chatId, telegramId, employee, session)
          userSessions.delete(telegramId)
          return
        }

        let fileId = null
        let fileName = 'photo_receipt.jpg'
        let fileType = 'image/jpeg'

        if (msg.photo && msg.photo.length > 0) {
          const largestPhoto = msg.photo[msg.photo.length - 1]
          fileId = largestPhoto.file_id
          fileName = `receipt_${Date.now()}.jpg`
          fileType = 'image/jpeg'
        } else if (msg.document) {
          fileId = msg.document.file_id
          fileName = msg.document.file_name || `document_${Date.now()}.pdf`
          fileType = msg.document.mime_type || 'application/pdf'
        }

        if (fileId) {
          await bot.sendMessage(chatId, '⏳ جاري رفع المرفق والتشفير السحابي المباشر...')
          const fileLink = await bot.getFileLink(fileId)
          const fetchRes = await fetch(fileLink)
          const arrayBuffer = await fetchRes.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)

          session.attachments.push({
            fileName,
            fileType,
            buffer
          })

          await bot.sendMessage(
            chatId,
            `📎 **تم إضافة المرفق بنجاح!** (${session.attachments.length} مرفق)\n\n` +
              `يمكنك إرسال المزيد من المرفقات والصور، أو اضغط **"✅ إنهاء وحفظ المصروف"**.`,
            {
              parse_mode: 'Markdown',
              reply_markup: {
                keyboard: [[{ text: '✅ إنهاء وحفظ المصروف' }, { text: 'إلغاء' }]],
                resize_keyboard: true
              }
            }
          )
          return
        }

        await bot.sendMessage(
          chatId,
          '⚠️ أرسل صورة الفاتورة أو ملف PDF، أو اضغط على زر "✅ إنهاء وحفظ المصروف".'
        )
        return
      }

      // Default Help Message
      userSessions.delete(telegramId)
      await bot.sendMessage(
        chatId,
        `👋 **أهلاً بك ${employee.name}!**\n\n` +
          `اختر إحدى الخدمات التفاعلية المتاحة من القائمة بالأسفل:`,
        mainKeyboard
      )
    } catch (err) {
      console.error('Bot Message Handler Error:', err)
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
      for (const att of session.attachments) {
        const base64Data = att.buffer.toString('base64')
        const dataUri = `data:${att.fileType};base64,${base64Data}`

        await prisma.ledgerAttachment.create({
          data: {
            ledgerEntryId: entry.id,
            fileName: att.fileName,
            filePath: dataUri,
            fileType: att.fileType,
            fileSize: att.buffer.length
          }
        })
      }
    }

    const deposits = await prisma.ledgerEntry.aggregate({
      where: { employeeId: employee.id, OR: [{ type: 'DEPOSIT' }, { type: 'OPENING_BALANCE' }] },
      _sum: { amount: true }
    })
    const expenses = await prisma.ledgerEntry.aggregate({
      where: { employeeId: employee.id, type: 'EXPENSE' },
      _sum: { amount: true }
    })

    const totalCustody = deposits._sum.amount || 0
    const totalExpenses = expenses._sum.amount || 0
    const remainingBalance = totalCustody - totalExpenses

    await bot.sendMessage(
      chatId,
      `✅ **تم تسجيل المصروف بنجاح!**\n\n` +
        `🔢 **رقم العملية:** \`${entry.operationNo}\`\n` +
        `💰 **المبلغ:** ${entry.amount.toLocaleString('ar-EG')} ج.م\n` +
        `📌 **الفئة:** ${entry.category}\n` +
        `📝 **البيان:** ${entry.description}\n` +
        `📎 **عدد المرفقات:** ${session.attachments ? session.attachments.length : 0}\n` +
        `----------------------------------\n` +
        `💵 **رصيدك المتبقي المحدث:** *${remainingBalance.toLocaleString('ar-EG')} ج.م*`,
      { parse_mode: 'Markdown', ...mainKeyboard }
    )
  } catch (err) {
    console.error('Finalize Expense Error:', err)
    await bot.sendMessage(chatId, '❌ فشل حفظ المصروف. يرجى المحاولة لاحقاً.', mainKeyboard)
  }
}

startBot()

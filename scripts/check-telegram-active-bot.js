const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.rhvzptjnvzthormqxnkc:01150823229Ad@aws-1-eu-west-2.pooler.supabase.com:5432/postgres'
    }
  }
})

async function check() {
  const s = await prisma.settings.findFirst()
  const token = s?.telegramBotToken
  console.log('Bot Token in Supabase DB:', token)

  if (token) {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`)
    const data = await res.json()
    console.log('Telegram Bot Identity from API:', data)

    const webhookRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`)
    const webhookData = await webhookRes.json()
    console.log('Telegram Bot Webhook Status:', webhookData)
  }
  await prisma.$disconnect()
}

check().catch(console.error)

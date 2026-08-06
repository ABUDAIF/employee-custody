const TelegramBot = require('node-telegram-bot-api')
const token = '8301534883:AAF0hdkdF6aUeXIq-ZhuQFu5VGsBEw0ls54'

console.log('🔍 Running Telegram Diagnostic to locate the active old process...')

const bot = new TelegramBot(token, { polling: true })

bot.on('polling_error', (err) => {
  console.log('--------------------------------------------------')
  console.log('💥 CONFLICT DETECTED!')
  console.log('Telegram API Error Message:', err.message)
  console.log('Error Code:', err.code)
  console.log('--------------------------------------------------')
})

setTimeout(() => {
  bot.stopPolling()
  process.exit(0)
}, 8000)

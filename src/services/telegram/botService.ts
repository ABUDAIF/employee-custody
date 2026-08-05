import TelegramBot from 'node-telegram-bot-api'
import { settingsRepository } from '../repositories/SettingsRepository'
import { eventBus } from '../../main/eventBus'

export class TelegramBotService {
  private bot: TelegramBot | null = null

  public async initBot(token?: string) {
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
      // Desktop app uses polling: false so 24/7 Cloud Worker on Railway has 100% exclusive polling control!
      this.bot = new TelegramBot(activeToken, { polling: false })

      console.log(`🤖 Telegram Bot Validated & Connected for Notifications: @${botInfo.username}`)
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
    if (!this.bot) return { connected: false }
    try {
      const me = await this.bot.getMe()
      return { connected: true, botInfo: me }
    } catch {
      return { connected: false }
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

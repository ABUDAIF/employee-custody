import { EventEmitter } from 'events'
import { BrowserWindow, Notification } from 'electron'

class SystemEventBus extends EventEmitter {
  private mainWindow: BrowserWindow | null = null

  public setMainWindow(win: BrowserWindow) {
    this.mainWindow = win
  }

  public showWindowsNotification(title: string, body: string) {
    try {
      if (Notification.isSupported()) {
        const notif = new Notification({
          title,
          body,
          silent: false
        })

        notif.on('click', () => {
          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            if (this.mainWindow.isMinimized()) this.mainWindow.restore()
            this.mainWindow.show()
            this.mainWindow.focus()
          }
        })

        notif.show()
      }
    } catch (err) {
      console.warn('Native notification warning:', err)
    }
  }

  public broadcast(channel: string, payload?: any) {
    // 1. Internal Event Bus emit
    this.emit(channel, payload)

    // 2. Broadcast via IPC to Renderer Process
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, payload)
    }

    // 3. Trigger Native Windows Toast Desktop Notifications (WhatsApp style)
    if (channel === 'activation:new_request') {
      const name = payload?.telegramName || 'موظف جديد'
      this.showWindowsNotification('🔑 طلب تفعيل حساب جديد', `قام ${name} بتسجيل طلب تفعيل جديد عبر التليجرام.`)
    } else if (channel === 'refund:new_request') {
      const name = payload?.employee?.name || 'موظف'
      const amount = payload?.amount ? `${payload.amount.toLocaleString('ar-EG')} ج.م` : ''
      this.showWindowsNotification('🔄 طلب استرداد مصروف جديد', `قدم ${name} طلب استرداد قيد بقيمة ${amount}.`)
    } else if (channel === 'activity:new') {
      if (payload?.type === 'EXPENSE') {
        this.showWindowsNotification(payload.title || '🔻 مصروف جديد', payload.description || 'تم تسجيل مصروف جديد.')
      }
    }
  }
}

export const eventBus = new SystemEventBus()

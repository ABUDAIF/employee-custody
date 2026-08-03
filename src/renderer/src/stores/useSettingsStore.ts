import { create } from 'zustand'

interface SettingsStore {
  settings: any | null
  botStatus: any | null
  loading: boolean
  fetchSettings: () => Promise<void>
  fetchBotStatus: () => Promise<void>
  updateSettings: (data: any) => Promise<void>
  connectBot: (token: string) => Promise<void>
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: null,
  botStatus: null,
  loading: false,

  fetchSettings: async () => {
    try {
      const data = await window.electronAPI.getSettings()
      set({ settings: data })
    } catch (err) {
      console.error('Failed to fetch settings:', err)
    }
  },

  fetchBotStatus: async () => {
    try {
      const status = await window.electronAPI.getBotStatus()
      set({ botStatus: status })
    } catch (err) {
      console.error('Failed to fetch bot status:', err)
    }
  },

  updateSettings: async (data: any) => {
    set({ loading: true })
    try {
      const updated = await window.electronAPI.updateSettings(data)
      set({ settings: updated })
    } catch (err) {
      console.error('Failed to update settings:', err)
    } finally {
      set({ loading: false })
    }
  },

  connectBot: async (token: string) => {
    set({ loading: true })
    try {
      const status = await window.electronAPI.connectBot(token)
      set({ botStatus: status })
    } catch (err: any) {
      console.error('Failed to connect bot:', err)
      set({ botStatus: { connected: false, message: err.message || 'تعذر الاتصال' } })
    } finally {
      set({ loading: false })
      await get().fetchSettings()
    }
  }
}))

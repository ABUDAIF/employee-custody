import { create } from 'zustand'

interface ActivationStore {
  pendingRequests: any[]
  loading: boolean
  generatedOtp: string | null
  fetchPending: () => Promise<void>
  generateOtp: (requestId: string, employeeId: string) => Promise<string>
  clearOtp: () => void
}

export const useActivationStore = create<ActivationStore>((set, get) => ({
  pendingRequests: [],
  loading: false,
  generatedOtp: null,

  fetchPending: async () => {
    set({ loading: true })
    try {
      const data = await window.electronAPI.getPendingActivations()
      set({ pendingRequests: data, loading: false })
    } catch (err) {
      console.error('Failed to fetch pending activation requests:', err)
      set({ loading: false })
    }
  },

  generateOtp: async (requestId: string, employeeId: string) => {
    const code = await window.electronAPI.generateOtpCode(requestId, employeeId)
    set({ generatedOtp: code })
    await get().fetchPending()
    return code
  },

  clearOtp: () => set({ generatedOtp: null })
}))

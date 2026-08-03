import { create } from 'zustand'

interface LedgerStore {
  metrics: any
  entries: any[]
  totalEntries: number
  page: number
  totalPages: number
  loading: boolean
  timeline: any[]
  fetchMetrics: () => Promise<void>
  fetchEntries: (options?: any) => Promise<void>
  fetchTimeline: (employeeId: string) => Promise<void>
  createDeposit: (data: any) => Promise<void>
}

export const useLedgerStore = create<LedgerStore>((set, get) => ({
  metrics: null,
  entries: [],
  totalEntries: 0,
  page: 1,
  totalPages: 1,
  loading: false,
  timeline: [],

  fetchMetrics: async () => {
    try {
      const data = await window.electronAPI.getDashboardMetrics()
      set({ metrics: data })
    } catch (err) {
      console.error('Failed to fetch dashboard metrics:', err)
    }
  },

  fetchEntries: async (options?: any) => {
    set({ loading: true })
    try {
      const res = await window.electronAPI.getLedgerEntries(options)
      set({
        entries: res.items,
        totalEntries: res.total,
        page: res.page,
        totalPages: res.totalPages,
        loading: false
      })
    } catch (err) {
      console.error('Failed to fetch ledger entries:', err)
      set({ loading: false })
    }
  },

  fetchTimeline: async (employeeId: string) => {
    set({ loading: true })
    try {
      const data = await window.electronAPI.getEmployeeTimeline(employeeId)
      set({ timeline: data, loading: false })
    } catch (err) {
      console.error('Failed to fetch employee timeline:', err)
      set({ loading: false })
    }
  },

  createDeposit: async (data: any) => {
    await window.electronAPI.createDeposit(data)
    await get().fetchMetrics()
    await get().fetchEntries()
  }
}))

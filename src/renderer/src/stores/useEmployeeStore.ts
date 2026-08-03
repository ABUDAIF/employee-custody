import { create } from 'zustand'

interface EmployeeStore {
  employees: any[]
  loading: boolean
  selectedEmployee: any | null
  fetchEmployees: () => Promise<void>
  fetchEmployeeById: (id: string) => Promise<void>
  createEmployee: (data: any) => Promise<void>
}

export const useEmployeeStore = create<EmployeeStore>((set, get) => ({
  employees: [],
  loading: false,
  selectedEmployee: null,

  fetchEmployees: async () => {
    set({ loading: true })
    try {
      const data = await window.electronAPI.getEmployees()
      set({ employees: data, loading: false })
    } catch (err) {
      console.error('Failed to fetch employees:', err)
      set({ loading: false })
    }
  },

  fetchEmployeeById: async (id: string) => {
    set({ loading: true })
    try {
      const data = await window.electronAPI.getEmployeeById(id)
      set({ selectedEmployee: data, loading: false })
    } catch (err) {
      console.error('Failed to fetch employee details:', err)
      set({ loading: false })
    }
  },

  createEmployee: async (data: any) => {
    await window.electronAPI.createEmployee(data)
    await get().fetchEmployees()
  }
}))

import { contextBridge, ipcRenderer } from 'electron'

const electronAPI = {
  // Employee IPCs
  getEmployees: () => ipcRenderer.invoke('employee:getAll'),
  getEmployeeById: (id: string) => ipcRenderer.invoke('employee:getById', id),
  createEmployee: (data: any) => ipcRenderer.invoke('employee:create', data),
  updateEmployee: (id: string, data: any) => ipcRenderer.invoke('employee:update', id, data),
  deleteEmployee: (id: string) => ipcRenderer.invoke('employee:delete', id),

  // Ledger IPCs
  getLedgerEntries: (options?: any) => ipcRenderer.invoke('ledger:getAll', options),
  getEmployeeTimeline: (employeeId: string) => ipcRenderer.invoke('ledger:getEmployeeTimeline', employeeId),
  createDeposit: (data: any) => ipcRenderer.invoke('ledger:createDeposit', data),
  createExpense: (data: any) => ipcRenderer.invoke('ledger:createExpense', data),
  getDashboardMetrics: () => ipcRenderer.invoke('ledger:getDashboardMetrics'),
  globalSearch: (query: string) => ipcRenderer.invoke('ledger:globalSearch', query),

  // Activation Requests IPCs
  getPendingActivations: () => ipcRenderer.invoke('activation:getPending'),
  generateOtpCode: (requestId: string, employeeId: string) => ipcRenderer.invoke('activation:generateOtp', requestId, employeeId),

  // Reports, Settlement & Month Close IPCs
  exportExcelReport: (options: any) => ipcRenderer.invoke('report:exportExcel', options),
  exportMasterExcelReport: (options: any) => ipcRenderer.invoke('report:exportMasterExcel', options),
  showSaveDialog: (options: any) => ipcRenderer.invoke('dialog:showSaveDialog', options),
  liquidateEmployee: (data: any) => ipcRenderer.invoke('settlement:liquidate', data),
  getClosedMonths: () => ipcRenderer.invoke('month:getClosed'),
  closeMonth: (monthKey: string) => ipcRenderer.invoke('month:close', monthKey),
  regenerateMonthReport: (monthKey: string) => ipcRenderer.invoke('month:regenerate', monthKey),

  // Settings & Bot IPCs
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (data: any) => ipcRenderer.invoke('settings:update', data),
  getBotStatus: () => ipcRenderer.invoke('bot:getStatus'),
  connectBot: (token: string) => ipcRenderer.invoke('bot:connect', token),

  // Backup IPCs
  createBackup: () => ipcRenderer.invoke('backup:create'),
  getBackupList: () => ipcRenderer.invoke('backup:getList'),
  restoreBackup: (fileName: string) => ipcRenderer.invoke('backup:restore', fileName),

  // File Shell IPCs
  openPath: (path: string, fileName?: string) => ipcRenderer.invoke('shell:openPath', path, fileName),

  // Event Listeners (Event Bus to React UI)
  on: (channel: string, callback: (...args: any[]) => void) => {
    const subscription = (_event: any, ...args: any[]) => callback(...args)
    ipcRenderer.on(channel, subscription)
    return () => ipcRenderer.removeListener(channel, subscription)
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
export type ElectronAPI = typeof electronAPI

import React from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/layout/Sidebar'

import { DashboardPage } from './pages/Dashboard/DashboardPage'
import { EmployeesPage } from './pages/Employees/EmployeesPage'
import { EmployeeProfilePage } from './pages/EmployeeProfile/EmployeeProfilePage'
import { ActivationRequestsPage } from './pages/ActivationRequests/ActivationRequestsPage'
import { RefundRequestsPage } from './pages/RefundRequests/RefundRequestsPage'
import { LedgerPage } from './pages/Ledger/LedgerPage'
import { ReportsPage } from './pages/Reports/ReportsPage'
import { MonthClosePage } from './pages/MonthClose/MonthClosePage'
import { SettingsPage } from './pages/Settings/SettingsPage'
import { UpdateNotificationModal } from './components/common/UpdateNotificationModal'

import './styles/tokens.css'
import './styles/components.css'

export const App: React.FC = () => {
  return (
    <Router>
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/employees/:id" element={<EmployeeProfilePage />} />
            <Route path="/activations" element={<ActivationRequestsPage />} />
            <Route path="/refunds" element={<RefundRequestsPage />} />
            <Route path="/ledger" element={<LedgerPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/month-close" element={<MonthClosePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
        <UpdateNotificationModal />
      </div>
    </Router>
  )
}

export default App

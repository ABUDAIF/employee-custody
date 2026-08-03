import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  FaWallet,
  FaArrowDown,
  FaUsers,
  FaCalendarDay,
  FaCalendarAlt,
  FaPlusCircle,
  FaSearch
} from 'react-icons/fa'
import { useLedgerStore } from '../../stores/useLedgerStore'
import { useEmployeeStore } from '../../stores/useEmployeeStore'
import { DepositModal } from '../../components/common/DepositModal'
import { GlobalSearchModal } from '../../components/common/GlobalSearchModal'
import { CustodyBreakdownModal } from '../../components/dashboard/CustodyBreakdownModal'
import { ExpensesBreakdownModal } from '../../components/dashboard/ExpensesBreakdownModal'
import { RemainingBalanceModal } from '../../components/dashboard/RemainingBalanceModal'
import { CopyableOpNo } from '../../components/common/CopyableOpNo'
import { useNavigate } from 'react-router-dom'

export const DashboardPage: React.FC = () => {
  const { metrics, fetchMetrics } = useLedgerStore()
  const { employees, fetchEmployees } = useEmployeeStore()

  const [isDepositOpen, setIsDepositOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isCustodyOpen, setIsCustodyOpen] = useState(false)
  const [isExpensesOpen, setIsExpensesOpen] = useState(false)
  const [isBalanceOpen, setIsBalanceOpen] = useState(false)
  const [activities, setActivities] = useState<any[]>([])

  const navigate = useNavigate()

  useEffect(() => {
    fetchMetrics()
    fetchEmployees()

    // Listen to real-time events via Event Bus
    const unsubActivity = window.electronAPI.on('activity:new', (act: any) => {
      setActivities((prev) => [act, ...prev.slice(0, 19)])
      fetchMetrics()
    })

    const unsubLedger = window.electronAPI.on('ledger:created', () => {
      fetchMetrics()
      fetchEmployees()
    })

    return () => {
      unsubActivity()
      unsubLedger()
    }
  }, [])

  const totalCustody = metrics?.totalCustody || 0
  const totalExpenses = metrics?.totalExpenses || 0
  const remainingBalance = metrics?.remainingBalance || 0

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Top Header & Quick Actions */}
      <div className="top-header">
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)' }}>لوحة التحكم المالية</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>متابعة لحظية شاملة للعهد والمصروفات والأنشطة الحية</p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="search-bar-trigger" onClick={() => setIsSearchOpen(true)}>
            <FaSearch size={16} />
            <span>بحث شامل في جميع القيود والموظفين...</span>
          </button>

          <button className="btn btn-success" onClick={() => setIsDepositOpen(true)}>
            <FaPlusCircle size={16} />
            إيداع عهدة جديدة
          </button>
        </div>
      </div>

      {/* Interactive KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '28px'
        }}
      >
        {/* Card 1: Total Custody */}
        <div
          className="card"
          onClick={() => setIsCustodyOpen(true)}
          style={{ borderRight: '4px solid var(--accent-brand)', cursor: 'pointer', transition: 'var(--transition-fast)' }}
          title="انقر لفتح تفاصيل العهد لكل موظف"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '13px', fontWeight: '600' }}>إجمالي العهد</span>
            <FaWallet color="var(--accent-brand)" size={20} />
          </div>
          <h3 style={{ fontSize: '22px', fontWeight: '800', marginTop: '10px' }}>
            {totalCustody.toLocaleString('ar-EG')} <span style={{ fontSize: '12px', fontWeight: 'normal' }}>ج.م</span>
          </h3>
          <span style={{ fontSize: '11px', color: 'var(--accent-brand)', marginTop: '4px', display: 'inline-block' }}>
            🔍 انقر لاستعراض تفاصيل الموظفين
          </span>
        </div>

        {/* Card 2: Total Expenses */}
        <div
          className="card"
          onClick={() => setIsExpensesOpen(true)}
          style={{ borderRight: '4px solid var(--accent-danger)', cursor: 'pointer', transition: 'var(--transition-fast)' }}
          title="انقر لفتح تفاصيل جميع المصروفات والفلترة"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '13px', fontWeight: '600' }}>إجمالي المصروفات</span>
            <FaArrowDown color="var(--accent-danger)" size={20} />
          </div>
          <h3 style={{ fontSize: '22px', fontWeight: '800', marginTop: '10px', color: 'var(--accent-danger)' }}>
            {totalExpenses.toLocaleString('ar-EG')} <span style={{ fontSize: '12px', fontWeight: 'normal' }}>ج.م</span>
          </h3>
          <span style={{ fontSize: '11px', color: 'var(--accent-danger)', marginTop: '4px', display: 'inline-block' }}>
            🔍 انقر لفلترة واستعراض المصروفات
          </span>
        </div>

        {/* Card 3: Remaining Balance */}
        <div
          className="card"
          onClick={() => setIsBalanceOpen(true)}
          style={{ borderRight: '4px solid var(--accent-success)', cursor: 'pointer', transition: 'var(--transition-fast)' }}
          title="انقر لفتح تفاصيل الأرصدة المتبقية لكل موظف"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '13px', fontWeight: '600' }}>الرصيد المتبقي</span>
            <FaWallet color="var(--accent-success)" size={20} />
          </div>
          <h3 style={{ fontSize: '22px', fontWeight: '800', marginTop: '10px', color: 'var(--accent-success)' }}>
            {remainingBalance.toLocaleString('ar-EG')} <span style={{ fontSize: '12px', fontWeight: 'normal' }}>ج.م</span>
          </h3>
          <span style={{ fontSize: '11px', color: 'var(--accent-success)', marginTop: '4px', display: 'inline-block' }}>
            🔍 انقر لاستعراض الأرصدة المتبقية
          </span>
        </div>

        {/* Card 4: Employee Count */}
        <div
          className="card"
          onClick={() => navigate('/employees')}
          style={{ cursor: 'pointer', transition: 'var(--transition-fast)' }}
          title="الانتقال إلى قائمة الموظفين"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '13px', fontWeight: '600' }}>عدد الموظفين</span>
            <FaUsers color="var(--accent-brand)" size={20} />
          </div>
          <h3 style={{ fontSize: '22px', fontWeight: '800', marginTop: '10px' }}>{metrics?.employeeCount || 0}</h3>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px', display: 'inline-block' }}>
            👥 عرض الموظفين
          </span>
        </div>

        {/* Card 5: Today Operations */}
        <div className="card" onClick={() => navigate('/ledger')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '13px', fontWeight: '600' }}>عمليات اليوم</span>
            <FaCalendarDay size={20} />
          </div>
          <h3 style={{ fontSize: '22px', fontWeight: '800', marginTop: '10px' }}>{metrics?.todayTxCount || 0}</h3>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px', display: 'inline-block' }}>
            📅 الدفتر الموحد
          </span>
        </div>

        {/* Card 6: Month Operations */}
        <div className="card" onClick={() => navigate('/ledger')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '13px', fontWeight: '600' }}>عمليات هذا الشهر</span>
            <FaCalendarAlt size={20} />
          </div>
          <h3 style={{ fontSize: '22px', fontWeight: '800', marginTop: '10px' }}>{metrics?.monthTxCount || 0}</h3>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px', display: 'inline-block' }}>
            📊 عرض السجل
          </span>
        </div>
      </div>

      {/* Main Dual Panel Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
        {/* Left: Live Real-Time Activity Feed */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-success)' }}></span>
            سجل النشاط اللحظي المباشر (Live Activity Timeline)
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '480px', overflowY: 'auto' }}>
            {activities.length === 0 && metrics?.recentEntries?.length > 0 && (
              metrics.recentEntries.map((entry: any) => {
                const localTimeStr = new Date(entry.date).toLocaleTimeString('ar-EG', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: true
                })

                return (
                  <div key={entry.id} className="timeline-item">
                    <div className={`timeline-icon ${entry.type === 'DEPOSIT' ? 'deposit' : 'expense'}`}>
                      {entry.type === 'DEPOSIT' ? '⬆️' : '⬇️'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>
                          {entry.type === 'DEPOSIT' ? 'إيداع عهدة' : entry.category} ({entry.employee?.name})
                        </strong>
                        <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                          🕒 {localTimeStr}
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{entry.description}</p>
                      <div style={{ marginTop: '4px' }}>
                        <CopyableOpNo opNo={entry.operationNo} />
                      </div>
                    </div>
                    <span
                      style={{
                        fontWeight: 'bold',
                        fontSize: '14px',
                        color: entry.type === 'DEPOSIT' ? 'var(--accent-success)' : 'var(--accent-danger)'
                      }}
                    >
                      {entry.type === 'DEPOSIT' ? '+' : '-'}{entry.amount} ج.م
                    </span>
                  </div>
                )
              })
            )}

            {activities.map((act, idx) => (
              <div key={idx} className="timeline-item">
                <div className="timeline-icon deposit">🔔</div>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: '14px' }}>{act.title}</strong>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{act.description}</p>
                  <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                    🕒 {new Date(act.createdAt || Date.now()).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Active Employees Sidebar List */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>أكثر الموظفين نشاطاً</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {employees.slice(0, 5).map((emp) => (
              <div
                key={emp.id}
                onClick={() => navigate(`/employees/${emp.id}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface-hover)',
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'var(--accent-brand-gradient)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      color: '#fff'
                    }}
                  >
                    {emp.name.charAt(0)}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: '600' }}>{emp.name}</h4>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{emp.jobTitle}</span>
                  </div>
                </div>

                <div style={{ textAlign: 'left' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--accent-success)' }}>
                    {emp.balance.toLocaleString('ar-EG')} ج.م
                  </span>
                  <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{emp.transactionCount} حركات</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      <DepositModal isOpen={isDepositOpen} onClose={() => setIsDepositOpen(false)} />
      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* KPI Detail Modals */}
      <CustodyBreakdownModal isOpen={isCustodyOpen} onClose={() => setIsCustodyOpen(false)} employees={employees} />
      <ExpensesBreakdownModal isOpen={isExpensesOpen} onClose={() => setIsExpensesOpen(false)} employees={employees} />
      <RemainingBalanceModal isOpen={isBalanceOpen} onClose={() => setIsBalanceOpen(false)} employees={employees} />
    </motion.div>
  )
}

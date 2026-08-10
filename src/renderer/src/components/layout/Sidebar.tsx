import React, { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  FaChartPie,
  FaUsers,
  FaKey,
  FaExchangeAlt,
  FaFileExcel,
  FaCalendarCheck,
  FaCog,
  FaUndoAlt
} from 'react-icons/fa'
import { useActivationStore } from '../../stores/useActivationStore'
import { useSettingsStore } from '../../stores/useSettingsStore'
import { HeaderNotificationCenter } from './HeaderNotificationCenter'

export const Sidebar: React.FC = () => {
  const { pendingRequests, fetchPending } = useActivationStore()
  const { settings, botStatus, fetchSettings, fetchBotStatus } = useSettingsStore()
  const [refundPendingCount, setRefundPendingCount] = useState<number>(0)

  const fetchRefundPendingCount = async () => {
    try {
      if ((window.electronAPI as any).getRefundPendingCount) {
        const count = await (window.electronAPI as any).getRefundPendingCount()
        setRefundPendingCount(count || 0)
      }
    } catch {}
  }

  useEffect(() => {
    fetchPending()
    fetchSettings()
    fetchBotStatus()
    fetchRefundPendingCount()

    // Listen to real-time activation requests
    const unsubscribeActivation = window.electronAPI.on('activation:new_request', () => {
      fetchPending()
    })

    // Listen to real-time refund requests and updates
    const unsubscribeRefund = window.electronAPI.on('refund:updated', () => {
      fetchRefundPendingCount()
    })

    const unsubscribeRefundNew = window.electronAPI.on('refund:new_request', () => {
      fetchRefundPendingCount()
    })

    // Listen to real-time Telegram Bot connection status updates
    const unsubscribeBot = window.electronAPI.on('telegram:status', (status: any) => {
      useSettingsStore.setState({ botStatus: status })
    })

    return () => {
      unsubscribeActivation()
      unsubscribeRefund()
      unsubscribeRefundNew()
      unsubscribeBot()
    }
  }, [])

  const pendingCount = pendingRequests.filter(
    (r: any) => r.status === 'PENDING' || r.status === 'CODE_GENERATED'
  ).length

  return (
    <aside
      style={{
        width: '270px',
        backgroundColor: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        padding: '24px 16px'
      }}
    >
      {/* Brand Header & Top Notification Center */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px 24px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-brand-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '18px',
              boxShadow: 'var(--shadow-glow-brand)'
            }}
          >
            ع
          </div>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>
              {settings?.companyName || 'نظام العهد المالية'}
            </h2>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>إدارة العهد والمصروفات</span>
          </div>
        </div>

        {/* Bell Notification Dropdown */}
        <HeaderNotificationCenter />
      </div>

      {/* Navigation Links */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
        <NavLink
          to="/"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            color: isActive ? '#ffffff' : 'var(--text-muted)',
            backgroundColor: isActive ? 'var(--accent-brand)' : 'transparent',
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'var(--transition-fast)'
          })}
        >
          <FaChartPie size={18} />
          لوحة التحكم
        </NavLink>

        <NavLink
          to="/employees"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            color: isActive ? '#ffffff' : 'var(--text-muted)',
            backgroundColor: isActive ? 'var(--accent-brand)' : 'transparent',
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'var(--transition-fast)'
          })}
        >
          <FaUsers size={18} />
          الموظفين
        </NavLink>

        <NavLink
          to="/activations"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            color: isActive ? '#ffffff' : 'var(--text-muted)',
            backgroundColor: isActive ? 'var(--accent-brand)' : 'transparent',
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'var(--transition-fast)'
          })}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FaKey size={18} />
            طلبات التفعيل
          </div>
          {pendingCount > 0 && (
            <span
              style={{
                background: 'var(--accent-danger)',
                color: '#fff',
                borderRadius: 'var(--radius-full)',
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: 'bold'
              }}
            >
              {pendingCount}
            </span>
          )}
        </NavLink>

        <NavLink
          to="/refunds"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            color: isActive ? '#ffffff' : 'var(--text-muted)',
            backgroundColor: isActive ? 'var(--accent-brand)' : 'transparent',
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'var(--transition-fast)'
          })}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FaUndoAlt size={18} />
            طلبات الاسترداد
          </div>
          {refundPendingCount > 0 && (
            <span
              style={{
                background: 'var(--accent-danger)',
                color: '#fff',
                borderRadius: 'var(--radius-full)',
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: 'bold'
              }}
            >
              {refundPendingCount}
            </span>
          )}
        </NavLink>

        <NavLink
          to="/ledger"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            color: isActive ? '#ffffff' : 'var(--text-muted)',
            backgroundColor: isActive ? 'var(--accent-brand)' : 'transparent',
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'var(--transition-fast)'
          })}
        >
          <FaExchangeAlt size={18} />
          الدفتر الموحد
        </NavLink>

        <NavLink
          to="/reports"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            color: isActive ? '#ffffff' : 'var(--text-muted)',
            backgroundColor: isActive ? 'var(--accent-brand)' : 'transparent',
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'var(--transition-fast)'
          })}
        >
          <FaFileExcel size={18} />
          التقارير
        </NavLink>

        <NavLink
          to="/month-close"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            color: isActive ? '#ffffff' : 'var(--text-muted)',
            backgroundColor: isActive ? 'var(--accent-brand)' : 'transparent',
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'var(--transition-fast)'
          })}
        >
          <FaCalendarCheck size={18} />
          تصفية الحسابات
        </NavLink>

        <NavLink
          to="/settings"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            color: isActive ? '#ffffff' : 'var(--text-muted)',
            backgroundColor: isActive ? 'var(--accent-brand)' : 'transparent',
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'var(--transition-fast)'
          })}
        >
          <FaCog size={18} />
          الإعدادات والنسخ
        </NavLink>
      </nav>

      {/* Footer Info */}
      <div
        style={{
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}
      >
        <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>الإصدار: v2.1 Commercial Ledger</span>
        <span
          style={{
            fontSize: '11px',
            fontWeight: '600',
            color: botStatus?.connected ? 'var(--accent-success)' : 'var(--accent-danger)'
          }}
        >
          {botStatus?.connected
            ? `● البوت متصل (@${botStatus.botInfo?.username || 'Bot'})`
            : '○ البوت غير متصل'}
        </span>
      </div>
    </aside>
  )
}

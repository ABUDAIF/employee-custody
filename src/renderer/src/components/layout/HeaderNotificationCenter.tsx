import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FaBell, FaKey, FaUndoAlt, FaReceipt, FaCheckDouble, FaTrashAlt, FaExchangeAlt } from 'react-icons/fa'

export interface AppNotification {
  id: string
  title: string
  description: string
  type: 'ACTIVATION' | 'REFUND' | 'EXPENSE' | 'DEPOSIT'
  route: string
  timestamp: string
  read: boolean
}

export const HeaderNotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem('app_notifications_v1')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [isOpen, setIsOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    try {
      localStorage.setItem('app_notifications_v1', JSON.stringify(notifications.slice(0, 50)))
    } catch {}
  }, [notifications])

  useEffect(() => {
    if (!(window as any).electronAPI) return

    // Listen to real-time events from main process
    const unbindActivation = window.electronAPI.on('activation:new_request', (data: any) => {
      addNotification({
        id: `notif_${Date.now()}_${Math.random()}`,
        title: '🔑 طلب تفعيل جديد',
        description: `قام ${data?.telegramName || 'موظف'} بتسجيل طلب تفعيل جديد عبر التليجرام.`,
        type: 'ACTIVATION',
        route: '/activations',
        timestamp: new Date().toISOString(),
        read: false
      })
    })

    const unbindRefund = window.electronAPI.on('refund:new_request', (data: any) => {
      const name = data?.employee?.name || 'موظف'
      const amount = data?.amount ? `${data.amount.toLocaleString('ar-EG')} ج.م` : ''
      addNotification({
        id: `notif_${Date.now()}_${Math.random()}`,
        title: '🔄 طلب استرداد مصروف جديد',
        description: `قدم ${name} طلب استرداد لعملية بقيمة ${amount}.`,
        type: 'REFUND',
        route: '/refunds',
        timestamp: new Date().toISOString(),
        read: false
      })
    })

    const unbindActivity = window.electronAPI.on('activity:new', (data: any) => {
      if (data?.type === 'EXPENSE') {
        addNotification({
          id: `notif_${Date.now()}_${Math.random()}`,
          title: '🔻 مصروف جديد من التليجرام',
          description: data?.description || 'تم تسجيل مصروف جديد.',
          type: 'EXPENSE',
          route: '/ledger',
          timestamp: new Date().toISOString(),
          read: false
        })
      }
    })

    return () => {
      unbindActivation()
      unbindRefund()
      unbindActivity()
    }
  }, [])

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const addNotification = (notif: AppNotification) => {
    setNotifications((prev) => [notif, ...prev])
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const handleClearAll = () => {
    setNotifications([])
  }

  const handleNotificationClick = (notif: AppNotification) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
    )
    setIsOpen(false)
    if (notif.route) {
      navigate(notif.route)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'ACTIVATION':
        return <FaKey color="#facc15" size={14} />
      case 'REFUND':
        return <FaUndoAlt color="#60a5fa" size={14} />
      case 'EXPENSE':
        return <FaReceipt color="#ef4444" size={14} />
      default:
        return <FaExchangeAlt color="#4ade80" size={14} />
    }
  }

  return (
    <div style={{ position: 'relative' }} ref={popoverRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          background: 'var(--bg-surface-hover)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          transition: 'var(--transition-fast)'
        }}
        title="مركز الإشعارات والتنبيهات"
      >
        <FaBell size={18} color={unreadCount > 0 ? '#60a5fa' : 'var(--text-muted)'} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: 'var(--accent-danger)',
              color: '#fff',
              borderRadius: 'var(--radius-full)',
              minWidth: '18px',
              height: '18px',
              fontSize: '10px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)'
            }}
          >
            {unreadCount > 9 ? '+9' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown positioned to stay cleanly inside application bounds */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              top: '48px',
              right: 0,
              width: '320px',
              maxHeight: '440px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5)',
              zIndex: 99999,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--bg-surface-hover)'
              }}
            >
              <h4 style={{ fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaBell color="#60a5fa" /> الإشعارات والتنبيهات الحية
              </h4>
              <div style={{ display: 'flex', gap: '8px' }}>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-brand)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: 'bold'
                    }}
                    title="علم الكل كُمقروء"
                  >
                    <FaCheckDouble size={10} /> قراءة الكل
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-dim)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="مسح السجل"
                  >
                    <FaTrashAlt size={10} /> مسح
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '8px' }}>
              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)', fontSize: '12px' }}>
                  لا توجد إشعارات جديدة حالياً.
                </div>
              ) : (
                notifications.map((n) => {
                  const timeStr = new Date(n.timestamp).toLocaleTimeString('ar-EG', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })

                  return (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: '6px',
                        cursor: 'pointer',
                        background: n.read ? 'transparent' : 'rgba(59, 130, 246, 0.08)',
                        borderRight: n.read ? '3px solid transparent' : '3px solid var(--accent-brand)',
                        transition: 'var(--transition-fast)',
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'flex-start'
                      }}
                    >
                      <div style={{ marginTop: '2px' }}>{getIcon(n.type)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: '12px', color: 'var(--text-main)' }}>{n.title}</strong>
                          <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{timeStr}</span>
                        </div>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: '1.4' }}>
                          {n.description}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaTimes, FaPaperPlane, FaUserCheck, FaBullhorn, FaSpinner } from 'react-icons/fa'

interface Employee {
  id: string
  name: string
  jobTitle: string
  telegramId?: string | null
}

interface BroadcastTelegramModalProps {
  isOpen: boolean
  employees: Employee[]
  selectedEmployeeId?: string | null
  onClose: () => void
}

export const BroadcastTelegramModal: React.FC<BroadcastTelegramModalProps> = ({
  isOpen,
  employees,
  selectedEmployeeId,
  onClose
}) => {
  const [targetId, setTargetId] = useState<string>(selectedEmployeeId || 'ALL')
  const [message, setMessage] = useState<string>('')
  const [sending, setSending] = useState<boolean>(false)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Sync selected employee prop when modal opens
  React.useEffect(() => {
    if (selectedEmployeeId) {
      setTargetId(selectedEmployeeId)
    } else {
      setTargetId('ALL')
    }
  }, [selectedEmployeeId, isOpen])

  if (!isOpen) return null

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) {
      setStatusMsg({ type: 'error', text: 'يرجى كتابة نص الرسالة الإشعارية أولاً.' })
      return
    }

    setSending(true)
    setStatusMsg(null)

    try {
      const res = await (window.electronAPI as any).broadcastTelegramMessage({
        employeeId: targetId,
        message: message.trim()
      })

      if (res.success) {
        setStatusMsg({ type: 'success', text: `✅ ${res.message}` })
        setMessage('')
      } else {
        setStatusMsg({ type: 'error', text: `⚠️ ${res.message}` })
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `⚠️ خطأ أثناء إرسال الرسالة: ${err.message}` })
    } finally {
      setSending(false)
    }
  }

  const activeEmployeesWithTelegram = employees.filter((e) => e.telegramId)

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="card"
          style={{ width: '540px', maxWidth: '92%', padding: '24px' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaBullhorn color="var(--accent-brand)" /> إرسال إشعار تليجرام للموظفين
            </h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <FaTimes size={18} />
            </button>
          </div>

          {statusMsg && (
            <div
              style={{
                padding: '12px 16px',
                background: statusMsg.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: statusMsg.type === 'success' ? '#4ade80' : 'var(--accent-danger)',
                border: `1px solid ${statusMsg.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                marginBottom: '16px'
              }}
            >
              {statusMsg.text}
            </div>
          )}

          <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Target Selector */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
                🎯 المستهدفين بالرسالة:
              </label>
              <select
                className="input-field"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="ALL">📢 إرسال عام لجميع الموظفين المفعّلين ({activeEmployeesWithTelegram.length} موظف)</option>
                {activeEmployeesWithTelegram.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    👤 {emp.name} ({emp.jobTitle})
                  </option>
                ))}
              </select>
            </div>

            {/* Message Area */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
                📝 نص الرسالة الإشعارية:
              </label>
              <textarea
                className="input-field"
                rows={5}
                placeholder="أدخل الرسالة المراد إرسالها لمشترك التليجرام (مثال: يرجى تسليم فواتير العهدة قبل نهاية الشهر)..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={sending}>
                إلغاء
              </button>
              <button type="submit" className="btn btn-primary" disabled={sending} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {sending ? <FaSpinner className="spin" /> : <FaPaperPlane />}
                {sending ? 'جاري الإرسال عبر البوت...' : 'إرسال الرسالة الآن 🚀'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FaTimes,
  FaPaperPlane,
  FaBullhorn,
  FaSpinner,
  FaBold,
  FaItalic,
  FaCode,
  FaListUl,
  FaEye,
  FaEdit
} from 'react-icons/fa'

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
  const [isPreview, setIsPreview] = useState<boolean>(false)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
      } else {
        setStatusMsg({ type: 'error', text: `⚠️ ${res.message}` })
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `⚠️ خطأ أثناء إرسال الرسالة: ${err.message}` })
    } finally {
      setSending(false)
    }
  }

  // Insert formatting at cursor
  const applyFormatting = (before: string, after: string = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = message.substring(start, end)
    const replacement = selectedText ? `${before}${selectedText}${after}` : `${before}نص${after}`
    const newText = message.substring(0, start) + replacement + message.substring(end)
    setMessage(newText)

    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + before.length + (selectedText ? selectedText.length : 2)
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current
    if (!textarea) {
      setMessage((prev) => prev + emoji)
      return
    }
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newText = message.substring(0, start) + emoji + message.substring(end)
    setMessage(newText)

    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + emoji.length, start + emoji.length)
    }, 0)
  }

  const activeEmployeesWithTelegram = employees.filter((e) => e.telegramId)
  const quickEmojis = ['🎉', '📢', '⚠️', '✅', '📱', '📞', '💼', '💰', '📄', '🚀', '📌', '✨', '💳', '📝', 'ℹ️']

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.82)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(6px)',
          padding: '20px'
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          className="card"
          style={{ width: '680px', maxWidth: '95%', padding: '28px', borderRadius: 'var(--radius-lg)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Title Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FaBullhorn color="var(--accent-brand)" size={22} /> إرسال إشعار تليجرام تفاعلي للموظفين
            </h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <FaTimes size={20} />
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
                fontSize: '13px',
                marginBottom: '18px',
                fontWeight: '600'
              }}
            >
              {statusMsg.text}
            </div>
          )}

          <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Target Selection Dropdown */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
                🎯 المستهدفين بالرسالة الإشعارية:
              </label>
              <select
                className="input-field"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                style={{ width: '100%', fontSize: '14px', padding: '10px 14px' }}
              >
                <option value="ALL">📢 إرسال عام لجميع الموظفين المفعّلين ({activeEmployeesWithTelegram.length} موظف)</option>
                {activeEmployeesWithTelegram.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    👤 {emp.name} ({emp.jobTitle})
                  </option>
                ))}
              </select>
            </div>

            {/* Rich Formatting Toolbar & Emojis */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold' }}>
                  📝 نص الرسالة والتزيين:
                </label>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => setIsPreview(!isPreview)}
                >
                  {isPreview ? <FaEdit /> : <FaEye />}
                  {isPreview ? 'تحرير النص' : 'معاينة شكل الرسالة بالتليجرام'}
                </button>
              </div>

              {!isPreview ? (
                <>
                  {/* Styling Buttons Toolbar */}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderBottom: 'none',
                      borderRadius: 'var(--radius-md) var(--radius-md) 0 0'
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                      onClick={() => applyFormatting('**', '**')}
                      title="سطر / نص غامق (Bold)"
                    >
                      <FaBold /> غامق
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                      onClick={() => applyFormatting('*', '*')}
                      title="نص مائل (Italic)"
                    >
                      <FaItalic /> مائل
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                      onClick={() => applyFormatting('`', '`')}
                      title="كود / نص بارز (Code)"
                    >
                      <FaCode /> بارز
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                      onClick={() => applyFormatting('• ')}
                      title="قائمة نقاط (Bullets)"
                    >
                      <FaListUl /> نقطة
                    </button>

                    <div style={{ height: '16px', width: '1px', background: 'var(--border-subtle)', margin: '0 4px' }} />

                    {/* Quick Emojis */}
                    <div style={{ display: 'flex', gap: '4px', overflowX: 'auto' }}>
                      {quickEmojis.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => insertEmoji(e)}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '15px',
                            cursor: 'pointer',
                            padding: '2px 4px',
                            borderRadius: '4px',
                            transition: 'transform 0.1s'
                          }}
                          title={`إدراج ${e}`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Large Spacious Textarea */}
                  <textarea
                    ref={textareaRef}
                    className="input-field"
                    rows={10}
                    placeholder="اكتب رسالتك الإشعارية هنا... يمكنك تزيين السطور واستخدام الأزرار أعلاه لجعل الرسالة تبدو جذابة وممتازة للموظفين."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    style={{
                      width: '100%',
                      resize: 'vertical',
                      fontSize: '14px',
                      lineHeight: '1.7',
                      borderRadius: '0 0 var(--radius-md) var(--radius-md)',
                      fontFamily: 'inherit'
                    }}
                  />
                </>
              ) : (
                /* Live Telegram Preview Frame */
                <div
                  style={{
                    minHeight: '220px',
                    maxHeight: '340px',
                    overflowY: 'auto',
                    background: '#0e1621',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    color: '#e4ecf2',
                    fontSize: '14px',
                    lineHeight: '1.7',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#6c7883', marginBottom: '8px', borderBottom: '1px solid #1c2a38', paddingBottom: '4px' }}>
                    📱 معاينة شكل الرسالة كما ستصل في التليجرام:
                  </div>
                  {message.trim() ? (
                    <div>{message}</div>
                  ) : (
                    <span style={{ color: '#6c7883', italic: 'true' }}>الرسالة فارغة... اكتب شيئاً لمعاينته.</span>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={sending}>
                إلغاء
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={sending || !message.trim()}
                style={{ padding: '10px 24px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
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

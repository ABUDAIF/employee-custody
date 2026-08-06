import React, { useState, useRef, useEffect } from 'react'
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
  FaEdit,
  FaHistory,
  FaTrashAlt,
  FaClock
} from 'react-icons/fa'

interface Employee {
  id: string
  name: string
  jobTitle: string
  telegramId?: string | null
}

interface BroadcastRecord {
  id: string
  sentAt: string
  text: string
  target: string
  sentItems: Array<{ telegramId: string; messageId: number }>
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
  const [activeTab, setActiveTab] = useState<'NEW' | 'HISTORY'>('NEW')
  const [targetId, setTargetId] = useState<string>(selectedEmployeeId || 'ALL')
  const [message, setMessage] = useState<string>('')
  const [sending, setSending] = useState<boolean>(false)
  const [isPreview, setIsPreview] = useState<boolean>(false)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [historyList, setHistoryList] = useState<BroadcastRecord[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (selectedEmployeeId) {
      setTargetId(selectedEmployeeId)
    } else {
      setTargetId('ALL')
    }
  }, [selectedEmployeeId, isOpen])

  useEffect(() => {
    if (isOpen && activeTab === 'HISTORY') {
      fetchHistory()
    }
  }, [isOpen, activeTab])

  const fetchHistory = async () => {
    try {
      const history = await (window.electronAPI as any).getBroadcastHistory()
      setHistoryList(history || [])
    } catch (e) {
      console.error('Failed to load broadcast history:', e)
    }
  }

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
        fetchHistory()
      } else {
        setStatusMsg({ type: 'error', text: `⚠️ ${res.message}` })
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `⚠️ خطأ أثناء إرسال الرسالة: ${err.message}` })
    } finally {
      setSending(false)
    }
  }

  const handleDeleteMessage = async (broadcastId: string) => {
    if (!window.confirm('هل أنت تأكد من رغبتك في مسح وسحب هذه الرسالة من تليجرام جميع الموظفين المستلمين؟')) {
      return
    }

    setDeletingId(broadcastId)
    setStatusMsg(null)

    try {
      const res = await (window.electronAPI as any).deleteBroadcastMessage(broadcastId)
      if (res.success) {
        setStatusMsg({ type: 'success', text: `✅ ${res.message}` })
        fetchHistory()
      } else {
        setStatusMsg({ type: 'error', text: `⚠️ ${res.message}` })
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `⚠️ خطأ في حذف الرسالة: ${err.message}` })
    } finally {
      setDeletingId(null)
    }
  }

  // Apply formatting (Bold, Italic, Code)
  const applyInlineFormatting = (before: string, after: string = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = message.substring(start, end)

    let replacement = ''
    if (selectedText) {
      // Toggle formatting if already wrapped
      if (selectedText.startsWith(before) && selectedText.endsWith(after)) {
        replacement = selectedText.substring(before.length, selectedText.length - after.length)
      } else {
        replacement = `${before}${selectedText}${after}`
      }
    } else {
      replacement = `${before}نص${after}`
    }

    const newText = message.substring(0, start) + replacement + message.substring(end)
    setMessage(newText)

    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + before.length + (selectedText ? selectedText.length : 2)
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  // Multi-line Bullet Points Formatting (Toggles bullet '• ' on every selected line)
  const applyBulletFormatting = () => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd

    if (start === end) {
      // Single line at cursor
      const currentText = message
      const beforeCursor = currentText.substring(0, start)
      const lastLineBreak = beforeCursor.lastIndexOf('\n')
      const lineStart = lastLineBreak === -1 ? 0 : lastLineBreak + 1
      const lineText = currentText.substring(lineStart, start)

      let updatedLine = ''
      if (lineText.startsWith('• ')) {
        updatedLine = lineText.replace(/^•\s*/, '')
      } else {
        updatedLine = `• ${lineText}`
      }

      const newText = currentText.substring(0, lineStart) + updatedLine + currentText.substring(start)
      setMessage(newText)
    } else {
      // Multi-line selection! Apply '• ' to EVERY selected line!
      const selectedText = message.substring(start, end)
      const lines = selectedText.split('\n')
      const allBulleted = lines.every((l) => l.trim() === '' || l.startsWith('• '))

      const newLines = lines.map((l) => {
        if (allBulleted) {
          return l.replace(/^•\s*/, '')
        } else {
          return l.trim() === '' ? l : `• ${l.replace(/^•\s*/, '')}`
        }
      })

      const newText = message.substring(0, start) + newLines.join('\n') + message.substring(end)
      setMessage(newText)
    }

    setTimeout(() => textarea.focus(), 0)
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

  // Telegram Live Markdown Preview Renderer
  const renderTelegramPreview = (text: string) => {
    if (!text.trim()) {
      return (
        <span style={{ color: '#6c7883', fontStyle: 'italic' }}>
          الرسالة فارغة... اكتب نصاً في صندوق التحرير لمشاهدة المعاينة الحية بتنسيق التليجرام.
        </span>
      )
    }

    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code style="background: rgba(255,255,255,0.15); padding: 2px 6px; border-radius: 4px; font-family: monospace; color: #64b5f6;">$1</code>')

    return <div dangerouslySetInnerHTML={{ __html: html.replace(/\n/g, '<br />') }} />
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
          background: 'rgba(0, 0, 0, 0.85)',
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
          style={{ width: '720px', maxWidth: '96%', padding: '28px', borderRadius: 'var(--radius-lg)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header & Tabs */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FaBullhorn color="var(--accent-brand)" size={22} /> إشعارات ورسائل التليجرام
            </h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <FaTimes size={20} />
            </button>
          </div>

          {/* Mode Switcher */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('NEW')}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                fontWeight: 'bold',
                border: 'none',
                background: activeTab === 'NEW' ? 'var(--accent-brand)' : 'var(--bg-surface-hover)',
                color: activeTab === 'NEW' ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <FaPaperPlane /> إرسال إشعار جديد
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('HISTORY')
                fetchHistory()
              }}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                fontWeight: 'bold',
                border: 'none',
                background: activeTab === 'HISTORY' ? 'var(--accent-brand)' : 'var(--bg-surface-hover)',
                color: activeTab === 'HISTORY' ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <FaHistory /> أرشيف الرسائل وإمكانية الحذف للجميع
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

          {activeTab === 'NEW' ? (
            <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Target Selector */}
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

              {/* Rich Text Editor Toolbar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold' }}>
                    📝 نص الرسالة والتزيين:
                  </label>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '4px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => setIsPreview(!isPreview)}
                  >
                    {isPreview ? <FaEdit /> : <FaEye color="#3b82f6" />}
                    {isPreview ? 'متابعة تحرير النص' : 'معاينة الشكل الفعلي بالتليجرام 👁️'}
                  </button>
                </div>

                {!isPreview ? (
                  <div
                    style={{
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      border: '1px solid rgba(255, 255, 255, 0.15)'
                    }}
                  >
                    {/* Formatting Toolbar */}
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 14px',
                        background: 'var(--bg-surface-elevated)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 'bold' }}
                        onClick={() => applyInlineFormatting('**', '**')}
                        title="سطر / نص غامق (Bold)"
                      >
                        <FaBold /> غامق
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => applyInlineFormatting('*', '*')}
                        title="نص مائل (Italic)"
                      >
                        <FaItalic /> مائل
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => applyInlineFormatting('`', '`')}
                        title="كود / نص بارز (Code)"
                      >
                        <FaCode /> بارز
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}
                        onClick={applyBulletFormatting}
                        title="تنقيط كافة الأسطر المحددة (Multi-line Bullet Points)"
                      >
                        <FaListUl /> نقطة 
                      </button>

                      <div style={{ height: '18px', width: '1px', background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />

                      {/* Emojis */}
                      <div style={{ display: 'flex', gap: '4px', overflowX: 'auto' }}>
                        {quickEmojis.map((e) => (
                          <button
                            key={e}
                            type="button"
                            onClick={() => insertEmoji(e)}
                            style={{
                              background: 'none',
                              border: 'none',
                              fontSize: '16px',
                              cursor: 'pointer',
                              padding: '2px 4px',
                              borderRadius: '4px'
                            }}
                            title={`إدراج ${e}`}
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Dark Sleek Textarea */}
                    <textarea
                      ref={textareaRef}
                      rows={10}
                      placeholder="اكتب رسالتك الإشعارية هنا... حدد على أي مجموعة أسطر واضغط 'نقطة' لتنقيطها جميعاً بأسلوب ممتاز."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      style={{
                        width: '100%',
                        background: '#0f172a',
                        color: '#f8fafc',
                        border: 'none',
                        outline: 'none',
                        padding: '16px 20px',
                        fontSize: '14px',
                        lineHeight: '1.8',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                ) : (
                  /* Telegram Live Chat Bubble Preview */
                  <div
                    style={{
                      minHeight: '240px',
                      maxHeight: '360px',
                      overflowY: 'auto',
                      background: '#0e1621',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: 'var(--radius-md)',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    <div style={{ fontSize: '11px', color: '#6c7883', borderBottom: '1px solid #1c2a38', paddingBottom: '6px' }}>
                      📱 المعاينة الفعلية كما تظهر للموظف بداخل التليجرام:
                    </div>

                    {/* Telegram Bubble */}
                    <div
                      style={{
                        alignSelf: 'flex-start',
                        maxWidth: '85%',
                        background: '#182533',
                        border: '1px solid #2b5278',
                        borderRadius: '12px 12px 12px 2px',
                        padding: '12px 16px',
                        color: '#f5f5f5',
                        fontSize: '14px',
                        lineHeight: '1.7',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64b5f6', marginBottom: '6px' }}>
                        📢 تنبيه وإشعار من إدارة الحسابات
                      </div>
                      {renderTelegramPreview(message)}
                      <div style={{ fontSize: '10px', color: '#6c7883', textAlign: 'left', marginTop: '8px' }}>
                        {new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })} ✓✓
                      </div>
                    </div>
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
          ) : (
            /* History & Message Revocation Tab */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px' }}>
                💡 يمكنك حذف وسحب أي رسالة سبق إرسالها من تليجرام جميع الموظفين في أي وقت بنقرة واحدة:
              </p>

              {historyList.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  لا توجد رسائل مرسلة سابقة في الأرشيف حالياً.
                </div>
              ) : (
                historyList.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: 'var(--bg-surface-hover)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px 18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 'bold' }}>
                        <FaClock color="var(--text-dim)" size={12} />
                        <span>{new Date(item.sentAt).toLocaleString('ar-EG')}</span>
                        <span style={{ fontSize: '11px', color: 'var(--accent-brand)', background: 'rgba(59, 130, 246, 0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                          🎯 {item.target} ({item.sentItems?.length || 0} موظف)
                        </span>
                      </div>

                      <button
                        className="btn btn-danger"
                        style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                        onClick={() => handleDeleteMessage(item.id)}
                        disabled={deletingId === item.id}
                      >
                        {deletingId === item.id ? <FaSpinner className="spin" /> : <FaTrashAlt />}
                        {deletingId === item.id ? 'جاري السحب...' : 'حذف للجميع من تليجرام'}
                      </button>
                    </div>

                    <div
                      style={{
                        background: 'rgba(0, 0, 0, 0.25)',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        color: 'var(--text-main)',
                        whiteSpace: 'pre-wrap',
                        maxHeight: '90px',
                        overflowY: 'auto'
                      }}
                    >
                      {item.text}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

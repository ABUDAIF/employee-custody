import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaTimes, FaFileAlt, FaFileImage, FaFolderOpen, FaInfoCircle } from 'react-icons/fa'

interface Attachment {
  id: string
  fileName: string
  filePath: string
  fileType: string
  fileSize: number
}

interface AttachmentModalProps {
  isOpen: boolean
  attachments: Attachment[]
  onClose: () => void
}

export const AttachmentModal: React.FC<AttachmentModalProps> = ({ isOpen, attachments, onClose }) => {
  const [opening, setOpening] = useState<string | null>(null)
  const [logInfo, setLogInfo] = useState<{ type: 'error' | 'info'; message: string; details?: string } | null>(null)

  if (!isOpen) return null

  const handleOpenFile = async (att: Attachment) => {
    try {
      setOpening(att.id)
      setLogInfo(null)
      const res = await window.electronAPI.openPath(att.filePath, att.fileName)

      if (!res.success) {
        const isLegacy = att.filePath && !att.filePath.startsWith('data:')
        if (isLegacy) {
          setLogInfo({
            type: 'info',
            message: `ℹ️ هذه الفاتورة تم تسجيلها من التليجرام قبل تفعيل التزامن المباشر، ومسارها محفوظ على السحابة (${att.filePath}).`,
            details: `المسار المطلوب على الويندوز: ${res.fullPath || 'غير متوفر'}\nحالة التشفير: ملف قديم غير مدمج شفرة Base64.\nتنبيه: الفواتير المسجلة بعد التحديث تُفتح وتُعرض تلقائياً 100%.`
          })
        } else {
          setLogInfo({
            type: 'error',
            message: `⚠️ ${res.message || 'لم نتمكن من فتح الملف تلقائياً.'}`,
            details: `مسار الداتابيز: ${res.dbPath || att.filePath}\nالمسار المستهدف: ${res.fullPath || 'غير معروف'}`
          })
        }
      }
    } catch (err: any) {
      setLogInfo({
        type: 'error',
        message: `⚠️ خطأ في فتح المستند: ${err.message}`
      })
    } finally {
      setOpening(null)
    }
  }

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
          style={{ width: '560px', maxWidth: '92%', padding: '24px' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📎 مستندات ومرفقات العملية ({attachments.length})
            </h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <FaTimes size={18} />
            </button>
          </div>

          {logInfo && (
            <div
              style={{
                padding: '12px 16px',
                background: logInfo.type === 'error' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                color: logInfo.type === 'error' ? 'var(--accent-danger)' : '#60a5fa',
                border: `1px solid ${logInfo.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                marginBottom: '16px',
                lineHeight: '1.6'
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FaInfoCircle size={14} /> {logInfo.message}
              </div>
              {logInfo.details && (
                <pre
                  style={{
                    marginTop: '8px',
                    padding: '8px 10px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '4px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    color: 'var(--text-muted)'
                  }}
                >
                  {logInfo.details}
                </pre>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '360px', overflowY: 'auto' }}>
            {attachments.map((att) => {
              const isImage = att.fileType?.includes('image') || att.fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)
              const isCloudDirect = att.filePath && att.filePath.startsWith('data:')
              const sizeKB = (att.fileSize / 1024).toFixed(1)

              return (
                <div
                  key={att.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-surface-hover)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {isImage ? <FaFileImage size={24} color="#3b82f6" /> : <FaFileAlt size={24} color="#ef4444" />}
                    <div>
                      <strong style={{ fontSize: '13px', display: 'block', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {att.fileName}
                      </strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                        {sizeKB} KB • {isCloudDirect ? '☁️ تزامن سحابي مباشر' : '📦 مسار قديم'}
                      </span>
                    </div>
                  </div>

                  <button
                    className="btn btn-primary"
                    style={{ padding: '8px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => handleOpenFile(att)}
                    disabled={opening === att.id}
                  >
                    <FaFolderOpen /> {opening === att.id ? 'جاري الفتح...' : 'عرض / فتح'}
                  </button>
                </div>
              )
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

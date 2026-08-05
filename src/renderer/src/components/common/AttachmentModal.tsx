import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaTimes, FaFileAlt, FaFileImage, FaExternalLinkAlt, FaFolderOpen } from 'react-icons/fa'

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const handleOpenFile = async (att: Attachment) => {
    try {
      setOpening(att.id)
      setErrorMsg(null)
      const res = await window.electronAPI.openPath(att.filePath)
      if (!res.success) {
        setErrorMsg(`⚠️ ${res.message || 'لم نتمكن من فتح الملف تلقائياً.'}`)
      }
    } catch (err: any) {
      setErrorMsg(`⚠️ خطأ في فتح المستند: ${err.message}`)
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
          style={{ width: '520px', maxWidth: '90%', padding: '24px' }}
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

          {errorMsg && (
            <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)', borderRadius: 'var(--radius-sm)', fontSize: '12px', marginBottom: '16px' }}>
              {errorMsg}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '360px', overflowY: 'auto' }}>
            {attachments.map((att) => {
              const isImage = att.fileType?.includes('image') || att.fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)
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
                        {sizeKB} KB • {att.fileType || 'مستند'}
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

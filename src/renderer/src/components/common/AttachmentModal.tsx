import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FaTimes,
  FaFileAlt,
  FaFileImage,
  FaSearchPlus,
  FaSearchMinus,
  FaRedo,
  FaDownload,
  FaPrint,
  FaSpinner
} from 'react-icons/fa'

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
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
  const [base64Uri, setBase64Uri] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [zoom, setZoom] = useState<number>(1)
  const [rotation, setRotation] = useState<number>(0)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  const activeAtt = attachments[selectedIndex] || attachments[0]

  useEffect(() => {
    if (isOpen && activeAtt) {
      loadAttachmentData(activeAtt)
    }
  }, [isOpen, selectedIndex, activeAtt?.id])

  const loadAttachmentData = async (att: Attachment) => {
    setLoading(true)
    setBase64Uri(null)
    setStatusMsg(null)
    setZoom(1)
    setRotation(0)

    try {
      if (att.filePath && att.filePath.startsWith('data:')) {
        setBase64Uri(att.filePath)
      } else {
        const uri = await (window.electronAPI as any).getAttachmentBase64(att.filePath)
        if (uri) {
          setBase64Uri(uri)
        } else {
          setStatusMsg('⚠️ تعذر تحميل صورة المستند من القرص المحلي.')
        }
      }
    } catch (err: any) {
      setStatusMsg(`⚠️ خطأ أثناء فتح المستند: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !activeAtt) return null

  const isImage = activeAtt.fileType?.includes('image') || activeAtt.fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)
  const isPdf = activeAtt.fileType?.includes('pdf') || activeAtt.fileName.endsWith('.pdf')

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3))
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5))
  const handleResetZoom = () => {
    setZoom(1)
    setRotation(0)
  }
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360)

  const handleSaveAs = async () => {
    try {
      const res = await (window.electronAPI as any).saveAttachmentAs(activeAtt.filePath, activeAtt.fileName)
      if (res.success) {
        setStatusMsg(`✅ تم حفظ الملف بنجاح في: ${res.filePath}`)
      } else if (res.message && !res.message.includes('إلغاء')) {
        setStatusMsg(`⚠️ ${res.message}`)
      }
    } catch (err: any) {
      setStatusMsg(`⚠️ خطأ في الحفظ: ${err.message}`)
    }
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <title>طباعة مستند فاتورة - ${activeAtt.fileName}</title>
          <style>
            @page { size: A4 portrait; margin: 0; }
            body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; background: #fff; }
            img { max-width: 100%; max-height: 100vh; object-fit: contain; }
          </style>
        </head>
        <body>
          ${
            isImage && base64Uri
              ? `<img src="${base64Uri}" onload="window.print();window.close();" />`
              : `<p>يرجى طباعة المستند مباشرة</p>`
          }
        </body>
      </html>
    `)
    printWindow.document.close()
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
          background: 'rgba(10, 15, 30, 0.88)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          zIndex: 1000,
          backdropFilter: 'blur(8px)',
          overflowY: 'auto',
          padding: '20px 10px'
        }}
        onClick={onClose}
      >
        {/* Top Control Bar */}
        <div
          style={{
            width: '100%',
            maxWidth: '1000px',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            zIndex: 10
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Document Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)', marginLeft: '10px' }}>
              📄 المرفقات ({attachments.length}):
            </span>
            {attachments.map((att, idx) => (
              <button
                key={att.id}
                onClick={() => setSelectedIndex(idx)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  border: 'none',
                  background: selectedIndex === idx ? 'var(--accent-brand)' : 'var(--bg-surface-hover)',
                  color: selectedIndex === idx ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontWeight: selectedIndex === idx ? 'bold' : 'normal',
                  transition: 'var(--transition-fast)'
                }}
              >
                {att.fileName}
              </button>
            ))}
          </div>

          {/* Action Tools: Zoom, Rotate, Save, Print, Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '12px' }} onClick={handleZoomIn} title="تكبير">
              <FaSearchPlus /> +
            </button>
            <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '12px' }} onClick={handleZoomOut} title="تصغير">
              <FaSearchMinus /> -
            </button>
            <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '12px' }} onClick={handleResetZoom} title="إعادة ضبط (100%)">
              {Math.round(zoom * 100)}%
            </button>
            <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '12px' }} onClick={handleRotate} title="تدوير (90°)">
              <FaRedo />
            </button>
            <button className="btn btn-success" style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={handleSaveAs} title="تنزيل وتخزين الملف علي الجهاز">
              <FaDownload /> تنزيل/حفظ
            </button>
            {isImage && (
              <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={handlePrint} title="طباعة الفاتورة">
                <FaPrint /> طباعة
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginRight: '10px' }}>
              <FaTimes size={20} />
            </button>
          </div>
        </div>

        {statusMsg && (
          <div
            style={{
              width: '100%',
              maxWidth: '1000px',
              padding: '10px 16px',
              background: statusMsg.startsWith('✅') ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: statusMsg.startsWith('✅') ? '#4ade80' : 'var(--accent-danger)',
              borderRadius: 'var(--radius-md)',
              fontSize: '12px',
              marginBottom: '16px',
              textAlign: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {statusMsg}
          </div>
        )}

        {/* A4 Paper Frame Canvas */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          style={{
            width: '210mm',
            minHeight: '297mm',
            background: '#ffffff',
            borderRadius: '4px',
            boxShadow: '0 12px 48px rgba(0, 0, 0, 0.6)',
            padding: '20px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            marginBottom: '40px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: '#475569' }}>
              <FaSpinner className="spin" size={32} />
              <span>جاري تحميل معاينة صفحة A4 للمستند...</span>
            </div>
          ) : base64Uri ? (
            isPdf ? (
              <iframe src={base64Uri} style={{ width: '100%', height: '280mm', border: 'none' }} title={activeAtt.fileName} />
            ) : (
              <div style={{ width: '100%', height: '100%', overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <img
                  src={base64Uri}
                  alt={activeAtt.fileName}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '270mm',
                    objectFit: 'contain',
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: 'transform 0.2s ease-out'
                  }}
                />
              </div>
            )
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: '#64748b' }}>
              <FaFileAlt size={48} color="#94a3b8" />
              <p style={{ fontSize: '14px', fontWeight: 'bold' }}>{activeAtt.fileName}</p>
              <p style={{ fontSize: '12px' }}>المستند مخزن على القرص المحلي بمسار: {activeAtt.filePath}</p>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

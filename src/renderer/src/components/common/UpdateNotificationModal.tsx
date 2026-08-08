import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaSyncAlt, FaTimes, FaDownload, FaCheckCircle, FaRocket } from 'react-icons/fa'

export const UpdateNotificationModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<{ version: string } | null>(null)
  const [progress, setProgress] = useState<number>(0)
  const [isDownloaded, setIsDownloaded] = useState(false)

  useEffect(() => {
    if (!(window as any).electronAPI) return

    // Listen for available updates
    const unbindAvailable = window.electronAPI.on('update:available', (data: any) => {
      console.log('Update available event received:', data)
      setUpdateInfo(data)
      setIsOpen(true)
      setIsDownloaded(false)
    })

    // Listen for download progress
    const unbindProgress = window.electronAPI.on('update:download-progress', (data: any) => {
      setProgress(data.percent || 0)
    })

    // Listen for update downloaded
    const unbindDownloaded = window.electronAPI.on('update:downloaded', (data: any) => {
      console.log('Update downloaded event received:', data)
      setUpdateInfo(data)
      setIsDownloaded(true)
      setProgress(100)
      setIsOpen(true)
    })

    return () => {
      unbindAvailable()
      unbindProgress()
      unbindDownloaded()
    }
  }, [])

  if (!isOpen || !updateInfo) return null

  const handleRestartAndInstall = () => {
    window.electronAPI.restartAndInstallUpdate()
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
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(8px)'
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="card"
          style={{
            width: '520px',
            maxWidth: '92%',
            padding: '28px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--accent-brand)',
            boxShadow: '0 12px 48px rgba(59, 130, 246, 0.3)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', color: '#60a5fa' }}>
              <FaSyncAlt className="spin" /> تتوفر نسخة جديدة محدثة من البرنامج!
            </h3>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <FaTimes size={18} />
            </button>
          </div>

          <div style={{ padding: '16px', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
            <p style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '6px' }}>
              🚀 إصدار البرنامج الجديد: <span style={{ color: 'var(--accent-success)' }}>v{updateInfo.version}</span>
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              يحتوي هذا التحديث على كافة التحسينات الأخيرة، إصلاحات الفتح المباشر للمرفقات، وميزة التنبيهات المباشرة.
            </p>
          </div>

          {!isDownloaded ? (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px', color: 'var(--text-muted)' }}>
                <span><FaDownload /> جاري تنزيل التحديث في الخلفية...</span>
                <span>{progress}%</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${progress}%`,
                    height: '100%',
                    background: 'var(--accent-brand-gradient)',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: '12px 16px',
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#4ade80',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                fontWeight: 'bold',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <FaCheckCircle size={16} /> مكتمل التنزيل! جاهز لتثبيت التحديث وتحديث البرنامج الآن.
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={() => setIsOpen(false)}>
              تأجيل التحديث لاحقاً
            </button>
            <button
              className="btn btn-primary"
              disabled={!isDownloaded}
              onClick={handleRestartAndInstall}
              style={{ padding: '10px 20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <FaRocket /> إعادة التشغيل والتحديث الآن
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

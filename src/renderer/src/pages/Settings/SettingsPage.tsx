import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FaCog, FaTelegramPlane, FaDatabase, FaCheckCircle, FaExclamationTriangle, FaDownload, FaUndo } from 'react-icons/fa'
import { useSettingsStore } from '../../stores/useSettingsStore'

export const SettingsPage: React.FC = () => {
  const { settings, botStatus, loading, fetchSettings, fetchBotStatus, updateSettings, connectBot } = useSettingsStore()

  const [companyName, setCompanyName] = useState('')
  const [botToken, setBotToken] = useState('')
  const [autoBackup, setAutoBackup] = useState(true)
  const [backups, setBackups] = useState<any[]>([])
  const [backupMsg, setBackupMsg] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  const loadBackups = async () => {
    try {
      const list = await window.electronAPI.getBackupList()
      setBackups(list)
    } catch (err) {
      console.error('Failed to load backup list:', err)
    }
  }

  useEffect(() => {
    fetchSettings()
    fetchBotStatus()
    loadBackups()
  }, [])

  useEffect(() => {
    if (settings) {
      if (settings.companyName && !companyName) setCompanyName(settings.companyName)
      if (settings.telegramBotToken && !botToken) setBotToken(settings.telegramBotToken)
      setAutoBackup(settings.autoBackupEnabled ?? true)
    }
  }, [settings])

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyName.trim()) {
      alert('⚠️ يرجى إدخال اسم الشركة.')
      return
    }
    const cleanedToken = botToken.trim().replace(/^bot/i, '').replace(/["'\s]/g, '')
    await updateSettings({
      companyName: companyName.trim(),
      telegramBotToken: cleanedToken,
      autoBackupEnabled: autoBackup
    })
    if (cleanedToken) {
      await connectBot(cleanedToken)
    }
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 4000)
  }

  const handleConnectBot = async () => {
    const cleanedToken = botToken.trim().replace(/^bot/i, '').replace(/["'\s]/g, '')
    if (!cleanedToken) {
      alert('⚠️ يرجى إدخال Telegram Bot Token أولاً.')
      return
    }
    await connectBot(cleanedToken)
  }

  const handleCreateBackup = async () => {
    try {
      const fileName = await window.electronAPI.createBackup()
      setBackupMsg(`✅ تم إنشاء نسخة احتياطية بنجاح: ${fileName}`)
      await loadBackups()
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء النسخ الاحتياطي.')
    }
  }

  const handleRestoreBackup = async (fileName: string) => {
    if (confirm(`هل أنت تأكد من استعادة النسخة الاحتياطية (${fileName})؟ سيتم دمج ومزامنة البيانات مع قاعدة البيانات السحابية.`)) {
      try {
        await window.electronAPI.restoreBackup(fileName)
        alert('✅ تم استعادة ومزامنة قاعدة البيانات بنجاح!')
        await fetchSettings()
        await loadBackups()
      } catch (err: any) {
        alert(err.message || 'حدث خطأ أثناء الاستعادة.')
      }
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="top-header">
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800' }}>إعدادات النظام والنسخ الاحتياطي السحابي</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            ربط بوت التليجرام، إعدادات اسم الشركة والنسخ الاحتياطي التلقائي لقاعدة البيانات السحابية
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Left Panel: Telegram Bot Config & Branding */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Company Branding */}
          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaCog color="var(--accent-brand)" /> بيانات الهوية والشركة
            </h3>

            <form onSubmit={handleSaveBranding}>
              <div className="form-group">
                <label className="form-label">اسم الشركة / المؤسسة:</label>
                <input
                  type="text"
                  className="form-input"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="مثال: شركة العهد المالية"
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                {saveSuccess && (
                  <span className="badge badge-active">
                    <FaCheckCircle size={12} /> تم حفظ الإعدادات بنجاح!
                  </span>
                )}
                <button type="submit" className="btn btn-success" style={{ marginRight: 'auto' }}>
                  حفظ التعديلات 💾
                </button>
              </div>
            </form>
          </div>

          {/* Telegram Bot Setup */}
          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaTelegramPlane color="#0088cc" /> إعداد وتوصيل بوت التليجرام
            </h3>

            <div className="form-group">
              <label className="form-label">Telegram Bot Token:</label>
              <input
                type="text"
                className="form-input"
                placeholder="مثال: 123456789:ABCdefGhIJKlmNoPQ..."
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
              />
              {botStatus && !botStatus.connected && botStatus.message && (
                <div style={{ color: 'var(--accent-danger)', fontSize: '12px', marginTop: '6px', fontWeight: 'bold' }}>
                  ⚠️ فشل التوصيل: {botStatus.message}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <div>
                {botStatus?.connected ? (
                  <span className="badge badge-active">
                    <FaCheckCircle size={10} /> متصل: @{botStatus.botInfo?.username}
                  </span>
                ) : (
                  <span className="badge badge-pending">
                    <FaExclamationTriangle size={10} /> غير متصل
                  </span>
                )}
              </div>

              <button className="btn btn-primary" onClick={handleConnectBot} disabled={loading}>
                {loading ? 'جاري الفحص...' : 'فحص وتوصيل البوت 🤖'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel: Auto & Manual Backups */}
        <div className="card">
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaDatabase color="var(--accent-success)" /> النسخ الاحتياطي والاستعادة السحابية
          </h3>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <strong style={{ fontSize: '14px' }}>النسخ الاحتياطي التلقائي اليومي</strong>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>توليد نسخة احتياطية سحابية تلقائية كل 24 ساعة</p>
            </div>

            <input
              type="checkbox"
              checked={autoBackup}
              onChange={(e) => setAutoBackup(e.target.checked)}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
          </div>

          <button className="btn btn-primary" onClick={handleCreateBackup} style={{ width: '100%', padding: '12px', marginBottom: '20px' }}>
            <FaDownload /> إنشاء نسخة احتياطية فورية الآن 💾
          </button>

          {backupMsg && (
            <p style={{ fontSize: '12px', color: 'var(--accent-success)', marginBottom: '16px', textAlign: 'center' }}>{backupMsg}</p>
          )}

          <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>سجل النسخ الاحتياطية المتوفرة:</h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
            {backups.length === 0 ? (
              <p style={{ color: 'var(--text-dim)', fontSize: '12px' }}>لا توجد نسخ احتياطية مسجلة بعد.</p>
            ) : (
              backups.map((b) => (
                <div
                  key={b.fileName}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-surface-hover)',
                    fontSize: '13px'
                  }}
                >
                  <div>
                    <strong style={{ fontFamily: 'monospace' }}>{b.fileName}</strong>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                      {(b.size / 1024).toFixed(1)} KB • {new Date(b.createdAt).toLocaleString('ar-EG')}
                    </div>
                  </div>

                  <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => handleRestoreBackup(b.fileName)}>
                    <FaUndo /> استعادة ومزامنة
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

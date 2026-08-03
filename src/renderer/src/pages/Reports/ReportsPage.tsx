import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { FaFileExcel, FaDownload, FaUsers, FaGlobe } from 'react-icons/fa'

export const ReportsPage: React.FC = () => {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [periodTitle, setPeriodTitle] = useState('الشهر الحالي')
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const [loadingMaster, setLoadingMaster] = useState(false)
  const [downloadMsg, setDownloadMsg] = useState<string | null>(null)

  // Export Multi-Sheet Report (One sheet per employee)
  const handleExportEmployeesReport = async () => {
    try {
      const dialogRes = await window.electronAPI.showSaveDialog({
        title: 'اختر مكان حفظ كشوفات حساب الموظفين',
        defaultPath: `كشوفات_حسابات_الموظفين_${Date.now()}.xlsx`,
        filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
      })

      if (dialogRes.canceled || !dialogRes.filePath) return

      setLoadingEmployees(true)
      const res = await window.electronAPI.exportExcelReport({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        periodTitle: startDate && endDate ? `الفترة من ${startDate} إلى ${endDate}` : periodTitle,
        targetFilePath: dialogRes.filePath
      })

      setDownloadMsg(`✅ تم تصدير كشوفات الموظفين (ورقة لكل موظف) بنجاح إلى:\n${res.filePath}`)
    } catch (err: any) {
      alert(`❌ حدث خطأ أثناء التصدير: ${err.message}`)
    } finally {
      setLoadingEmployees(false)
    }
  }

  // Export Master System Report
  const handleExportMasterReport = async () => {
    try {
      const dialogRes = await window.electronAPI.showSaveDialog({
        title: 'اختر مكان حفظ التقرير العام الشامل',
        defaultPath: `التقرير_العام_الشامل_${Date.now()}.xlsx`,
        filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
      })

      if (dialogRes.canceled || !dialogRes.filePath) return

      setLoadingMaster(true)
      const res = await window.electronAPI.exportMasterExcelReport({
        targetFilePath: dialogRes.filePath
      })

      setDownloadMsg(`✅ تم تصدير التقرير العام الشامل بنجاح إلى:\n${res.filePath}`)
    } catch (err: any) {
      alert(`❌ حدث خطأ أثناء التصدير: ${err.message}`)
    } finally {
      setLoadingMaster(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="top-header">
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800' }}>مركز التقارير والتصدير (Excel Accounting Center)</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            تصدير تقارير محاسبية تفصيلية وتحديد مكان حفظ الملف على جهازك مباشرة
          </p>
        </div>
      </div>

      {downloadMsg && (
        <div
          style={{
            marginBottom: '24px',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: 'var(--accent-success)',
            fontSize: '14px',
            whiteSpace: 'pre-wrap',
            fontWeight: 'bold'
          }}
        >
          {downloadMsg}
        </div>
      )}

      {/* Date Filter & Options */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>
          📅 تصفية الفترة الزمانية للتقارير (اختياري)
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">الفترة السريعة:</label>
            <select
              className="form-input"
              value={periodTitle}
              onChange={(e) => {
                setPeriodTitle(e.target.value)
                setStartDate('')
                setEndDate('')
              }}
            >
              <option value="الشهر الحالي">الشهر الحالي (الافتراضي)</option>
              <option value="الشهر السابق">الشهر السابق</option>
              <option value="جميع الفترات التاريخية">جميع الفترات التاريخية</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">من تاريخ (مخصص):</label>
            <input type="date" className="form-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">إلى تاريخ (مخصص):</label>
            <input type="date" className="form-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Report Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Report 1: Multi-Sheet Per Employee */}
        <div className="card" style={{ borderRight: '4px solid var(--accent-brand)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-brand-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '20px'
              }}
            >
              <FaUsers />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '800' }}>تقرير كشوفات حسابات الموظفين (Multi-Sheet)</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ورقة عمل مستقلة (Worksheet) لكل موظف بالكامل</span>
            </div>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.6' }}>
            يولد ملف Excel متكامل يحتوي على ورقة رئيسية لملخص العهد، بالإضافة إلى <strong>ورقة مستقلة لكل موظف</strong> تتضمن كافة إيداعاته ومصروفاته ورصيده المتبقي بتواريخ وساعات مضبوطة.
          </p>

          <button
            className="btn btn-primary"
            onClick={handleExportEmployeesReport}
            disabled={loadingEmployees}
            style={{ width: '100%', padding: '14px', fontSize: '14px' }}
          >
            <FaDownload /> {loadingEmployees ? 'جاري تصدير الملف...' : 'اختيار المكان وتصدير تقرير الموظفين 📊'}
          </button>
        </div>

        {/* Report 2: Master General System Report */}
        <div className="card" style={{ borderRight: '4px solid var(--accent-success)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '20px'
              }}
            >
              <FaGlobe />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '800' }}>التقرير العام الشامل للنظام (Master System Report)</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>سجل زمني عام لجميع العمليات والقيود</span>
            </div>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.6' }}>
            يولد شيت شامل لجميع العمليات والقيود والإيداعات والمصروفات المسجلة في البرنامج مرتبة زمنياً بالساعة والدقيقة، مع تفاصيل اسم الموظف والفئة والمرفقات.
          </p>

          <button
            className="btn btn-success"
            onClick={handleExportMasterReport}
            disabled={loadingMaster}
            style={{ width: '100%', padding: '14px', fontSize: '14px' }}
          >
            <FaDownload /> {loadingMaster ? 'جاري تصدير التقرير العام...' : 'اختيار المكان وتصدير التقرير العام 🚀'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

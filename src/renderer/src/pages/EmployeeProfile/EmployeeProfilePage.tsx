import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FaArrowRight, FaPhone, FaCheckCircle, FaHourglassHalf, FaPlusCircle, FaQrcode, FaPaperclip } from 'react-icons/fa'
import { useEmployeeStore } from '../../stores/useEmployeeStore'
import { useLedgerStore } from '../../stores/useLedgerStore'
import { DepositModal } from '../../components/common/DepositModal'
import { QRModal } from '../../components/common/QRModal'
import { CopyableOpNo } from '../../components/common/CopyableOpNo'

export const EmployeeProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { selectedEmployee, fetchEmployeeById } = useEmployeeStore()
  const { timeline, fetchTimeline } = useLedgerStore()

  const [isDepositOpen, setIsDepositOpen] = useState(false)
  const [selectedOpNo, setSelectedOpNo] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      fetchEmployeeById(id)
      fetchTimeline(id)
    }
  }, [id])

  if (!selectedEmployee) {
    return <p style={{ color: 'var(--text-muted)', padding: '40px' }}>جاري تحميل ملف الموظف...</p>
  }

  const isActivated = selectedEmployee.status === 'ACTIVE'

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Back Button & Top Navigation */}
      <button
        onClick={() => navigate('/employees')}
        className="btn btn-secondary"
        style={{ marginBottom: '20px', padding: '8px 14px', fontSize: '13px' }}
      >
        <FaArrowRight size={12} /> العودة إلى قائمة الموظفين
      </button>

      {/* Hero Profile Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--accent-brand-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                fontWeight: 'bold',
                color: '#fff',
                boxShadow: 'var(--shadow-glow-brand)'
              }}
            >
              {selectedEmployee.name.charAt(0)}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: '800' }}>{selectedEmployee.name}</h1>
                {isActivated ? (
                  <span className="badge badge-active">
                    <FaCheckCircle size={10} /> مفعّل تليجرام
                  </span>
                ) : (
                  <span className="badge badge-pending">
                    <FaHourglassHalf size={10} /> غير مفعّل
                  </span>
                )}
              </div>

              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>{selectedEmployee.jobTitle}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dim)', fontSize: '13px', marginTop: '6px' }}>
                <FaPhone size={12} />
                <span>{selectedEmployee.phone}</span>
              </div>
            </div>
          </div>

          <button className="btn btn-success" onClick={() => setIsDepositOpen(true)}>
            <FaPlusCircle size={16} /> إيداع عهدة جديدة
          </button>
        </div>

        {/* Metrics Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            marginTop: '24px',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '20px'
          }}
        >
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>الرصيد المتبقي الحالي</span>
            <h3 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-success)', marginTop: '4px' }}>
              {selectedEmployee.balance.toLocaleString('ar-EG')} ج.م
            </h3>
          </div>

          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>إجمالي العهد الاستلامية</span>
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginTop: '4px' }}>
              {selectedEmployee.totalCustody.toLocaleString('ar-EG')} ج.م
            </h3>
          </div>

          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>إجمالي المصروفات</span>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--accent-danger)', marginTop: '4px' }}>
              {selectedEmployee.totalExpenses.toLocaleString('ar-EG')} ج.م
            </h3>
          </div>

          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>إجمالي الحركات</span>
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginTop: '4px' }}>{selectedEmployee.transactionCount}</h3>
          </div>
        </div>
      </div>

      {/* Bank Statement Visual Timeline */}
      <div className="card">
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          📑 كشف الحساب والتايم لاين (Bank Statement Timeline)
        </h2>

        {timeline.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px' }}>لا توجد حركات عهدة أو مصروفات مسجلة لهذا الموظف بعد.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {timeline.map((item) => {
              const isDeposit = item.type === 'DEPOSIT' || item.type === 'OPENING_BALANCE'
              const dateStr = new Date(item.date).toLocaleString('ar-EG', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })

              return (
                <div key={item.id} className="timeline-item">
                  <div className={`timeline-icon ${isDeposit ? 'deposit' : 'expense'}`}>
                    {isDeposit ? '⬆️' : '⬇️'}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <strong style={{ fontSize: '15px' }}>{isDeposit ? 'إيداع عهدة' : item.category}</strong>
                      <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>• {dateStr}</span>
                    </div>

                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{item.description}</p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px' }}>
                      <CopyableOpNo opNo={item.operationNo} />

                      <button
                        onClick={() => setSelectedOpNo(item.operationNo)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-dim)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px'
                        }}
                      >
                        <FaQrcode /> عرض الباركود
                      </button>

                      {item.attachments && item.attachments.length > 0 && (
                        <span style={{ fontSize: '11px', color: 'var(--accent-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <FaPaperclip /> {item.attachments.length} مرفق
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: 'left' }}>
                    <span
                      style={{
                        fontSize: '18px',
                        fontWeight: '800',
                        color: isDeposit ? 'var(--accent-success)' : 'var(--accent-danger)'
                      }}
                    >
                      {isDeposit ? '+' : '-'}{item.amount.toLocaleString('ar-EG')} ج.م
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <DepositModal isOpen={isDepositOpen} onClose={() => setIsDepositOpen(false)} />
      <QRModal isOpen={!!selectedOpNo} operationNo={selectedOpNo} onClose={() => setSelectedOpNo(null)} />
    </motion.div>
  )
}

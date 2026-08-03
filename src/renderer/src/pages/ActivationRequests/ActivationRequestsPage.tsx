import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FaKey, FaClock, FaCheckCircle, FaCopy, FaTelegramPlane } from 'react-icons/fa'
import { useActivationStore } from '../../stores/useActivationStore'
import { useEmployeeStore } from '../../stores/useEmployeeStore'

export const ActivationRequestsPage: React.FC = () => {
  const { pendingRequests, loading, generatedOtp, fetchPending, generateOtp, clearOtp } = useActivationStore()
  const { employees, fetchEmployees } = useEmployeeStore()

  const [selectedReqId, setSelectedReqId] = useState<string | null>(null)
  const [targetEmployeeId, setTargetEmployeeId] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchPending()
    fetchEmployees()
  }, [])

  const handleGenerateCode = async () => {
    if (!selectedReqId || !targetEmployeeId) return
    await generateOtp(selectedReqId, targetEmployeeId)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="top-header">
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800' }}>طلبات تفعيل التليجرام (Activation Requests)</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            ربط حسابات التليجرام بالموظفين وتوليد أكواد التفعيل المؤقتة (صالحة لمدة 10 دقائق فقط)
          </p>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px' }}>جاري التحميل...</p>
        ) : pendingRequests.length === 0 ? (
          <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '40px' }}>
            لا توجد طلبات تفعيل معلقة حالياً. عندما يضغط موظف على Start داخل البوت، سيظهر طلبه هنا فوراً.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '13px' }}>
                  <th style={{ padding: '12px' }}>اسم التليجرام</th>
                  <th style={{ padding: '12px' }}>اسم المستخدم</th>
                  <th style={{ padding: '12px' }}>Telegram ID</th>
                  <th style={{ padding: '12px' }}>وقت الطلب</th>
                  <th style={{ padding: '12px' }}>الحالة</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map((req) => (
                  <tr key={req.id} style={{ borderBottom: '1px solid var(--border-subtle)', fontSize: '14px' }}>
                    <td style={{ padding: '14px', fontWeight: 'bold' }}>
                      <FaTelegramPlane color="#0088cc" style={{ marginLeft: '6px' }} />
                      {req.telegramName}
                    </td>
                    <td style={{ padding: '14px', color: 'var(--text-muted)' }}>
                      @{req.telegramUsername || 'لا يوجد'}
                    </td>
                    <td style={{ padding: '14px', fontFamily: 'monospace' }}>{req.telegramId}</td>
                    <td style={{ padding: '14px', color: 'var(--text-dim)', fontSize: '12px' }}>
                      {new Date(req.createdAt).toLocaleString('ar-EG')}
                    </td>
                    <td style={{ padding: '14px' }}>
                      {req.status === 'ACTIVATED' ? (
                        <span className="badge badge-active">
                          <FaCheckCircle size={10} /> تم الربط واستخدام الكود بنجاح
                        </span>
                      ) : req.status === 'CODE_GENERATED' ? (
                        <span className="badge badge-pending">
                          <FaClock size={10} /> كود تفعيل مؤقت (ينتهي خلال 10 دقائق)
                        </span>
                      ) : (
                        <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-brand)' }}>
                          طلب جديد
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px', textAlign: 'left' }}>
                      {req.status === 'ACTIVATED' ? (
                        <span style={{ fontSize: '12px', color: 'var(--accent-success)', fontWeight: 'bold' }}>
                          مكتمل ({req.employee?.name})
                        </span>
                      ) : (
                        <button
                          className="btn btn-primary"
                          style={{ padding: '6px 14px', fontSize: '12px' }}
                          onClick={() => {
                            setSelectedReqId(req.id)
                            clearOtp()
                          }}
                        >
                          <FaKey size={12} /> ربط وتوليد كود التفعيل
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* OTP Generation Modal */}
      {selectedReqId && (
        <div className="modal-overlay" onClick={() => setSelectedReqId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
              🔑 توليد كود تفعيل مؤقت (OTP)
            </h3>

            {!generatedOtp ? (
              <>
                <div className="form-group">
                  <label className="form-label">اختر الموظف المطابق لربطه بهوية التليجرام:</label>
                  <select
                    className="form-input"
                    value={targetEmployeeId}
                    onChange={(e) => setTargetEmployeeId(e.target.value)}
                  >
                    <option value="">-- حدد الموظف من القائمة --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.jobTitle}) - {emp.phone}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                  <button className="btn btn-secondary" onClick={() => setSelectedReqId(null)}>
                    إلغاء
                  </button>
                  <button className="btn btn-primary" onClick={handleGenerateCode} disabled={!targetEmployeeId}>
                    توليد الكود الآن 🔑
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  أرسل هذا الكود للموظف ليقوم بإدخاله في البوت. الكود صدمة واحدة وصالح لمدة **10 دقائق فقط**:
                </p>

                <div
                  style={{
                    background: 'var(--bg-app)',
                    border: '2px dashed var(--accent-brand)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '18px',
                    fontSize: '36px',
                    fontWeight: '800',
                    letterSpacing: '8px',
                    color: 'var(--accent-brand)',
                    marginBottom: '16px'
                  }}
                >
                  {generatedOtp}
                </div>

                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedOtp)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                  style={{ marginBottom: '16px' }}
                >
                  <FaCopy /> {copied ? 'تم نسخ الكود!' : 'نسخ الكود'}
                </button>

                <div style={{ marginTop: '16px' }}>
                  <button
                    className="btn btn-success"
                    onClick={() => {
                      setSelectedReqId(null)
                      clearOtp()
                    }}
                  >
                    <FaCheckCircle /> إغلاق الشاشة
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}

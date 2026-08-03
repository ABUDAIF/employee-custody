import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FaCalendarCheck, FaUser, FaWallet, FaArrowDown, FaCheckCircle, FaExclamationTriangle, FaPaperclip } from 'react-icons/fa'
import { useEmployeeStore } from '../../stores/useEmployeeStore'
import { CopyableOpNo } from '../../components/common/CopyableOpNo'

export const MonthClosePage: React.FC = () => {
  const { employees, fetchEmployees } = useEmployeeStore()
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null)
  const [empTimeline, setEmpTimeline] = useState<any[]>([])
  const [loadingTimeline, setLoadingTimeline] = useState(false)
  const [showRolloverPrompt, setShowRolloverPrompt] = useState(false)
  const [liquidating, setLiquidating] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    fetchEmployees()
  }, [])

  const handleOpenLiquidation = async (emp: any) => {
    setSelectedEmp(emp)
    setLoadingTimeline(true)
    setShowRolloverPrompt(false)
    try {
      const data = await window.electronAPI.getEmployeeTimeline(emp.id)
      setEmpTimeline(data)
    } catch (err) {
      console.error('Failed to load employee timeline for liquidation:', err)
    } finally {
      setLoadingTimeline(false)
    }
  }

  const handleConfirmSettlementClick = () => {
    if (!selectedEmp) return
    const balance = selectedEmp.balance || 0
    if (balance > 0) {
      setShowRolloverPrompt(true)
    } else {
      executeSettlement(false)
    }
  }

  const executeSettlement = async (rollover: boolean) => {
    if (!selectedEmp) return
    setLiquidating(true)
    try {
      const res = await window.electronAPI.liquidateEmployee({
        employeeId: selectedEmp.id,
        rolloverBalance: rollover
      })

      if (res.success) {
        setSuccessMsg(
          rollover
            ? `✅ تم تصفية حساب الموظف ${selectedEmp.name} بنجاح، وترحيل مبلغ (${res.currentBalance} ج.م) كعهدة افتتاحية للشهر الجديد.`
            : `✅ تم تصفية حساب الموظف ${selectedEmp.name} بالكامل وتصفير الرصيد إلى (0 ج.م).`
        )
        setSelectedEmp(null)
        setShowRolloverPrompt(false)
        fetchEmployees()
        setTimeout(() => setSuccessMsg(null), 5000)
      }
    } catch (err: any) {
      alert(`❌ حدث خطأ أثناء التصفية: ${err.message}`)
    } finally {
      setLiquidating(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="top-header">
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FaCalendarCheck color="var(--accent-brand)" /> تصفية وحسابات الموظفين (Employee Settlements)
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            مراجعة كشوفات الموظفين، تصفية الفترات الحالية، وتصفير الحسابات أو ترحيل الرصيد المتبقي كعهدة جديدة
          </p>
        </div>
      </div>

      {successMsg && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid var(--accent-success)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 20px',
            marginBottom: '20px',
            color: 'var(--accent-success)',
            fontWeight: 'bold',
            fontSize: '14px'
          }}
        >
          {successMsg}
        </div>
      )}

      {/* Active Employees List */}
      <div className="card">
        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>قائمة الموظفين للتصفية والربط</h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '13px' }}>
                <th style={{ padding: '12px' }}>الموظف</th>
                <th style={{ padding: '12px' }}>الوظيفة</th>
                <th style={{ padding: '12px' }}>رقم الهاتف</th>
                <th style={{ padding: '12px' }}>إجمالي العهد (ج.م)</th>
                <th style={{ padding: '12px' }}>إجمالي المصروفات (ج.م)</th>
                <th style={{ padding: '12px' }}>الرصيد المتبقي (ج.م)</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => {
                const hasTransactions = (emp.transactionCount || 0) > 0
                return (
                  <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-subtle)', fontSize: '14px' }}>
                    <td style={{ padding: '14px', fontWeight: 'bold' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FaUser color="var(--accent-brand)" />
                        <span>{emp.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px', color: 'var(--text-muted)' }}>{emp.jobTitle}</td>
                    <td style={{ padding: '14px', fontFamily: 'monospace' }}>{emp.phone}</td>
                    <td style={{ padding: '14px', fontWeight: 'bold', color: 'var(--accent-brand)' }}>
                      {(emp.totalCustody || 0).toLocaleString('ar-EG')} ج.م
                    </td>
                    <td style={{ padding: '14px', color: 'var(--accent-danger)' }}>
                      {(emp.totalExpenses || 0).toLocaleString('ar-EG')} ج.م
                    </td>
                    <td style={{ padding: '14px', fontWeight: '800', color: 'var(--accent-success)', fontSize: '15px' }}>
                      {(emp.balance || 0).toLocaleString('ar-EG')} ج.م
                    </td>
                    <td style={{ padding: '14px', textAlign: 'left' }}>
                      {hasTransactions ? (
                        <button
                          className="btn btn-primary"
                          style={{ padding: '6px 14px', fontSize: '12px', background: 'var(--accent-brand-gradient)' }}
                          onClick={() => handleOpenLiquidation(emp)}
                        >
                          ⚖️ تصفية الموظف
                        </button>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 'bold' }}>
                          لا توجد حركات للتصفية ✅
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Liquidation Statement Review Modal */}
      {selectedEmp && !showRolloverPrompt && (
        <div className="modal-overlay" onClick={() => setSelectedEmp(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '900px', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800' }}>
                  ⚖️ كشف حساب وتصفية الموظف: {selectedEmp.name}
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  مراجعة كافة التسليمات والمصروفات قبل اعتماد التصفية النهائية
                </span>
              </div>
            </div>

            {/* KPI Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: 'var(--bg-surface-hover)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>إجمالي العهد الاستلامية</span>
                <h4 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--accent-brand)', marginTop: '4px' }}>
                  {(selectedEmp.totalCustody || 0).toLocaleString('ar-EG')} ج.م
                </h4>
              </div>
              <div style={{ background: 'var(--bg-surface-hover)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>إجمالي المصروفات المسددة</span>
                <h4 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--accent-danger)', marginTop: '4px' }}>
                  {(selectedEmp.totalExpenses || 0).toLocaleString('ar-EG')} ج.م
                </h4>
              </div>
              <div style={{ background: 'var(--bg-surface-hover)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>الرصيد المتبقي الحالي</span>
                <h4 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--accent-success)', marginTop: '4px' }}>
                  {(selectedEmp.balance || 0).toLocaleString('ar-EG')} ج.م
                </h4>
              </div>
            </div>

            {/* Timeline Itemized Table */}
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px' }}>
              {loadingTimeline ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px' }}>جاري تحميل كشف الحساب...</p>
              ) : empTimeline.length === 0 ? (
                <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '30px' }}>لا توجد حركات مسجلة.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '12px' }}>
                      <th style={{ padding: '10px' }}>رقم العملية</th>
                      <th style={{ padding: '10px' }}>التاريخ والوقت</th>
                      <th style={{ padding: '10px' }}>نوع الحركة</th>
                      <th style={{ padding: '10px' }}>الفئة / الوصف</th>
                      <th style={{ padding: '10px' }}>المبلغ (ج.م)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empTimeline.map((item) => {
                      const isDeposit = item.type === 'DEPOSIT' || item.type === 'OPENING_BALANCE'
                      const dateStr = new Date(item.date).toLocaleString('ar-EG', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })

                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)', fontSize: '13px' }}>
                          <td style={{ padding: '10px' }}>
                            <CopyableOpNo opNo={item.operationNo} />
                          </td>
                          <td style={{ padding: '10px', color: 'var(--text-muted)', fontSize: '12px' }}>{dateStr}</td>
                          <td style={{ padding: '10px' }}>
                            {isDeposit ? (
                              <span className="badge badge-deposit">إيداع عهدة</span>
                            ) : (
                              <span className="badge badge-expense">مصروف ({item.category})</span>
                            )}
                          </td>
                          <td style={{ padding: '10px' }}>{item.description}</td>
                          <td style={{ padding: '10px', fontWeight: 'bold', color: isDeposit ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                            {isDeposit ? '+' : '-'}{item.amount.toLocaleString('ar-EG')} ج.م
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedEmp(null)}>
                إلغاء
              </button>
              <button className="btn btn-success" onClick={handleConfirmSettlementClick} disabled={liquidating}>
                تأكيد التصفية وإغلاق الفترة 🏁
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rollover Prompt Modal */}
      {showRolloverPrompt && selectedEmp && (
        <div className="modal-overlay" onClick={() => setShowRolloverPrompt(false)}>
          <div className="modal-content" style={{ maxWidth: '520px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>💡</div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>
              ترحيل الرصيد المتبقي للشهر الجديد؟
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.6' }}>
              يوجد رصيد متبقي في حساب الموظف <strong>{selectedEmp.name}</strong> بقيمة{' '}
              <strong style={{ color: 'var(--accent-success)', fontSize: '16px' }}>
                ({(selectedEmp.balance || 0).toLocaleString('ar-EG')} ج.م)
              </strong>
              .<br />
              كيف ترغب في التعامل مع هذا المبلغ عند التصفية؟
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                className="btn btn-primary"
                style={{ padding: '14px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                onClick={() => executeSettlement(true)}
                disabled={liquidating}
              >
                🔄 نعم، ترحيل المبلغ كعهد جديدة للشهر الجديد
              </button>

              <button
                className="btn btn-secondary"
                style={{ padding: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                onClick={() => executeSettlement(false)}
                disabled={liquidating}
              >
                🏁 لا، البدء من رصيد صفر (0 ج.م)
              </button>

              <button
                className="btn"
                style={{ background: 'transparent', color: 'var(--text-dim)', fontSize: '13px', marginTop: '6px' }}
                onClick={() => setShowRolloverPrompt(false)}
              >
                إلغاء التصفية
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}

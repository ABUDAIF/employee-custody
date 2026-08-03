import React, { useState, useEffect } from 'react'
import { FaPlus, FaTimes } from 'react-icons/fa'
import { useEmployeeStore } from '../../stores/useEmployeeStore'
import { useLedgerStore } from '../../stores/useLedgerStore'

interface DepositModalProps {
  isOpen: boolean
  onClose: () => void
}

export const DepositModal: React.FC<DepositModalProps> = ({ isOpen, onClose }) => {
  const { employees, fetchEmployees } = useEmployeeStore()
  const { createDeposit } = useLedgerStore()

  const [employeeId, setEmployeeId] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchEmployees()
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employeeId || !amount || !description) return

    setLoading(true)
    try {
      await createDeposit({
        employeeId,
        amount: parseFloat(amount),
        description
      })
      onClose()
      setEmployeeId('')
      setAmount('')
      setDescription('')
    } catch (err) {
      console.error('Failed to create deposit:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>📥 إضافة عهدة جديدة (إيداع)</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <FaTimes size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">اختر الموظف:</label>
            <select
              className="form-input"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              required
            >
              <option value="">-- حدد الموظف --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.jobTitle}) - الرصيد الحالي: {emp.balance} ج.م
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">المبلغ (بالجنيه):</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              placeholder="مثال: 5000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">وصف الإيداع:</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="مثال: إيداع عهدة شهرية جديدة للعمليات الميدانية"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              إلغاء
            </button>
            <button type="submit" className="btn btn-success" disabled={loading}>
              {loading ? 'جاري الحفظ...' : 'حفظ وإيداع العهدة 🚀'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

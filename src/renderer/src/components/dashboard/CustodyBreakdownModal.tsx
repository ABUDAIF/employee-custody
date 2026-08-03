import React, { useState } from 'react'
import { FaTimes, FaSearch, FaUser, FaWallet, FaArrowRight } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'

interface CustodyBreakdownModalProps {
  isOpen: boolean
  onClose: () => void
  employees: any[]
}

export const CustodyBreakdownModal: React.FC<CustodyBreakdownModalProps> = ({ isOpen, onClose, employees }) => {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  if (!isOpen) return null

  const filtered = employees.filter((emp) =>
    emp.name.toLowerCase().includes(search.toLowerCase()) ||
    emp.jobTitle.toLowerCase().includes(search.toLowerCase())
  )

  const totalAllCustody = employees.reduce((sum, e) => sum + (e.totalCustody || 0), 0)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '820px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaWallet color="var(--accent-brand)" /> تفاصيل إجمالي العهد لكل موظف
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              إجمالي العهد المسلمة لجميع الموظفين: <strong>{totalAllCustody.toLocaleString('ar-EG')} ج.م</strong>
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <FaTimes size={18} />
          </button>
        </div>

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', background: 'var(--bg-surface-hover)', padding: '8px 14px', borderRadius: 'var(--radius-md)' }}>
          <FaSearch color="var(--text-dim)" />
          <input
            type="text"
            placeholder="ابحث باسم الموظف أو المسمى الوظيفي..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none', fontSize: '14px' }}
          />
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '12px' }}>
                <th style={{ padding: '10px' }}>الموظف</th>
                <th style={{ padding: '10px' }}>الوظيفة</th>
                <th style={{ padding: '10px' }}>إجمالي العهد (ج.م)</th>
                <th style={{ padding: '10px' }}>إجمالي المصروفات (ج.م)</th>
                <th style={{ padding: '10px' }}>الرصيد المتبقي (ج.م)</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp) => (
                <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-subtle)', fontSize: '13px' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FaUser color="var(--accent-brand)" size={12} />
                      <span>{emp.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{emp.jobTitle}</td>
                  <td style={{ padding: '12px', fontWeight: 'bold', color: 'var(--accent-brand)' }}>
                    {(emp.totalCustody || 0).toLocaleString('ar-EG')} ج.م
                  </td>
                  <td style={{ padding: '12px', color: 'var(--accent-danger)' }}>
                    {(emp.totalExpenses || 0).toLocaleString('ar-EG')} ج.م
                  </td>
                  <td style={{ padding: '12px', fontWeight: '800', color: 'var(--accent-success)' }}>
                    {(emp.balance || 0).toLocaleString('ar-EG')} ج.م
                  </td>
                  <td style={{ padding: '12px', textAlign: 'left' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '11px' }}
                      onClick={() => {
                        onClose()
                        navigate(`/employees/${emp.id}`)
                      }}
                    >
                      كشف الحساب <FaArrowRight size={10} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

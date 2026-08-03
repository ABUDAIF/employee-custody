import React, { useState, useEffect } from 'react'
import { FaTimes, FaSearch, FaArrowDown, FaPaperclip, FaFilter } from 'react-icons/fa'
import { CopyableOpNo } from '../common/CopyableOpNo'

interface ExpensesBreakdownModalProps {
  isOpen: boolean
  onClose: () => void
  employees: any[]
}

export const ExpensesBreakdownModal: React.FC<ExpensesBreakdownModalProps> = ({ isOpen, onClose, employees }) => {
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('ALL')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadExpenses()
    }
  }, [isOpen])

  const loadExpenses = async () => {
    setLoading(true)
    try {
      const data = await window.electronAPI.getLedgerEntries({ type: 'EXPENSE' })
      setEntries(data)
    } catch (err) {
      console.error('Failed to load expenses breakdown:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  // Filter entries by employee bubble filter + search query
  const filtered = entries.filter((item) => {
    const matchesEmp = selectedEmployeeId === 'ALL' || item.employeeId === selectedEmployeeId
    const query = search.toLowerCase().trim()
    const matchesSearch =
      !query ||
      (item.employee?.name || '').toLowerCase().includes(query) ||
      (item.category || '').toLowerCase().includes(query) ||
      (item.description || '').toLowerCase().includes(query) ||
      (item.operationNo || '').toLowerCase().includes(query)
    return matchesEmp && matchesSearch
  })

  const totalFilteredSum = filtered.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '960px', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaArrowDown color="var(--accent-danger)" /> تفاصيل المصروفات لجميع الموظفين
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              إجمالي المصروفات المحددة: <strong style={{ color: 'var(--accent-danger)' }}>{totalFilteredSum.toLocaleString('ar-EG')} ج.م</strong> ({filtered.length} حركة)
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <FaTimes size={18} />
          </button>
        </div>

        {/* Employee Filter Chips / Bubbles */}
        <div style={{ marginBottom: '14px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FaFilter size={10} /> فلترة حسب الموظف:
          </span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', maxHeight: '80px', overflowY: 'auto' }}>
            <button
              onClick={() => setSelectedEmployeeId('ALL')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-subtle)',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                background: selectedEmployeeId === 'ALL' ? 'var(--accent-brand)' : 'var(--bg-surface-hover)',
                color: selectedEmployeeId === 'ALL' ? '#fff' : 'var(--text-muted)',
                transition: 'var(--transition-fast)'
              }}
            >
              الكل ({entries.length})
            </button>

            {employees.map((emp) => {
              const count = entries.filter((e) => e.employeeId === emp.id).length
              const isSelected = selectedEmployeeId === emp.id
              return (
                <button
                  key={emp.id}
                  onClick={() => setSelectedEmployeeId(emp.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--accent-brand)' : 'var(--bg-surface-hover)',
                    color: isSelected ? '#fff' : 'var(--text-muted)',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  👤 {emp.name} ({count})
                </button>
              )
            })}
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', background: 'var(--bg-surface-hover)', padding: '8px 14px', borderRadius: 'var(--radius-md)' }}>
          <FaSearch color="var(--text-dim)" />
          <input
            type="text"
            placeholder="فلترة برقم العملية، اسم الموظف، الفئة (وقود، صيانة...) أو الوصف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none', fontSize: '14px' }}
          />
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px' }}>جاري التحميل...</p>
          ) : filtered.length === 0 ? (
            <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '30px' }}>لا توجد مصروفات تطابق خيارات البحث.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '12px' }}>
                  <th style={{ padding: '10px' }}>رقم العملية (انقر للنسخ)</th>
                  <th style={{ padding: '10px' }}>التاريخ والوقت (ساعة الجهاز)</th>
                  <th style={{ padding: '10px' }}>الموظف</th>
                  <th style={{ padding: '10px' }}>الفئة</th>
                  <th style={{ padding: '10px' }}>الوصف</th>
                  <th style={{ padding: '10px' }}>المبلغ (ج.م)</th>
                  <th style={{ padding: '10px' }}>المرفقات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const dateStr = new Date(item.date).toLocaleString('ar-EG', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                  })

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)', fontSize: '13px' }}>
                      <td style={{ padding: '10px' }}>
                        <CopyableOpNo opNo={item.operationNo} />
                      </td>
                      <td style={{ padding: '10px', color: 'var(--text-muted)', fontSize: '12px' }}>{dateStr}</td>
                      <td style={{ padding: '10px', fontWeight: 'bold' }}>{item.employee?.name || '-'}</td>
                      <td style={{ padding: '10px', color: 'var(--accent-brand)' }}>{item.category || '-'}</td>
                      <td style={{ padding: '10px', maxWidth: '200px' }}>{item.description}</td>
                      <td style={{ padding: '10px', fontWeight: '800', color: 'var(--accent-danger)' }}>
                        {item.amount.toLocaleString('ar-EG')} ج.م
                      </td>
                      <td style={{ padding: '10px' }}>
                        {item.attachments && item.attachments.length > 0 ? (
                          <span style={{ fontSize: '11px', color: 'var(--accent-brand)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <FaPaperclip size={10} /> {item.attachments.length} مرفق
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

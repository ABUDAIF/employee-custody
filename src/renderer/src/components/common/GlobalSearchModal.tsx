import React, { useState, useEffect } from 'react'
import { FaSearch, FaTimes, FaUser, FaReceipt, FaFileAlt } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import { CopyableOpNo } from './CopyableOpNo'

interface GlobalSearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ employees: any[]; ledgerEntries: any[] }>({
    employees: [],
    ledgerEntries: []
  })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!query.trim()) {
      setResults({ employees: [], ledgerEntries: [] })
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await window.electronAPI.globalSearch(query)
        setResults(data)
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setLoading(false)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [query])

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '680px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Box */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '16px'
          }}
        >
          <FaSearch size={20} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="ابحث برقم العملية، اسم الموظف، المبلغ، الفئة، الوصف..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-main)',
              fontSize: '16px',
              outline: 'none'
            }}
          />
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <FaTimes size={18} />
          </button>
        </div>

        {/* Results List */}
        <div style={{ flex: 1, overflowY: 'auto', marginTop: '16px' }}>
          {loading && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>جاري البحث...</p>}

          {!loading && query && results.employees.length === 0 && results.ledgerEntries.length === 0 && (
            <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '30px' }}>
              لا توجد نتائج تطابق "{query}"
            </p>
          )}

          {/* Group 1: Employees */}
          {results.employees.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-dim)', marginBottom: '8px', display: 'block' }}>
                الموظفين ({results.employees.length})
              </span>
              {results.employees.map((emp) => (
                <div
                  key={emp.id}
                  onClick={() => {
                    navigate(`/employees/${emp.id}`)
                    onClose()
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    background: 'var(--bg-surface-hover)',
                    marginBottom: '6px'
                  }}
                >
                  <FaUser color="var(--accent-brand)" />
                  <div>
                    <strong style={{ color: 'var(--text-main)', fontSize: '14px' }}>{emp.name}</strong>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginRight: '10px' }}>{emp.jobTitle}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Group 2: Ledger Entries */}
          {results.ledgerEntries.length > 0 && (
            <div>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-dim)', marginBottom: '8px', display: 'block' }}>
                القيود والحركات ({results.ledgerEntries.length})
              </span>
              {results.ledgerEntries.map((entry) => {
                const isDeposit = entry.type === 'DEPOSIT'
                return (
                  <div
                    key={entry.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-surface-hover)',
                      marginBottom: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: 'var(--radius-md)',
                          background: isDeposit ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                          color: isDeposit ? 'var(--accent-success)' : 'var(--accent-danger)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold'
                        }}
                      >
                        {isDeposit ? '⬆️' : '⬇️'}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CopyableOpNo opNo={entry.operationNo} />
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>({entry.employee?.name})</span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {entry.category} - {entry.description}
                        </p>
                      </div>
                    </div>

                    <div style={{ textAlign: 'left' }}>
                      <span
                        style={{
                          fontWeight: 'bold',
                          fontSize: '15px',
                          color: isDeposit ? 'var(--accent-success)' : 'var(--accent-danger)'
                        }}
                      >
                        {isDeposit ? '+' : '-'}{entry.amount.toLocaleString('ar-EG')} ج.م
                      </span>
                      {entry.attachments && entry.attachments.length > 0 && (
                        <div style={{ fontSize: '11px', color: 'var(--accent-brand)', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                          <FaReceipt size={10} /> {entry.attachments.length} مرفق
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

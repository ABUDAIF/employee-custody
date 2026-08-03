import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FaExchangeAlt, FaQrcode, FaPaperclip, FaFilter } from 'react-icons/fa'
import { useLedgerStore } from '../../stores/useLedgerStore'
import { QRModal } from '../../components/common/QRModal'
import { CopyableOpNo } from '../../components/common/CopyableOpNo'

export const LedgerPage: React.FC = () => {
  const { entries, totalEntries, page, totalPages, loading, fetchEntries } = useLedgerStore()
  const [filterType, setFilterType] = useState<string>('')
  const [selectedOpNo, setSelectedOpNo] = useState<string | null>(null)

  useEffect(() => {
    fetchEntries({ type: filterType || undefined })
  }, [filterType])

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="top-header">
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800' }}>الدفتر المحاسبي الموحد (General Ledger)</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            جميع حركات العهد والمصروفات والتسويات مسجلة بتوليد أرقام قيود فريدة (إجمالي: {totalEntries} حركة)
          </p>
        </div>

        {/* Filter Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaFilter color="var(--text-dim)" size={14} />
          <select
            className="form-input"
            style={{ padding: '8px 14px', fontSize: '13px' }}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">جميع الحركات</option>
            <option value="DEPOSIT">إيداعات العهد فقط</option>
            <option value="EXPENSE">المصروفات فقط</option>
          </select>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px' }}>جاري تحميل الدفتر...</p>
        ) : entries.length === 0 ? (
          <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '40px' }}>لا توجد قيود مسجلة تفيم تصفية البحث.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '13px' }}>
                  <th style={{ padding: '12px' }}>رقم العملية</th>
                  <th style={{ padding: '12px' }}>التاريخ والوقت</th>
                  <th style={{ padding: '12px' }}>الموظف</th>
                  <th style={{ padding: '12px' }}>نوع الحركة</th>
                  <th style={{ padding: '12px' }}>الفئة</th>
                  <th style={{ padding: '12px' }}>الوصف</th>
                  <th style={{ padding: '12px' }}>المبلغ</th>
                  <th style={{ padding: '12px' }}>المصدر / المرفقات</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const isDeposit = entry.type === 'DEPOSIT' || entry.type === 'OPENING_BALANCE'
                  const dateStr = new Date(entry.date).toLocaleString('ar-EG', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                  })
                  const attCount = entry.attachments ? entry.attachments.length : 0

                  return (
                    <tr key={entry.id} style={{ borderBottom: '1px solid var(--border-subtle)', fontSize: '13px' }}>
                      <td style={{ padding: '14px', fontWeight: 'bold' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <CopyableOpNo opNo={entry.operationNo} />
                          <button
                            onClick={() => setSelectedOpNo(entry.operationNo)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-dim)',
                              cursor: 'pointer'
                            }}
                            title="عرض QR Code للعملية"
                          >
                            <FaQrcode size={12} />
                          </button>
                        </div>
                      </td>

                      <td style={{ padding: '14px', color: 'var(--text-muted)', fontSize: '12px' }}>{dateStr}</td>
                      <td style={{ padding: '14px', fontWeight: 'bold' }}>{entry.employee?.name}</td>

                      <td style={{ padding: '14px' }}>
                        {isDeposit ? (
                          <span className="badge badge-deposit">إيداع عهدة</span>
                        ) : (
                          <span className="badge badge-expense">مصروف</span>
                        )}
                      </td>

                      <td style={{ padding: '14px', color: 'var(--text-muted)' }}>{entry.category || '-'}</td>
                      <td style={{ padding: '14px', maxWidth: '240px' }}>{entry.description}</td>

                      <td style={{ padding: '14px', fontWeight: '800', fontSize: '15px' }}>
                        <span style={{ color: isDeposit ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                          {isDeposit ? '+' : '-'}{entry.amount.toLocaleString('ar-EG')} ج.م
                        </span>
                      </td>

                      <td style={{ padding: '14px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{entry.createdBy}</div>
                        {attCount > 0 && (
                          <span style={{ fontSize: '11px', color: 'var(--accent-brand)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <FaPaperclip size={10} /> {attCount} مرفق
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <QRModal isOpen={!!selectedOpNo} operationNo={selectedOpNo} onClose={() => setSelectedOpNo(null)} />
    </motion.div>
  )
}

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FaExchangeAlt, FaQrcode, FaPaperclip, FaFilter, FaChevronRight, FaChevronLeft } from 'react-icons/fa'
import { useLedgerStore } from '../../stores/useLedgerStore'
import { QRModal } from '../../components/common/QRModal'
import { CopyableOpNo } from '../../components/common/CopyableOpNo'
import { AttachmentModal } from '../../components/common/AttachmentModal'

export const LedgerPage: React.FC = () => {
  const { entries, totalEntries, totalPages, loading, fetchEntries } = useLedgerStore()
  const [filterType, setFilterType] = useState<string>('')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(20)
  const [selectedOpNo, setSelectedOpNo] = useState<string | null>(null)
  const [activeAttachments, setActiveAttachments] = useState<any[] | null>(null)

  useEffect(() => {
    setCurrentPage(1)
  }, [filterType, pageSize])

  useEffect(() => {
    fetchEntries({ page: currentPage, limit: pageSize, type: filterType || undefined })
  }, [currentPage, pageSize, filterType])

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="top-header">
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800' }}>الدفتر المحاسبي الموحد (General Ledger)</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            جميع حركات العهد والمصروفات والتسويات مسجلة بتوليد أرقام قيود فريدة (إجمالي: {totalEntries} حركة)
          </p>
        </div>

        {/* Filter Chips & Page Size */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>عرض:</span>
            <select
              className="form-input"
              style={{ padding: '8px 10px', fontSize: '13px' }}
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              <option value={20}>20 صف لكل صفحة</option>
              <option value={50}>50 صف لكل صفحة</option>
              <option value={100}>100 صف لكل صفحة</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px' }}>جاري تحميل الدفتر...</p>
        ) : entries.length === 0 ? (
          <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '40px' }}>لا توجد قيود مسجلة تطابق تصفية البحث.</p>
        ) : (
          <>
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
                            <button
                              onClick={() => setActiveAttachments(entry.attachments)}
                              style={{
                                background: 'none',
                                border: 'none',
                                fontSize: '11px',
                                color: 'var(--accent-brand)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                marginTop: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                              }}
                              title="اضغط لعرض المرفقات وفتح الملفات"
                            >
                              <FaPaperclip size={10} /> {attCount} مرفق (فتح)
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '20px',
                borderTop: '1px solid var(--border-subtle)',
                marginTop: '10px'
              }}
            >
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                صفحة <strong style={{ color: 'var(--text-main)' }}>{currentPage}</strong> من{' '}
                <strong style={{ color: 'var(--text-main)' }}>{totalPages || 1}</strong> (إجمالي القيود: {totalEntries})
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                >
                  <FaChevronRight size={10} /> الصفحة السابقة
                </button>

                <button
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                >
                  الصفحة التالية <FaChevronLeft size={10} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <QRModal isOpen={!!selectedOpNo} operationNo={selectedOpNo} onClose={() => setSelectedOpNo(null)} />
      <AttachmentModal isOpen={!!activeAttachments} attachments={activeAttachments || []} onClose={() => setActiveAttachments(null)} />
    </motion.div>
  )
}

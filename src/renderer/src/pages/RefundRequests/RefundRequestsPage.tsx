import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FaUndoAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaHourglassHalf,
  FaUser,
  FaPhone,
  FaPaperclip,
  FaCommentDots,
  FaSpinner,
  FaTimes
} from 'react-icons/fa'
import { CopyableOpNo } from '../../components/common/CopyableOpNo'
import { AttachmentModal } from '../../components/common/AttachmentModal'

export const RefundRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [statusFilter, setStatusFilter] = useState<string>('PENDING')

  const [activeAttachments, setActiveAttachments] = useState<any[] | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null)
  const [actionType, setActionType] = useState<'APPROVED' | 'REJECTED' | null>(null)
  const [accountantNote, setAccountantNote] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchRequests()
  }, [statusFilter])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const data = await (window.electronAPI as any).getAllRefundRequests(statusFilter || undefined)
      setRequests(data || [])
    } catch (err) {
      console.error('Failed to fetch refund requests:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDecisionModal = (req: any, type: 'APPROVED' | 'REJECTED') => {
    setSelectedRequest(req)
    setActionType(type)
    setAccountantNote(type === 'APPROVED' ? 'تم قبول الطلب وإعادة المبلغ لرصيدك.' : 'تم مراجعة الفاتورة والمستندات ورفض طلب الاسترداد.')
    setStatusMsg(null)
  }

  const handleProcessDecision = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRequest || !actionType) return

    setSubmitting(true)
    setStatusMsg(null)

    try {
      const res = await (window.electronAPI as any).processRefundRequest({
        requestId: selectedRequest.id,
        status: actionType,
        accountantNote: accountantNote.trim()
      })

      if (res.success) {
        setStatusMsg({ type: 'success', text: res.message })
        setTimeout(() => {
          setSelectedRequest(null)
          setActionType(null)
          fetchRequests()
        }, 1200)
      } else {
        setStatusMsg({ type: 'error', text: res.message })
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `خطأ في المعالجة: ${err.message}` })
    } finally {
      setSubmitting(false)
    }
  }

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Top Header */}
      <div className="top-header">
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FaUndoAlt color="var(--accent-brand)" /> طلبات الاسترداد وإلغاء القيود
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            مراجعة واتخاذ القرار في طلبات استرجاع المبالغ والمصروفات المسجلة بالخطأ من قبل الموظفين
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`btn ${statusFilter === 'PENDING' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusFilter('PENDING')}
            style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FaHourglassHalf color={statusFilter === 'PENDING' ? '#fff' : '#facc15'} />
            الطلبات المعلقة ({pendingCount})
          </button>
          <button
            className={`btn ${statusFilter === 'APPROVED' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusFilter('APPROVED')}
            style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FaCheckCircle color={statusFilter === 'APPROVED' ? '#fff' : '#4ade80'} />
            تم استرداد قيمتها
          </button>
          <button
            className={`btn ${statusFilter === 'REJECTED' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusFilter('REJECTED')}
            style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FaTimesCircle color={statusFilter === 'REJECTED' ? '#fff' : '#ef4444'} />
            طلبات مرفوضة
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>جاري تحميل طلبات الاسترداد...</p>
      ) : requests.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <FaUndoAlt size={48} color="var(--border-subtle)" style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>لا توجد طلبات استرداد في هذه الفئة حالياً.</h3>
          <p style={{ fontSize: '12px', marginTop: '6px' }}>
            يمكن للموظفين تقديم طلب استرداد لأي عملية مصروف من خلال زر البوت التفاعلي (🔄 طلب استرداد).
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
          {requests.map((req) => {
            const isPending = req.status === 'PENDING'
            const isApproved = req.status === 'APPROVED'
            const dateStr = new Date(req.createdAt).toLocaleString('ar-EG', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })
            const attCount = req.ledgerEntry?.attachments ? req.ledgerEntry.attachments.length : 0

            return (
              <div
                key={req.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  border: isPending
                    ? '1px solid rgba(250, 204, 21, 0.4)'
                    : isApproved
                    ? '1px solid rgba(74, 222, 128, 0.3)'
                    : '1px solid rgba(239, 68, 68, 0.3)'
                }}
              >
                {/* Top Info Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                    طلب رقم: <CopyableOpNo opNo={req.requestNo} />
                  </span>

                  {isPending ? (
                    <span className="badge badge-pending">
                      <FaHourglassHalf size={10} /> بانتظار المراجعة
                    </span>
                  ) : isApproved ? (
                    <span className="badge badge-active">
                      <FaCheckCircle size={10} /> تم قبول الاسترداد
                    </span>
                  ) : (
                    <span className="badge badge-expense">
                      <FaTimesCircle size={10} /> مرفوض
                    </span>
                  )}
                </div>

                {/* Employee Profile */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--accent-brand-gradient)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: '#fff'
                    }}
                  >
                    {req.employee?.name?.charAt(0) || <FaUser />}
                  </div>
                  <div>
                    <strong style={{ fontSize: '14px', display: 'block' }}>{req.employee?.name}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {req.employee?.jobTitle} • <FaPhone size={10} /> {req.employee?.phone}
                    </span>
                  </div>
                </div>

                {/* Operation Details Box */}
                <div style={{ background: 'var(--bg-surface-hover)', padding: '12px 14px', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-dim)' }}>العملية المراد استردادها:</span>
                    <CopyableOpNo opNo={req.operationNo} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-dim)' }}>المبلغ المطلوب إرجاعه:</span>
                    <strong style={{ color: 'var(--accent-danger)', fontSize: '15px' }}>
                      {req.amount.toLocaleString('ar-EG')} ج.م
                    </strong>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    <strong>البيان الأصلي:</strong> {req.ledgerEntry?.description || '-'}
                  </div>

                  {attCount > 0 && (
                    <button
                      onClick={() => setActiveAttachments(req.ledgerEntry.attachments)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '11px',
                        color: 'var(--accent-brand)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginTop: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      <FaPaperclip size={10} /> استعراض الفاتورة المرفقة ({attCount})
                    </button>
                  )}
                </div>

                {/* Employee Reason */}
                <div
                  style={{
                    padding: '10px 14px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '12px',
                    color: '#60a5fa'
                  }}
                >
                  <strong style={{ display: 'block', marginBottom: '4px' }}>💬 سبب الموظف لطلب الاسترداد:</strong>
                  <span>{req.reason}</span>
                </div>

                {/* Accountant Notes if processed */}
                {req.accountantNote && (
                  <div
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(0, 0, 0, 0.25)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '11px',
                      color: 'var(--text-muted)'
                    }}
                  >
                    <strong>تعليق وملاحظة المحاسب:</strong> {req.accountantNote}
                  </div>
                )}

                {/* Action Controls for Pending Requests */}
                {isPending && (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                    <button
                      className="btn btn-success"
                      style={{ flex: 1, padding: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      onClick={() => handleOpenDecisionModal(req, 'APPROVED')}
                    >
                      <FaCheckCircle /> قبول واستراد المبلغ
                    </button>
                    <button
                      className="btn btn-danger"
                      style={{ flex: 1, padding: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      onClick={() => handleOpenDecisionModal(req, 'REJECTED')}
                    >
                      <FaTimesCircle /> رفض الطلب
                    </button>
                  </div>
                )}

                <div style={{ fontSize: '11px', color: 'var(--text-dim)', textAlign: 'left', marginTop: 'auto' }}>
                  تاريخ الطلب: {dateStr}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Decision Modal Dialog */}
      <AnimatePresence>
        {selectedRequest && actionType && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              backdropFilter: 'blur(4px)'
            }}
            onClick={() => setSelectedRequest(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card"
              style={{ width: '500px', maxWidth: '92%', padding: '24px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {actionType === 'APPROVED' ? (
                    <FaCheckCircle color="var(--accent-success)" />
                  ) : (
                    <FaTimesCircle color="var(--accent-danger)" />
                  )}
                  {actionType === 'APPROVED' ? 'تأكيد قبول طلب الاسترداد وإعادة المبلغ' : 'تأكيد رفض طلب الاسترداد'}
                </h3>
                <button onClick={() => setSelectedRequest(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <FaTimes size={18} />
                </button>
              </div>

              {statusMsg && (
                <div
                  style={{
                    padding: '10px 14px',
                    background: statusMsg.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: statusMsg.type === 'success' ? '#4ade80' : 'var(--accent-danger)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '12px',
                    marginBottom: '14px'
                  }}
                >
                  {statusMsg.text}
                </div>
              )}

              <form onSubmit={handleProcessDecision} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ background: 'var(--bg-surface-hover)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
                  <div>
                    <strong>الموظف:</strong> {selectedRequest.employee?.name}
                  </div>
                  <div>
                    <strong>رقم العملية:</strong> {selectedRequest.operationNo}
                  </div>
                  <div>
                    <strong>المبلغ:</strong>{' '}
                    <strong style={{ color: 'var(--accent-success)' }}>
                      {selectedRequest.amount.toLocaleString('ar-EG')} ج.م
                    </strong>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
                    💬 ملاحظة المحاسب وتعليق القرار (سيصل إشعار بها للموظف):
                  </label>
                  <textarea
                    className="input-field"
                    rows={3}
                    placeholder="اكتب ملاحظة أو تعليق توضيحي للموظف..."
                    value={accountantNote}
                    onChange={(e) => setAccountantNote(e.target.value)}
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setSelectedRequest(null)} disabled={submitting}>
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className={`btn ${actionType === 'APPROVED' ? 'btn-success' : 'btn-danger'}`}
                    disabled={submitting}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {submitting ? <FaSpinner className="spin" /> : actionType === 'APPROVED' ? <FaCheckCircle /> : <FaTimesCircle />}
                    {submitting ? 'جاري الحفظ والرد...' : actionType === 'APPROVED' ? 'قبول وإرجاع المبلغ لرصيد الموظف 🚀' : 'رفض الطلب نهائياً ❌'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AttachmentModal isOpen={!!activeAttachments} attachments={activeAttachments || []} onClose={() => setActiveAttachments(null)} />
    </motion.div>
  )
}

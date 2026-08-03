import React, { useState, useEffect } from 'react'
import { FaTimes, FaQrcode, FaPrint } from 'react-icons/fa'

interface QRModalProps {
  isOpen: boolean
  operationNo: string | null
  onClose: () => void
}

export const QRModal: React.FC<QRModalProps> = ({ isOpen, operationNo, onClose }) => {
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && operationNo) {
      setLoading(true)
      window.electronAPI
        .generateQRCode(operationNo)
        .then((url: string) => setQrUrl(url))
        .catch((err: any) => console.error('Failed to generate QR Code:', err))
        .finally(() => setLoading(false))
    }
  }, [isOpen, operationNo])

  if (!isOpen || !operationNo) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ textAlign: 'center', maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>
            <FaQrcode style={{ marginLeft: '8px' }} /> باركود العملية #{operationNo}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <FaTimes size={18} />
          </button>
        </div>

        {loading ? (
          <p style={{ padding: '30px', color: 'var(--text-muted)' }}>جاري توليد الـ QR Code...</p>
        ) : (
          qrUrl && (
            <div style={{ background: '#ffffff', padding: '20px', borderRadius: 'var(--radius-lg)', display: 'inline-block' }}>
              <img src={qrUrl} alt={`QR Code ${operationNo}`} style={{ width: '220px', height: '220px' }} />
              <p style={{ color: '#0F172A', fontWeight: 'bold', marginTop: '10px', fontSize: '14px' }}>#{operationNo}</p>
            </div>
          )
        )}

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            إغلاق
          </button>
          <button className="btn btn-primary" onClick={() => window.print()}>
            <FaPrint /> طباعة الباركود
          </button>
        </div>
      </div>
    </div>
  )
}

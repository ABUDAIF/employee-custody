import React, { useState } from 'react'
import { FaUserPlus, FaTimes } from 'react-icons/fa'
import { useEmployeeStore } from '../../stores/useEmployeeStore'

interface NewEmployeeModalProps {
  isOpen: boolean
  onClose: () => void
}

export const NewEmployeeModal: React.FC<NewEmployeeModalProps> = ({ isOpen, onClose }) => {
  const { createEmployee } = useEmployeeStore()
  const [name, setName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !jobTitle || !phone) return

    setLoading(true)
    try {
      await createEmployee({ name, jobTitle, phone })
      onClose()
      setName('')
      setJobTitle('')
      setPhone('')
    } catch (err) {
      console.error('Failed to create employee:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>👤 إضافة موظف جديد</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <FaTimes size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">الاسم الكامل:</label>
            <input
              type="text"
              className="form-input"
              placeholder="مثال: محمد أحمد علي"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">المسمى الوظيفي:</label>
            <input
              type="text"
              className="form-input"
              placeholder="مثال: مهندس موقع / سائق / فني"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">رقم الهاتف:</label>
            <input
              type="tel"
              className="form-input"
              placeholder="مثال: 0501234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              إلغاء
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'جاري الإضافة...' : 'إضافة الموظف 👤'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

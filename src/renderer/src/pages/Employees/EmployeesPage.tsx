import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FaUserPlus, FaPhone, FaExchangeAlt, FaCheckCircle, FaHourglassHalf } from 'react-icons/fa'
import { useEmployeeStore } from '../../stores/useEmployeeStore'
import { NewEmployeeModal } from '../../components/common/NewEmployeeModal'
import { useNavigate } from 'react-router-dom'

export const EmployeesPage: React.FC = () => {
  const { employees, loading, fetchEmployees } = useEmployeeStore()
  const [isNewOpen, setIsNewOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchEmployees()
  }, [])

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Header */}
      <div className="top-header">
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800' }}>دليل الموظفين والعهد المالية</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>إدارة ملفات الموظفين، حالة التفعيل ورصيد العهد الحالية</p>
        </div>

        <button className="btn btn-primary" onClick={() => setIsNewOpen(true)}>
          <FaUserPlus size={16} />
          إضافة موظف جديد
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', padding: '40px', textAlign: 'center' }}>جاري تحميل الموظفين...</p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px'
          }}
        >
          {employees.map((emp) => {
            const isActivated = emp.status === 'ACTIVE'
            return (
              <div
                key={emp.id}
                className="card"
                onClick={() => navigate(`/employees/${emp.id}`)}
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  position: 'relative'
                }}
              >
                {/* Status Pill */}
                <div style={{ position: 'absolute', top: '16px', left: '16px' }}>
                  {isActivated ? (
                    <span className="badge badge-active">
                      <FaCheckCircle size={10} /> مفعّل
                    </span>
                  ) : (
                    <span className="badge badge-pending">
                      <FaHourglassHalf size={10} /> بانتظار التفعيل
                    </span>
                  )}
                </div>

                {/* Profile Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--accent-brand-gradient)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '22px',
                      fontWeight: 'bold',
                      color: '#fff',
                      boxShadow: 'var(--shadow-glow-brand)'
                    }}
                  >
                    {emp.name.charAt(0)}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '700' }}>{emp.name}</h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{emp.jobTitle}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
                      <FaPhone size={10} />
                      <span>{emp.phone}</span>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>الرصيد المتبقي</span>
                    <h4 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--accent-success)' }}>
                      {emp.balance.toLocaleString('ar-EG')} <span style={{ fontSize: '11px', fontWeight: 'normal' }}>ج.م</span>
                    </h4>
                  </div>

                  <div style={{ textAlign: 'left' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>عدد الحركات</span>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FaExchangeAlt size={12} color="var(--text-muted)" /> {emp.transactionCount}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <NewEmployeeModal isOpen={isNewOpen} onClose={() => setIsNewOpen(false)} />
    </motion.div>
  )
}

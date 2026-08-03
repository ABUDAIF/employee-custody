import React, { useState } from 'react'
import { FaCopy, FaCheck } from 'react-icons/fa'

interface CopyableOpNoProps {
  opNo: string
}

export const CopyableOpNo: React.FC<CopyableOpNoProps> = ({ opNo }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(opNo)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <span
      onClick={handleCopy}
      title="انقر لنسخ رقم العملية"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: 'var(--bg-surface-hover)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-sm)',
        padding: '3px 8px',
        fontSize: '12px',
        fontFamily: 'monospace',
        fontWeight: 'bold',
        color: copied ? 'var(--accent-success)' : 'var(--accent-brand)',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'var(--transition-fast)'
      }}
    >
      <span>#{opNo}</span>
      {copied ? <FaCheck size={10} color="var(--accent-success)" /> : <FaCopy size={10} opacity={0.7} />}
    </span>
  )
}

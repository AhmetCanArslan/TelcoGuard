import { useState, useRef, useEffect } from 'react'
import { FaTimes, FaCheck } from 'react-icons/fa'

interface Props {
  onResolve: (note: string) => void
  onClose: () => void
  title?: string
  confirmLabel?: string
  placeholder?: string
}

export default function ResolveModal({ onResolve, onClose, title = 'Çözüm Notu', confirmLabel = 'Çöz', placeholder = 'Çözüm ile ilgili kısa bir açıklama yazın...' }: Props) {
  const [note, setNote] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleSubmit = () => {
    const trimmed = note.trim()
    if (!trimmed) return
    onResolve(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-card">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="modal-body">
          <textarea
            ref={textareaRef}
            className="resolve-textarea"
            value={note}
            onChange={e => setNote(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={4}
          />

          <div className="resolve-actions">
            <button className="btn-resolve-cancel" onClick={onClose}>
              Iptal
            </button>
            <button
              className="btn-resolve-confirm"
              onClick={handleSubmit}
              disabled={!note.trim()}
            >
              <FaCheck />
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

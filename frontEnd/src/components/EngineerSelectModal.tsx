import { useState, useEffect } from 'react'
import { FaTimes, FaUserCheck, FaUserClock, FaMapMarkerAlt } from 'react-icons/fa'
import { apiGetUsers } from '../services/api'
import type { FieldEngineer } from '../types'

interface Props {
  onSelect: (engineer: FieldEngineer) => void
  onClose: () => void
}

export default function EngineerSelectModal({ onSelect, onClose }: Props) {
  const [engineers, setEngineers] = useState<FieldEngineer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGetUsers()
      .then(users => {
        setEngineers(users.filter(u => u.role === 'FIELD_ENGINEER' && u.active))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-card">
        <div className="modal-header">
          <h3>Saha Muhendisi Sec</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="modal-loading">
              <div className="loading-spinner" />
              <p>Saha muhendisleri yukleniyor...</p>
            </div>
          ) : engineers.length === 0 ? (
            <div className="modal-empty">
              <FaUserClock size={32} />
              <p>Uygun saha muhendisi bulunamadi</p>
            </div>
          ) : (
            <div className="engineer-list">
              {engineers.map(eng => (
                <button
                  key={eng.id}
                  className="engineer-item"
                  onClick={() => onSelect(eng)}
                >
                  <div className="engineer-info">
                    <span className="engineer-name">{eng.name}</span>
                    <span className="engineer-email">{eng.email}</span>
                    {eng.latitude && eng.longitude && (
                      <span className="engineer-location">
                        <FaMapMarkerAlt size={10} />
                        {eng.latitude.toFixed(4)}, {eng.longitude.toFixed(4)}
                      </span>
                    )}
                  </div>
                  <div className="engineer-meta">
                    <span className={`engineer-status ${eng.is_online ? 'online' : 'offline'}`}>
                      {eng.is_online ? 'Cevrimici' : 'Cevrimdisi'}
                    </span>
                    <span className="engineer-select-hint">
                      <FaUserCheck />
                      Sec
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

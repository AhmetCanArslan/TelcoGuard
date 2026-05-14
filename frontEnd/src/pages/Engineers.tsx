import { useState, useEffect } from 'react'
import { apiGetUsers } from '../services/api'
import { wsService } from '../services/websocket'
import type { FieldEngineer } from '../types'

export default function Engineers() {
  const [engineers, setEngineers] = useState<FieldEngineer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUsers = () => {
      apiGetUsers()
        .then(users => {
          const fieldEngineers = (users as FieldEngineer[]).filter(
            u => u.role === 'FIELD_ENGINEER'
          )
          setEngineers(fieldEngineers)
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    }

    fetchUsers()

    const unbind = wsService.on('user_status', (msg) => {
      const payload = msg.payload as { user_id: number; is_online: boolean }
      setEngineers(prev => prev.map(eng => 
        eng.id === payload.user_id 
          ? { ...eng, is_online: payload.is_online } 
          : eng
      ))
    })

    return () => unbind()
  }, [])

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}><div className="loading-spinner" /></div>
  }

  const onlineCount = engineers.filter(e => e.is_online).length

  return (
    <>
      <div className="page-header">
        <h2>Saha Mühendisleri</h2>
        <div className="live-badge">
          <span className="live-dot" />
          {onlineCount} Çevrimiçi
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {engineers.map(eng => (
          <div key={eng.id} className="stat-card" style={{ flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
              <div className="user-avatar" style={{
                width: 42, height: 42, fontSize: 14,
                borderColor: eng.is_online ? 'var(--status-active)' : 'var(--status-offline)'
              }}>
                {eng.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{eng.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-data)' }}>
                  {eng.email}
                </div>
              </div>
              <span className={`status-badge ${eng.is_online ? 'RESOLVED' : 'OPEN'}`}
                style={{ fontSize: 11 }}>
                {eng.is_online ? 'Çevrimiçi' : 'Çevrimdışı'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: 12, color: 'var(--text-secondary)' }}>
              <span>Rol: <strong>{eng.role}</strong></span>
              <span>Durum: <strong>{eng.is_online ? 'ONLINE' : 'OFFLINE'}</strong></span>
            </div>
          </div>
        ))}
        {engineers.length === 0 && (
          <p style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center', gridColumn: '1 / -1' }}>
            Saha mühendisi bulunamadı
          </p>
        )}
      </div>
    </>
  )
}

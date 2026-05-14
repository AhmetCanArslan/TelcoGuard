import { useState, useEffect } from 'react'
import { FaCommentDots, FaPaperPlane } from 'react-icons/fa'
import { apiGetUsers } from '../services/api'
import { wsService } from '../services/websocket'
import type { FieldEngineer, Alarm } from '../types'
import { useAuth } from '../context/AuthContext'

interface EngineersProps {
  onOpenChat?: (target: { id: number; name: string }) => void
}

export default function Engineers({ onOpenChat }: EngineersProps) {
  const { user } = useAuth()
  const [engineers, setEngineers] = useState<FieldEngineer[]>([])
  const [loading, setLoading] = useState(true)

  /* ── Alarm forwarding state ── */
  const [forwardTarget, setForwardTarget] = useState<FieldEngineer | null>(null)
  const [alarmText, setAlarmText] = useState('')

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

  const handleForwardAlarm = () => {
    if (!forwardTarget || !alarmText.trim() || !user) return
    wsService.send({
      type: 'forward_alarm',
      payload: {
        sender_id: user.id,
        sender_name: user.name,
        receiver_id: forwardTarget.id,
        alarm: {
          id: 'manual-' + Date.now(),
          station_id: '',
          metric_name: 'Manuel Alarm',
          severity: 'WARNING',
          message: alarmText
        }
      }
    })
    setForwardTarget(null)
    setAlarmText('')
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}><div className="loading-spinner" /></div>
  }

  const online = engineers.filter(e => e.is_online)
  const offline = engineers.filter(e => !e.is_online)

  return (
    <>
      <div className="page-header">
        <h2>Saha Mühendisleri</h2>
        <div className="live-badge">
          <span className="live-dot" />
          {online.length} Çevrimiçi
        </div>
      </div>

      {/* ── Online Engineers ── */}
      {online.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, color: 'var(--status-active)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="live-dot" /> Aktif Mühendisler
          </h3>
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            {online.map(eng => (
              <div key={eng.id} className="stat-card engineer-card" style={{ flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                  <div className="user-avatar" style={{
                    width: 42, height: 42, fontSize: 14,
                    borderColor: 'var(--status-active)'
                  }}>
                    {eng.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{eng.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-data)' }}>
                      {eng.email}
                    </div>
                  </div>
                  <span className="status-badge RESOLVED" style={{ fontSize: 11 }}>Çevrimiçi</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: 12, color: 'var(--text-secondary)' }}>
                  <span>Rol: <strong>{eng.role}</strong></span>
                  {eng.last_seen_at && (
                    <span>Son Aktif: <strong>{new Date(eng.last_seen_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</strong></span>
                  )}
                </div>

                {/* ── Action Buttons ── */}
                {eng.id !== user?.id && (
                  <div className="engineer-actions">
                    <button
                      className="eng-action-btn chat"
                      onClick={() => onOpenChat?.({ id: eng.id, name: eng.name })}
                    >
                      <FaCommentDots /> Mesaj Gönder
                    </button>
                    <button
                      className="eng-action-btn alarm"
                      onClick={() => setForwardTarget(eng)}
                    >
                      <FaPaperPlane /> Alarm Gönder
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Offline Engineers ── */}
      {offline.length > 0 && (
        <div>
          <h3 style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>
            Çevrimdışı Mühendisler
          </h3>
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            {offline.map(eng => (
              <div key={eng.id} className="stat-card" style={{ flexDirection: 'column', gap: 12, opacity: 0.6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                  <div className="user-avatar" style={{
                    width: 42, height: 42, fontSize: 14,
                    borderColor: 'var(--status-offline)'
                  }}>
                    {eng.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{eng.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-data)' }}>
                      {eng.email}
                    </div>
                  </div>
                  <span className="status-badge OPEN" style={{ fontSize: 11 }}>Çevrimdışı</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: 12, color: 'var(--text-secondary)' }}>
                  <span>Rol: <strong>{eng.role}</strong></span>
                  <span>Durum: <strong>OFFLINE</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {engineers.length === 0 && (
        <p style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>
          Saha mühendisi bulunamadı
        </p>
      )}

      {/* ── Forward Alarm Modal ── */}
      {forwardTarget && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 style={{ marginBottom: 8 }}>
              <FaPaperPlane style={{ marginRight: 8 }} />
              Alarm Gönder
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              <strong>{forwardTarget.name}</strong> adlı mühendise alarm/bildirim gönder
            </p>
            <textarea
              className="user-input"
              rows={3}
              placeholder="Alarm mesajını yazın..."
              value={alarmText}
              onChange={e => setAlarmText(e.target.value)}
              style={{ resize: 'vertical', marginBottom: 12 }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="eng-action-btn" onClick={() => { setForwardTarget(null); setAlarmText('') }}>
                İptal
              </button>
              <button className="btn-primary" onClick={handleForwardAlarm} disabled={!alarmText.trim()}>
                <FaPaperPlane /> Gönder
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

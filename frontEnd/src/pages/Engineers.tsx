import { useState, useEffect } from 'react'
import { FaCommentDots, FaPaperPlane, FaEnvelope } from 'react-icons/fa'
import { apiGetUsers } from '../services/api'
import { wsService } from '../services/websocket'
import type { FieldEngineer } from '../types'
import { useAuth } from '../context/AuthContext'

/* ── Hazır Mesaj Şablonları ── */
const MESSAGE_TEMPLATES = [
  {
    label: '🔧 Arıza Bildirimi',
    text: 'Merhaba, {istasyon} istasyonunda {metrik} değerlerinde anormallik tespit edildi. Lütfen en kısa sürede kontrol edin.'
  },
  {
    label: '⚠️ Acil Müdahale',
    text: 'ACİL: {istasyon} istasyonu kritik seviyede. Derhal sahaya gitmeniz gerekmektedir. Detaylar için dashboard\'u kontrol edin.'
  },
  {
    label: '📋 Rutin Kontrol',
    text: '{istasyon} istasyonunda rutin bakım zamanı geldi. Lütfen planlı bakım prosedürünü uygulayın.'
  },
  {
    label: '🔄 Güncelleme Talebi',
    text: 'Merhaba, {istasyon} ile ilgili durum güncellemesi bekliyorum. Mevcut durumu raporlayabilir misiniz?'
  },
  {
    label: '✅ Görev Tamamlama',
    text: '{istasyon} istasyonundaki müdahale tamamlandı. Sonuçları ve yapılan işlemleri raporlayın.'
  },
  {
    label: '📡 Sinyal Sorunu',
    text: '{istasyon} istasyonunda sinyal kalitesi düşük. RSSI ve bağlantı kalitesini yerinde kontrol edin.'
  }
]

interface EngineersProps {
  onOpenChat?: (target: { id: number; name: string }) => void
}

export default function Engineers({ onOpenChat }: EngineersProps) {
  const { user } = useAuth()
  const [engineers, setEngineers] = useState<FieldEngineer[]>([])
  const [loading, setLoading] = useState(true)

  /* ── Mesaj bırakma modal state ── */
  const [msgTarget, setMsgTarget] = useState<FieldEngineer | null>(null)
  const [msgText, setMsgText] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [msgSent, setMsgSent] = useState(false)

  /* ── Alarm forwarding state ── */
  const [forwardTarget, setForwardTarget] = useState<FieldEngineer | null>(null)
  const [alarmText, setAlarmText] = useState('')
  const [alarmShowTemplates, setAlarmShowTemplates] = useState(false)

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

  /* ── Send offline message via WS (will be queued/shown when user connects) ── */
  const handleSendOfflineMsg = () => {
    if (!msgTarget || !msgText.trim() || !user) return
    wsService.send({
      type: 'chat_message',
      payload: {
        sender_id: user.id,
        sender_name: user.name,
        receiver_id: msgTarget.id,
        type: 'text',
        content: msgText,
        timestamp: new Date().toISOString()
      }
    })
    setMsgSent(true)
    setTimeout(() => {
      setMsgTarget(null)
      setMsgText('')
      setMsgSent(false)
      setShowTemplates(false)
    }, 1500)
  }

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
    setAlarmShowTemplates(false)
  }

  const applyTemplate = (template: string, setter: (val: string) => void) => {
    setter(template)
    setShowTemplates(false)
    setAlarmShowTemplates(false)
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
            <span className="live-dot" /> Aktif Mühendisler ({online.length})
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
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>
            Çevrimdışı Mühendisler ({offline.length})
          </h3>
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            {offline.map(eng => (
              <div key={eng.id} className="stat-card" style={{ flexDirection: 'column', gap: 12 }}>
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

                {/* ── Offline: Leave Message & Alarm ── */}
                {eng.id !== user?.id && (
                  <div className="engineer-actions">
                    <button
                      className="eng-action-btn"
                      onClick={() => { setMsgTarget(eng); setShowTemplates(false); setMsgText('') }}
                    >
                      <FaEnvelope /> Mesaj Bırak
                    </button>
                    <button
                      className="eng-action-btn alarm"
                      onClick={() => setForwardTarget(eng)}
                    >
                      <FaPaperPlane /> Alarm Bırak
                    </button>
                  </div>
                )}
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

      {/* ══════ Offline Message Modal ══════ */}
      {msgTarget && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ width: 480 }}>
            {msgSent ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                <h3 style={{ color: 'var(--status-active)', marginBottom: 4 }}>Mesaj Gönderildi!</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {msgTarget.name} çevrimiçi olduğunda mesajınızı görecek.
                </p>
              </div>
            ) : (
              <>
                <h3 style={{ marginBottom: 4 }}>
                  <FaEnvelope style={{ marginRight: 8 }} />
                  Mesaj Bırak
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                  <strong>{msgTarget.name}</strong> şu an çevrimdışı. Girdiğinde bu mesajı görecek.
                </p>

                {/* Template Picker */}
                <div style={{ marginBottom: 12 }}>
                  <button
                    className="eng-action-btn"
                    style={{ width: '100%', marginBottom: 8 }}
                    onClick={() => setShowTemplates(!showTemplates)}
                  >
                    📋 Hazır Şablon Kullan {showTemplates ? '▲' : '▼'}
                  </button>

                  {showTemplates && (
                    <div className="template-grid">
                      {MESSAGE_TEMPLATES.map((t, i) => (
                        <button
                          key={i}
                          className="template-btn"
                          onClick={() => applyTemplate(t.text, setMsgText)}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <textarea
                  className="user-input"
                  rows={4}
                  placeholder="Mesajınızı yazın veya yukarıdan şablon seçin...&#10;&#10;Şablon içindeki {istasyon} ve {metrik} değerlerini düzenleyebilirsiniz."
                  value={msgText}
                  onChange={e => setMsgText(e.target.value)}
                  style={{ resize: 'vertical', marginBottom: 12, lineHeight: 1.5 }}
                />

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="eng-action-btn" onClick={() => { setMsgTarget(null); setMsgText(''); setShowTemplates(false) }}>
                    İptal
                  </button>
                  <button className="btn-primary" onClick={handleSendOfflineMsg} disabled={!msgText.trim()}>
                    <FaEnvelope /> Mesaj Bırak
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ══════ Forward Alarm Modal ══════ */}
      {forwardTarget && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ width: 480 }}>
            <h3 style={{ marginBottom: 4 }}>
              <FaPaperPlane style={{ marginRight: 8 }} />
              {forwardTarget.is_online ? 'Alarm Gönder' : 'Alarm Bırak'}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              <strong>{forwardTarget.name}</strong> adlı mühendise alarm/bildirim {forwardTarget.is_online ? 'gönder' : 'bırak'}
              {!forwardTarget.is_online && <span style={{ color: 'var(--status-warning)' }}> (Çevrimdışı — girişte görecek)</span>}
            </p>

            {/* Template Picker */}
            <div style={{ marginBottom: 12 }}>
              <button
                className="eng-action-btn"
                style={{ width: '100%', marginBottom: 8 }}
                onClick={() => setAlarmShowTemplates(!alarmShowTemplates)}
              >
                📋 Hazır Şablon Kullan {alarmShowTemplates ? '▲' : '▼'}
              </button>

              {alarmShowTemplates && (
                <div className="template-grid">
                  {MESSAGE_TEMPLATES.map((t, i) => (
                    <button
                      key={i}
                      className="template-btn"
                      onClick={() => applyTemplate(t.text, setAlarmText)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <textarea
              className="user-input"
              rows={4}
              placeholder="Alarm mesajını yazın veya yukarıdan şablon seçin..."
              value={alarmText}
              onChange={e => setAlarmText(e.target.value)}
              style={{ resize: 'vertical', marginBottom: 12, lineHeight: 1.5 }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="eng-action-btn" onClick={() => { setForwardTarget(null); setAlarmText(''); setAlarmShowTemplates(false) }}>
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

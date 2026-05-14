import { mockEngineers } from '../data/mockData'

export default function Engineers() {
  return (
    <>
      <div className="page-header">
        <h2>Saha Mühendisleri</h2>
        <div className="live-badge">
          <span className="live-dot" />
          {mockEngineers.filter(e => e.status !== 'OFFLINE').length} Çevrimiçi
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {mockEngineers.map(eng => (
          <div key={eng.id} className="stat-card" style={{ flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
              <div className="user-avatar" style={{
                width: 42, height: 42, fontSize: 14,
                borderColor: eng.status === 'ONLINE' ? 'var(--status-active)' :
                             eng.status === 'BUSY' ? 'var(--yellow-500)' : 'var(--status-offline)'
              }}>
                {eng.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{eng.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Konum: {eng.latitude.toFixed(3)}, {eng.longitude.toFixed(3)}
                </div>
              </div>
              <span className={`status-badge ${eng.status === 'ONLINE' ? 'RESOLVED' : eng.status === 'BUSY' ? 'ACKNOWLEDGED' : 'OPEN'}`}
                style={{ fontSize: 11 }}>
                {eng.status === 'ONLINE' ? 'Çevrimiçi' : eng.status === 'BUSY' ? 'Meşgul' : 'Çevrimdışı'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: 12, color: 'var(--text-secondary)' }}>
              <span>Aktif Alarm: <strong style={{ color: eng.activeAlarms > 0 ? 'var(--yellow-500)' : 'var(--text-primary)' }}>{eng.activeAlarms}</strong></span>
              <span>Durum: <strong>{eng.status}</strong></span>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

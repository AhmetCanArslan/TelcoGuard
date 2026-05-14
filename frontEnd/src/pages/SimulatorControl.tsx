import { useState } from 'react'
import { mockStations } from '../data/mockData'
import type { AnomalyType } from '../types'

const anomalyTypes: { value: AnomalyType; label: string; desc: string }[] = [
  { value: 'CPU_SPIKE',     label: 'CPU Spike',        desc: 'CPU %95+ sürekli 30sn' },
  { value: 'USER_DROP',     label: 'Kullanıcı Düşüşü', desc: 'Bağlı kullanıcı %80 ani düşüş' },
  { value: 'LATENCY_BURST', label: 'Latency Burst',    desc: 'Gecikme 200ms+ sürekli 1dk' },
  { value: 'PACKET_STORM',  label: 'Paket Fırtınası',  desc: 'Paket kaybı %15+ dalgalı' },
  { value: 'STATION_DOWN',  label: 'İstasyon Çöküşü',  desc: 'Tüm metrikler 0, veri yok' },
]

export default function SimulatorControl() {
  const [running, setRunning] = useState(false)
  const [selectedStation, setSelectedStation] = useState(mockStations[0].id)
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyType>('CPU_SPIKE')
  const [duration, setDuration] = useState(60)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString('tr-TR')}] ${msg}`, ...prev].slice(0, 20))
  }

  const toggleSimulator = () => {
    if (running) {
      setRunning(false)
      addLog('⏹ Simülatör durduruldu')
    } else {
      setRunning(true)
      addLog('▶️ Simülatör başlatıldı — metrik üretimi aktif')
    }
  }

  const injectAnomaly = () => {
    const station = mockStations.find(s => s.id === selectedStation)
    const anomaly = anomalyTypes.find(a => a.value === selectedAnomaly)
    addLog(`⚡ Anomali enjekte edildi: ${anomaly?.label} → ${station?.code} (${duration}s)`)
  }

  const selectStyle: React.CSSProperties = {
    background: 'var(--navy-700)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    fontSize: 13,
    fontFamily: 'inherit',
    width: '100%',
  }

  const inputStyle: React.CSSProperties = {
    ...selectStyle,
    width: 100,
  }

  return (
    <>
      <div className="page-header">
        <h2>Simülatör Kontrol</h2>
        <button className="btn-primary" onClick={toggleSimulator}>
          {running ? '⏹ Durdur' : '▶️ Başlat'}
        </button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* Simulator Status */}
        <div className="chart-panel">
          <div className="chart-panel-header"><span>📡</span> Simülatör Durumu</div>
          <div className="chart-body" style={{ textAlign: 'center', padding: 32 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: running ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
              border: `3px solid ${running ? 'var(--status-active)' : 'var(--status-offline)'}`,
            }}>
              <span style={{ fontSize: 32 }}>{running ? '📡' : '📴'}</span>
            </div>
            <h3 style={{ fontSize: 18, marginBottom: 4 }}>
              {running ? 'Çalışıyor' : 'Durduruldu'}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {running ? 'Her 3-5 saniyede metrik üretiliyor' : 'Simülatörü başlatmak için butona basın'}
            </p>
          </div>
        </div>

        {/* Anomaly Injection */}
        <div className="chart-panel">
          <div className="chart-panel-header"><span>⚡</span> Anomali Enjeksiyonu</div>
          <div className="chart-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>İstasyon</label>
              <select style={selectStyle} value={selectedStation} onChange={e => setSelectedStation(e.target.value)}>
                {mockStations.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Anomali Tipi</label>
              <select style={selectStyle} value={selectedAnomaly} onChange={e => setSelectedAnomaly(e.target.value as AnomalyType)}>
                {anomalyTypes.map(a => <option key={a.value} value={a.value}>{a.label} — {a.desc}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Süre (sn)</label>
                <input type="number" style={inputStyle} value={duration} onChange={e => setDuration(+e.target.value)} min={10} max={300} />
              </div>
              <button className="btn-primary" onClick={injectAnomaly} style={{ flex: 1, padding: '9px 20px' }}>
                ⚡ Enjekte Et
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Event Log */}
      <div className="alarm-panel" style={{ marginTop: 24 }}>
        <div className="alarm-panel-header">
          <h3><span>📋</span> Olay Günlüğü</h3>
          <button className="filter-btn" onClick={() => setLogs([])}>Temizle</button>
        </div>
        <div style={{ padding: 16, maxHeight: 300, overflowY: 'auto' }}>
          {logs.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24, fontSize: 13 }}>
              Henüz olay yok. Simülatörü başlatın veya anomali enjekte edin.
            </p>
          ) : (
            logs.map((log, i) => (
              <div key={i} style={{
                padding: '8px 12px',
                borderBottom: '1px solid rgba(255,255,255,0.03)',
                fontSize: 13,
                fontFamily: 'monospace',
                color: log.includes('Kritik') ? 'var(--status-critical)' :
                       log.includes('Anomali') ? 'var(--yellow-500)' : 'var(--text-secondary)',
              }}>
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}

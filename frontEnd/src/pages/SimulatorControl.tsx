import { useState, useEffect, useCallback, useRef } from 'react'
import {
  FaBroadcastTower, FaBolt, FaPlay, FaStop,
  FaClipboardList, FaTrash, FaPowerOff, FaServer,
  FaClock, FaCheckCircle, FaExclamationTriangle,
  FaTimesCircle, FaSignal, FaTachometerAlt, FaUsers,
  FaMicrochip, FaUserTimes, FaStopwatch, FaCloudRain, FaBan
} from 'react-icons/fa'
import {
  apiSimulatorStart, apiSimulatorStop,
  apiSimulatorInjectAnomaly, apiSimulatorStatus,
  apiSimulatorStations, apiSimulatorSetInterval,
  createSimulatorEventSource
} from '../services/api'
import type { AnomalyType, SimStation, SimulatorStatus, SimulatorEvent, TickSummary, AnomalyHistoryEntry } from '../types'

const anomalyTypes: { value: AnomalyType; label: string; desc: string; icon: React.ElementType; color: string }[] = [
  { value: 'CPU_SPIKE',     label: 'CPU Spike',        desc: 'CPU %95+ sürekli',    icon: FaMicrochip, color: '#ef4444' },
  { value: 'USER_DROP',     label: 'Kullanıcı Düşüşü', desc: '%80 ani düşüş',       icon: FaUserTimes, color: '#f59e0b' },
  { value: 'LATENCY_BURST', label: 'Latency Burst',    desc: '200ms+ gecikme',      icon: FaStopwatch, color: '#8b5cf6' },
  { value: 'PACKET_STORM',  label: 'Paket Fırtınası',  desc: '%15+ paket kaybı',    icon: FaCloudRain, color: '#06b6d4' },
  { value: 'STATION_DOWN',  label: 'İstasyon Çöküşü',  desc: 'Tüm metrikler 0',     icon: FaBan,       color: '#6b7280' },
]

const durationPresets = [30, 60, 120, 300]

export default function SimulatorControl() {
  const [status, setStatus] = useState<SimulatorStatus | null>(null)
  const [stations, setStations] = useState<SimStation[]>([])
  const [selectedStation, setSelectedStation] = useState('')
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyType>('CPU_SPIKE')
  const [duration, setDuration] = useState(60)
  const [logs, setLogs] = useState<string[]>([])
  const [tickFeed, setTickFeed] = useState<TickSummary[]>([])
  const [actionLoading, setActionLoading] = useState(false)
  const [sseConnected, setSseConnected] = useState(false)
  const [now, setNow] = useState(Date.now())
  const esRef = useRef<EventSource | null>(null)

  const addLog = (msg: string, type: 'info' | 'error' | 'success' | 'warn' = 'info') => {
    const timeStr = new Date().toLocaleTimeString('tr-TR')
    const prefix = { info: '[INFO]', error: '[ERR]', success: '[OK]', warn: '[WARN]' }[type]
    setLogs(prev => [`[${timeStr}] ${prefix} ${msg}`, ...prev].slice(0, 50))
  }

  const fetchInitialData = useCallback(async () => {
    try {
      const [s, st] = await Promise.all([
        apiSimulatorStatus(),
        apiSimulatorStations()
      ])
      setStatus(s)
      setStations(st)
      if (st.length > 0 && !selectedStation) setSelectedStation(st[0].code)
    } catch (err) {
      addLog('Bağlantı hatası: ' + (err instanceof Error ? err.message : 'Bilinmeyen'), 'error')
    }
  }, [selectedStation])

  // SSE connection with auto-reconnect
  useEffect(() => {
    let es: EventSource | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let intentionalClose = false

    const connect = () => {
      if (intentionalClose) return
      es = createSimulatorEventSource()
      esRef.current = es

      es.onopen = () => {
        setSseConnected(true)
      }

      es.onmessage = (event) => {
        try {
          const msg: SimulatorEvent = JSON.parse(event.data)
          if (msg.type === 'simulator_status') {
            setStatus(msg.payload as SimulatorStatus)
          } else if (msg.type === 'tick_complete') {
            const tick = msg.payload as TickSummary
            setTickFeed(prev => [tick, ...prev].slice(0, 20))
          } else if (msg.type === 'anomaly_injected') {
            const a = msg.payload as AnomalyHistoryEntry
            addLog(`Anomali enjekte edildi: ${a.anomaly_type} → ${a.station_code}`, 'info')
          } else if (msg.type === 'anomaly_expired') {
            const a = msg.payload as AnomalyHistoryEntry
            addLog(`Anomali süresi doldu: ${a.anomaly_type} → ${a.station_code}`, 'warn')
          }
        } catch {
          // ignore parse errors
        }
      }

      es.onerror = () => {
        setSseConnected(false)
        // Browser auto-reconnects on transient errors.
        // If it permanently fails, schedule a manual reconnect after 3s.
        if (!intentionalClose && es?.readyState === EventSource.CLOSED) {
          if (reconnectTimer) clearTimeout(reconnectTimer)
          reconnectTimer = setTimeout(connect, 3000)
        }
      }
    }

    connect()

    return () => {
      intentionalClose = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      es?.close()
      esRef.current = null
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchInitialData()
  }, [fetchInitialData])

  // Timer for countdown updates
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const toggleSimulator = async () => {
    setActionLoading(true)
    try {
      if (status?.running) {
        await apiSimulatorStop()
        setStatus(prev => prev ? { ...prev, running: false } : prev)
        addLog('Simülatör durduruldu', 'warn')
      } else {
        await apiSimulatorStart()
        setStatus(prev => prev ? { ...prev, running: true } : prev)
        addLog('Simülatör başlatıldı', 'success')
      }
    } catch (err) {
      addLog('Hata: ' + (err instanceof Error ? err.message : 'Bilinmeyen'), 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const injectAnomaly = async () => {
    if (!selectedStation) return
    setActionLoading(true)
    try {
      await apiSimulatorInjectAnomaly(selectedStation, selectedAnomaly, duration)
      const anomaly = anomalyTypes.find(a => a.value === selectedAnomaly)
      addLog(`Anomali enjekte edildi: ${anomaly?.label} → ${selectedStation} (${duration}s)`, 'success')
    } catch (err) {
      addLog('Hata: ' + (err instanceof Error ? err.message : 'Enjeksiyon başarısız'), 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const changeInterval = async (ms: number) => {
    try {
      await apiSimulatorSetInterval(ms)
      setStatus(prev => prev ? { ...prev, tick_interval_ms: ms } : prev)
      addLog(`Tick aralığı ${ms}ms olarak ayarlandı`, 'success')
    } catch (err) {
      addLog('Hata: ' + (err instanceof Error ? err.message : 'Ayar başarısız'), 'error')
    }
  }

  const activeAnomalies = status?.active_anomalies || {}
  const anomalyEntries = Object.entries(activeAnomalies)

  const cardBase: React.CSSProperties = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    padding: 16,
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  }

  const valueStyle: React.CSSProperties = {
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-data)',
  }

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2>Simülatör Kontrol</h2>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: sseConnected ? '#10b981' : '#ef4444',
            boxShadow: sseConnected ? '0 0 8px #10b981' : '0 0 8px #ef4444',
            transition: 'all 0.3s',
          }} title={sseConnected ? 'SSE Bağlı' : 'SSE Bağlı Değil'} />
        </div>
        <button className="btn-primary" onClick={toggleSimulator} disabled={actionLoading}>
          {status?.running ? <><FaStop /> Durdur</> : <><FaPlay /> Başlat</>}
        </button>
      </div>

      {/* Status Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', marginBottom: 20 }}>
        <div style={cardBase}>
          <div style={labelStyle}>Durum</div>
          <div style={{ ...valueStyle, fontSize: 14, color: status?.running ? '#10b981' : '#6b7280' }}>
            {status?.running ? <><FaCheckCircle style={{ marginRight: 6 }} /> Çalışıyor</> : <><FaPowerOff style={{ marginRight: 6 }} /> Durduruldu</>}
          </div>
        </div>
        <div style={cardBase}>
          <div style={labelStyle}>Tick Aralığı</div>
          <div style={valueStyle}>{status?.tick_interval_ms || 3000}ms</div>
        </div>
        <div style={cardBase}>
          <div style={labelStyle}>Tick Sayısı</div>
          <div style={valueStyle}>{status?.tick_count?.toLocaleString() || 0}</div>
        </div>
        <div style={cardBase}>
          <div style={labelStyle}>Metrik Gönderildi</div>
          <div style={valueStyle}>{status?.metrics_sent?.toLocaleString() || 0}</div>
        </div>
        <div style={cardBase}>
          <div style={labelStyle}>Başarısız</div>
          <div style={{ ...valueStyle, color: (status?.metrics_failed || 0) > 0 ? '#ef4444' : 'var(--text-primary)' }}>
            {status?.metrics_failed || 0}
          </div>
        </div>
        <div style={cardBase}>
          <div style={labelStyle}>Uptime</div>
          <div style={valueStyle}>
            {status?.uptime_seconds ? `${Math.floor(status.uptime_seconds / 60)}m ${status.uptime_seconds % 60}s` : '0s'}
          </div>
        </div>
        <div style={cardBase}>
          <div style={labelStyle}>Son Tick</div>
          <div style={{ ...valueStyle, fontSize: 14 }}>
            {status?.last_tick_duration_ms ? `${status.last_tick_duration_ms}ms` : '-'}
          </div>
        </div>
        <div style={cardBase}>
          <div style={labelStyle}>Backend Gecikme</div>
          <div style={{ ...valueStyle, fontSize: 14 }}>
            {status?.last_backend_latency_ms ? `${status.last_backend_latency_ms}ms` : '-'}
          </div>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr', alignItems: 'stretch' }}>
        {/* Anomaly Injection Panel */}
        <div className="chart-panel">
          <div className="chart-panel-header"><FaBolt /> Anomali Enjeksiyonu</div>
          <div className="chart-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Anomaly Type Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {anomalyTypes.map(a => (
                <button
                  key={a.value}
                  onClick={() => setSelectedAnomaly(a.value)}
                  style={{
                    padding: '12px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: `2px solid ${selectedAnomaly === a.value ? a.color : 'var(--border-color)'}`,
                    background: selectedAnomaly === a.value ? `${a.color}15` : 'var(--bg-elevated)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                    opacity: actionLoading ? 0.6 : 1,
                  }}
                  disabled={actionLoading}
                >
                  <div style={{ fontSize: 20, marginBottom: 4, color: a.color }}><a.icon /></div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{a.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{a.desc}</div>
                </button>
              ))}
            </div>

            {/* Station + Duration */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>İstasyon</label>
                <select
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 13,
                    width: '100%',
                  }}
                  value={selectedStation}
                  onChange={e => setSelectedStation(e.target.value)}
                >
                  {stations.map(s => <option key={s.code} value={s.code}>{s.code} — {s.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Süre (sn)</label>
                <input
                  type="number"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 13,
                    width: 80,
                    fontFamily: 'var(--font-data)',
                  }}
                  value={duration}
                  onChange={e => setDuration(Math.max(10, Math.min(3600, +e.target.value)))}
                  min={10} max={3600}
                />
              </div>
            </div>

            {/* Duration Presets */}
            <div style={{ display: 'flex', gap: 6 }}>
              {durationPresets.map(p => (
                <button
                  key={p}
                  onClick={() => setDuration(p)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    background: duration === p ? 'var(--accent)' : 'var(--bg-elevated)',
                    color: duration === p ? '#fff' : 'var(--text-secondary)',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  {p}s
                </button>
              ))}
            </div>

            <button className="btn-primary" onClick={injectAnomaly} disabled={actionLoading || !selectedStation} style={{ padding: '10px 20px' }}>
              <FaBolt /> Enjekte Et
            </button>
          </div>
        </div>

        {/* Active Anomalies with Countdown */}
        <div className="chart-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="chart-panel-header"><FaExclamationTriangle /> Aktif Anomaliler ({anomalyEntries.length})</div>
          <div className="chart-body" style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {anomalyEntries.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32, fontSize: 13 }}>
                Aktif anomali yok. Bir anomali enjekte edin.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {anomalyEntries.map(([code, anomaly]) => {
                  const expiresMs = new Date(anomaly.expires_at).getTime()
                  const remainingSec = Math.max(0, Math.floor((expiresMs - now) / 1000))
                  const pct = anomaly.duration_sec > 0 ? Math.max(0, Math.min(100, (remainingSec / anomaly.duration_sec) * 100)) : 0
                  const anomalyInfo = anomalyTypes.find(a => a.value === anomaly.type)
                  return (
                    <div key={code} style={{
                      padding: 12,
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-color)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 16, color: anomalyInfo?.color || '#ef4444' }}>{anomalyInfo?.icon ? <anomalyInfo.icon /> : <FaBolt />}</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{code}</div>
                            <div style={{ fontSize: 11, color: anomalyInfo?.color || 'var(--text-secondary)' }}>{anomalyInfo?.label || anomaly.type}</div>
                          </div>
                        </div>
                        <div style={{
                          fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-data)',
                          color: remainingSec <= 10 ? '#ef4444' : remainingSec <= 30 ? '#f59e0b' : '#10b981',
                        }}>
                          {remainingSec}s
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          width: `${pct}%`, height: '100%',
                          background: anomalyInfo?.color || '#6366f1',
                          borderRadius: 2,
                          transition: 'width 1s linear',
                        }} />
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
                        {anomaly.duration_sec}s toplam
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Station Grid */}
      <div className="chart-panel" style={{ marginTop: 20 }}>
        <div className="chart-panel-header"><FaServer /> İstasyonlar ({stations.length})</div>
        <div className="chart-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
            {stations.map(s => {
              const active = activeAnomalies[s.code]
              const anomalyInfo = active ? anomalyTypes.find(a => a.value === active.type) : null
              return (
                <div key={s.code} style={{
                  padding: 12,
                  borderRadius: 'var(--radius-sm)',
                  background: active ? `${anomalyInfo?.color || '#ef4444'}10` : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${active ? (anomalyInfo?.color || '#ef4444') + '40' : 'var(--border-color)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }} onClick={() => setSelectedStation(s.code)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-data)' }}>{s.code}</span>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: active ? (anomalyInfo?.color || '#ef4444') : '#10b981',
                      boxShadow: active ? `0 0 6px ${anomalyInfo?.color || '#ef4444'}` : 'none',
                    }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{s.name}</div>
                  {active && (
                    <div style={{ fontSize: 10, color: anomalyInfo?.color || '#ef4444', fontWeight: 600 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{anomalyInfo?.icon ? <anomalyInfo.icon style={{ fontSize: 10 }} /> : <FaBolt style={{ fontSize: 10 }} />} {anomalyInfo?.label} — {active.remaining_seconds}s</span>
                    </div>
                  )}
                  {!active && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      <FaSignal style={{ marginRight: 4, fontSize: 9 }} />
                      {s.type} | Kapasite: {s.capacity}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 20 }}>
        {/* Tick Feed */}
        <div className="chart-panel">
          <div className="chart-panel-header"><FaTachometerAlt /> Canlı Tick Akışı</div>
          <div className="chart-body" style={{ maxHeight: 300, overflowY: 'auto', padding: 0 }}>
            {tickFeed.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32, fontSize: 13 }}>
                Henüz tick verisi yok. Simülatörü başlatın.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {tickFeed.map((tick, i) => (
                  <div key={i} style={{
                    padding: '8px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    fontSize: 12,
                    fontFamily: 'var(--font-data)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ color: 'var(--text-muted)', minWidth: 50 }}>#{tick.tick_number}</span>
                      <span style={{ color: tick.stations_failed > 0 ? '#ef4444' : '#10b981' }}>
                        {tick.stations_sent}/{tick.stations_sent + tick.stations_failed} istasyon
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, color: 'var(--text-muted)' }}>
                      <span>{tick.tick_duration_ms}ms</span>
                      <span>{tick.backend_latency_ms}ms BE</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Event Log */}
        <div className="alarm-panel">
          <div className="alarm-panel-header">
            <h3><FaClipboardList /> Olay Günlüğü</h3>
            <button className="filter-btn" onClick={() => setLogs([])}><FaTrash /> Temizle</button>
          </div>
          <div style={{ padding: 16, maxHeight: 300, overflowY: 'auto' }}>
            {logs.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24, fontSize: 13 }}>
                Henüz olay yok. Simülatörü başlatın veya anomali enjekte edin.
              </p>
            ) : (
              logs.map((log, i) => (
                <div key={i} style={{
                  padding: '6px 10px',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  fontSize: 12,
                  fontFamily: 'var(--font-data)',
                  color: log.includes('[ERR]') ? '#ef4444' :
                         log.includes('[WARN]') ? '#f59e0b' :
                         log.includes('[OK]') ? '#10b981' : 'var(--text-secondary)',
                }}>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Interval Quick Controls */}
      {status?.running && (
        <div style={{ marginTop: 20, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tick Hızı:</span>
          {[500, 1000, 2000, 3000, 5000].map(ms => (
            <button
              key={ms}
              onClick={() => changeInterval(ms)}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                background: status?.tick_interval_ms === ms ? 'var(--accent)' : 'var(--bg-elevated)',
                color: status?.tick_interval_ms === ms ? '#fff' : 'var(--text-secondary)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {ms >= 1000 ? `${ms / 1000}s` : `${ms}ms`}
            </button>
          ))}
        </div>
      )}
    </>
  )
}

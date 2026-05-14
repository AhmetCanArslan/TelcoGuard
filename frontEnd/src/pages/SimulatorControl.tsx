import { useState, useEffect, useCallback } from 'react'
import {
  FaBroadcastTower, FaBolt, FaPlay, FaStop,
  FaClipboardList, FaTrash, FaPowerOff, FaUndo, FaSync
} from 'react-icons/fa'
import {
  apiSimulatorStart, apiSimulatorStop, apiSimulatorReset,
  apiSimulatorInjectAnomaly, apiSimulatorStatus,
  apiGetStations, apiResetAllAlarms
} from '../services/api'
import type { AnomalyType, BaseStation } from '../types'

const anomalyTypes: { value: AnomalyType; label: string; desc: string }[] = [
  { value: 'CPU_SPIKE',     label: 'CPU Spike',        desc: 'CPU %95+ sürekli 30sn' },
  { value: 'USER_DROP',     label: 'Kullanıcı Düşüşü', desc: 'Bağlı kullanıcı %80 ani düşüş' },
  { value: 'LATENCY_BURST', label: 'Latency Burst',    desc: 'Gecikme 200ms+ sürekli 1dk' },
  { value: 'PACKET_STORM',  label: 'Paket Fırtınası',  desc: 'Paket kaybı %15+ dalgalı' },
  { value: 'STATION_DOWN',  label: 'İstasyon Çöküşü',  desc: 'Tüm metrikler 0, veri yok' },
]

export default function SimulatorControl() {
  const [running, setRunning] = useState(false)
  const [stations, setStations] = useState<BaseStation[]>([])
  const [selectedStation, setSelectedStation] = useState('')
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyType>('CPU_SPIKE')
  const [duration, setDuration] = useState(60)
  const [logs, setLogs] = useState<string[]>([])
  const [actionLoading, setActionLoading] = useState(false)

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString('tr-TR')}] ${msg}`, ...prev].slice(0, 20))
  }

  const fetchStatus = useCallback(async () => {
    try {
      const status = await apiSimulatorStatus()
      setRunning(status.running)
    } catch {
      // simulator may be offline
    }
  }, [])

  useEffect(() => {
    apiGetStations().then(s => {
      setStations(s)
      if (s.length > 0) setSelectedStation(s[0].code)
    }).catch(() => {})
    fetchStatus()
  }, [fetchStatus])

  useEffect(() => {
    if (!running) return
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [running, fetchStatus])

  const toggleSimulator = async () => {
    setActionLoading(true)
    try {
      if (running) {
        await apiSimulatorStop()
        setRunning(false)
        addLog('Simülatör durduruldu')
      } else {
        await apiSimulatorStart()
        setRunning(true)
        addLog('Simülatör başlatıldı — metrik üretimi aktif')
      }
    } catch (err) {
      addLog(`Hata: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`)
    } finally {
      setActionLoading(false)
    }
  }

  const injectAnomaly = async () => {
    setActionLoading(true)
    try {
      await apiSimulatorInjectAnomaly(selectedStation, selectedAnomaly, duration)
      const anomaly = anomalyTypes.find(a => a.value === selectedAnomaly)
      addLog(`Anomali enjekte edildi: ${anomaly?.label} → ${selectedStation} (${duration}s)`)
    } catch (err) {
      addLog(`Hata: ${err instanceof Error ? err.message : 'Enjeksiyon başarısız'}`)
    } finally {
      setActionLoading(false)
    }
  }

  const resetSimulator = async () => {
    setActionLoading(true)
    try {
      await apiSimulatorReset()
      addLog('Simülatör sıfırlandı — tüm istasyonlar normale döndü')
    } catch (err) {
      addLog(`Hata: ${err instanceof Error ? err.message : 'Sıfırlama başarısız'}`)
    } finally {
      setActionLoading(false)
    }
  }

  const refreshAll = async () => {
    setActionLoading(true)
    try {
      await apiResetAllAlarms()
      await apiSimulatorReset()
      addLog('🔄 Tüm alarmlar silindi, istasyonlar ACTIVE yapıldı, simülatör sıfırlandı')
      // Refresh status after a short delay
      setTimeout(() => fetchStatus(), 500)
    } catch (err) {
      addLog(`Hata: ${err instanceof Error ? err.message : 'Refresh başarısız'}`)
    } finally {
      setActionLoading(false)
    }
  }

  const selectStyle: React.CSSProperties = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    fontSize: 13,
    fontFamily: 'var(--font-heading)',
    width: '100%',
  }

  const inputStyle: React.CSSProperties = { ...selectStyle, width: 100 }

  return (
    <>
      <div className="page-header">
        <h2>Simülatör Kontrol</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-primary" onClick={refreshAll} disabled={actionLoading} style={{ background: 'var(--status-active)' }}>
            <FaSync /> Refresh
          </button>
          <button className="btn-primary" onClick={resetSimulator} disabled={actionLoading} style={{ background: 'var(--primary-light)' }}>
            <FaUndo /> Sıfırla
          </button>
          <button className="btn-primary" onClick={toggleSimulator} disabled={actionLoading}>
            {running ? <><FaStop /> Durdur</> : <><FaPlay /> Başlat</>}
          </button>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="chart-panel">
          <div className="chart-panel-header"><FaBroadcastTower /> Simülatör Durumu</div>
          <div className="chart-body" style={{ textAlign: 'center', padding: 32 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: running ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
              border: `3px solid ${running ? 'var(--status-active)' : 'var(--status-offline)'}`,
            }}>
              {running
                ? <FaBroadcastTower style={{ fontSize: 28, color: 'var(--status-active)' }} />
                : <FaPowerOff style={{ fontSize: 28, color: 'var(--status-offline)' }} />
              }
            </div>
            <h3 style={{ fontSize: 18, marginBottom: 4, fontFamily: 'var(--font-heading)' }}>
              {running ? 'Çalışıyor' : 'Durduruldu'}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {running ? 'Her 3-5 saniyede metrik üretiliyor' : 'Simülatörü başlatmak için butona basın'}
            </p>
          </div>
        </div>

        <div className="chart-panel">
          <div className="chart-panel-header"><FaBolt /> Anomali Enjeksiyonu</div>
          <div className="chart-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>İstasyon</label>
              <select style={selectStyle} value={selectedStation} onChange={e => setSelectedStation(e.target.value)}>
                {stations.map(s => <option key={s.id} value={s.code}>{s.code} — {s.name}</option>)}
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
              <button className="btn-primary" onClick={injectAnomaly} disabled={actionLoading} style={{ flex: 1, padding: '9px 20px' }}>
                <FaBolt /> Enjekte Et
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="alarm-panel" style={{ marginTop: 24 }}>
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
                padding: '8px 12px',
                borderBottom: '1px solid rgba(255,255,255,0.03)',
                fontSize: 13,
                fontFamily: 'var(--font-data)',
                color: log.includes('Hata') ? 'var(--status-critical)' :
                       log.includes('Anomali') ? 'var(--accent)' : 'var(--text-secondary)',
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

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  FaArrowLeft, FaMicrochip, FaMemory, FaNetworkWired,
  FaClock, FaSignal, FaUsers
} from 'react-icons/fa'
import MetricChart from '../components/MetricChart'
import AlarmTable from '../components/AlarmTable'
import { apiGetStation, apiGetStationMetrics, apiGetAlarms } from '../services/api'
import type { BaseStation, Metric, Alarm } from '../types'

export default function StationDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [station, setStation] = useState<BaseStation | null>(null)
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [alarms, setAlarms] = useState<Alarm[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchData = useCallback(async () => {
    if (!id) return
    try {
      const [s, m, a] = await Promise.all([
        apiGetStation(id),
        apiGetStationMetrics(id),
        apiGetAlarms({ station: id }),
      ])
      setStation(s)
      setMetrics(m)
      setAlarms(a.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Veri yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 2000)
    return () => clearInterval(interval)
  }, [fetchData])

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}><div className="loading-spinner" /></div>
  }

  if (error || !station) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 80 }}>
        <h2>{error || 'İstasyon Bulunamadı'}</h2>
        <button className="btn-primary" onClick={() => navigate('/')} style={{ marginTop: 16 }}>
          Dashboard'a Dön
        </button>
      </div>
    )
  }

  // metrics come newest-first from API, index 0 = latest
  const latest = metrics.length > 0 ? metrics[0] : null
  // reverse for charts (oldest-first = left-to-right time flow)
  const chartMetrics = [...metrics].reverse()

  return (
    <>
      <div className="detail-header">
        <button className="back-btn" onClick={() => navigate('/')}><FaArrowLeft /></button>
        <div className="station-meta">
          <h2>{station.name} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({station.code})</span></h2>
          <p>{station.region} • {station.type === 'NR_5G' ? '5G NR' : '4G LTE'} • Kapasite: {station.capacity}</p>
        </div>
        <span className={`station-status-pill ${station.status}`}>{station.status}</span>
      </div>

      {latest && (
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-icon yellow"><FaMicrochip /></div>
            <div className="stat-info"><h3>{Number(latest.cpu_usage).toFixed(2)}%</h3><p>CPU Kullanımı</p></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue"><FaMemory /></div>
            <div className="stat-info"><h3>{Number(latest.memory_usage).toFixed(2)}%</h3><p>Bellek Kullanımı</p></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon red"><FaNetworkWired /></div>
            <div className="stat-info"><h3>{Number(latest.packet_loss).toFixed(2)}%</h3><p>Paket Kaybı</p></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green"><FaClock /></div>
            <div className="stat-info"><h3>{Number(latest.latency).toFixed(2)}ms</h3><p>Gecikme</p></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon gray"><FaSignal /></div>
            <div className="stat-info"><h3>{Number(latest.rssi).toFixed(2)}dBm</h3><p>Sinyal (RSSI)</p></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon yellow"><FaUsers /></div>
            <div className="stat-info"><h3>{latest.connected_users}</h3><p>Bağlı Kullanıcı</p></div>
          </div>
        </div>
      )}

      <div className="metrics-grid">
        <MetricChart title="CPU Kullanımı" metrics={chartMetrics} dataKey="cpu_usage" unit="%"
          color="#FFCB05"
          warningThreshold={{ value: 75, label: 'Uyarı', color: '#FFCB05' }}
          criticalThreshold={{ value: 90, label: 'Kritik', color: '#EF4444' }}
        />
        <MetricChart title="Bellek Kullanımı" metrics={chartMetrics} dataKey="memory_usage" unit="%"
          color="#1A6BC4"
          warningThreshold={{ value: 80, label: 'Uyarı', color: '#FFCB05' }}
          criticalThreshold={{ value: 95, label: 'Kritik', color: '#EF4444' }}
        />
        <MetricChart title="Paket Kaybı" metrics={chartMetrics} dataKey="packet_loss" unit="%"
          color="#EF4444"
          warningThreshold={{ value: 5, label: 'Uyarı', color: '#FFCB05' }}
          criticalThreshold={{ value: 10, label: 'Kritik', color: '#EF4444' }}
        />
        <MetricChart title="Gecikme (Latency)" metrics={chartMetrics} dataKey="latency" unit="ms"
          color="#10B981"
          warningThreshold={{ value: 50, label: 'Uyarı', color: '#FFCB05' }}
          criticalThreshold={{ value: 100, label: 'Kritik', color: '#EF4444' }}
        />
        <MetricChart title="Sinyal Güçlüğü (RSSI)" metrics={chartMetrics} dataKey="rssi" unit="dBm"
          color="#A78BFA"
        />
        <MetricChart title="Bağlı Kullanıcı" metrics={chartMetrics} dataKey="connected_users" unit="adet"
          color="#FFCB05"
          warningThreshold={{ value: 800, label: 'Uyarı', color: '#FFCB05' }}
          criticalThreshold={{ value: 950, label: 'Kritik', color: '#EF4444' }}
        />
      </div>

      {alarms.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <AlarmTable alarms={alarms} />
        </div>
      )}
    </>
  )
}

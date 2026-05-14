import { useParams, useNavigate } from 'react-router-dom'
import MetricChart from '../components/MetricChart'
import AlarmTable from '../components/AlarmTable'
import { mockStations, mockMetrics, mockAlarms } from '../data/mockData'

export default function StationDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const station = mockStations.find(s => s.id === id)
  const metrics = id ? mockMetrics[id] || [] : []
  const stationAlarms = mockAlarms.filter(a => a.stationId === id)

  if (!station) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 80 }}>
        <h2>İstasyon Bulunamadı</h2>
        <button className="btn-primary" onClick={() => navigate('/')} style={{ marginTop: 16 }}>
          Dashboard'a Dön
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="detail-header">
        <button className="back-btn" onClick={() => navigate('/')}>←</button>
        <div className="station-meta">
          <h2>{station.name} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({station.code})</span></h2>
          <p>{station.region} • {station.type === 'NR_5G' ? '5G NR' : '4G LTE'} • Kapasite: {station.capacity}</p>
        </div>
        <span className={`station-status-pill ${station.status}`}>{station.status}</span>
      </div>

      {/* Quick stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {metrics.length > 0 && (() => {
          const latest = metrics[metrics.length - 1]
          return (
            <>
              <div className="stat-card">
                <div className="stat-icon yellow"><span style={{fontSize:18}}>💻</span></div>
                <div className="stat-info"><h3>{latest.cpuUsage}%</h3><p>CPU Kullanımı</p></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon navy"><span style={{fontSize:18}}>🧠</span></div>
                <div className="stat-info"><h3>{latest.memoryUsage}%</h3><p>Bellek Kullanımı</p></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon red"><span style={{fontSize:18}}>📶</span></div>
                <div className="stat-info"><h3>{latest.packetLoss}%</h3><p>Paket Kaybı</p></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon green"><span style={{fontSize:18}}>⏱️</span></div>
                <div className="stat-info"><h3>{latest.latency}ms</h3><p>Gecikme</p></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon gray"><span style={{fontSize:18}}>📡</span></div>
                <div className="stat-info"><h3>{latest.rssi}dBm</h3><p>Sinyal (RSSI)</p></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon yellow"><span style={{fontSize:18}}>👥</span></div>
                <div className="stat-info"><h3>{latest.connectedUsers}</h3><p>Bağlı Kullanıcı</p></div>
              </div>
            </>
          )
        })()}
      </div>

      {/* Charts */}
      <div className="metrics-grid">
        <MetricChart title="CPU Kullanımı" metrics={metrics} dataKey="cpuUsage" unit="%"
          color="#FFCC00"
          warningThreshold={{ value: 75, label: 'Uyarı', color: '#FFCC00' }}
          criticalThreshold={{ value: 90, label: 'Kritik', color: '#EF4444' }}
        />
        <MetricChart title="Bellek Kullanımı" metrics={metrics} dataKey="memoryUsage" unit="%"
          color="#5B8DB8"
          warningThreshold={{ value: 80, label: 'Uyarı', color: '#FFCC00' }}
          criticalThreshold={{ value: 95, label: 'Kritik', color: '#EF4444' }}
        />
        <MetricChart title="Paket Kaybı" metrics={metrics} dataKey="packetLoss" unit="%"
          color="#EF4444"
          warningThreshold={{ value: 5, label: 'Uyarı', color: '#FFCC00' }}
          criticalThreshold={{ value: 10, label: 'Kritik', color: '#EF4444' }}
        />
        <MetricChart title="Gecikme (Latency)" metrics={metrics} dataKey="latency" unit="ms"
          color="#10B981"
          warningThreshold={{ value: 50, label: 'Uyarı', color: '#FFCC00' }}
          criticalThreshold={{ value: 100, label: 'Kritik', color: '#EF4444' }}
        />
        <MetricChart title="Sinyal Güçlüğü (RSSI)" metrics={metrics} dataKey="rssi" unit="dBm"
          color="#A78BFA"
        />
        <MetricChart title="Bağlı Kullanıcı" metrics={metrics} dataKey="connectedUsers" unit="adet"
          color="#FFCC00"
          warningThreshold={{ value: 800, label: 'Uyarı', color: '#FFCC00' }}
          criticalThreshold={{ value: 950, label: 'Kritik', color: '#EF4444' }}
        />
      </div>

      {/* Station Alarms */}
      {stationAlarms.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <AlarmTable alarms={stationAlarms} />
        </div>
      )}
    </>
  )
}

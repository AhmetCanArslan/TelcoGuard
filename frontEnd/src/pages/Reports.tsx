import { useState, useEffect } from 'react'
import {
  FaBroadcastTower, FaBell, FaCheckCircle, FaChartBar,
  FaChartPie, FaBuilding, FaDownload, FaGlobe
} from 'react-icons/fa'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import { apiGetDashboardSummary, apiGetStations, apiGetAlarms } from '../services/api'
import type { DashboardSummary, BaseStation, Alarm } from '../types'

export default function Reports() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [stations, setStations] = useState<BaseStation[]>([])
  const [alarms, setAlarms] = useState<Alarm[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      apiGetDashboardSummary(),
      apiGetStations(),
      apiGetAlarms({ per_page: 100 }),
    ]).then(([s, st, al]) => {
      setSummary(s)
      setStations(st)
      setAlarms(al.data)
    }).catch(() => {})
    .finally(() => setLoading(false))
  }, [])

  if (loading || !summary) {
    return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}><div className="loading-spinner" /></div>
  }

  const statusData = [
    { name: 'Aktif',      value: summary.active_stations,   color: '#10B981' },
    { name: 'Uyarı',      value: summary.warning_stations,  color: '#FFCB05' },
    { name: 'Kritik',     value: summary.critical_stations, color: '#EF4444' },
    { name: 'Çevrimdışı', value: summary.offline_stations,  color: '#6B7280' },
  ]

  const severityData = [
    { name: 'Kritik', value: alarms.filter(a => a.severity === 'CRITICAL').length, color: '#EF4444' },
    { name: 'Uyarı',  value: alarms.filter(a => a.severity === 'WARNING').length,  color: '#FFCB05' },
  ]

  const stationAlarmCounts = stations.map(s => ({
    name: s.code,
    alarms: alarms.filter(a => a.station_id === s.id).length,
  })).filter(s => s.alarms > 0).sort((a, b) => b.alarms - a.alarms)

  const regionData = [
    { name: 'Marmara', stations: stations.length, alarms: alarms.length },
  ]

  const tooltipStyle = { background: '#111111', border: '1px solid rgba(255,203,5,0.2)', borderRadius: 8, color: '#F0F0F0' }
  const uptime = summary.total_stations > 0
    ? ((summary.active_stations / summary.total_stations) * 100).toFixed(0)
    : '0'

  return (
    <>
      <div className="page-header">
        <h2>Raporlama & Analiz</h2>
        <button className="btn-primary"><FaDownload /> Rapor İndir</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon yellow"><FaBroadcastTower /></div>
          <div className="stat-info"><h3>{summary.total_stations}</h3><p>Toplam İstasyon</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><FaBell /></div>
          <div className="stat-info"><h3>{alarms.length}</h3><p>Toplam Alarm</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><FaCheckCircle /></div>
          <div className="stat-info"><h3>{alarms.filter(a => a.status === 'RESOLVED').length}</h3><p>Çözülen Alarm</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><FaChartBar /></div>
          <div className="stat-info"><h3>{uptime}%</h3><p>Uptime Oranı</p></div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="chart-panel">
          <div className="chart-panel-header"><FaChartPie /> İstasyon Durumu Dağılımı</div>
          <div className="chart-body" style={{ display: 'flex', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-panel">
          <div className="chart-panel-header"><FaChartBar /> Alarm Şiddet Dağılımı</div>
          <div className="chart-body" style={{ display: 'flex', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={severityData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {severityData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-panel full-width">
          <div className="chart-panel-header"><FaBuilding /> En Çok Alarm Üreten İstasyonlar</div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stationAlarmCounts}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#6B7A90', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6B7A90', fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="alarms" fill="#FFCB05" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="alarm-panel" style={{ marginTop: 24 }}>
        <div className="alarm-panel-header">
          <h3><FaGlobe /> Bölge Özeti</h3>
        </div>
        <table className="alarm-table">
          <thead>
            <tr>
              <th>Bölge</th>
              <th>İstasyon Sayısı</th>
              <th>Alarm Sayısı</th>
              <th>Sağlık Skoru</th>
            </tr>
          </thead>
          <tbody>
            {regionData.map(r => (
              <tr key={r.name}>
                <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{r.name}</td>
                <td>{r.stations}</td>
                <td>{r.alarms}</td>
                <td>
                  <span style={{
                    color: r.alarms < 3 ? 'var(--status-active)' : r.alarms < 6 ? 'var(--accent)' : 'var(--status-critical)',
                    fontWeight: 600
                  }}>
                    {r.alarms < 3 ? 'İyi' : r.alarms < 6 ? 'Orta' : 'Kötü'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

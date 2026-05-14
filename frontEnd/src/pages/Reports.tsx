import { mockStations, mockAlarms } from '../data/mockData'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

export default function Reports() {
  /* Region breakdown */
  const regionData = [
    { name: 'Marmara', stations: mockStations.length, alarms: mockAlarms.length },
  ]

  /* Station status distribution */
  const statusData = [
    { name: 'Aktif',      value: mockStations.filter(s => s.status === 'ACTIVE').length,   color: '#10B981' },
    { name: 'Uyarı',      value: mockStations.filter(s => s.status === 'WARNING').length,  color: '#FFCC00' },
    { name: 'Kritik',     value: mockStations.filter(s => s.status === 'CRITICAL').length, color: '#EF4444' },
    { name: 'Çevrimdışı', value: mockStations.filter(s => s.status === 'OFFLINE').length,  color: '#6B7280' },
  ]

  /* Alarm severity distribution */
  const severityData = [
    { name: 'Kritik', value: mockAlarms.filter(a => a.severity === 'CRITICAL').length, color: '#EF4444' },
    { name: 'Uyarı',  value: mockAlarms.filter(a => a.severity === 'WARNING').length,  color: '#FFCC00' },
  ]

  /* Top problematic stations */
  const stationAlarmCounts = mockStations.map(s => ({
    name: s.code,
    alarms: mockAlarms.filter(a => a.stationId === s.id).length,
  })).filter(s => s.alarms > 0).sort((a, b) => b.alarms - a.alarms)

  return (
    <>
      <div className="page-header">
        <h2>Raporlama & Analiz</h2>
        <button className="btn-primary">Rapor İndir</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon yellow"><span style={{fontSize:18}}>📊</span></div>
          <div className="stat-info"><h3>{mockStations.length}</h3><p>Toplam İstasyon</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><span style={{fontSize:18}}>🔔</span></div>
          <div className="stat-info"><h3>{mockAlarms.length}</h3><p>Toplam Alarm</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><span style={{fontSize:18}}>✅</span></div>
          <div className="stat-info"><h3>{mockAlarms.filter(a => a.status === 'RESOLVED').length}</h3><p>Çözülen Alarm</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon navy"><span style={{fontSize:18}}>📈</span></div>
          <div className="stat-info">
            <h3>{((mockStations.filter(s => s.status === 'ACTIVE').length / mockStations.length) * 100).toFixed(0)}%</h3>
            <p>Uptime Oranı</p>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Station Status Pie */}
        <div className="chart-panel">
          <div className="chart-panel-header"><span>🥧</span> İstasyon Durumu Dağılımı</div>
          <div className="chart-body" style={{ display: 'flex', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1B2838', border: '1px solid rgba(255,204,0,0.2)', borderRadius: 8, color: '#F0F0F0' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alarm Severity Pie */}
        <div className="chart-panel">
          <div className="chart-panel-header"><span>📊</span> Alarm Şiddet Dağılımı</div>
          <div className="chart-body" style={{ display: 'flex', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={severityData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {severityData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1B2838', border: '1px solid rgba(255,204,0,0.2)', borderRadius: 8, color: '#F0F0F0' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Problem Stations Bar */}
        <div className="chart-panel full-width">
          <div className="chart-panel-header"><span>🏚️</span> En Çok Alarm Üreten İstasyonlar</div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stationAlarmCounts}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#6B7A90', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6B7A90', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1B2838', border: '1px solid rgba(255,204,0,0.2)', borderRadius: 8, color: '#F0F0F0' }} />
                <Bar dataKey="alarms" fill="#FFCC00" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Region Summary Table */}
      <div className="alarm-panel" style={{ marginTop: 24 }}>
        <div className="alarm-panel-header">
          <h3><span>🌍</span> Bölge Özeti</h3>
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
                    color: r.alarms < 3 ? 'var(--status-active)' : r.alarms < 6 ? 'var(--yellow-500)' : 'var(--status-critical)',
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

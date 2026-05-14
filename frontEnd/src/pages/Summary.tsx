import { useState, useEffect } from 'react'
import {
  FaBroadcastTower, FaBell, FaCheckCircle, FaChartBar,
  FaChartLine, FaGlobe, FaHardHat, FaTrophy,
  FaShieldAlt, FaFire, FaCheckDouble
} from 'react-icons/fa'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts'
import {
  apiGetSummaryOverview, apiGetSummaryTrends, apiGetSummaryEngineers,
  apiGetSummaryFixedIssues, apiGetSummaryLocations
} from '../services/api'
import type {
  SummaryOverview, TrendPoint, EngineerAnalytics,
  FixedIssue, LocationAnalysis
} from '../types'

export default function Summary() {
  const [overview, setOverview] = useState<SummaryOverview | null>(null)
  const [trends, setTrends] = useState<TrendPoint[]>([])
  const [engineers, setEngineers] = useState<EngineerAnalytics[]>([])
  const [locations, setLocations] = useState<LocationAnalysis[]>([])
  const [fixedIssues, setFixedIssues] = useState<FixedIssue[]>([])
  const [fixedMeta, setFixedMeta] = useState({ page: 1, total: 0, total_pages: 1 })
  const [loading, setLoading] = useState(true)
  const [fixedPage, setFixedPage] = useState(1)

  useEffect(() => {
    Promise.all([
      apiGetSummaryOverview(),
      apiGetSummaryTrends(7),
      apiGetSummaryEngineers(),
      apiGetSummaryLocations(),
      apiGetSummaryFixedIssues(1, 10),
    ]).then(([ov, tr, eng, loc, fi]) => {
      setOverview(ov)
      setTrends(tr)
      setEngineers(eng)
      setLocations(loc)
      setFixedIssues(fi.data)
      setFixedMeta(prev => ({ ...prev, ...fi.meta! }))
    }).catch(() => {})
    .finally(() => setLoading(false))
  }, [])

  const loadFixedPage = async (page: number) => {
    try {
      const fi = await apiGetSummaryFixedIssues(page, 10)
      setFixedIssues(fi.data)
      setFixedMeta(prev => ({ ...prev, ...fi.meta! }))
      setFixedPage(page)
    } catch {}
  }

  if (loading || !overview) {
    return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}>
      <div className="loading-spinner" />
    </div>
  }

  const tooltipStyle = { background: '#111111', border: '1px solid rgba(255,203,5,0.2)', borderRadius: 8, color: '#F0F0F0' }
  const bestEng = engineers.length > 0 ? engineers.reduce((a, b) => a.score > b.score ? a : b) : null

  return (
    <>
      <div className="page-header">
        <h2>Özet & Analiz</h2>
        <div className="live-badge">
          <span className="live-dot" />
          {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="stat-card">
          <div className="stat-icon blue"><FaBroadcastTower /></div>
          <div className="stat-info"><h3>{overview.total_stations}</h3><p>Toplam İstasyon</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><FaBell /></div>
          <div className="stat-info"><h3>{overview.total_alarms}</h3><p>Toplam Alarm</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><FaCheckCircle /></div>
          <div className="stat-info"><h3>{overview.resolved_today}</h3><p>Bugün Çözülen</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow"><FaChartBar /></div>
          <div className="stat-info">
            <h3>%{overview.uptime_percent}</h3>
            <p>Uptime Oranı</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon gray"><FaHardHat /></div>
          <div className="stat-info"><h3>{overview.online_engineers}</h3><p>Çevrimiçi Müh.</p></div>
        </div>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: 24 }}>
        <div className="chart-panel">
          <div className="chart-panel-header"><FaChartLine /> Trend (7 Günlük Alarm Hacmi)</div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#6B7A90', fontSize: 11 }}
                  tickFormatter={val => val.slice(5)} />
                <YAxis tick={{ fill: '#6B7A90', fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="warning" name="Uyarı" stackId="a" fill="#FFCB05" radius={[0, 0, 0, 0]} />
                <Bar dataKey="critical" name="Kritik" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="chart-panel">
          <div className="chart-panel-header"><FaChartLine /> Ortalama Metrik Trendi</div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#6B7A90', fontSize: 11 }}
                  tickFormatter={val => val.slice(5)} />
                <YAxis tick={{ fill: '#6B7A90', fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="avg_cpu" name="CPU %" stroke="#10B981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="avg_memory" name="Bellek %" stroke="#3B82F6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="avg_latency" name="Gecikme ms" stroke="#FFCB05" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: 24 }}>
        <div className="alarm-panel">
          <div className="alarm-panel-header">
            <h3><FaGlobe /> Bölge Sağlık Skorları</h3>
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {overview.region_health.map(r => (
              <div key={r.region}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{r.region}</span>
                  <span style={{ fontFamily: 'var(--font-data)', fontSize: 12 }}>{r.health_score}%</span>
                </div>
                <div style={{ height: 8, background: 'var(--bg-elevated)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 4, transition: 'width 0.8s ease',
                    background: r.health_score >= 80 ? 'var(--status-active)' : r.health_score >= 50 ? 'var(--accent)' : 'var(--status-critical)',
                    width: `${r.health_score}%`
                  }} />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                  <span style={{ color: 'var(--status-active)' }}>{r.active} aktif</span>
                  <span style={{ color: 'var(--accent)' }}>{r.warning} uyarı</span>
                  <span style={{ color: 'var(--status-critical)' }}>{r.critical} kritik</span>
                  <span style={{ color: 'var(--status-offline)' }}>{r.offline} çevr.dışı</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="alarm-panel">
          <div className="alarm-panel-header">
            <h3><FaFire /> Güvenilirlik & Risk Analizi</h3>
          </div>
          <table className="alarm-table">
            <thead>
              <tr>
                <th>Bölge</th>
                <th>İst.</th>
                <th>Alarm</th>
                <th>Güvenilirlik</th>
                <th>Risk Skoru</th>
              </tr>
            </thead>
            <tbody>
              {locations.map(l => (
                <tr key={l.region}>
                  <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{l.region}</td>
                  <td>{l.station_count}</td>
                  <td>{l.alarm_count}</td>
                  <td>
                    <span className={`status-badge ${l.reliability_score >= 80 ? 'RESOLVED' : l.reliability_score >= 50 ? 'ACKNOWLEDGED' : 'OPEN'}`}
                      style={{ fontSize: 11 }}>
                      %{l.reliability_score}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${l.fraud_score < 20 ? 'RESOLVED' : l.fraud_score < 50 ? 'ACKNOWLEDGED' : 'OPEN'}`}
                      style={{ fontSize: 11 }}>
                      {l.fraud_score.toFixed(0)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '10px 16px', fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)' }}>
            <FaShieldAlt style={{ marginRight: 4 }} />
            Risk skoru: çoklu-metrik alarm × 15 + istasyon başı alarm × 10 + kritik × 5
          </div>
        </div>
      </div>

      {engineers.length > 0 && (
        <div className="alarm-panel" style={{ marginBottom: 24 }}>
          <div className="alarm-panel-header">
            <h3><FaTrophy /> Saha Mühendisi Performansı (Bu Ay)</h3>
            {bestEng && (
              <span style={{ fontSize: 12, color: 'var(--accent)' }}>
                <FaTrophy style={{ marginRight: 4 }} />
                En iyi: {bestEng.name} — {bestEng.score} puan
              </span>
            )}
          </div>
          <table className="alarm-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Mühendis</th>
                <th>Çözülen</th>
                <th>Kritik</th>
                <th>Ort. Süre</th>
                <th>Tah. Saat</th>
                <th>Skor</th>
              </tr>
            </thead>
            <tbody>
              {engineers.map((eng, i) => (
                <tr key={eng.user_id}>
                  <td style={{ fontFamily: 'var(--font-data)', fontSize: 12, color: 'var(--text-muted)' }}>
                    {i === 0 ? <FaTrophy style={{ color: 'var(--accent)' }} /> :
                     i === 1 ? <FaTrophy style={{ color: '#A0AEC0' }} /> :
                     i === 2 ? <FaTrophy style={{ color: '#CD7F32' }} /> : i + 1}
                  </td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="user-avatar" style={{ width: 26, height: 26, fontSize: 9 }}>
                        {eng.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      {eng.name}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-data)' }}>{eng.resolved_count}</td>
                  <td style={{ fontFamily: 'var(--font-data)', color: 'var(--status-critical)' }}>{eng.critical_count}</td>
                  <td style={{ fontFamily: 'var(--font-data)', fontSize: 12 }}>
                    {eng.avg_resolution_mins.toFixed(0)} dk
                  </td>
                  <td style={{ fontFamily: 'var(--font-data)', fontSize: 12 }}>{eng.estimated_hours.toFixed(1)}h</td>
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      color: eng.score >= 80 ? 'var(--status-active)' : eng.score >= 40 ? 'var(--accent)' : 'var(--status-critical)',
                      fontFamily: 'var(--font-data)', fontWeight: 700, fontSize: 14
                    }}>
                      {eng.score.toFixed(0)}
                      <div style={{
                        width: 50, height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%', borderRadius: 3,
                          background: eng.score >= 80 ? 'var(--status-active)' : eng.score >= 40 ? 'var(--accent)' : 'var(--status-critical)',
                          width: `${Math.min(eng.score, 100)}%`
                        }} />
                      </div>
                    </span>
                  </td>
                </tr>
              ))}
              {engineers.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
                  Bu ay için veri bulunamadı
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="alarm-panel" style={{ marginBottom: 24 }}>
        <div className="alarm-panel-header">
          <h3><FaCheckDouble /> Son Çözülen Arızalar</h3>
          <div className="alarm-filters">
            <button className="filter-btn" disabled={fixedPage <= 1}
              onClick={() => loadFixedPage(fixedPage - 1)}>← Önceki</button>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', padding: '0 8px', display: 'flex', alignItems: 'center' }}>
              Sayfa {fixedPage} / {fixedMeta.total_pages}
            </span>
            <button className="filter-btn" disabled={fixedPage >= fixedMeta.total_pages}
              onClick={() => loadFixedPage(fixedPage + 1)}>Sonraki →</button>
          </div>
        </div>
        <table className="alarm-table">
          <thead>
            <tr>
              <th>İstasyon</th>
              <th>Metrik</th>
              <th>Şiddet</th>
              <th>Mühendis</th>
              <th>Çözüm Süresi</th>
              <th>Not</th>
              <th>Çözülme</th>
            </tr>
          </thead>
          <tbody>
            {fixedIssues.map(issue => (
              <tr key={issue.id}>
                <td>
                  <div style={{ fontSize: 13 }}>{issue.station_code}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{issue.region}</div>
                </td>
                <td style={{ fontFamily: 'var(--font-data)', fontSize: 12 }}>{issue.metric_name}</td>
                <td>
                  <span className={`severity-badge ${issue.severity}`}>
                    {issue.severity === 'CRITICAL' ? 'Kritik' : 'Uyarı'}
                  </span>
                </td>
                <td style={{ fontSize: 13 }}>{issue.engineer_name || '-'}</td>
                <td style={{ fontFamily: 'var(--font-data)', fontSize: 12 }}>
                  {issue.resolution_mins > 0
                    ? issue.resolution_mins >= 60
                      ? `${(issue.resolution_mins / 60).toFixed(1)}s`
                      : `${issue.resolution_mins.toFixed(0)}dk`
                    : '-'}
                </td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {issue.resolution_note || '-'}
                </td>
                <td style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-data)' }}>
                  {issue.resolved_at
                    ? new Date(issue.resolved_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                    : '-'}
                </td>
              </tr>
            ))}
            {fixedIssues.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
                Henüz çözülen arıza bulunamadı
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

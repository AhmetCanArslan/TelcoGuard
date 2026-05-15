import { useState, useEffect, useRef, useMemo } from 'react'
import {
  FaBroadcastTower, FaBell, FaCheckCircle, FaChartBar,
  FaChartLine, FaGlobe, FaHardHat, FaTrophy,
  FaShieldAlt, FaFire, FaCheckDouble, FaFilter, FaTimes
} from 'react-icons/fa'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Area, AreaChart
} from 'recharts'
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion'
import type { Variants } from 'framer-motion'
import {
  apiGetSummaryOverview, apiGetSummaryTrends, apiGetSummaryEngineers,
  apiGetSummaryFixedIssues, apiGetSummaryLocations
} from '../services/api'
import type {
  SummaryOverview, TrendPoint, EngineerAnalytics,
  FixedIssue, LocationAnalysis
} from '../types'

/* ---------- Animated Components ---------- */
function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const motionValue = useMotionValue(0)
  const springValue = useTransform(motionValue, (latest) => Math.round(latest))

  useEffect(() => {
    const controls = animate(motionValue, value, { duration: 1.2, ease: 'easeOut' })
    return controls.stop
  }, [value, motionValue])

  useEffect(() => {
    const unsub = springValue.on('change', (latest) => {
      if (ref.current) ref.current.textContent = String(latest) + suffix
    })
    return unsub
  }, [springValue, suffix])

  return <span ref={ref}>0{suffix}</span>
}

function MiniDonut({ percentage, color }: { percentage: number; color: string }) {
  const r = 16, circ = 2 * Math.PI * r
  const offset = circ - (percentage / 100) * circ
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
      <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
      <motion.circle
        cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="4"
        strokeLinecap="round" strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.4, delay: 0.3, ease: [0.21, 1.02, 0.73, 1] }}
        transform="rotate(-90 20 20)"
        style={{ filter: `drop-shadow(0 0 4px ${color}50)` }}
      />
    </svg>
  )
}

function ReportStat({ icon, value, label, color, suffix, pct, index }: {
  icon: React.ReactNode; value: number; label: string; color: string; suffix?: string; pct: number; index: number
}) {
  return (
    <motion.div className="rpt-stat" variants={fadeUp} whileHover={{ y: -5, transition: { duration: 0.2 } }}>
      <div className="rpt-stat-shimmer" />
      <div className="rpt-stat-top" style={{ borderBottomColor: `${color}20` }}>
        <div className="rpt-stat-icon" style={{ color, background: `${color}15` }}>{icon}</div>
        <MiniDonut percentage={pct} color={color} />
      </div>
      <div className="rpt-stat-body">
        <span className="rpt-stat-value" style={{ color }}><AnimatedNumber value={value} suffix={suffix} /></span>
        <span className="rpt-stat-label">{label}</span>
      </div>
    </motion.div>
  )
}

/* ---------- Variants ---------- */
const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
}
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.21, 1.02, 0.73, 1] } },
}
const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: [0.21, 1.02, 0.73, 1] } },
}

/* ---------- Custom Tooltip ---------- */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rpt-tooltip">
      <div className="rpt-tooltip-label">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="rpt-tooltip-row">
          <span className="rpt-tooltip-dot" style={{ background: p.color || p.fill }} />
          <span>{p.name}: <strong>{Number(p.value).toFixed(1)}</strong></span>
        </div>
      ))}
    </div>
  )
}

/* ========== MAIN COMPONENT ========== */
interface SummaryFilters {
  dateFrom: string
  dateTo: string
  trendDays: number
}

const emptyFilters: SummaryFilters = {
  dateFrom: '',
  dateTo: '',
  trendDays: 7,
}

export default function Summary() {
  const [overview, setOverview] = useState<SummaryOverview | null>(null)
  const [trends, setTrends] = useState<TrendPoint[]>([])
  const [engineers, setEngineers] = useState<EngineerAnalytics[]>([])
  const [locations, setLocations] = useState<LocationAnalysis[]>([])
  const [fixedIssues, setFixedIssues] = useState<FixedIssue[]>([])
  const [fixedMeta, setFixedMeta] = useState({ page: 1, total: 0, total_pages: 1 })
  const [loading, setLoading] = useState(true)
  const [fixedPage, setFixedPage] = useState(1)
  const [filters, setFilters] = useState<SummaryFilters>(emptyFilters)
  const [showFilters, setShowFilters] = useState(false)

  const fetchData = () => {
    setLoading(true)
    Promise.all([
      apiGetSummaryOverview(),
      apiGetSummaryTrends(filters.trendDays),
      apiGetSummaryEngineers(),
      apiGetSummaryLocations(),
      apiGetSummaryFixedIssues(1, 10),
    ]).then(([ov, tr, eng, loc, fi]) => {
      let trendData = tr
      if (filters.dateFrom) {
        const from = new Date(filters.dateFrom)
        trendData = trendData.filter(t => new Date(t.date) >= from)
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo)
        to.setHours(23, 59, 59, 999)
        trendData = trendData.filter(t => new Date(t.date) <= to)
      }

      setOverview(ov)
      setTrends(trendData)
      setEngineers(eng)
      setLocations(loc)
      setFixedIssues(fi.data)
      setFixedMeta(prev => ({ ...prev, ...fi.meta! }))
    }).catch(() => {})
    .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchData()
  }, [filters.trendDays])

  const loadFixedPage = async (page: number) => {
    try {
      const fi = await apiGetSummaryFixedIssues(page, 10)
      setFixedIssues(fi.data)
      setFixedMeta(prev => ({ ...prev, ...fi.meta! }))
      setFixedPage(page)
    } catch {}
  }

  const handleFilterChange = (key: keyof SummaryFilters, value: string | number) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => setFilters(emptyFilters)
  const hasActiveFilters = filters.dateFrom !== '' || filters.dateTo !== '' || filters.trendDays !== 7
  const applyFilters = () => {
    setFixedPage(1)
    fetchData()
  }

  if (loading || !overview) {
    return (
      <div className="dash-loading">
        <motion.div className="dash-loading-ring" animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }} />
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}>Özet veriler yükleniyor...</motion.span>
      </div>
    )
  }

  const bestEng = engineers.length > 0 ? engineers.reduce((a, b) => a.score > b.score ? a : b) : null

  return (
    <div className="rpt-page">
      {/* Header */}
      <motion.div className="rpt-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div>
          <h1 className="rpt-title">Özet & Analiz</h1>
          <p className="rpt-subtitle">Şebeke sağlığı, bölge riskleri ve performans değerlendirmesi</p>
        </div>
        <div className="rpt-header-actions">
          <button className="rpt-tab" onClick={() => setShowFilters(!showFilters)} style={{ background: showFilters ? 'rgba(255,255,255,0.1)' : undefined }}>
            <FaFilter style={{ marginRight: 6 }} /> Filtreler 
            {hasActiveFilters && <span style={{ marginLeft: 6, color: 'var(--accent)' }}>●</span>}
          </button>
          <div className="live-badge" style={{ marginLeft: 8 }}>
            <span className="live-dot" />
            {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </motion.div>

      {/* Filter Bar */}
      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0, marginBottom: 0 }} 
            animate={{ height: 'auto', opacity: 1, marginBottom: 28 }} 
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="filter-bar" style={{ background: 'rgba(17,17,17,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="filter-row" style={{ padding: '16px 20px' }}>
                <div className="filter-group">
                  <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tarih (Başlangıç)</label>
                  <input type="date" value={filters.dateFrom} onChange={e => handleFilterChange('dateFrom', e.target.value)} className="filter-input" />
                </div>
                <div className="filter-group">
                  <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tarih (Bitiş)</label>
                  <input type="date" value={filters.dateTo} onChange={e => handleFilterChange('dateTo', e.target.value)} className="filter-input" />
                </div>
                <div className="filter-group">
                  <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Trend Periyodu</label>
                  <select value={filters.trendDays} onChange={e => handleFilterChange('trendDays', Number(e.target.value))} className="filter-input">
                    <option value={7}>7 Gün</option><option value={14}>14 Gün</option>
                    <option value={30}>30 Gün</option><option value={60}>60 Gün</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 10, alignSelf: 'flex-end', marginLeft: 'auto' }}>
                  {hasActiveFilters && (
                    <button className="filter-clear-btn" onClick={clearFilters} style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12 }}>
                      <FaTimes /> Temizle
                    </button>
                  )}
                  <button className="btn-primary" onClick={applyFilters} style={{ borderRadius: 8 }}>
                    Uygula
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stat Cards */}
      <motion.div className="rpt-stats-row" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }} variants={stagger} initial="hidden" animate="visible">
        <ReportStat icon={<FaBroadcastTower />} value={overview.total_stations} label="Toplam İstasyon" color="#3B82F6" pct={100} index={0} />
        <ReportStat icon={<FaBell />} value={overview.total_alarms} label="Toplam Alarm" color="#EF4444" pct={Math.min(100, overview.total_alarms * 2)} index={1} />
        <ReportStat icon={<FaCheckCircle />} value={overview.resolved_today} label="Bugün Çözülen" color="#10B981" pct={Math.min(100, overview.resolved_today * 5)} index={2} />
        <ReportStat icon={<FaChartBar />} value={overview.uptime_percent} label="Uptime Oranı" color="#FFCB05" suffix="%" pct={overview.uptime_percent} index={3} />
        <ReportStat icon={<FaHardHat />} value={overview.online_engineers} label="Çevrimiçi Müh." color="#A0AEC0" pct={100} index={4} />
      </motion.div>

      {/* Trend Charts */}
      <motion.div className="rpt-charts-grid" variants={stagger} initial="hidden" animate="visible">
        <motion.div className="rpt-chart-card" variants={scaleIn}>
          <div className="rpt-chart-header"><FaChartLine className="rpt-chart-icon" /> Alarm Hacmi ({filters.trendDays} Gün)</div>
          <div className="rpt-chart-body">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={trends}>
                <defs>
                  <linearGradient id="barWarning" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FFCB05" /><stop offset="100%" stopColor="#E6B300" stopOpacity={0.6} /></linearGradient>
                  <linearGradient id="barCritical" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#EF4444" /><stop offset="100%" stopColor="#DC2626" stopOpacity={0.6} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: '#6B7A90', fontSize: 11 }} tickFormatter={val => val.slice(5)} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#6B7A90', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="warning" name="Uyarı" stackId="a" fill="url(#barWarning)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="critical" name="Kritik" stackId="a" fill="url(#barCritical)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div className="rpt-chart-card" variants={scaleIn}>
          <div className="rpt-chart-header"><FaChartLine className="rpt-chart-icon" /> Ortalama Metrik Trendi</div>
          <div className="rpt-chart-body">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: '#6B7A90', fontSize: 11 }} tickFormatter={val => val.slice(5)} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#6B7A90', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="avg_cpu" name="CPU %" stroke="#10B981" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#10B981', stroke: '#000' }} />
                <Line type="monotone" dataKey="avg_memory" name="Bellek %" stroke="#3B82F6" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#3B82F6', stroke: '#000' }} />
                <Line type="monotone" dataKey="avg_latency" name="Gecikme ms" stroke="#FFCB05" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#FFCB05', stroke: '#000' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </motion.div>

      {/* Region Analysis */}
      <motion.div className="rpt-charts-grid" variants={stagger} initial="hidden" animate="visible" style={{ marginTop: 24 }}>
        <motion.div className="rpt-chart-card" variants={scaleIn}>
          <div className="rpt-chart-header">
            <FaGlobe className="rpt-chart-icon" /> Bölge Sağlık Skorları
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {overview.region_health.map(r => (
              <div key={r.region}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.region}</span>
                  <span style={{ fontFamily: 'var(--font-data)', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>{r.health_score}%</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${r.health_score}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                    style={{
                      height: '100%', borderRadius: 3,
                      background: r.health_score >= 80 ? '#10B981' : r.health_score >= 50 ? '#FFCB05' : '#EF4444',
                      boxShadow: `0 0 10px ${r.health_score >= 80 ? '#10B981' : r.health_score >= 50 ? '#FFCB05' : '#EF4444'}80`
                    }} 
                  />
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, fontWeight: 600 }}>
                  <span style={{ color: '#10B981' }}>{r.active} Aktif</span>
                  <span style={{ color: '#FFCB05' }}>{r.warning} Uyarı</span>
                  <span style={{ color: '#EF4444' }}>{r.critical} Kritik</span>
                  <span style={{ color: '#6B7280' }}>{r.offline} Offline</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div className="rpt-chart-card" variants={scaleIn}>
          <div className="rpt-chart-header">
            <FaFire className="rpt-chart-icon" style={{ color: '#EF4444' }} /> Bölge Sorun Analizi
          </div>
          <div className="rpt-table-wrap">
            <table className="rpt-table">
              <thead>
                <tr>
                  <th>Bölge</th>
                  <th>İstasyon</th>
                  <th>Alarm / İstasyon</th>
                  <th>Risk Skoru</th>
                </tr>
              </thead>
              <tbody>
                {locations.sort((a, b) => b.alarm_count - a.alarm_count).map((l, i) => (
                  <motion.tr key={l.region} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
                    <td className="rpt-td-code">{l.region}</td>
                    <td style={{ fontFamily: 'var(--font-data)' }}>{l.station_count}</td>
                    <td style={{ fontFamily: 'var(--font-data)' }}>{l.alarms_per_station.toFixed(1)}</td>
                    <td>
                      <span className={`rpt-status-pill ${l.fraud_score >= 50 ? 'CRITICAL' : l.fraud_score >= 20 ? 'WARNING' : 'ACTIVE'}`}>
                        {l.fraud_score.toFixed(0)} / 100
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '12px 20px', fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid rgba(255,203,5,0.06)' }}>
            <FaShieldAlt style={{ marginRight: 6 }} />
            Risk skoru = çoklu-metrik(15) + alarm/ist(10) + kritik(5)
          </div>
        </motion.div>
      </motion.div>

      {/* Engineer Performance & Fixed Issues */}
      <motion.div className="rpt-charts-grid" variants={stagger} initial="hidden" animate="visible" style={{ marginTop: 24, marginBottom: 40 }}>
        {engineers.length > 0 && (
          <motion.div className="rpt-chart-card" variants={scaleIn}>
            <div className="rpt-chart-header" style={{ justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FaTrophy className="rpt-chart-icon" /> Mühendis Performansı
              </span>
              {bestEng && (
                <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, background: 'rgba(255,203,5,0.1)', padding: '4px 10px', borderRadius: 20 }}>
                  👑 Lider: {bestEng.name.split(' ')[0]}
                </span>
              )}
            </div>
            <div className="rpt-table-wrap">
              <table className="rpt-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Mühendis</th>
                    <th>Çözülen</th>
                    <th>Ort. Süre</th>
                    <th>Skor</th>
                  </tr>
                </thead>
                <tbody>
                  {engineers.map((eng, i) => (
                    <motion.tr key={eng.user_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
                      <td style={{ color: i === 0 ? '#FFCB05' : i === 1 ? '#A0AEC0' : i === 2 ? '#CD7F32' : 'var(--text-muted)' }}>
                        {i < 3 ? <FaTrophy /> : i + 1}
                      </td>
                      <td style={{ fontWeight: 600 }}>{eng.name}</td>
                      <td className="rpt-td-alarm" style={{ color: '#10B981' }}>{eng.resolved_count}</td>
                      <td style={{ fontFamily: 'var(--font-data)' }}>{eng.avg_resolution_mins.toFixed(0)} dk</td>
                      <td>
                        <span className={`rpt-status-pill ${eng.score >= 80 ? 'ACTIVE' : eng.score >= 40 ? 'WARNING' : 'CRITICAL'}`}>
                          {eng.score.toFixed(0)}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        <motion.div className="rpt-chart-card" variants={scaleIn}>
          <div className="rpt-chart-header" style={{ justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FaCheckDouble className="rpt-chart-icon" style={{ color: '#10B981' }} /> Son Çözülen Arızalar
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => loadFixedPage(fixedPage - 1)} disabled={fixedPage <= 1} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}>←</button>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>{fixedPage} / {fixedMeta.total_pages}</span>
              <button onClick={() => loadFixedPage(fixedPage + 1)} disabled={fixedPage >= fixedMeta.total_pages} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}>→</button>
            </div>
          </div>
          <div className="rpt-table-wrap">
            <table className="rpt-table">
              <thead>
                <tr>
                  <th>İstasyon</th>
                  <th>Metrik</th>
                  <th>Süre</th>
                  <th>Tarih</th>
                </tr>
              </thead>
              <tbody>
                {fixedIssues.map((issue, i) => (
                  <motion.tr key={issue.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
                    <td className="rpt-td-code">{issue.station_code}</td>
                    <td style={{ fontFamily: 'var(--font-data)' }}>{issue.metric_name}</td>
                    <td style={{ fontFamily: 'var(--font-data)' }}>
                      {issue.resolution_mins > 0 ? (issue.resolution_mins >= 60 ? `${(issue.resolution_mins / 60).toFixed(1)}s` : `${issue.resolution_mins.toFixed(0)}dk`) : '-'}
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-data)' }}>
                      {issue.resolved_at ? new Date(issue.resolved_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                  </motion.tr>
                ))}
                {fixedIssues.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Bulunamadı</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}

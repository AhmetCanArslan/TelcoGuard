import { useState, useEffect, useRef, useMemo } from 'react'
import {
  FaBroadcastTower, FaBell, FaCheckCircle, FaChartBar,
  FaChartPie, FaBuilding, FaDownload, FaGlobe
} from 'react-icons/fa'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Area, AreaChart
} from 'recharts'
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { apiGetDashboardSummary, apiGetStations, apiGetAlarms } from '../services/api'
import type { DashboardSummary, BaseStation, Alarm } from '../types'

/* ---------- Animated Counter ---------- */
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

/* ---------- Particle Background ---------- */
function ReportParticles() {
  const particles = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2.5 + 1,
      dur: Math.random() * 18 + 12,
      delay: Math.random() * 8,
    })), []
  )
  return (
    <div className="dash-particles">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="dash-particle"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
          animate={{ y: [0, -30, 0], opacity: [0, 0.5, 0], scale: [0.5, 1, 0.5] }}
          transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

/* ---------- Custom Mini Donut for Stat Cards ---------- */
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
          <span>{p.name}: <strong>{p.value}</strong></span>
        </div>
      ))}
    </div>
  )
}

/* ---------- Stat Card ---------- */
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

/* ========== MAIN COMPONENT ========== */
export default function Reports() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [stations, setStations] = useState<BaseStation[]>([])
  const [alarms, setAlarms] = useState<Alarm[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'stations' | 'regions'>('overview')

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

  // Build fake trend data from alarm timestamps
  const trendData = useMemo(() => {
    const days: Record<string, { critical: number; warning: number }> = {}
    alarms.forEach(a => {
      const d = new Date(a.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
      if (!days[d]) days[d] = { critical: 0, warning: 0 }
      if (a.severity === 'CRITICAL') days[d].critical++
      else days[d].warning++
    })
    return Object.entries(days).slice(-7).map(([date, v]) => ({ date, ...v, total: v.critical + v.warning }))
  }, [alarms])

  if (loading || !summary) {
    return (
      <div className="dash-loading">
        <motion.div className="dash-loading-ring" animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }} />
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}>Raporlar yükleniyor...</motion.span>
      </div>
    )
  }

  const statusData = [
    { name: 'Aktif', value: summary.active_stations, color: '#10B981' },
    { name: 'Uyarı', value: summary.warning_stations, color: '#FFCB05' },
    { name: 'Kritik', value: summary.critical_stations, color: '#EF4444' },
    { name: 'Çevrimdışı', value: summary.offline_stations, color: '#6B7280' },
  ]

  const severityData = [
    { name: 'Kritik', value: alarms.filter(a => a.severity === 'CRITICAL').length, color: '#EF4444' },
    { name: 'Uyarı', value: alarms.filter(a => a.severity === 'WARNING').length, color: '#FFCB05' },
  ]

  const stationAlarmCounts = stations.map(s => ({
    name: s.code,
    alarms: alarms.filter(a => a.station_id === s.id).length,
  })).filter(s => s.alarms > 0).sort((a, b) => b.alarms - a.alarms).slice(0, 12)

  const resolvedAlarms = alarms.filter(a => a.status === 'RESOLVED').length
  const uptime = summary.total_stations > 0 ? Math.round((summary.active_stations / summary.total_stations) * 100) : 0
  const totalAlarms = alarms.length

  const regionData = [{ name: 'Marmara', stations: stations.length, alarms: alarms.length }]

  const tabs = [
    { key: 'overview' as const, label: 'Genel Bakış' },
    { key: 'stations' as const, label: 'İstasyon Analizi' },
    { key: 'regions' as const, label: 'Bölge Özeti' },
  ]

  return (
    <div className="rpt-page">

      {/* Header */}
      <motion.div className="rpt-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div>
          <h1 className="rpt-title">Raporlama & Analiz</h1>
          <p className="rpt-subtitle">{new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="rpt-header-actions">
          <div className="rpt-tabs">
            {tabs.map(t => (
              <button
                key={t.key}
                className={`rpt-tab ${activeTab === t.key ? 'active' : ''}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <motion.button className="rpt-download-btn" whileHover={{ scale: 1.04, boxShadow: '0 0 24px rgba(255,203,5,0.25)' }} whileTap={{ scale: 0.97 }}>
            <FaDownload /> Rapor İndir
          </motion.button>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <motion.div className="rpt-stats-row" variants={stagger} initial="hidden" animate="visible">
        <ReportStat icon={<FaBroadcastTower />} value={summary.total_stations} label="Toplam İstasyon" color="#FFCB05" pct={100} index={0} />
        <ReportStat icon={<FaBell />} value={totalAlarms} label="Toplam Alarm" color="#EF4444" pct={Math.min(100, totalAlarms * 5)} index={1} />
        <ReportStat icon={<FaCheckCircle />} value={resolvedAlarms} label="Çözülen Alarm" color="#10B981" pct={totalAlarms > 0 ? Math.round((resolvedAlarms / totalAlarms) * 100) : 0} index={2} />
        <ReportStat icon={<FaChartBar />} value={uptime} label="Uptime Oranı" color="#3B82F6" suffix="%" pct={uptime} index={3} />
      </motion.div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
            {/* Charts Row */}
            <motion.div className="rpt-charts-grid" variants={stagger} initial="hidden" animate="visible">
              {/* Pie: Station Status */}
              <motion.div className="rpt-chart-card" variants={scaleIn}>
                <div className="rpt-chart-header">
                  <FaChartPie className="rpt-chart-icon" /> İstasyon Durumu
                </div>
                <div className="rpt-chart-body">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} dataKey="value" paddingAngle={3} animationBegin={300} animationDuration={1200}>
                        {statusData.map((e, i) => <Cell key={i} fill={e.color} stroke="transparent" />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="rpt-pie-legend">
                    {statusData.map((s, i) => (
                      <div key={i} className="rpt-pie-legend-item">
                        <span style={{ background: s.color, boxShadow: `0 0 6px ${s.color}50` }} className="rpt-legend-dot" />
                        <span className="rpt-legend-name">{s.name}</span>
                        <span className="rpt-legend-val" style={{ color: s.color }}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Pie: Severity */}
              <motion.div className="rpt-chart-card" variants={scaleIn}>
                <div className="rpt-chart-header">
                  <FaBell className="rpt-chart-icon" /> Alarm Şiddet Dağılımı
                </div>
                <div className="rpt-chart-body">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={severityData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} dataKey="value" paddingAngle={3} animationBegin={400} animationDuration={1200}>
                        {severityData.map((e, i) => <Cell key={i} fill={e.color} stroke="transparent" />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="rpt-pie-legend">
                    {severityData.map((s, i) => (
                      <div key={i} className="rpt-pie-legend-item">
                        <span style={{ background: s.color, boxShadow: `0 0 6px ${s.color}50` }} className="rpt-legend-dot" />
                        <span className="rpt-legend-name">{s.name}</span>
                        <span className="rpt-legend-val" style={{ color: s.color }}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Trend Area Chart */}
            {trendData.length > 0 && (
              <motion.div className="rpt-chart-card rpt-full-width" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }}>
                <div className="rpt-chart-header">
                  <FaChartBar className="rpt-chart-icon" /> Alarm Trendi
                </div>
                <div className="rpt-chart-body" style={{ padding: '16px 20px 8px' }}>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="gradCritical" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#EF4444" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradWarning" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FFCB05" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#FFCB05" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="date" tick={{ fill: '#6B7A90', fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: '#6B7A90', fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="critical" name="Kritik" stroke="#EF4444" fill="url(#gradCritical)" strokeWidth={2} />
                      <Area type="monotone" dataKey="warning" name="Uyarı" stroke="#FFCB05" fill="url(#gradWarning)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {activeTab === 'stations' && (
          <motion.div key="stations" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
            <motion.div className="rpt-chart-card rpt-full-width" variants={scaleIn} initial="hidden" animate="visible">
              <div className="rpt-chart-header">
                <FaBuilding className="rpt-chart-icon" /> En Çok Alarm Üreten İstasyonlar
              </div>
              <div className="rpt-chart-body" style={{ padding: '16px 20px 8px' }}>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={stationAlarmCounts} barSize={24}>
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FFCB05" stopOpacity={1} />
                        <stop offset="100%" stopColor="#E6B300" stopOpacity={0.6} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="name" tick={{ fill: '#6B7A90', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#6B7A90', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="alarms" name="Alarm" fill="url(#barGrad)" radius={[6, 6, 0, 0]} animationBegin={300} animationDuration={1200} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Station Status Table */}
            <motion.div className="rpt-chart-card rpt-full-width" style={{ marginTop: 20 }} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div className="rpt-chart-header">
                <FaBroadcastTower className="rpt-chart-icon" /> İstasyon Durum Tablosu
              </div>
              <div className="rpt-table-wrap">
                <table className="rpt-table">
                  <thead>
                    <tr>
                      <th>Kod</th><th>İsim</th><th>Tip</th><th>Durum</th><th>Alarm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stations.slice(0, 10).map((st, i) => {
                      const alarmCount = alarms.filter(a => a.station_id === st.id).length
                      return (
                        <motion.tr key={st.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.04 }}>
                          <td className="rpt-td-code">{st.code}</td>
                          <td>{st.name}</td>
                          <td><span className="rpt-type-badge">{st.type === 'NR_5G' ? '5G NR' : '4G LTE'}</span></td>
                          <td><span className={`rpt-status-pill ${st.status}`}>{st.status}</span></td>
                          <td className="rpt-td-alarm">{alarmCount}</td>
                        </motion.tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}

        {activeTab === 'regions' && (
          <motion.div key="regions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
            <motion.div className="rpt-chart-card rpt-full-width" variants={scaleIn} initial="hidden" animate="visible">
              <div className="rpt-chart-header">
                <FaGlobe className="rpt-chart-icon" /> Bölge Özeti
              </div>
              <div className="rpt-table-wrap">
                <table className="rpt-table">
                  <thead>
                    <tr><th>Bölge</th><th>İstasyon</th><th>Alarm</th><th>Sağlık</th></tr>
                  </thead>
                  <tbody>
                    {regionData.map((r, i) => {
                      const health = r.alarms < 3 ? 'İyi' : r.alarms < 6 ? 'Orta' : 'Kötü'
                      const hColor = r.alarms < 3 ? '#10B981' : r.alarms < 6 ? '#FFCB05' : '#EF4444'
                      return (
                        <motion.tr key={r.name} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.08 }}>
                          <td className="rpt-td-code">{r.name}</td>
                          <td>{r.stations}</td>
                          <td>{r.alarms}</td>
                          <td>
                            <div className="rpt-health-indicator">
                              <motion.span className="rpt-health-dot" style={{ background: hColor, boxShadow: `0 0 8px ${hColor}60` }}
                              />
                              <span style={{ color: hColor, fontWeight: 700 }}>{health}</span>
                            </div>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

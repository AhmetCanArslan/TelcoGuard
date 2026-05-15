import { useState, useEffect, useRef } from 'react'
import {
  FaBroadcastTower, FaBell, FaCheckCircle, FaChartBar,
  FaChartPie, FaBuilding, FaDownload, FaGlobe
} from 'react-icons/fa'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
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
    const controls = animate(motionValue, value, {
      duration: 1.2,
      ease: 'easeOut',
    })
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

/* ---------- Variants ---------- */
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.15,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: 'easeOut',
    },
  },
}

const headerVariants: Variants = {
  hidden: { opacity: 0, y: -16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
}

const tableRowVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
}

const chartPanelVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.65, ease: 'easeOut' },
  },
}

/* ---------- Glow Pulse for Icons ---------- */
const iconPulse = {
  animate: {
    boxShadow: [
      '0 0 0 0 rgba(255,203,5,0)',
      '0 0 0 8px rgba(255,203,5,0.08)',
      '0 0 0 0 rgba(255,203,5,0)',
    ],
  },
  transition: {
    duration: 2.5,
    repeat: Infinity,
    ease: 'easeInOut' as const,
  },
}

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
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}>
        <motion.div
          className="loading-spinner"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    )
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

  const resolvedAlarms = alarms.filter(a => a.status === 'RESOLVED').length

  return (
    <>
      {/* Page Header */}
      <motion.div
        className="page-header"
        variants={headerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h2
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
        >
          Raporlama & Analiz
        </motion.h2>
        <motion.button
          className="btn-primary"
          whileHover={{ scale: 1.04, boxShadow: '0 0 24px rgba(255,203,5,0.25)' }}
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
        >
          <FaDownload /> Rapor İndir
        </motion.button>
      </motion.div>

      {/* Stat Cards */}
      <motion.div
        className="stats-grid"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="stat-card reports-stat-card" variants={itemVariants}>
          <motion.div
            className="stat-icon yellow"
            animate={iconPulse.animate}
            transition={iconPulse.transition}
          >
            <FaBroadcastTower />
          </motion.div>
          <div className="stat-info">
            <h3><AnimatedNumber value={summary.total_stations} /></h3>
            <p>Toplam İstasyon</p>
          </div>
        </motion.div>

        <motion.div className="stat-card reports-stat-card" variants={itemVariants}>
          <motion.div
            className="stat-icon red"
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(239,68,68,0)',
                '0 0 0 8px rgba(239,68,68,0.08)',
                '0 0 0 0 rgba(239,68,68,0)',
              ],
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <FaBell />
          </motion.div>
          <div className="stat-info">
            <h3><AnimatedNumber value={alarms.length} /></h3>
            <p>Toplam Alarm</p>
          </div>
        </motion.div>

        <motion.div className="stat-card reports-stat-card" variants={itemVariants}>
          <motion.div
            className="stat-icon green"
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(16,185,129,0)',
                '0 0 0 8px rgba(16,185,129,0.08)',
                '0 0 0 0 rgba(16,185,129,0)',
              ],
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <FaCheckCircle />
          </motion.div>
          <div className="stat-info">
            <h3><AnimatedNumber value={resolvedAlarms} /></h3>
            <p>Çözülen Alarm</p>
          </div>
        </motion.div>

        <motion.div className="stat-card reports-stat-card" variants={itemVariants}>
          <motion.div
            className="stat-icon blue"
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(3,78,162,0)',
                '0 0 0 8px rgba(3,78,162,0.08)',
                '0 0 0 0 rgba(3,78,162,0)',
              ],
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <FaChartBar />
          </motion.div>
          <div className="stat-info">
            <h3><AnimatedNumber value={Number(uptime)} suffix="%" /></h3>
            <p>Uptime Oranı</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Charts Grid */}
      <motion.div
        className="dashboard-grid"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="chart-panel reports-chart-panel" variants={chartPanelVariants}>
          <div className="chart-panel-header"><FaChartPie /> İstasyon Durumu Dağılımı</div>
          <div className="chart-body" style={{ display: 'flex', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  animationBegin={400}
                  animationDuration={1200}
                  animationEasing="ease-out"
                >
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div className="chart-panel reports-chart-panel" variants={chartPanelVariants}>
          <div className="chart-panel-header"><FaChartBar /> Alarm Şiddet Dağılımı</div>
          <div className="chart-body" style={{ display: 'flex', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  animationBegin={500}
                  animationDuration={1200}
                  animationEasing="ease-out"
                >
                  {severityData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div className="chart-panel full-width reports-chart-panel" variants={chartPanelVariants}>
          <div className="chart-panel-header"><FaBuilding /> En Çok Alarm Üreten İstasyonlar</div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stationAlarmCounts}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#6B7A90', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6B7A90', fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar
                  dataKey="alarms"
                  fill="#FFCB05"
                  radius={[4, 4, 0, 0]}
                  animationBegin={600}
                  animationDuration={1000}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </motion.div>

      {/* Region Summary Table */}
      <motion.div
        className="alarm-panel"
        style={{ marginTop: 24 }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5, ease: 'easeOut' }}
      >
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
            <AnimatePresence>
              {regionData.map((r, index) => (
                <motion.tr
                  key={r.name}
                  variants={tableRowVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.6 + index * 0.1 }}
                  whileHover={{ backgroundColor: 'rgba(255,203,5,0.04)' }}
                >
                  <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{r.name}</td>
                  <td>{r.stations}</td>
                  <td>{r.alarms}</td>
                  <td>
                    <motion.span
                      style={{
                        color: r.alarms < 3 ? 'var(--status-active)' : r.alarms < 6 ? 'var(--accent)' : 'var(--status-critical)',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.8, duration: 0.4, ease: 'easeOut' }}
                    >
                      <motion.span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: r.alarms < 3 ? 'var(--status-active)' : r.alarms < 6 ? 'var(--accent)' : 'var(--status-critical)',
                          display: 'inline-block',
                        }}
                        animate={{
                          boxShadow: [
                            `0 0 0 0 ${r.alarms < 3 ? 'rgba(16,185,129,0)' : r.alarms < 6 ? 'rgba(255,203,5,0)' : 'rgba(239,68,68,0)'}`,
                            `0 0 0 6px ${r.alarms < 3 ? 'rgba(16,185,129,0.2)' : r.alarms < 6 ? 'rgba(255,203,5,0.2)' : 'rgba(239,68,68,0.2)'}`,
                            `0 0 0 0 ${r.alarms < 3 ? 'rgba(16,185,129,0)' : r.alarms < 6 ? 'rgba(255,203,5,0)' : 'rgba(239,68,68,0)'}`,
                          ],
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      />
                      {r.alarms < 3 ? 'İyi' : r.alarms < 6 ? 'Orta' : 'Kötü'}
                    </motion.span>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </motion.div>
    </>
  )
}

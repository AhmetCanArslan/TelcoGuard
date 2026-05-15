import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FaBroadcastTower, FaCheckCircle, FaExclamationTriangle,
  FaTimesCircle, FaPowerOff, FaBell, FaWrench, FaHardHat,
  FaNetworkWired, FaShieldAlt, FaChartLine
} from 'react-icons/fa'
import StatCard from '../components/StatCard'
import NetworkMap from '../components/NetworkMap'
import AlarmTable from '../components/AlarmTable'
import { apiGetDashboardSummary, apiGetStations, apiGetAlarms } from '../services/api'
import { wsService } from '../services/websocket'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import type { BaseStation, Alarm, DashboardSummary } from '../types'

/* ---- Animated particles background ---- */
function ParticleField() {
  const particles = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * 10,
    })), []
  )

  return (
    <div className="dash-particles">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="dash-particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -40, 0],
            opacity: [0, 0.6, 0],
            scale: [0.5, 1.2, 0.5],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

/* ---- Status Ring: mini donut showing station status breakdown ---- */
function StatusRing({ summary }: { summary: DashboardSummary }) {
  const total = summary.total_stations || 1
  const segments = [
    { label: 'Aktif', value: summary.active_stations, color: '#10B981' },
    { label: 'Uyarı', value: summary.warning_stations, color: '#FFCB05' },
    { label: 'Kritik', value: summary.critical_stations, color: '#EF4444' },
    { label: 'Çevrimdışı', value: summary.offline_stations, color: '#6B7280' },
  ]

  let cumulativePercent = 0
  const radius = 52
  const circumference = 2 * Math.PI * radius

  return (
    <motion.div
      className="status-ring-container"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.5 }}
    >
      <div className="status-ring-header">
        <FaNetworkWired />
        <span>İstasyon Durumu</span>
      </div>
      <div className="status-ring-body">
        <div className="status-ring-svg-wrap">
          <svg width="140" height="140" viewBox="0 0 140 140">
            {/* Background ring */}
            <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
            {/* Segments */}
            {segments.map((seg, i) => {
              const pct = (seg.value / total) * 100
              const offset = circumference - (pct / 100) * circumference
              const rotation = (cumulativePercent / 100) * 360 - 90
              cumulativePercent += pct

              return (
                <motion.circle
                  key={i}
                  cx="70" cy="70" r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${circumference}`}
                  strokeDashoffset={offset}
                  transform={`rotate(${rotation} 70 70)`}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: offset }}
                  transition={{ duration: 1.2, delay: 0.7 + i * 0.15, ease: [0.21, 1.02, 0.73, 1] }}
                  style={{ filter: `drop-shadow(0 0 6px ${seg.color}40)` }}
                />
              )
            })}
          </svg>
          <div className="status-ring-center">
            <span className="status-ring-number">{total}</span>
            <span className="status-ring-label">Toplam</span>
          </div>
        </div>
        <div className="status-ring-legend">
          {segments.map((seg, i) => (
            <motion.div
              key={i}
              className="status-ring-legend-item"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1 + i * 0.1 }}
            >
              <span className="legend-dot" style={{ background: seg.color, boxShadow: `0 0 8px ${seg.color}60` }} />
              <span className="legend-text">{seg.label}</span>
              <span className="legend-value" style={{ color: seg.color }}>{seg.value}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

/* ---- Health Score Gauge ---- */
function HealthGauge({ summary }: { summary: DashboardSummary }) {
  const total = summary.total_stations || 1
  const healthScore = Math.round(
    ((summary.active_stations / total) * 70) +
    ((summary.warning_stations / total) * 20) +
    ((1 - summary.critical_stations / total) * 10)
  )
  const clampedScore = Math.min(100, Math.max(0, healthScore))

  const getScoreColor = (s: number) => {
    if (s >= 80) return '#10B981'
    if (s >= 60) return '#FFCB05'
    if (s >= 40) return '#F59E0B'
    return '#EF4444'
  }

  const scoreColor = getScoreColor(clampedScore)

  return (
    <motion.div
      className="health-gauge-container"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.6 }}
    >
      <div className="health-gauge-header">
        <FaShieldAlt />
        <span>Şebeke Sağlığı</span>
      </div>
      <div className="health-gauge-body">
        <div className="health-gauge-arc-wrap">
          <svg width="160" height="100" viewBox="0 0 160 100">
            {/* Background arc */}
            <path
              d="M 15 90 A 65 65 0 0 1 145 90"
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="10"
              strokeLinecap="round"
            />
            {/* Animated arc */}
            <motion.path
              d="M 15 90 A 65 65 0 0 1 145 90"
              fill="none"
              stroke={scoreColor}
              strokeWidth="10"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: clampedScore / 100 }}
              transition={{ duration: 1.5, delay: 0.8, ease: [0.21, 1.02, 0.73, 1] }}
              style={{ filter: `drop-shadow(0 0 10px ${scoreColor}50)` }}
            />
          </svg>
          <div className="health-gauge-score">
            <motion.span
              style={{ color: scoreColor }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              {clampedScore}
            </motion.span>
            <span className="health-gauge-unit">%</span>
          </div>
        </div>
        <div className="health-gauge-indicators">
          <div className="health-indicator">
            <FaChartLine style={{ color: '#10B981' }} />
            <div>
              <span className="hi-value">{summary.resolved_today || 0}</span>
              <span className="hi-label">Bugün Çözülen</span>
            </div>
          </div>
          <div className="health-indicator">
            <FaBell style={{ color: '#EF4444' }} />
            <div>
              <span className="hi-value">{summary.open_alarms}</span>
              <span className="hi-label">Açık Alarm</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ---- Main Dashboard ---- */
export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user?.role === 'FIELD_ENGINEER') {
      navigate('/alarms', { replace: true })
    }
  }, [user, navigate])
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [stations, setStations] = useState<BaseStation[]>([])
  const [alarms, setAlarms] = useState<Alarm[]>([])
  const [error, setError] = useState('')

  const canViewAlarms = user?.role === 'NOC_OPERATOR' || user?.role === 'ADMIN'

  const fetchData = useCallback(async () => {
    try {
      const [s, st, al] = await Promise.all([
        apiGetDashboardSummary(),
        apiGetStations(),
        canViewAlarms ? apiGetAlarms({ per_page: 10 }) : Promise.resolve({ data: [] }),
      ])
      setSummary(s)
      setStations(st)
      setAlarms(al.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Veri yüklenemedi')
    }
  }, [canViewAlarms])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)

    wsService.connect()
    const unsub1 = wsService.on('dashboard_snapshot', (msg) => {
      setSummary(msg.payload as DashboardSummary)
    })
    const unsub2 = wsService.on('new_alarm', () => { fetchData() })
    const unsub3 = wsService.on('station_status', () => { fetchData() })

    // Live engineer count: re-fetch summary when a user comes online/offline
    // (backend counts only FIELD_ENGINEER role, so delta approach is unreliable)
    const unsub4 = wsService.on('user_status', () => {
      apiGetDashboardSummary().then(s => setSummary(s)).catch(() => {})
    })

    return () => {
      clearInterval(interval)
      unsub1(); unsub2(); unsub3(); unsub4()
    }
  }, [fetchData])

  if (error) {
    return (
      <motion.div
        className="dash-error"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <FaTimesCircle size={28} />
        <span>{error}</span>
      </motion.div>
    )
  }

  if (!summary) {
    return (
      <div className="dash-loading">
        <motion.div
          className="dash-loading-ring"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        />
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          Dashboard yükleniyor...
        </motion.span>
      </div>
    )
  }

  const now = new Date()
  const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="dash-v2">

      {/* ---- Header ---- */}
      <motion.div
        className="dash-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="dash-header-left">
          <div className="dash-header-brand">
            <img src="/turkcell-logo.png" alt="Turkcell" className="dash-brand-logo" />
            <div>
              <h1 className="dash-title">Şebeke Dashboard</h1>
              <p className="dash-subtitle">{dateStr}</p>
            </div>
          </div>
        </div>
        <div className="dash-header-right">
          <motion.div
            className="dash-time-display"
          >
            {timeStr}
          </motion.div>
          <div className="dash-live-indicator">
            <span className="dash-live-pulse" />
            Canlı İzleme
          </div>
        </div>
      </motion.div>

      {/* ---- Stat Cards ---- */}
      <div className="dash-stats-grid">
        <StatCard icon={<FaBroadcastTower />}     value={summary.total_stations}    label="Toplam İstasyon"   colorClass="yellow" index={0} />
        <StatCard icon={<FaCheckCircle />}         value={summary.active_stations}   label="Aktif İstasyon"    colorClass="green"  index={1} />
        <StatCard icon={<FaExclamationTriangle />} value={summary.warning_stations}  label="Uyarı Durumunda"   colorClass="yellow" index={2} />
        <StatCard icon={<FaTimesCircle />}         value={summary.critical_stations} label="Kritik Durum"      colorClass="red"    index={3} />
        <StatCard icon={<FaPowerOff />}            value={summary.offline_stations}   label="Çevrimdışı"       colorClass="gray"   index={4} />
        <StatCard icon={<FaBell />}                value={summary.open_alarms}        label="Açık Alarm"       colorClass="red"    index={5} />
        <StatCard icon={<FaWrench />}              value={summary.in_progress_alarms} label="Müdahale Ediliyor" colorClass="blue"   index={6} />
        <StatCard icon={<FaHardHat />}             value={summary.online_engineers}   label="Çevrimiçi Müh."   colorClass="green"  index={7} />
      </div>

      {/* ---- Insights Row: Ring + Health ---- */}
      <div className="dash-insights-row">
        <StatusRing summary={summary} />
        <HealthGauge summary={summary} />
      </div>

      {/* ---- Map ---- */}
      <motion.div
        className="dash-map-section"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
      >
        <NetworkMap stations={stations} />
      </motion.div>

      {/* ---- Alarm Table ---- */}
      <AnimatePresence>
        {canViewAlarms && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
          >
            <AlarmTable alarms={alarms} compact />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

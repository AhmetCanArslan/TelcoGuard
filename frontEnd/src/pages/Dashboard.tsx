import { useState, useEffect, useCallback } from 'react'
import {
  FaBroadcastTower, FaCheckCircle, FaExclamationTriangle,
  FaTimesCircle, FaPowerOff, FaBell, FaWrench, FaHardHat
} from 'react-icons/fa'
import StatCard from '../components/StatCard'
import NetworkMap from '../components/NetworkMap'
import AlarmTable from '../components/AlarmTable'
import { apiGetDashboardSummary, apiGetStations, apiGetAlarms } from '../services/api'
import { wsService } from '../services/websocket'
import { useAuth } from '../context/AuthContext'
import type { BaseStation, Alarm, DashboardSummary } from '../types'

export default function Dashboard() {
  const { user } = useAuth()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [stations, setStations] = useState<BaseStation[]>([])
  const [alarms, setAlarms] = useState<Alarm[]>([])
  const [error, setError] = useState('')

  const canViewAlarms = user?.role === 'NOC' || user?.role === 'ADMIN'

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

    return () => {
      clearInterval(interval)
      unsub1(); unsub2(); unsub3()
    }
  }, [fetchData])

  if (error) {
    return <div style={{ textAlign: 'center', paddingTop: 80, color: 'var(--status-critical)' }}>{error}</div>
  }

  if (!summary) {
    return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}><div className="loading-spinner" /></div>
  }

  return (
    <>
      <div className="page-header">
        <h2>Şebeke Dashboard</h2>
        <div className="live-badge">
          <span className="live-dot" />
          Canlı İzleme
        </div>
      </div>

      <div className="stats-grid">
        <StatCard icon={<FaBroadcastTower />}       value={summary.total_stations}    label="Toplam İstasyon"   colorClass="yellow" />
        <StatCard icon={<FaCheckCircle />}           value={summary.active_stations}   label="Aktif İstasyon"    colorClass="green" />
        <StatCard icon={<FaExclamationTriangle />}   value={summary.warning_stations}  label="Uyarı Durumunda"   colorClass="yellow" />
        <StatCard icon={<FaTimesCircle />}           value={summary.critical_stations} label="Kritik Durum"      colorClass="red" />
        <StatCard icon={<FaPowerOff />}              value={summary.offline_stations}   label="Çevrimdışı"       colorClass="gray" />
        <StatCard icon={<FaBell />}                  value={summary.open_alarms}        label="Açık Alarm"       colorClass="red" />
        <StatCard icon={<FaWrench />}                value={summary.in_progress_alarms} label="Müdahale Ediliyor" colorClass="blue" />
        <StatCard icon={<FaHardHat />}               value={summary.online_engineers}   label="Çevrimiçi Müh."   colorClass="green" />
      </div>

      <div className="dashboard-grid">
        <NetworkMap stations={stations} />
      </div>

      {canViewAlarms && <AlarmTable alarms={alarms} compact />}
    </>
  )
}

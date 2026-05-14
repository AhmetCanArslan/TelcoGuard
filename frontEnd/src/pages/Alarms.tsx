import { useState, useEffect, useCallback } from 'react'
import { FaDownload } from 'react-icons/fa'
import AlarmTable from '../components/AlarmTable'
import { apiGetAlarms, apiAcknowledgeAlarm, apiAssignAlarm, apiResolveAlarm } from '../services/api'
import type { Alarm } from '../types'

function exportToCSV(alarms: Alarm[]) {
  const headers = ['ID', 'İstasyon', 'Metrik', 'Şiddet', 'Durum', 'Mesaj', 'Atanan', 'Çözüm Notu', 'Oluşturulma', 'Çözülme']
  const rows = alarms.map(a => [
    a.id,
    a.station?.name || a.station_id,
    a.metric_name,
    a.severity,
    a.status,
    `"${(a.message || '').replace(/"/g, '""')}"`,
    a.assigned_user?.name || '-',
    `"${(a.resolution_note || '').replace(/"/g, '""')}"`,
    new Date(a.created_at).toLocaleString('tr-TR'),
    a.resolved_at ? new Date(a.resolved_at).toLocaleString('tr-TR') : '-',
  ])

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const bom = '\uFEFF'
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `telcoguard_alarms_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export default function Alarms() {
  const [alarms, setAlarms] = useState<Alarm[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAlarms = useCallback(async () => {
    try {
      const res = await apiGetAlarms({ per_page: 100 })
      setAlarms(res.data)
    } catch {
      // silently fail, data stays stale
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAlarms()
    const interval = setInterval(fetchAlarms, 15000)
    return () => clearInterval(interval)
  }, [fetchAlarms])

  const handleAcknowledge = async (id: string) => {
    try {
      await apiAcknowledgeAlarm(id)
      fetchAlarms()
    } catch { /* show toast in the future */ }
  }

  const handleAssign = async (id: string) => {
    try {
      await apiAssignAlarm(id)
      fetchAlarms()
    } catch { /* show toast in the future */ }
  }

  const handleResolve = async (id: string) => {
    const note = prompt('Çözüm notu:')
    if (!note) return
    try {
      await apiResolveAlarm(id, note)
      fetchAlarms()
    } catch { /* show toast in the future */ }
  }

  const handleExportCSV = () => {
    exportToCSV(alarms)
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}><div className="loading-spinner" /></div>
  }

  return (
    <>
      <div className="page-header">
        <h2>Alarm Yönetimi</h2>
        <button className="btn-primary" onClick={handleExportCSV}><FaDownload /> CSV İndir</button>
      </div>
      <AlarmTable
        alarms={alarms}
        onAcknowledge={handleAcknowledge}
        onAssign={handleAssign}
        onResolve={handleResolve}
      />
    </>
  )
}

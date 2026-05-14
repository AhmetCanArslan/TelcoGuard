import { useState, useEffect, useCallback } from 'react'
import { FaDownload } from 'react-icons/fa'
import AlarmTable from '../components/AlarmTable'
import EngineerSelectModal from '../components/EngineerSelectModal'
import ResolveModal from '../components/ResolveModal'
import { apiGetAlarms, apiGetMyAlarms, apiAcknowledgeAlarm, apiAssignAlarm, apiResolveAlarm } from '../services/api'
import { useAuth } from '../context/AuthContext'
import type { Alarm, FieldEngineer } from '../types'

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
  const [assignTargetAlarmId, setAssignTargetAlarmId] = useState<string | null>(null)
  const [resolveTargetAlarmId, setResolveTargetAlarmId] = useState<string | null>(null)
  const { user } = useAuth()

  const fetchAlarms = useCallback(async () => {
    try {
      let data: Alarm[] = []
      if (user?.role === 'FIELD_ENGINEER') {
        data = await apiGetMyAlarms()
      } else {
        const res = await apiGetAlarms({ per_page: 100 })
        data = res.data
      }
      setAlarms(data)
    } catch {
      // silently fail, data stays stale
    } finally {
      setLoading(false)
    }
  }, [user])

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

  const handleAssign = (id: string) => {
    setAssignTargetAlarmId(id)
  }

  const handleEngineerSelected = async (engineer: FieldEngineer) => {
    if (!assignTargetAlarmId) return
    try {
      await apiAssignAlarm(assignTargetAlarmId, engineer.id)
      setAssignTargetAlarmId(null)
      fetchAlarms()
    } catch { /* show toast in the future */ }
  }

  const handleResolve = (id: string) => {
    setResolveTargetAlarmId(id)
  }

  const handleResolveConfirm = async (note: string) => {
    if (!resolveTargetAlarmId) return
    try {
      await apiResolveAlarm(resolveTargetAlarmId, note)
      setResolveTargetAlarmId(null)
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

      {assignTargetAlarmId && (
        <EngineerSelectModal
          onSelect={handleEngineerSelected}
          onClose={() => setAssignTargetAlarmId(null)}
        />
      )}

      {resolveTargetAlarmId && (
        <ResolveModal
          onResolve={handleResolveConfirm}
          onClose={() => setResolveTargetAlarmId(null)}
        />
      )}
    </>
  )
}

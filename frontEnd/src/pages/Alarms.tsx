import { useState, useEffect, useCallback } from 'react'
import { FaDownload } from 'react-icons/fa'
import AlarmTable from '../components/AlarmTable'
import { apiGetAlarms, apiAcknowledgeAlarm, apiAssignAlarm, apiResolveAlarm } from '../services/api'
import type { Alarm } from '../types'

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

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}><div className="loading-spinner" /></div>
  }

  return (
    <>
      <div className="page-header">
        <h2>Alarm Yönetimi</h2>
        <button className="btn-primary"><FaDownload /> CSV İndir</button>
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

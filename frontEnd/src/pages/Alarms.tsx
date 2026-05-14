import { useState, useEffect, useCallback } from 'react'
import { FaDownload, FaFilter, FaTimes } from 'react-icons/fa'
import AlarmTable from '../components/AlarmTable'
import { apiGetAlarms, apiGetStations, apiAcknowledgeAlarm, apiAssignAlarm, apiResolveAlarm } from '../services/api'
import type { Alarm, BaseStation, AlarmSeverity, AlarmStatus } from '../types'

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

interface AlarmFilters {
  severity: string
  status: string
  station: string
  dateFrom: string
  dateTo: string
}

const emptyFilters: AlarmFilters = {
  severity: '',
  status: '',
  station: '',
  dateFrom: '',
  dateTo: '',
}

export default function Alarms() {
  const [alarms, setAlarms] = useState<Alarm[]>([])
  const [stations, setStations] = useState<BaseStation[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<AlarmFilters>(emptyFilters)
  const [showFilters, setShowFilters] = useState(false)

  const fetchAlarms = useCallback(async () => {
    try {
      const params: { severity?: AlarmSeverity; status?: AlarmStatus; station?: string; per_page: number } = { per_page: 200 }
      if (filters.severity) params.severity = filters.severity as AlarmSeverity
      if (filters.status) params.status = filters.status as AlarmStatus
      if (filters.station) params.station = filters.station

      const res = await apiGetAlarms(params)
      let data = res.data

      if (filters.dateFrom) {
        const from = new Date(filters.dateFrom)
        data = data.filter(a => new Date(a.created_at) >= from)
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo)
        to.setHours(23, 59, 59, 999)
        data = data.filter(a => new Date(a.created_at) <= to)
      }

      setAlarms(data)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchAlarms()
    const interval = setInterval(fetchAlarms, 15000)
    return () => clearInterval(interval)
  }, [fetchAlarms])

  useEffect(() => {
    apiGetStations().then(setStations).catch(() => {})
  }, [])

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

  const handleFilterChange = (key: keyof AlarmFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters(emptyFilters)
  }

  const hasActiveFilters = Object.values(filters).some(v => v !== '')

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}><div className="loading-spinner" /></div>
  }

  return (
    <>
      <div className="page-header">
        <h2>Alarm Yönetimi</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-primary" onClick={() => setShowFilters(!showFilters)} style={{ background: showFilters ? 'var(--primary-light)' : undefined }}>
            <FaFilter /> Filtreler {hasActiveFilters && <span style={{ marginLeft: 4, background: 'var(--accent)', color: 'var(--bg-primary)', borderRadius: 10, padding: '1px 6px', fontSize: 10 }}>●</span>}
          </button>
          <button className="btn-primary" onClick={handleExportCSV}><FaDownload /> CSV İndir</button>
        </div>
      </div>

      {showFilters && (
        <div className="filter-bar">
          <div className="filter-row">
            <div className="filter-group">
              <label>Tarih (Başlangıç)</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={e => handleFilterChange('dateFrom', e.target.value)}
                className="filter-input"
              />
            </div>
            <div className="filter-group">
              <label>Tarih (Bitiş)</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={e => handleFilterChange('dateTo', e.target.value)}
                className="filter-input"
              />
            </div>
            <div className="filter-group">
              <label>Şiddet</label>
              <select
                value={filters.severity}
                onChange={e => handleFilterChange('severity', e.target.value)}
                className="filter-input"
              >
                <option value="">Tümü</option>
                <option value="WARNING">Uyarı</option>
                <option value="CRITICAL">Kritik</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Durum</label>
              <select
                value={filters.status}
                onChange={e => handleFilterChange('status', e.target.value)}
                className="filter-input"
              >
                <option value="">Tümü</option>
                <option value="OPEN">Açık</option>
                <option value="ACKNOWLEDGED">Kabul Edildi</option>
                <option value="IN_PROGRESS">Müdahale</option>
                <option value="RESOLVED">Çözüldü</option>
              </select>
            </div>
            <div className="filter-group">
              <label>İstasyon</label>
              <select
                value={filters.station}
                onChange={e => handleFilterChange('station', e.target.value)}
                className="filter-input"
              >
                <option value="">Tümü</option>
                {stations.map(s => (
                  <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
                ))}
              </select>
            </div>
            {hasActiveFilters && (
              <button className="filter-clear-btn" onClick={clearFilters}>
                <FaTimes /> Temizle
              </button>
            )}
          </div>
        </div>
      )}

      <AlarmTable
        alarms={alarms}
        onAcknowledge={handleAcknowledge}
        onAssign={handleAssign}
        onResolve={handleResolve}
      />
    </>
  )
}

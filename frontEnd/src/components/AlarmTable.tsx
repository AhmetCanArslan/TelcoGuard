import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Alarm, AlarmStatus } from '../types'

interface Props {
  alarms: Alarm[]
  compact?: boolean
}

const statusLabels: Record<AlarmStatus, string> = {
  OPEN: 'Açık',
  ACKNOWLEDGED: 'Kabul Edildi',
  IN_PROGRESS: 'Müdahale',
  RESOLVED: 'Çözüldü',
}

export default function AlarmTable({ alarms, compact = false }: Props) {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<string>('ALL')

  const filtered = filter === 'ALL'
    ? alarms
    : alarms.filter(a => a.severity === filter || a.status === filter)

  const displayAlarms = compact ? filtered.slice(0, 5) : filtered

  return (
    <div className="alarm-panel">
      <div className="alarm-panel-header">
        <h3>
          <span>🔔</span>
          {compact ? 'Son Alarmlar' : 'Alarm Yönetimi'}
          <span style={{ opacity: 0.5, fontWeight: 400 }}> ({filtered.length})</span>
        </h3>
        <div className="alarm-filters">
          {['ALL', 'CRITICAL', 'WARNING', 'OPEN', 'IN_PROGRESS'].map(f => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'ALL' ? 'Tümü' : f === 'CRITICAL' ? 'Kritik' : f === 'WARNING' ? 'Uyarı' : f === 'OPEN' ? 'Açık' : 'Müdahale'}
            </button>
          ))}
        </div>
      </div>

      <table className="alarm-table">
        <thead>
          <tr>
            <th>İstasyon</th>
            <th>Metrik</th>
            <th>Şiddet</th>
            <th>Durum</th>
            <th>Mesaj</th>
            <th>Zaman</th>
            {!compact && <th>Atanan</th>}
          </tr>
        </thead>
        <tbody>
          {displayAlarms.map(alarm => (
            <tr
              key={alarm.id}
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/stations/${alarm.stationId}`)}
            >
              <td>
                <strong style={{ color: 'var(--accent)' }}>{alarm.stationCode}</strong>
                <br />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{alarm.stationName}</span>
              </td>
              <td>{alarm.metricName.replace('_', ' ')}</td>
              <td><span className={`severity-badge ${alarm.severity}`}>
                {alarm.severity === 'CRITICAL' ? '🔴' : '🟡'} {alarm.severity === 'CRITICAL' ? 'Kritik' : 'Uyarı'}
              </span></td>
              <td><span className={`status-badge ${alarm.status}`}>{statusLabels[alarm.status]}</span></td>
              <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {alarm.message}
              </td>
              <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {new Date(alarm.createdAt).toLocaleTimeString('tr-TR')}
              </td>
              {!compact && (
                <td style={{ color: alarm.assignedTo ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {alarm.assignedTo || '—'}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

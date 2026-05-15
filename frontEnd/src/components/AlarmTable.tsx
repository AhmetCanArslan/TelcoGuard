import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaBell, FaExclamationCircle, FaExclamationTriangle, FaCheck, FaTimes, FaUserPlus } from 'react-icons/fa'
import type { Alarm, AlarmStatus } from '../types'

interface Props {
  alarms: Alarm[]
  compact?: boolean
  onAcknowledge?: (id: string) => void
  onAssign?: (id: string) => void
  onResolve?: (id: string) => void
  onReject?: (id: string) => void
}

const statusLabels: Record<AlarmStatus, string> = {
  OPEN: 'Açık',
  ACKNOWLEDGED: 'Kabul Edildi',
  IN_PROGRESS: 'Müdahale',
  RESOLVED: 'Çözüldü',
  REJECTED: 'Reddedildi',
}

export default function AlarmTable({ alarms, compact = false, onAcknowledge, onAssign, onResolve, onReject }: Props) {
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
          <FaBell />
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
            {!compact && <th>Not</th>}
            {!compact && <th>Atanan</th>}
            {!compact && (onAcknowledge || onAssign || onResolve || onReject) && <th>İşlem</th>}
          </tr>
        </thead>
        <tbody>
          {displayAlarms.map(alarm => (
            <tr
              key={alarm.id}
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/stations/${alarm.station_id}`)}
            >
              <td>
                <strong style={{ color: 'var(--accent)' }}>{alarm.station?.code || '—'}</strong>
                <br />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{alarm.station?.name || ''}</span>
              </td>
              <td>{alarm.metric_name.replace('_', ' ')}</td>
              <td><span className={`severity-badge ${alarm.severity}`}>
                {alarm.severity === 'CRITICAL' ? <FaExclamationCircle /> : <FaExclamationTriangle />}
                {' '}{alarm.severity === 'CRITICAL' ? 'Kritik' : 'Uyarı'}
              </span></td>
              <td><span className={`status-badge ${alarm.status}`}>{statusLabels[alarm.status]}</span></td>
              <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {alarm.message}
              </td>
              <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', fontFamily: 'var(--font-data)' }}>
                {new Date(alarm.created_at).toLocaleTimeString('tr-TR')}
              </td>
              {!compact && (
                <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {alarm.rejection_note || alarm.resolution_note || '—'}
                </td>
              )}
              {!compact && (
                <td style={{ color: alarm.assigned_user ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {alarm.assigned_user?.name || '—'}
                </td>
              )}
              {!compact && (onAcknowledge || onAssign || onResolve || onReject) && (
                <td onClick={e => e.stopPropagation()}>
                  <div className="alarm-actions">
                    {alarm.status === 'OPEN' && onAcknowledge && (
                      <button className="alarm-action-btn" onClick={() => onAcknowledge(alarm.id)} title="Onayla">
                        <FaCheck />
                      </button>
                    )}
                    {(alarm.status === 'OPEN' || alarm.status === 'ACKNOWLEDGED') && onAssign && (
                      <button className="alarm-action-btn" onClick={() => onAssign(alarm.id)} title="Ata">
                        <FaUserPlus />
                      </button>
                    )}
                    {alarm.status !== 'RESOLVED' && alarm.status !== 'REJECTED' && onResolve && (
                      <button className="alarm-action-btn resolve" onClick={() => onResolve(alarm.id)} title="Çöz">
                        <FaCheck />
                      </button>
                    )}
                    {alarm.status === 'IN_PROGRESS' && onReject && (
                      <button className="alarm-action-btn reject" onClick={() => onReject(alarm.id)} title="Reddet">
                        <FaTimes />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

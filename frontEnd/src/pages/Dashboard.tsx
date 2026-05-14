import StatCard from '../components/StatCard'
import NetworkMap from '../components/NetworkMap'
import AlarmTable from '../components/AlarmTable'
import { mockStations, mockAlarms, mockSummary } from '../data/mockData'

export default function Dashboard() {
  return (
    <>
      <div className="page-header">
        <h2>Şebeke Dashboard</h2>
        <div className="live-badge">
          <span className="live-dot" />
          Canlı İzleme
        </div>
      </div>

      {/* Summary Stats */}
      <div className="stats-grid">
        <StatCard icon="📡" value={mockSummary.totalStations}  label="Toplam İstasyon"   colorClass="yellow" />
        <StatCard icon="✅" value={mockSummary.activeStations}  label="Aktif İstasyon"    colorClass="green" />
        <StatCard icon="⚠️" value={mockSummary.warningStations} label="Uyarı Durumunda"   colorClass="yellow" />
        <StatCard icon="🔴" value={mockSummary.criticalStations} label="Kritik Durum"     colorClass="red" />
        <StatCard icon="📴" value={mockSummary.offlineStations}  label="Çevrimdışı"       colorClass="gray" />
        <StatCard icon="🔔" value={mockSummary.openAlarms}       label="Açık Alarm"       colorClass="red" />
        <StatCard icon="🛠️" value={mockSummary.inProgressAlarms} label="Müdahale Ediliyor" colorClass="navy" />
        <StatCard icon="👷" value={mockSummary.onlineEngineers}  label="Çevrimiçi Müh."   colorClass="green" />
      </div>

      {/* Map */}
      <div className="dashboard-grid">
        <NetworkMap stations={mockStations} />
      </div>

      {/* Recent Alarms */}
      <AlarmTable alarms={mockAlarms} compact />
    </>
  )
}

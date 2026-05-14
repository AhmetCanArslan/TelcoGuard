import AlarmTable from '../components/AlarmTable'
import { mockAlarms } from '../data/mockData'

export default function Alarms() {
  return (
    <>
      <div className="page-header">
        <h2>Alarm Yönetimi</h2>
        <button className="btn-primary">CSV İndir</button>
      </div>
      <AlarmTable alarms={mockAlarms} />
    </>
  )
}

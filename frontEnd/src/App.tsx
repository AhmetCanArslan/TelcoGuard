import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import StationDetail from './pages/StationDetail'
import Alarms from './pages/Alarms'
import Engineers from './pages/Engineers'
import Reports from './pages/Reports'
import SimulatorControl from './pages/SimulatorControl'

export default function App() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/stations/:id" element={<StationDetail />} />
          <Route path="/alarms" element={<Alarms />} />
          <Route path="/engineers" element={<Engineers />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/simulator" element={<SimulatorControl />} />
        </Routes>
      </main>
    </div>
  )
}

import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import StationDetail from './pages/StationDetail'
import Alarms from './pages/Alarms'
import Engineers from './pages/Engineers'
import Reports from './pages/Reports'
import SimulatorControl from './pages/SimulatorControl'
import Users from './pages/Users'
import Metrics from './pages/Metrics'
import Summary from './pages/Summary'
import ForgotPassword from './pages/ForgotPassword'

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  )
}

function ProtectedPage({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
        <Route path="/stations/:id" element={<ProtectedPage><StationDetail /></ProtectedPage>} />
        <Route path="/alarms" element={<ProtectedPage allowedRoles={['ADMIN', 'NOC_OPERATOR', 'FIELD_ENGINEER']}><Alarms /></ProtectedPage>} />
        <Route path="/engineers" element={<ProtectedPage allowedRoles={['ADMIN', 'NOC_OPERATOR']}><Engineers /></ProtectedPage>} />
        <Route path="/reports" element={<ProtectedPage allowedRoles={['ADMIN', 'NOC_OPERATOR']}><Reports /></ProtectedPage>} />
          <Route path="/metrics" element={<ProtectedPage allowedRoles={['ADMIN', 'NOC_OPERATOR']}><Metrics /></ProtectedPage>} />
        <Route path="/simulator" element={<ProtectedPage allowedRoles={['ADMIN']}><SimulatorControl /></ProtectedPage>} />
        <Route path="/users" element={<ProtectedPage allowedRoles={['ADMIN']}><Users /></ProtectedPage>} />
        <Route path="/summary" element={<ProtectedPage allowedRoles={['ADMIN', 'NETWORK_MANAGER']}><Summary /></ProtectedPage>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}


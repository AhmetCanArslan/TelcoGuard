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

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  )
}

function ProtectedPage({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
        <Route path="/stations/:id" element={<ProtectedPage><StationDetail /></ProtectedPage>} />
        <Route path="/alarms" element={<ProtectedPage><Alarms /></ProtectedPage>} />
        <Route path="/engineers" element={<ProtectedPage><Engineers /></ProtectedPage>} />
        <Route path="/reports" element={<ProtectedPage><Reports /></ProtectedPage>} />
        <Route path="/simulator" element={<ProtectedPage><SimulatorControl /></ProtectedPage>} />
        <Route path="/users" element={<ProtectedRoute allowedRoles={['ADMIN']}><AppLayout><Users /></AppLayout></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

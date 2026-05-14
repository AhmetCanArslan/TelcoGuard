import { useState, useCallback } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Sidebar from './components/Sidebar'
import ChatWidget from './components/ChatWidget'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import StationDetail from './pages/StationDetail'
import Alarms from './pages/Alarms'
import Engineers from './pages/Engineers'
import Reports from './pages/Reports'
import SimulatorControl from './pages/SimulatorControl'
import Users from './pages/Users'
import Summary from './pages/Summary'

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
  const [chatTarget, setChatTarget] = useState<{ id: number; name: string } | null>(null)

  const handleOpenChat = useCallback((target: { id: number; name: string }) => {
    setChatTarget(target)
  }, [])

  const handleClearChatTarget = useCallback(() => {
    setChatTarget(null)
  }, [])

  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
        <Route path="/stations/:id" element={<ProtectedPage><StationDetail /></ProtectedPage>} />
        <Route path="/alarms" element={<ProtectedPage allowedRoles={['ADMIN', 'NOC_OPERATOR']}><Alarms /></ProtectedPage>} />
        <Route path="/engineers" element={
          <ProtectedPage allowedRoles={['ADMIN', 'NOC_OPERATOR']}>
            <Engineers onOpenChat={handleOpenChat} />
          </ProtectedPage>
        } />
        <Route path="/reports" element={<ProtectedPage allowedRoles={['ADMIN', 'NOC_OPERATOR']}><Reports /></ProtectedPage>} />
        <Route path="/simulator" element={<ProtectedPage allowedRoles={['ADMIN']}><SimulatorControl /></ProtectedPage>} />
        <Route path="/users" element={<ProtectedPage allowedRoles={['ADMIN']}><Users /></ProtectedPage>} />
        <Route path="/summary" element={<ProtectedPage allowedRoles={['ADMIN', 'NETWORK_MANAGER']}><Summary /></ProtectedPage>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global floating chat widget + notification toasts */}
      <ChatWidget initialTarget={chatTarget} onClearInitial={handleClearChatTarget} />
    </AuthProvider>
  )
}

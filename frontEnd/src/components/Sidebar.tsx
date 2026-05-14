import { useLocation, useNavigate } from 'react-router-dom'

const navItems = [
  { path: '/',           label: 'Dashboard',       icon: '📊' },
  { path: '/alarms',     label: 'Alarm Yönetimi',  icon: '🔔' },
  { path: '/engineers',  label: 'Saha Mühendisleri', icon: '👷' },
  { path: '/reports',    label: 'Raporlama',        icon: '📈' },
  { path: '/simulator',  label: 'Simülatör',        icon: '⚡' },
]

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-icon">TG</div>
          <div>
            <h1>TelcoGuard</h1>
            <span>Şebeke İzleme Platformu</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => (
          <div
            key={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            {item.label}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">NO</div>
          <div className="user-details">
            <div className="user-name">NOC Operatörü</div>
            <div className="user-role">Şebeke İzleme</div>
          </div>
        </div>
      </div>
    </aside>
  )
}

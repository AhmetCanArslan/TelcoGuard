import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  FaTachometerAlt, FaBell, FaHardHat, FaChartLine,
  FaBolt, FaUserShield, FaChartBar, FaSignOutAlt
} from 'react-icons/fa'

const navItems = [
  { path: '/',           label: 'Dashboard',            icon: <FaTachometerAlt />, roles: ['ADMIN', 'NOC_OPERATOR', 'NETWORK_MANAGER'] },
  { path: '/alarms',     label: 'Alarmlar',             icon: <FaBell />,          roles: ['ADMIN', 'NOC_OPERATOR', 'FIELD_ENGINEER'] },
  { path: '/engineers',  label: 'Saha Mühendisleri',    icon: <FaHardHat />,       roles: ['ADMIN', 'NOC_OPERATOR'] },
  { path: '/reports',    label: 'Raporlama',            icon: <FaChartLine />,     roles: ['ADMIN', 'NOC_OPERATOR'] },
  { path: '/metrics',    label: 'Metrikler',            icon: <FaChartBar />,     roles: ['ADMIN', 'NOC_OPERATOR'] },
  { path: '/summary',    label: 'Özet & Analiz',        icon: <FaChartBar />,      roles: ['ADMIN', 'NETWORK_MANAGER'] },
  { path: '/simulator',  label: 'Simülatör',            icon: <FaBolt />,          roles: ['ADMIN'] },
  { path: '/users',      label: 'Kullanıcı Yönetimi',   icon: <FaUserShield />,   roles: ['ADMIN'] },
]


export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

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
        {navItems
          .filter(item => !item.roles || (user && item.roles.includes(user.role)))
          .map(item => (
          <div
            key={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            {item.icon}
            {item.label}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">
            {user ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'NO'}
          </div>
          <div className="user-details">
            <div className="user-name">{user?.name || 'NOC Operatörü'}</div>
            <div className="user-role">{user?.role || 'Şebeke İzleme'}</div>
          </div>
        </div>
        <button className="sidebar-logout-btn" onClick={handleLogout}>
          <FaSignOutAlt /> Çıkış Yap
        </button>
      </div>
    </aside>
  )
}

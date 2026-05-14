import { useState, useEffect } from 'react'
import { FaPlus, FaTrash, FaSave, FaTimes, FaEdit, FaUserShield } from 'react-icons/fa'
import { apiGetUsers, apiCreateUser, apiUpdateUser, apiDeleteUser } from '../services/api'
import type { FieldEngineer } from '../types'

const ROLES = ['ADMIN', 'NOC_OPERATOR', 'FIELD_ENGINEER', 'NETWORK_MANAGER']

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  NOC_OPERATOR: 'NOC Operatörü',
  FIELD_ENGINEER: 'Saha Mühendisi',
  NETWORK_MANAGER: 'Şebeke Yöneticisi',
}

export default function Users() {
  const [users, setUsers] = useState<FieldEngineer[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<Partial<FieldEngineer>>({})
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', email: '', password: '', phone: '', role: 'NOC_OPERATOR' })
  const [creating, setCreating] = useState(false)

  const fetchUsers = () => {
    apiGetUsers()
      .then(setUsers)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchUsers() }, [])

  const startEdit = (user: FieldEngineer) => {
    setEditingId(user.id)
    setEditForm({ name: user.name, email: user.email, phone: user.phone, role: user.role, active: user.active })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({})
  }

  const saveEdit = async (id: number) => {
    try {
      await apiUpdateUser(id, editForm)
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...editForm } : u))
      setEditingId(null)
      setEditForm({})
    } catch (e) {
      alert('Failed to update user')
    }
  }

  const deleteUser = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return
    try {
      await apiDeleteUser(id)
      setUsers(prev => prev.filter(u => u.id !== id))
    } catch (e) {
      alert('Failed to delete user')
    }
  }

  const createUser = async () => {
    if (!addForm.name || !addForm.email || !addForm.password) {
      alert('Name, email and password are required')
      return
    }
    setCreating(true)
    try {
      const newUser = await apiCreateUser(addForm)
      setUsers(prev => [...prev, newUser])
      setShowAddForm(false)
      setAddForm({ name: '', email: '', password: '', phone: '', role: 'NOC_OPERATOR' })
    } catch (e) {
      alert('Failed to create user')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}><div className="loading-spinner" /></div>
  }

  return (
    <>
      <div className="page-header">
        <h2>Kullanıcı Yönetimi</h2>
        <button className="btn-primary" onClick={() => setShowAddForm(prev => !prev)}>
          <FaPlus /> {showAddForm ? 'İptal' : 'Yeni Kullanıcı'}
        </button>
      </div>

      {showAddForm && (
        <div className="alarm-panel" style={{ marginBottom: 20 }}>
          <div className="alarm-panel-header">
            <h3><FaUserShield /> Yeni Kullanıcı Oluştur</h3>
          </div>
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="user-form-row">
              <div className="user-form-field">
                <label>Ad Soyad</label>
                <input className="user-input" placeholder="Ad Soyad" value={addForm.name}
                  onChange={e => setAddForm(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="user-form-field">
                <label>E-posta</label>
                <input className="user-input" placeholder="E-posta" type="email" value={addForm.email}
                  onChange={e => setAddForm(prev => ({ ...prev, email: e.target.value }))} />
              </div>
            </div>
            <div className="user-form-row">
              <div className="user-form-field">
                <label>Parola</label>
                <input className="user-input" placeholder="Parola" type="password" value={addForm.password}
                  onChange={e => setAddForm(prev => ({ ...prev, password: e.target.value }))} />
              </div>
              <div className="user-form-field">
                <label>Telefon</label>
                <input className="user-input" placeholder="+905xxxxxxxxx" value={addForm.phone}
                  onChange={e => setAddForm(prev => ({ ...prev, phone: e.target.value }))} />
              </div>
            </div>
            <div className="user-form-row">
              <div className="user-form-field">
                <label>Rol</label>
                <select className="user-select" value={addForm.role}
                  onChange={e => setAddForm(prev => ({ ...prev, role: e.target.value }))}>
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              <div className="user-form-field" style={{ justifyContent: 'flex-end', paddingTop: 22 }}>
                <button className="btn-primary" onClick={createUser} disabled={creating}
                  style={{ minWidth: 130, justifyContent: 'center' }}>
                  {creating ? <><div className="login-spinner" /> Oluşturuluyor...</> : 'Oluştur'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="alarm-panel">
        <div className="alarm-panel-header">
          <h3><FaUserShield /> Tüm Kullanıcılar ({users.length})</h3>
        </div>
        <table className="alarm-table">
          <thead>
            <tr>
              <th>Ad Soyad</th>
              <th>E-posta</th>
              <th>Telefon</th>
              <th>Rol</th>
              <th>Durum</th>
              <th>Son Görülme</th>
              <th style={{ width: 120 }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => {
              const isEditing = editingId === user.id
              return (
                <tr key={user.id}>
                  <td>
                    {isEditing
                      ? <input className="user-input" value={editForm.name || ''}
                          onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))} />
                      : <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="user-avatar" style={{ width: 28, height: 28, fontSize: 10 }}>
                            {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          {user.name}
                        </span>}
                  </td>
                  <td>
                    {isEditing
                      ? <input className="user-input" value={editForm.email || ''}
                          onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))} />
                      : user.email}
                  </td>
                  <td>
                    {isEditing
                      ? <input className="user-input" value={editForm.phone || ''}
                          onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))} />
                      : user.phone || '-'}
                  </td>
                  <td>
                    {isEditing
                      ? <select className="user-select" value={editForm.role || ''}
                          onChange={e => setEditForm(prev => ({ ...prev, role: e.target.value }))}>
                          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                        </select>
                      : <span className={`status-badge ${user.role === 'ADMIN' ? 'RESOLVED' : user.role === 'NOC_OPERATOR' ? 'ACKNOWLEDGED' : 'OPEN'}`}>
                          {ROLE_LABELS[user.role] || user.role}
                        </span>}
                  </td>
                  <td>
                    {isEditing
                      ? <label className="toggle-switch">
                          <input type="checkbox" checked={editForm.active ?? true}
                            onChange={e => setEditForm(prev => ({ ...prev, active: e.target.checked }))} />
                          <span className="toggle-slider" />
                        </label>
                      : <span className={`status-badge ${user.active ? 'RESOLVED' : 'OPEN'}`}
                          style={{ fontSize: 11 }}>
                          {user.active ? 'Aktif' : 'Pasif'}
                        </span>}
                  </td>
                  <td style={{ fontFamily: 'var(--font-data)', fontSize: 12, color: 'var(--text-muted)' }}>
                    {user.last_seen_at
                      ? new Date(user.last_seen_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                      : '-'}
                  </td>
                  <td>
                    <div className="alarm-actions">
                      {isEditing ? (
                        <>
                          <button className="alarm-action-btn" onClick={() => saveEdit(user.id)} title="Save">
                            <FaSave /> Kaydet
                          </button>
                          <button className="alarm-action-btn" onClick={cancelEdit} title="Cancel">
                            <FaTimes /> İptal
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="alarm-action-btn" onClick={() => startEdit(user)} title="Edit">
                            <FaEdit /> Düzenle
                          </button>
                          <button className="alarm-action-btn resolve" onClick={() => deleteUser(user.id)} title="Delete"
                            style={{ borderColor: 'rgba(239,68,68,0.2)', color: 'var(--status-critical)' }}>
                            <FaTrash /> Sil
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  Kullanıcı bulunamadı
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

/* ======================================================
   TelcoGuard – Login Page
   ====================================================== */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FaShieldAlt, FaEnvelope, FaLock, FaSignInAlt, FaExclamationTriangle } from 'react-icons/fa'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Giriş başarısız')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg-grid" />
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">
            <FaShieldAlt />
          </div>
          <h1>TelcoGuard</h1>
          <p>Şebeke İzleme Platformu</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <h2>Giriş Yap</h2>

          {error && (
            <div className="login-error">
              <FaExclamationTriangle />
              {error}
            </div>
          )}

          <div className="login-field">
            <label htmlFor="login-email">E-posta</label>
            <div className="login-input-wrapper">
              <FaEnvelope className="login-input-icon" />
              <input
                id="login-email"
                type="email"
                placeholder="ornek@turkcell.com.tr"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Şifre</label>
            <div className="login-input-wrapper">
              <FaLock className="login-input-icon" />
              <input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            id="login-submit"
            type="submit"
            className="btn-primary login-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="login-spinner" />
            ) : (
              <>
                <FaSignInAlt /> Giriş Yap
              </>
            )}
          </button>
        </form>

        <p className="login-footer-text">
          Turkcell CodeNight 2026 — TelcoGuard
        </p>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaShieldAlt, FaEnvelope, FaCheck, FaArrowLeft,
  FaExclamationTriangle, FaPaperPlane
} from 'react-icons/fa'
import { apiSendResetEmail } from '../services/api'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.includes('@')) {
      setError('Geçerli bir e-posta adresi giriniz')
      return
    }
    setError('')
    setLoading(true)
    try {
      await apiSendResetEmail(email)
      setSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'E-posta gönderilemedi')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="login-page">
        <div className="login-bg-grid" />
        <div className="login-card" style={{ textAlign: 'center' }}>
          <div className="login-logo">
            <div className="login-logo-icon" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
              <FaCheck />
            </div>
            <h1>E-posta Gönderildi</h1>
            <p style={{ fontSize: 13, lineHeight: 1.6, marginTop: 8 }}>
              {email} adresine şifre sıfırlama bağlantısı gönderildi.<br />
              Lütfen e-postanızı kontrol edin.
            </p>
          </div>
          <div style={{ marginTop: 8, padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
            fontSize: 11, color: 'var(--text-muted)', textAlign: 'left' }}>
            <strong style={{ color: 'var(--accent)', fontSize: 12 }}>Gönderen:</strong> Firebase (noreply@case1turkcell.firebaseapp.com)<br />
            <strong style={{ color: 'var(--accent)', fontSize: 12 }}>Konu:</strong> Şifrenizi sıfırlayın<br />
            <span style={{ display: 'block', marginTop: 6 }}>Spam klasörünü de kontrol edin.</span>
          </div>
          <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn-primary" onClick={() => navigate('/login')}>
              <FaArrowLeft /> Giriş Yap
            </button>
            <button className="filter-btn" onClick={() => { setSent(false); setEmail('') }}
              style={{ padding: '8px 20px', fontSize: 13 }}>
              Farklı E-posta
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-bg-grid" />
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">
            <FaShieldAlt />
          </div>
          <h1>Şifre Sıfırlama</h1>
          <p>E-posta adresinize şifre sıfırlama bağlantısı gönderelim</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <h2>E-posta Adresiniz</h2>

          {error && (
            <div className="login-error">
              <FaExclamationTriangle />
              {error}
            </div>
          )}

          <div className="login-field">
            <label>E-posta</label>
            <div className="login-input-wrapper">
              <FaEnvelope className="login-input-icon" />
              <input
                type="email"
                placeholder="ornek@turkcell.com.tr"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary login-btn" disabled={loading}>
            {loading ? <span className="login-spinner" /> : <><FaPaperPlane /> Gönder</>}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button className="filter-btn" onClick={() => navigate('/login')} style={{ fontSize: 12 }}>
            <FaArrowLeft style={{ marginRight: 4 }} /> Giriş Sayfasına Dön
          </button>
        </div>
      </div>
    </div>
  )
}

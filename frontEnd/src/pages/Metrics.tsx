import { useState, useEffect } from 'react'
import { FaSave, FaRedo, FaChartBar } from 'react-icons/fa'

export default function Metrics() {
  const defaultConfig = {
    zWarning: 2,
    zCritical: 3,
    corrThreshold: 2,
    maWindow: 10,
    maWarning: 2,
    maCritical: 3,
  } as const

  const [config, setConfig] = useState(defaultConfig)
  const [saved, setSaved] = useState(false)

  // Load persisted config
  useEffect(() => {
    const stored = localStorage.getItem('anomalyConfig')
    if (stored) {
      try {
        setConfig(JSON.parse(stored))
      } catch { /* ignore malformed */ }
    }
  }, [])

  const handleChange = (field: keyof typeof defaultConfig) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig(prev => ({ ...prev, [field]: Number(e.target.value) }))
  }

  const handleSave = () => {
    localStorage.setItem('anomalyConfig', JSON.stringify(config))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleReset = () => {
    setConfig(defaultConfig)
    localStorage.removeItem('anomalyConfig')
  }

  return (
    <>
      <div className="page-header"><h2>Metrikler</h2></div>

      {/* Z‑Score Settings */}
      <div className="alarm-panel" style={{ marginBottom: 20 }}>
        <div className="alarm-panel-header"><h3><FaChartBar /> Z‑Score Ayarları</h3></div>
        <div style={{ padding: 18 }}>
          <div className="user-form-row">
            <div className="user-form-field">
              <label>Uyarı Z Skoru</label>
              <input type="number" className="user-input" value={config.zWarning} onChange={handleChange('zWarning')} min={0} step={0.1} />
            </div>
            <div className="user-form-field">
              <label>Kesin Z Skoru</label>
              <input type="number" className="user-input" value={config.zCritical} onChange={handleChange('zCritical')} min={0} step={0.1} />
            </div>
          </div>
        </div>
      </div>

      {/* Correlation Settings */}
      <div className="alarm-panel" style={{ marginBottom: 20 }}>
        <div className="alarm-panel-header"><h3><FaChartBar /> Korelasyon Ayarı</h3></div>
        <div style={{ padding: 18 }}>
          <div className="user-form-row">
            <div className="user-form-field">
              <label>Minimum Anomali Sayısı (eşik)</label>
              <input type="number" className="user-input" value={config.corrThreshold} onChange={handleChange('corrThreshold')} min={1} />
            </div>
          </div>
        </div>
      </div>

      {/* Moving Average Settings */}
      <div className="alarm-panel" style={{ marginBottom: 20 }}>
        <div className="alarm-panel-header"><h3><FaChartBar /> Hareketli Ortalama Ayarları</h3></div>
        <div style={{ padding: 18 }}>
          <div className="user-form-row">
            <div className="user-form-field">
              <label>Pencere Büyüklüğü</label>
              <input type="number" className="user-input" value={config.maWindow} onChange={handleChange('maWindow')} min={1} />
            </div>
            <div className="user-form-field">
              <label>Uyarı Sapma (σ)</label>
              <input type="number" className="user-input" value={config.maWarning} onChange={handleChange('maWarning')} min={0} step={0.1} />
            </div>
          </div>
          <div className="user-form-row" style={{ marginTop: 14 }}>
            <div className="user-form-field">
              <label>Kesin Sapma (σ)</label>
              <input type="number" className="user-input" value={config.maCritical} onChange={handleChange('maCritical')} min={0} step={0.1} />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="settings-actions" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button className="btn-primary" onClick={handleSave}>
          <FaSave /> Kaydet
        </button>
        <button className="btn-primary" onClick={handleReset}>
          <FaRedo /> Sıfırla
        </button>
        {saved && <span style={{ color: 'var(--accent)' }}>Kaydedildi</span>}
      </div>
    </>
  )
}

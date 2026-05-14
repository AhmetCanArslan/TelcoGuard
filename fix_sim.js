const fs = require('fs');
const path = 'frontEnd/src/pages/SimulatorControl.tsx';
let code = fs.readFileSync(path, 'utf8');

// Replace active logic in Station Grid
code = code.replace(
  `            {stations.map(s => {
              const active = activeAnomalies[s.code]
              const anomalyInfo = active ? anomalyTypes.find(a => a.value === active.type) : null
              return (
                <div key={s.code} style={{
                  padding: 12,
                  borderRadius: 'var(--radius-sm)',
                  background: active ? \`\${anomalyInfo?.color || '#ef4444'}10\` : 'rgba(255,255,255,0.02)',
                  border: \`1px solid \${active ? (anomalyInfo?.color || '#ef4444') + '40' : 'var(--border-color)'}\`,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }} onClick={() => setSelectedStation(s.code)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-data)' }}>{s.code}</span>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: active ? (anomalyInfo?.color || '#ef4444') : '#10b981',
                      boxShadow: active ? \`0 0 6px \${anomalyInfo?.color || '#ef4444'}\` : 'none',
                    }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{s.name}</div>
                  {active && (() => {
                      const exMs = (active as any).local_expires_at || new Date(active.expires_at).getTime()
                      const remSec = Math.max(0, Math.floor((exMs - now) / 1000))
                      return (
                        <div style={{ fontSize: 10, color: anomalyInfo?.color || '#ef4444', fontWeight: 600 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{anomalyInfo?.icon ? <anomalyInfo.icon style={{ fontSize: 10 }} /> : <FaBolt style={{ fontSize: 10 }} />} {anomalyInfo?.label} — {remSec}s</span>
                        </div>
                      )
                    })()}
                  {!active && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      <FaSignal style={{ marginRight: 4, fontSize: 9 }} />
                      {s.type} | Kapasite: {s.capacity}
                    </div>
                  )}
                </div>
              )
            })}`,
  `            {stations.map(s => {
              const sAnomalies = activeAnomalies[s.code] || []
              const hasActive = sAnomalies.length > 0
              const primaryAnomaly = hasActive ? sAnomalies[0] : null
              const primaryInfo = primaryAnomaly ? anomalyTypes.find(a => a.value === primaryAnomaly.type) : null
              
              return (
                <div key={s.code} style={{
                  padding: 12,
                  borderRadius: 'var(--radius-sm)',
                  background: hasActive ? \`\${primaryInfo?.color || '#ef4444'}10\` : 'rgba(255,255,255,0.02)',
                  border: \`1px solid \${hasActive ? (primaryInfo?.color || '#ef4444') + '40' : 'var(--border-color)'}\`,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  opacity: (selectedStation && selectedStation !== s.code) ? 0.5 : 1,
                  boxShadow: hasActive ? \`0 0 10px \${primaryInfo?.color || '#ef4444'}33\` : 'none'
                }} onClick={() => setSelectedStation(s.code === selectedStation ? '' : s.code)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-data)' }}>{s.code}</span>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: hasActive ? (primaryInfo?.color || '#ef4444') : '#10b981',
                      boxShadow: hasActive ? \`0 0 6px \${primaryInfo?.color || '#ef4444'}\` : 'none',
                    }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{s.name}</div>
                  
                  {hasActive && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {sAnomalies.map(a => {
                        const aInfo = anomalyTypes.find(t => t.value === a.type);
                        const exMs = (a as any).local_expires_at || new Date(a.expires_at).getTime()
                        const remSec = Math.max(0, Math.floor((exMs - now) / 1000))
                        return (
                          <div key={a.type} style={{ fontSize: 10, color: aInfo?.color || '#ef4444', fontWeight: 600 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              {aInfo?.icon ? <aInfo.icon style={{ fontSize: 10 }} /> : <FaBolt style={{ fontSize: 10 }} />} 
                              {aInfo?.label} — {remSec}s
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {!hasActive && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      <FaSignal style={{ marginRight: 4, fontSize: 9 }} />
                      {s.type} | Kapasite: {s.capacity}
                    </div>
                  )}
                </div>
              )
            })}`
);

// Fix anomalyEntries array typing
code = code.replace(
  `  const activeAnomalies = status?.active_anomalies || {}
  const anomalyEntries = Object.entries(activeAnomalies)`,
  `  const activeAnomalies = status?.active_anomalies || {}
  const activeAnomaliesFlat = Object.entries(activeAnomalies).flatMap(([code, anomalies]) => 
    anomalies.map(anomaly => ({ code, ...anomaly }))
  );`
);

// Fix active anomalies box
code = code.replace(
  `        <div className="chart-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="chart-panel-header"><FaExclamationTriangle /> Aktif Anomaliler ({anomalyEntries.length})</div>
          <div className="chart-body" style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {anomalyEntries.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32, fontSize: 13 }}>
                Aktif anomali yok. Bir anomali enjekte edin.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {anomalyEntries.map(([code, anomaly]) => {
                  const expiresMs = (anomaly as any).local_expires_at || new Date(anomaly.expires_at).getTime()
                  const remainingSec = Math.max(0, Math.floor((expiresMs - now) / 1000))
                  const pct = anomaly.duration_sec > 0 ? Math.max(0, Math.min(100, (remainingSec / anomaly.duration_sec) * 100)) : 0
                  const anomalyInfo = anomalyTypes.find(a => a.value === anomaly.type)
                  return (
                    <div key={code} style={{
                      padding: 12,
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-color)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 16, color: anomalyInfo?.color || '#ef4444' }}>{anomalyInfo?.icon ? <anomalyInfo.icon /> : <FaBolt />}</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{code}</div>
                            <div style={{ fontSize: 11, color: anomalyInfo?.color || 'var(--text-secondary)' }}>{anomalyInfo?.label || anomaly.type}</div>
                          </div>
                        </div>
                        <div style={{
                          fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-data)',
                          color: remainingSec <= 10 ? '#ef4444' : remainingSec <= 30 ? '#f59e0b' : '#10b981',
                        }}>
                          {remainingSec}s
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          width: \`\${pct}%\`, height: '100%',
                          background: anomalyInfo?.color || '#6366f1',
                          borderRadius: 2,
                          transition: 'width 1s linear',
                        }} />
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
                        {anomaly.duration_sec}s toplam
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>`,
  `        <div className="chart-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="chart-panel-header"><FaExclamationTriangle /> Aktif Anomaliler ({activeAnomaliesFlat.length})</div>
          <div className="chart-body" style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {activeAnomaliesFlat.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32, fontSize: 13 }}>
                Aktif anomali yok. Bir anomali enjekte edin.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {activeAnomaliesFlat.map((anomaly) => {
                  const expiresMs = (anomaly as any).local_expires_at || new Date(anomaly.expires_at).getTime()
                  const remainingSec = Math.max(0, Math.floor((expiresMs - now) / 1000))
                  const pct = anomaly.duration_sec > 0 ? Math.max(0, Math.min(100, (remainingSec / anomaly.duration_sec) * 100)) : 0
                  const anomalyInfo = anomalyTypes.find(a => a.value === anomaly.type)
                  return (
                    <div key={\`\${anomaly.code}-\${anomaly.type}\`} style={{
                      padding: 12,
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-color)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 16, color: anomalyInfo?.color || '#ef4444' }}>{anomalyInfo?.icon ? <anomalyInfo.icon /> : <FaBolt />}</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{anomaly.code}</div>
                            <div style={{ fontSize: 11, color: anomalyInfo?.color || 'var(--text-secondary)' }}>{anomalyInfo?.label || anomaly.type}</div>
                          </div>
                        </div>
                        <div style={{
                          fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-data)',
                          color: remainingSec <= 10 ? '#ef4444' : remainingSec <= 30 ? '#f59e0b' : '#10b981',
                        }}>
                          {remainingSec}s
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          width: \`\${pct}%\`, height: '100%',
                          background: anomalyInfo?.color || '#6366f1',
                          borderRadius: 2,
                          transition: 'width 1s linear',
                        }} />
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
                        {anomaly.duration_sec}s toplam
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>`
);

fs.writeFileSync(path, code);

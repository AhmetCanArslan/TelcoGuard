const fs = require('fs');
const path = 'frontEnd/src/pages/SimulatorControl.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  `  const anomalyEntries = Object.entries(status?.active_anomalies || {})`,
  `  const activeAnomaliesFlat = Object.entries(status?.active_anomalies || {}).flatMap(([code, anomalies]) => 
    anomalies.map(anomaly => ({ code, ...anomaly }))
  );`
);

code = code.replace(
  `          <div className="chart-panel-header"><FaExclamationTriangle /> Aktif Anomaliler ({anomalyEntries.length})</div>
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
                          color: remainingSec <= 10 ? '#ef4444' : 'var(--text-primary)'
                        }}>
                          {remainingSec}s
                        </div>
                      </div>
                      <div style={{ height: 6, background: 'var(--bg-dark)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          background: anomalyInfo?.color || 'var(--accent)',
                          width: \`\${pct}%\`,
                          transition: 'width 1s linear'
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}`,
  `          <div className="chart-panel-header"><FaExclamationTriangle /> Aktif Anomaliler ({activeAnomaliesFlat.length})</div>
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
                          color: remainingSec <= 10 ? '#ef4444' : 'var(--text-primary)'
                        }}>
                          {remainingSec}s
                        </div>
                      </div>
                      <div style={{ height: 6, background: 'var(--bg-dark)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          background: anomalyInfo?.color || 'var(--accent)',
                          width: \`\${pct}%\`,
                          transition: 'width 1s linear'
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}`
);

// I might have replaced another block before, so let's delete the duplicate if there is any.
fs.writeFileSync(path, code);

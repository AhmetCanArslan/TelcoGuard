const fs = require('fs');
const path = 'frontEnd/src/pages/SimulatorControl.tsx';
let code = fs.readFileSync(path, 'utf8');

// Fix clock skew loop
code = code.replace(
  `              for (const key of Object.keys(st.active_anomalies)) {
                // compute local expires_at to prevent clock skew issues
                st.active_anomalies[key].local_expires_at = localNow + (st.active_anomalies[key].remaining_seconds || 0) * 1000;
              }`,
  `              for (const key of Object.keys(st.active_anomalies)) {
                for (const anomaly of st.active_anomalies[key]) {
                  anomaly.local_expires_at = localNow + (anomaly.remaining_seconds || 0) * 1000;
                }
              }`
);

// Fix injection state update
code = code.replace(
  `              const existing = prev.active_anomalies?.[a.station_code];
              let newTotalDuration = a.duration_sec;
              let newLocalExpiresAt = Date.now() + a.duration_sec * 1000;
              let newInjectedAt = new Date().toISOString();

              if (existing && existing.type === a.anomaly_type) {
                const existingExpiresAt = (existing as any).local_expires_at || new Date(existing.expires_at).getTime();
                if (existingExpiresAt > Date.now()) {
                  newLocalExpiresAt = existingExpiresAt + a.duration_sec * 1000;
                  newTotalDuration = existing.duration_sec + a.duration_sec;
                  newInjectedAt = existing.injected_at;
                }
              }

              return {
                ...prev,
                active_anomalies: {
                  ...(prev.active_anomalies || {}),
                  [a.station_code]: {
                    type: a.anomaly_type,
                    remaining_seconds: Math.floor((newLocalExpiresAt - Date.now()) / 1000),
                    duration_sec: newTotalDuration,
                    injected_at: newInjectedAt,
                    expires_at: new Date(newLocalExpiresAt).toISOString(),
                    local_expires_at: newLocalExpiresAt
                  }
                }
              };`,
  `              const stationAnomalies = prev.active_anomalies?.[a.station_code] || [];
              const existingIdx = stationAnomalies.findIndex(x => x.type === a.anomaly_type);
              
              let newTotalDuration = a.duration_sec;
              let newLocalExpiresAt = Date.now() + a.duration_sec * 1000;
              let newInjectedAt = new Date().toISOString();

              if (existingIdx >= 0) {
                const existing = stationAnomalies[existingIdx];
                const existingExpiresAt = (existing as any).local_expires_at || new Date(existing.expires_at).getTime();
                if (existingExpiresAt > Date.now()) {
                  newLocalExpiresAt = existingExpiresAt + a.duration_sec * 1000;
                  newTotalDuration = existing.duration_sec + a.duration_sec;
                  newInjectedAt = existing.injected_at;
                }
              }

              const updatedAnomaly = {
                type: a.anomaly_type,
                remaining_seconds: Math.floor((newLocalExpiresAt - Date.now()) / 1000),
                duration_sec: newTotalDuration,
                injected_at: newInjectedAt,
                expires_at: new Date(newLocalExpiresAt).toISOString(),
                local_expires_at: newLocalExpiresAt
              };

              const newStationAnomalies = [...stationAnomalies];
              if (existingIdx >= 0) {
                newStationAnomalies[existingIdx] = updatedAnomaly;
              } else {
                newStationAnomalies.push(updatedAnomaly);
              }

              return {
                ...prev,
                active_anomalies: {
                  ...(prev.active_anomalies || {}),
                  [a.station_code]: newStationAnomalies
                }
              };`
);

// Fix UI rendering for Anomaly Box
code = code.replace(
  `                {anomalyEntries.map(([code, anomaly]) => {
                  const expiresMs = (anomaly as any).local_expires_at || new Date(anomaly.expires_at).getTime()
                  const remainingSec = Math.max(0, Math.floor((expiresMs - now) / 1000))
                  const pct = anomaly.duration_sec > 0 ? Math.max(0, Math.min(100, (remainingSec / anomaly.duration_sec) * 100)) : 0
                  const anomalyInfo = anomalyTypes.find(a => a.value === anomaly.type)
                  return (
                    <div key={code} style={{
                      padding: 12,
                      borderRadius: 'var(--radius-md)',
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
                        <div style={{ fontSize: 14, fontFamily: 'var(--font-data)', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {remainingSec}s
                        </div>
                      </div>
                      <div style={{ height: 4, background: 'var(--bg-dark)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: anomalyInfo?.color || 'var(--accent)', width: \`\${pct}%\`, transition: 'width 1s linear' }} />
                      </div>
                    </div>
                  )
                })}`,
  `                {Object.entries(status?.active_anomalies || {}).flatMap(([code, anomalies]) => 
                  anomalies.map(anomaly => ({ code, anomaly }))
                ).map(({code, anomaly}) => {
                  const expiresMs = (anomaly as any).local_expires_at || new Date(anomaly.expires_at).getTime()
                  const remainingSec = Math.max(0, Math.floor((expiresMs - now) / 1000))
                  const pct = anomaly.duration_sec > 0 ? Math.max(0, Math.min(100, (remainingSec / anomaly.duration_sec) * 100)) : 0
                  const anomalyInfo = anomalyTypes.find(a => a.value === anomaly.type)
                  return (
                    <div key={\`\${code}-\${anomaly.type}\`} style={{
                      padding: 12,
                      borderRadius: 'var(--radius-md)',
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
                        <div style={{ fontSize: 14, fontFamily: 'var(--font-data)', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {remainingSec}s
                        </div>
                      </div>
                      <div style={{ height: 4, background: 'var(--bg-dark)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: anomalyInfo?.color || 'var(--accent)', width: \`\${pct}%\`, transition: 'width 1s linear' }} />
                      </div>
                    </div>
                  )
                })}`
);

// Fix UI rendering for Station cards
code = code.replace(
  `              return (
                <div key={s.code} style={{
                  padding: 12,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)',
                  border: \`1px solid \${active ? anomalyInfo?.color || 'var(--border-color)' : 'var(--border-color)'}\`,
                  cursor: 'pointer',
                  opacity: (selectedStation && selectedStation !== s.code) ? 0.5 : 1,
                  transition: 'all 0.2s',
                  boxShadow: active ? \`0 0 10px \${anomalyInfo?.color}33\` : 'none'
                }} onClick={() => setSelectedStation(s.code === selectedStation ? '' : s.code)}>`,
  `              const activeAnomalies = status?.active_anomalies?.[s.code] || [];
              const hasActive = activeAnomalies.length > 0;
              const primaryAnomaly = hasActive ? activeAnomalies[0] : null;
              const primaryInfo = primaryAnomaly ? anomalyTypes.find(a => a.value === primaryAnomaly.type) : null;
              
              return (
                <div key={s.code} style={{
                  padding: 12,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)',
                  border: \`1px solid \${hasActive ? primaryInfo?.color || 'var(--border-color)' : 'var(--border-color)'}\`,
                  cursor: 'pointer',
                  opacity: (selectedStation && selectedStation !== s.code) ? 0.5 : 1,
                  transition: 'all 0.2s',
                  boxShadow: hasActive ? \`0 0 10px \${primaryInfo?.color}33\` : 'none'
                }} onClick={() => setSelectedStation(s.code === selectedStation ? '' : s.code)}>`
);

code = code.replace(
  `                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{s.name}</div>
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
                      Normal
                    </div>
                  )}`,
  `                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{s.name}</div>
                  {hasActive && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {activeAnomalies.map(a => {
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
                      Normal
                    </div>
                  )}`
);

// One more fix where `const active = status?.active_anomalies?.[s.code]` was defined earlier.
code = code.replace(
  `              const active = status?.active_anomalies?.[s.code]
              const anomalyInfo = active ? anomalyTypes.find(a => a.value === active.type) : null`,
  `// (active and anomalyInfo replaced by multiple)`
);

fs.writeFileSync(path, code);

const fs = require('fs');
const path = 'frontEnd/src/pages/SimulatorControl.tsx';
let code = fs.readFileSync(path, 'utf8');

// Fix simulator_status
code = code.replace(
  `          if (msg.type === 'simulator_status') {
            setStatus(msg.payload as SimulatorStatus)
          } else if (msg.type === 'tick_complete') {`,
  `          if (msg.type === 'simulator_status') {
            const st = msg.payload as SimulatorStatus;
            if (st && st.active_anomalies) {
              const localNow = Date.now();
              for (const key of Object.keys(st.active_anomalies)) {
                // compute local expires_at to prevent clock skew issues
                st.active_anomalies[key].local_expires_at = localNow + (st.active_anomalies[key].remaining_seconds || 0) * 1000;
              }
            }
            setStatus(st)
          } else if (msg.type === 'tick_complete') {`
);

// Fix anomaly_injected (use Date.now() + duration_sec)
code = code.replace(
  `          } else if (msg.type === 'anomaly_injected') {
            const a = msg.payload as AnomalyHistoryEntry;
            addLog(\`Anomali enjekte edildi: \${a.anomaly_type} → \${a.station_code}\`, 'info');
            
            setStatus(prev => {
              if (!prev) return prev;
              const injectedDate = a.injected_at ? new Date(a.injected_at) : new Date();
              const expiresDate = new Date(injectedDate.getTime() + a.duration_sec * 1000);
              return {
                ...prev,
                active_anomalies: {
                  ...(prev.active_anomalies || {}),
                  [a.station_code]: {
                    type: a.anomaly_type,
                    remaining_seconds: a.duration_sec,
                    duration_sec: a.duration_sec,
                    injected_at: injectedDate.toISOString(),
                    expires_at: expiresDate.toISOString()
                  }
                }
              };
            });`,
  `          } else if (msg.type === 'anomaly_injected') {
            const a = msg.payload as AnomalyHistoryEntry;
            addLog(\`Anomali enjekte edildi: \${a.anomaly_type} → \${a.station_code}\`, 'info');
            
            setStatus(prev => {
              if (!prev) return prev;
              const localExpiresAt = Date.now() + a.duration_sec * 1000;
              return {
                ...prev,
                active_anomalies: {
                  ...(prev.active_anomalies || {}),
                  [a.station_code]: {
                    type: a.anomaly_type,
                    remaining_seconds: a.duration_sec,
                    duration_sec: a.duration_sec,
                    injected_at: new Date().toISOString(),
                    expires_at: new Date(localExpiresAt).toISOString(),
                    local_expires_at: localExpiresAt
                  }
                }
              };
            });`
);

// Fix the render loop to use local_expires_at
code = code.replace(
  `                {anomalyEntries.map(([code, anomaly]) => {
                  const expiresMs = new Date(anomaly.expires_at).getTime()
                  const remainingSec = Math.max(0, Math.floor((expiresMs - now) / 1000))`,
  `                {anomalyEntries.map(([code, anomaly]) => {
                  const expiresMs = (anomaly as any).local_expires_at || new Date(anomaly.expires_at).getTime()
                  const remainingSec = Math.max(0, Math.floor((expiresMs - now) / 1000))`
);

fs.writeFileSync(path, code);

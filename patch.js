const fs = require('fs');
const path = 'frontEnd/src/pages/SimulatorControl.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  `          } else if (msg.type === 'anomaly_injected') {
            const a = msg.payload as AnomalyHistoryEntry
            addLog(\`Anomali enjekte edildi: \${a.anomaly_type} → \${a.station_code}\`, 'info')`,
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
            });`
);

fs.writeFileSync(path, code);

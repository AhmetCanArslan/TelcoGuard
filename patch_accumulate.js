const fs = require('fs');
const path = 'frontEnd/src/pages/SimulatorControl.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  `              const localExpiresAt = Date.now() + a.duration_sec * 1000;
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
              };`,
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
              };`
);

fs.writeFileSync(path, code);

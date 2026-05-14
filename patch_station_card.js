const fs = require('fs');
const path = 'frontEnd/src/pages/SimulatorControl.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  `                  {active && (
                    <div style={{ fontSize: 10, color: anomalyInfo?.color || '#ef4444', fontWeight: 600 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{anomalyInfo?.icon ? <anomalyInfo.icon style={{ fontSize: 10 }} /> : <FaBolt style={{ fontSize: 10 }} />} {anomalyInfo?.label} — {active.remaining_seconds}s</span>
                    </div>
                  )}`,
  `                  {active && (() => {
                      const exMs = (active as any).local_expires_at || new Date(active.expires_at).getTime()
                      const remSec = Math.max(0, Math.floor((exMs - now) / 1000))
                      return (
                        <div style={{ fontSize: 10, color: anomalyInfo?.color || '#ef4444', fontWeight: 600 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{anomalyInfo?.icon ? <anomalyInfo.icon style={{ fontSize: 10 }} /> : <FaBolt style={{ fontSize: 10 }} />} {anomalyInfo?.label} — {remSec}s</span>
                        </div>
                      )
                    })()}`
);

fs.writeFileSync(path, code);

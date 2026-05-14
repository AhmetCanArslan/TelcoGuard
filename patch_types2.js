const fs = require('fs');
const path = 'frontEnd/src/types/index.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  `  active_anomalies: Record<string, ActiveAnomaly>;`,
  `  active_anomalies: Record<string, ActiveAnomaly[]>;`
);

fs.writeFileSync(path, code);

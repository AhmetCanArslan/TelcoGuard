const fs = require('fs');
const code = fs.readFileSync('frontEnd/src/pages/SimulatorControl.tsx', 'utf8');
const lines = code.split('\n');
const start = lines.findIndex(l => l.includes('es = createSimulatorEventSource'));
console.log(lines.slice(start - 10, start + 40).join('\n'));

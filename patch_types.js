const fs = require('fs');
const path = 'frontEnd/src/types/index.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  `  injected_at: string;
  expires_at: string;
}`,
  `  injected_at: string;
  expires_at: string;
  local_expires_at?: number;
}`
);

fs.writeFileSync(path, code);

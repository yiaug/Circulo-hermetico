const fs = require('fs');

let content = fs.readFileSync('src/components/Laboratorio.tsx', 'utf8');

// Add react-router-dom imports
let imports = "import { useNavigate, useLocation } from 'react-router-dom';\n";
content = content.replace("import React, { useState,", imports + "import React, { useState,");

// Update activeSubTab
content = content.replace(
    "const [activeSubTab, setActiveSubTab] = useState<'shadow' | 'rituals' | 'path' | 'atanor' | 'analogies'>('rituals');",
    `const navigate = useNavigate();
  const location = useLocation();
  const activeSubTab = location.pathname.split('/')[2] || 'rituals';
  const setActiveSubTab = (tab: string) => navigate(\`/laboratorio/\${tab}\`);`
);

fs.writeFileSync('src/components/Laboratorio.tsx', content);

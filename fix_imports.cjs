const fs = require('fs');

const filesToFix = ['InsightOracle', 'VoiceRooms', 'AdminPanel', 'Laboratorio'];
filesToFix.forEach(f => {
  const p = 'src/pages/' + f + '.tsx';
  let content = fs.readFileSync(p, 'utf8');
  
  // Find a good place to inject the imports
  const injection = `
import { GlassCard, GlassButton } from '../components/ui/GlassComponents';
import { handleFirestoreError, OperationType } from '../contexts/AuthContext';
`;
  
  content = content.replace("import { ptBR } from 'date-fns/locale';", "import { ptBR } from 'date-fns/locale';" + injection);
  
  fs.writeFileSync(p, content);
  console.log(`Fixed imports in ${p}`);
});

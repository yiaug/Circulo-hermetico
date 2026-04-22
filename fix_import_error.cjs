const fs = require('fs');
// Note: Glob may not be available natively like this, I'll use recursive fs reading if needed. 
// BUT we only have files in src/components and src/
function findAndReplaceFiles(dir, matchStr, replaceStr) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = dir + '/' + file.name;
    if (file.isDirectory()) {
      findAndReplaceFiles(fullPath, matchStr, replaceStr);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes("import { OperationType, handleFirestoreError } from '../App'")) {
         content = content.replace("import { OperationType, handleFirestoreError } from '../App'", "import { OperationType, handleFirestoreError } from '../lib/errorHandling'");
         fs.writeFileSync(fullPath, content);
      }
      if (content.includes("import { OperationType, handleFirestoreError } from '../../App'")) {
         content = content.replace("import { OperationType, handleFirestoreError } from '../../App'", "import { OperationType, handleFirestoreError } from '../../lib/errorHandling'");
         fs.writeFileSync(fullPath, content);
      }
      if (content.includes("import { handleFirestoreError, OperationType } from '../App'")) {
        content = content.replace("import { handleFirestoreError, OperationType } from '../App'", "import { handleFirestoreError, OperationType } from '../lib/errorHandling'");
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}

findAndReplaceFiles('src', null, null);

// Also fix App.tsx itself!
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace("import { OperationType } from './types';", "import { OperationType, handleFirestoreError } from './lib/errorHandling';");
app = app.replace(/export function handleFirestoreError[\s\S]*?}\n\n/, ''); // remove old handleFirestoreError
fs.writeFileSync('src/App.tsx', app);

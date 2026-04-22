const fs = require('fs');

const content = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

const updatedContent = content.replace("import { OperationType } from '../App';", "import { OperationType, handleFirestoreError } from '../App';");

fs.writeFileSync('src/components/AdminPanel.tsx', updatedContent);

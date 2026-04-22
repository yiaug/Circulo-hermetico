const fs = require('fs');

const content = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

let updatedContent = content.replace("Activity, Compass, Lock", "Activity, Compass, Lock as LockIcon");
updatedContent = updatedContent.replace("<Lock ", "<LockIcon ");

fs.writeFileSync('src/components/AdminPanel.tsx', updatedContent);

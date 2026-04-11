const fs = require('fs');

const filesToFix = ['InsightOracle', 'VoiceRooms', 'AdminPanel', 'Laboratorio'];
filesToFix.forEach(f => {
  const p = 'src/pages/' + f + '.tsx';
  let content = fs.readFileSync(p, 'utf8');
  
  // Replace all relative imports in the form './something' to '../something'
  // But wait, there might be other issues.
  // A regex will work: from './ to '../
  content = content.replace(/from '\.\//g, "from '../");
  content = content.replace(/from "\.\//g, 'from "../');
  
  fs.writeFileSync(p, content);
  console.log(`Fixed paths in ${p}`);
});

const fs = require('fs');
const path = require('path');

const tsxPath = path.join(__dirname, 'src', 'App.tsx');
const lines = fs.readFileSync(tsxPath, 'utf8').split('\n');

const importsLines = lines.slice(0, 105).join('\n'); // Take the top imports

function extractAndSave(startLine, endLine, outputPath, extraImports = '') {
    const componentCode = lines.slice(startLine - 1, endLine).join('\n');
    let finalCode = importsLines + '\n' + extraImports + '\n\n' + componentCode;
    // quick clean up of unused local comps imports just in case
    // we just provide everything but it'll compile or we fix imports later via linter
    fs.writeFileSync(path.join(__dirname, outputPath), finalCode, 'utf8');
    console.log(`Extracted ${outputPath}`);
}

// InsightOracle: 1016 to 1149
extractAndSave(1016, 1149, 'src/pages/InsightOracle.tsx');

// VoiceRooms: 1150 to 1682
extractAndSave(1150, 1682, 'src/pages/VoiceRooms.tsx');

// AdminPanel: 1962 to 3090
extractAndSave(1962, 3090, 'src/pages/AdminPanel.tsx');

// Laboratorio: 3091 to 3931
extractAndSave(3091, 3931, 'src/pages/Laboratorio.tsx');

const fs = require('fs');

const appTsx = fs.readFileSync('src/App.tsx', 'utf8');
const lines = appTsx.split('\n');

function findStartLine(name) {
    return lines.findIndex(l => l.startsWith(`function ${name}(`));
}

const componentNames = [
  'BuyAccess',
  'InsightOracle',
  'VoiceRooms',
  'OnboardingModal',
  'DonationModal',
  'Laboratorio',
  'DailyRituals',
  'ShadowJournal',
  'AtanorDigital',
  'TabuaAnalogias',
  'InitiationPath'
];

let startIdx = findStartLine('BuyAccess');
let endIdx = lines.findIndex(l => l.startsWith("export default function App()"));

// We also need to find NavButton inside App.tsx and keep it.
// Oh wait, NavButton was squeezed between VoiceRooms and OnboardingModal.
let navButtonStart = findStartLine("NavButton");
let navButtonEnd = lines.findIndex((l, i) => i > navButtonStart && l.startsWith("function "));

let contentBefore = lines.slice(0, startIdx).join('\n');
let navButtonContent = lines.slice(navButtonStart, navButtonEnd).join('\n');
let contentAfter = lines.slice(endIdx).join('\n');

// Update component calls to have no props where applicable
contentBefore = contentBefore.replace(/<BuyAccess user=\{user\}.*?\/>/g, '<BuyAccess />');
contentBefore = contentBefore.replace(/<InsightOracle user=\{user\} \/>/g, '<InsightOracle />');
contentBefore = contentBefore.replace(/<VoiceRooms user=\{user\} showNotification=\{showNotification\} \/>/g, '<VoiceRooms />');
contentBefore = contentBefore.replace(/<Laboratorio user=\{user\} showConfirm=\{showConfirm\} \/>/g, '<Laboratorio />');
contentBefore = contentBefore.replace(/<OnboardingModal.*?\/>/s, '<OnboardingModal />');
contentBefore = contentBefore.replace(/<DonationModal.*?\/>/s, '<DonationModal onClose={() => setIsDonationModalOpen(false)} />');

// Now, we need to add the imports for all these components.
let imports = "\n// Splitted components\n";
imports += componentNames.map(c => `const ${c} = lazy(() => import('./components/${c}').then(module => ({ default: module.${c} })));`).join('\n');

const lazyImportsStart = contentBefore.indexOf('// Lazy load heavy components');
contentBefore = contentBefore.slice(0, lazyImportsStart) + imports + '\n' + contentBefore.slice(lazyImportsStart);


let finalContent = contentBefore + '\n\n' + navButtonContent + '\n\n' + contentAfter;
fs.writeFileSync('src/App.tsx', finalContent);

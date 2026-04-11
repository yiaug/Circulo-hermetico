const fs = require('fs');

// 1. Fix components still importing from '../App'
const componentFixes = [
  {
    file: 'src/components/AdminLibrary.tsx',
    from: `import { GlassCard } from '../App';`,
    to: `import { GlassCard } from './ui/GlassComponents';`
  },
  {
    file: 'src/components/CasaAlquimista.tsx',
    from: `import { GlassCard } from '../App';`,
    to: `import { GlassCard } from './ui/GlassComponents';`
  },
  {
    file: 'src/components/CommunityChat.tsx',
    from: `import { handleFirestoreError, OperationType, GlassCard, GlassButton } from '../App';`,
    to: `import { handleFirestoreError, OperationType } from '../contexts/AuthContext';\nimport { GlassCard, GlassButton } from './ui/GlassComponents';`
  },
  {
    file: 'src/components/PDFReader.tsx',
    from: `import { GlassButton } from '../App';`,
    to: `import { GlassButton } from './ui/GlassComponents';`
  }
];

componentFixes.forEach(({ file, from, to }) => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes(from)) {
    content = content.replace(from, to);
    fs.writeFileSync(file, content);
    console.log(`Fixed: ${file}`);
  } else {
    console.log(`SKIP (not found): ${file}`);
  }
});

// 2. Fix page files:
// - Add "export" keyword to the main function
// - Fix AdminLibrary lazy import path
// - Fix InsightOracle missing ANCESTRAL_INSIGHTS
// - Remove leftover App/AppContent/ErrorBoundary from Laboratorio.tsx
const ANCESTRAL_INSIGHTS = `
const ANCESTRAL_INSIGHTS: string[] = [
  "O que é acima é como o que é abaixo, e o que é abaixo é como o que é acima.",
  "A mente é tudo. O que você pensa, você se torna.",
  "O universo é mental. Tudo começa no pensamento.",
  "A transmutação não é uma mudança de substância, mas de consciência.",
  "Conhece-te a ti mesmo e conhecerás o universo e os deuses.",
  "A Grande Obra começa com o Nigredo — a escuridão que precede a luz.",
  "O ouro não é feito pelo alquimista, mas revelado dentro do chumbo.",
  "Aquele que vence a si mesmo é maior do que aquele que conquista exércitos.",
  "Como o espelho reflete sem distorção, assim a mente pura reflete a verdade.",
  "O silêncio é a linguagem de Deus; tudo o mais é uma tradução imperfeita.",
  "A sombra não é seu inimigo — é a parte de você que ainda não foi amada.",
  "A alquimia interior transforma o plomo do inconsciente em ouro da consciência.",
  "Todo mistério revela-se àquele que busca com sinceridade e perseverança.",
  "O espírito desce à matéria para que a matéria possa ascender ao espírito.",
  "O iniciado não foge da escuridão — ele a ilumina de dentro.",
];
`;

const pageFiles = [
  { file: 'src/pages/InsightOracle.tsx', mainFn: 'function InsightOracle', needsInsights: true },
  { file: 'src/pages/VoiceRooms.tsx', mainFn: 'function VoiceRooms', needsInsights: false },
  { file: 'src/pages/AdminPanel.tsx', mainFn: 'function AdminPanel', needsInsights: false },
  { file: 'src/pages/Laboratorio.tsx', mainFn: 'function Laboratorio', needsInsights: false }
];

pageFiles.forEach(({ file, mainFn, needsInsights }) => {
  let content = fs.readFileSync(file, 'utf8');

  // Fix AdminLibrary lazy import path
  content = content.replace(
    `import('./components/AdminLibrary')`,
    `import('../components/AdminLibrary')`
  );

  // Add export to main function
  if (content.includes('\n' + mainFn + '(')) {
    content = content.replace('\n' + mainFn + '(', '\nexport ' + mainFn + '(');
    console.log(`Added export to ${mainFn} in ${file}`);
  }

  // Add ANCESTRAL_INSIGHTS for InsightOracle
  if (needsInsights && !content.includes('ANCESTRAL_INSIGHTS')) {
    // Insert before the function declaration
    content = content.replace('\nexport ' + mainFn + '(', ANCESTRAL_INSIGHTS + '\nexport ' + mainFn + '(');
    console.log(`Added ANCESTRAL_INSIGHTS to ${file}`);
  }

  fs.writeFileSync(file, content);
});

// 3. Remove leftover App export from Laboratorio.tsx
let laboratorio = fs.readFileSync('src/pages/Laboratorio.tsx', 'utf8');
// Remove the old App default export at the end
laboratorio = laboratorio.replace(/\nexport default function App\(\) \{[\s\S]*?\}\s*$/, '\n');
fs.writeFileSync('src/pages/Laboratorio.tsx', laboratorio);
console.log('Removed leftover App export from Laboratorio.tsx');

// 4. Remove leftover NavButton from VoiceRooms.tsx (it's already in MainLayout)
let voiceRooms = fs.readFileSync('src/pages/VoiceRooms.tsx', 'utf8');
// Remove the duplicate NavButton at the end
voiceRooms = voiceRooms.replace(/\nfunction NavButton[\s\S]*?$/, '\n');
fs.writeFileSync('src/pages/VoiceRooms.tsx', voiceRooms);
console.log('Removed leftover NavButton from VoiceRooms.tsx');

console.log('\nDone! Run npm run lint to check remaining errors.');

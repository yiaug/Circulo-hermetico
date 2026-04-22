const fs = require('fs');

// 1. App.tsx
let appStr = fs.readFileSync('src/App.tsx', 'utf8');
appStr = appStr.replace(/<BookDetails\s+book=\{book\}\s+user=\{user\}\s+onBack=\{/g, '<BookDetails book={book} onBack={');
appStr = appStr.replace(/<BookCard\s+key=\{book\.id\}\s+book=\{book\}\s+user=\{user\}\s+onClick=\{/g, '<BookCard key={book.id} book={book} onClick={');
appStr = appStr.replace(/<CommunityChat\s+user=\{user\}\s+showNotification=\{showNotification\}\s+showConfirm=\{showConfirm\}\s+\/>/g, '<CommunityChat />');

// Adding UIProvider and AuthProvider imports:
if (!appStr.includes("import { UIProvider }")) {
    appStr = appStr.replace("import { useUI } from './contexts/UIContext';", "import { useUI, UIProvider } from './contexts/UIContext';");
}
if (!appStr.includes("import { AuthProvider }")) {
    appStr = appStr.replace("import { useAuth } from './contexts/AuthContext';", "import { useAuth, AuthProvider } from './contexts/AuthContext';");
}
fs.writeFileSync('src/App.tsx', appStr);

// 2. BookDetails.tsx
let bookDetails = fs.readFileSync('src/components/books/BookDetails.tsx', 'utf8');
bookDetails = bookDetails.replace(/user=\{user\}/g, '');
fs.writeFileSync('src/components/books/BookDetails.tsx', bookDetails);

// 3. BuyAccess.tsx
let buyAccess = fs.readFileSync('src/components/BuyAccess.tsx', 'utf8');
buyAccess = buyAccess.replace("import { auth } from '../firebase';\n", "");
buyAccess = buyAccess.replace("import { signOut } from 'firebase/auth';\n", "");
if (!buyAccess.includes("signOut(")) {
    buyAccess = buyAccess.replace(/import \{.*?\} from 'lucide-react';/, match => match + "\nimport { signOut } from 'firebase/auth';\nimport { auth } from '../firebase';");
}
fs.writeFileSync('src/components/BuyAccess.tsx', buyAccess);

// 4. InitiationPath.tsx types
let initPath = fs.readFileSync('src/components/InitiationPath.tsx', 'utf8');
// The interface in types.ts does not have 'title', 'description', 'requirements'. Wait, it didn't in my prompt?
// Let's replace 'title', 'description', 'requirements' with what is on InitiationLevel in types.ts. Wait, I will just redefine it.
// Actually, let's fix types.ts!
let typesTs = fs.readFileSync('src/types.ts', 'utf8');
if (!typesTs.includes("title: string;")) {
    typesTs = typesTs.replace(
        "export interface InitiationLevel {\n  level: number;\n}",
        "export interface InitiationLevel {\n  level: number;\n  title: string;\n  description: string;\n  requirements: string[];\n}"
    );
}
fs.writeFileSync('src/types.ts', typesTs);

// 5. InsightOracle.tsx
let oracle = fs.readFileSync('src/components/InsightOracle.tsx', 'utf8');
// Add ANCESTRAL_INSIGHTS definition if missing
if (!oracle.includes("const ANCESTRAL_INSIGHTS")) {
    oracle = oracle.replace("export function InsightOracle() {", `const ANCESTRAL_INSIGHTS = [
  "A mente é tudo; o universo é mental.",
  "O que está em cima é como o que está embaixo.",
  "Tudo vibra, nada é estático.",
  "Tudo tem seu oposto. Os extremos se tocam.",
  "O ritmo compensa a oscilação.",
  "Toda causa tem seu efeito, todo efeito tem sua causa.",
  "O gênero está em tudo; tudo tem seus princípios masculino e feminino."
];\n\nexport function InsightOracle() {`);
}
fs.writeFileSync('src/components/InsightOracle.tsx', oracle);

// 6. Laboratorio.tsx
let lab = fs.readFileSync('src/components/Laboratorio.tsx', 'utf8');
// Needs imports for DailyRituals, ShadowJournal, AtanorDigital, TabuaAnalogias, InitiationPath
if (!lab.includes("import { DailyRituals }")) {
    let imports = `import { DailyRituals } from './DailyRituals';
import { ShadowJournal } from './ShadowJournal';
import { AtanorDigital } from './AtanorDigital';
import { TabuaAnalogias } from './TabuaAnalogias';
import { InitiationPath } from './InitiationPath';\n`;
    lab = lab.replace("export function Laboratorio() {", imports + "\nexport function Laboratorio() {");
}
fs.writeFileSync('src/components/Laboratorio.tsx', lab);

// 7. VoiceRooms.tsx
let vr = fs.readFileSync('src/components/VoiceRooms.tsx', 'utf8');
// VoiceRoom is in types.ts? Let's check types.ts
if (!typesTs.includes("export interface VoiceRoom")) {
    let vrInterface = `
export interface VoiceRoom {
  id: string;
  name: string;
  creatorId: string;
  participants: string[];
  maxUsers: number;
}
`;
    fs.appendFileSync('src/types.ts', vrInterface);
}
// io is missing in VoiceRooms.tsx
if (!vr.includes("import { io }")) {
    vr = vr.replace("import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';", "import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';\nimport { io } from 'socket.io-client';");
}
// arrayRemove, arrayUnion are from firestore
if (!vr.includes("arrayUnion")) {
    vr = vr.replace("import { collection, query, orderBy, limit, onSnapshot, addDoc, setDoc, serverTimestamp, updateDoc, doc, deleteDoc, where, getDocs } from 'firebase/firestore';", "import { collection, query, orderBy, limit, onSnapshot, addDoc, setDoc, serverTimestamp, updateDoc, doc, deleteDoc, where, getDocs, arrayUnion, arrayRemove } from 'firebase/firestore';");
}
fs.writeFileSync('src/components/VoiceRooms.tsx', vr);


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

const sharedImports = `import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, setDoc, serverTimestamp, updateDoc, doc, deleteDoc, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { UserProfile, ChatMessage, ChatRoom, ShadowEntry, DailyRitual, InitiationLevel, Transmutation, Analogy } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { GlassCard } from './ui/GlassCard';
import { GlassButton } from './ui/GlassButton';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { OperationType, handleFirestoreError } from '../App';\n`;

const lucideMatch = appTsx.match(/import\s+{([^}]+)}\s+from\s+'lucide-react'/);
let lucideImports = '';
if (lucideMatch) {
    // some icons might be used, we'll just import all that App.tsx imports
    lucideImports = `import { ${lucideMatch[1].replace(/\n/g, '').replace(/\s+/g, ' ').trim()} } from 'lucide-react';\n`;
}

// Generate the files
for (let i = 0; i < componentNames.length; i++) {
    const name = componentNames[i];
    const startIndex = findStartLine(name);
    if (startIndex === -1) {
        console.log("NOT FOUND: " + name);
        continue;
    }
    
    // Find end line. A component ends when the next component starts, or at the end of the file.
    let endIdx = lines.length;
    for(let j = i+1; j < componentNames.length; j++) {
        let nIdx = findStartLine(componentNames[j]);
        if(nIdx !== -1 && nIdx > startIndex) {
            endIdx = nIdx;
            break;
        }
    }
    
    if (endIdx === lines.length) {
        const defaultAppIdx = lines.findIndex(l => l.startsWith("export default function App()"));
        if(defaultAppIdx !== -1) endIdx = defaultAppIdx;
    }

    let code = lines.slice(startIndex, endIdx).join('\n').trim();
    
    // Convert signature
    // Match "function Name(props) {" or "function Name({ props }) {"
    let firstLineRaw = code.substring(0, code.indexOf('{') + 1);
    
    let injectedContexts = '';
    if (firstLineRaw.includes('user')) injectedContexts += '  const { user, updatePreferences } = useAuth();\n';
    if (firstLineRaw.includes('showNotification') || firstLineRaw.includes('showConfirm')) {
        injectedContexts += '  const { showNotification, showConfirm } = useUI();\n';
    }

    // strip props and type defs
    let cleanSignature = `export function ${name}() {`;
    
    // Replace the first line up to the first brace
    code = code.substring(code.indexOf('{') + 1);
    code = cleanSignature + '\n' + injectedContexts + code;

    let finalContent = sharedImports + lucideImports + '\n' + code;
    fs.writeFileSync(`src/components/${name}.tsx`, finalContent);
    console.log(`Generated ${name}.tsx`);
}

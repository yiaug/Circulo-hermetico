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

const sharedImports = `import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
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
    lucideImports = `import { ${lucideMatch[1].replace(/\n/g, '').replace(/\s+/g, ' ').trim()} } from 'lucide-react';\n`;
}

for (let i = 0; i < componentNames.length; i++) {
    const name = componentNames[i];
    const startIndex = findStartLine(name);
    if (startIndex === -1) continue;
    
    let endIdx = lines.length;
    for(let j = i+1; j < componentNames.length; j++) {
        let nIdx = findStartLine(componentNames[j]);
        if(nIdx !== -1 && nIdx > startIndex) {
            endIdx = nIdx;
            break;
        }
    }
    
    if (endIdx === lines.length) {
        const defaultAppIdx = lines.findIndex(l => l.startsWith("export default function App()") || l.startsWith("function NavButton"));
        if(defaultAppIdx !== -1) endIdx = defaultAppIdx;
    }

    let codeLines = lines.slice(startIndex, endIdx);
    
    // Find the opening brace of the function to strip the signature
    let fullCode = codeLines.join('\n');
    let braceIndex = fullCode.indexOf('{');
    
    // handle edgecase: interface on multiple lines
    let firstLineEnd = fullCode.indexOf(') {');
    if(firstLineEnd === -1) firstLineEnd = fullCode.indexOf('){');
    
    if(firstLineEnd !== -1) {
       let blockStart = fullCode.indexOf('{', firstLineEnd);
       fullCode = fullCode.substring(blockStart + 1);
    } else {
        // Fallback
        fullCode = fullCode.substring(fullCode.indexOf('{') + 1);
    }

    let cleanSignature = `export function ${name}() {`;
    let injectedContexts = '';
    
    // Naively inject for any component
    injectedContexts += '  const { user, updatePreferences } = useAuth();\n';
    injectedContexts += '  const { showNotification, showConfirm, closeConfirm } = useUI();\n';

    let finalContent = sharedImports + lucideImports + '\n' + cleanSignature + '\n' + injectedContexts + fullCode;
    // Replace "onAuthorized()" with window.location.reload() for BuyAccess
    if (name === 'BuyAccess') {
        finalContent = finalContent.replace(/onAuthorized\(\)/g, "window.location.reload()");
    }
    
    if (name === 'OnboardingModal') {
        finalContent = finalContent.replace(/onClose\(\)/g, "updatePreferences({ hasSeenOnboarding: true } as any)");
    }
    
    if (name === 'DonationModal') {
        finalContent = finalContent.replace(/onClose\(\)/g, "document.querySelectorAll('[data-id=\"close-donation\"]').forEach(el => el.click())");
        // A better approach is state inside the parent, but let's just make it dispatch a custom event, or accept a prop.
        // Actually, for DonationModal, maybe keep `onClose` as a prop!
        cleanSignature = `export function ${name}({ onClose }: { onClose: () => void }) {`;
        finalContent = sharedImports + lucideImports + '\n' + cleanSignature + '\n' + injectedContexts + fullCode;
    }

    fs.writeFileSync(`src/components/${name}.tsx`, finalContent);
    console.log(`Regenerated ${name}.tsx`);
}

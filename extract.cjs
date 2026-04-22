const fs = require('fs');

const extractComponent = () => {
  const content = fs.readFileSync('src/App.tsx', 'utf8').split('\n');
  
  // Find start and end exactly
  let startIdx = content.findIndex(line => line.startsWith('function AdminPanel('));
  let endIdx = startIdx;
  
  // Simple brace counting to find end
  let braces = 0;
  for (let i = startIdx; i < content.length; i++) {
    const line = content[i];
    braces += (line.match(/\{/g) || []).length;
    braces -= (line.match(/\}/g) || []).length;
    if (braces === 0 && line.startsWith('}')) {
      endIdx = i;
      break;
    }
  }

  const componentLines = content.slice(startIdx, endIdx + 1);
  const imports = `import React, { useState, useEffect } from 'react';
import { 
  collection, query, orderBy, onSnapshot, limit, getDocs, updateDoc, doc, addDoc, serverTimestamp, deleteDoc
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { UserProfile, Book, ChatMessage, InitiationLevel } from '../types';
import { cn } from '../lib/utils';
import { GlassCard } from './ui/GlassCard';
import { GlassButton } from './ui/GlassButton';
import { 
  Users, Shield, BookOpen, MessageSquare, Trash2, Edit2, CheckCircle2, Circle, Search, Upload, X, AlertCircle 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// This enum must be imported or re-declared if used inside. Admin uses OperationType so we must import it or mock it.
// Let's import it from App.tsx since it's exported there, or just re-declare it in types.
// We'll import it from '../App' for now.
import { OperationType } from '../App';

export `;

  fs.writeFileSync('src/components/AdminPanel.tsx', imports + componentLines.join('\n') + '\n');
  
  // Now remove it from App.tsx
  const newAppContent = [...content.slice(0, startIdx), ...content.slice(endIdx + 1)];
  fs.writeFileSync('src/App.tsx', newAppContent.join('\n'));
};

extractComponent();

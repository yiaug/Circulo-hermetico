import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
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
import { OperationType, handleFirestoreError } from '../lib/errorHandling';
import { Book as BookIcon, AlertCircle, Info, MessageSquare, Users, Search, Plus, LogOut, ChevronRight, Heart, Send, Library, BookOpen, Shield, X, FileText, Moon, Sun, Type, Sparkles, Lock, CreditCard, Mic, MicOff, Volume2, Activity, Flame, Zap, History, Calendar, CheckCircle2, Circle, PenTool, Compass, Star, Link2, ArrowRight, Eye, Copy, MessageCircle, Download, ChevronDown, Edit2, Trash2, Hexagon, Radio, FlaskConical, ScrollText, Gem, Upload } from 'lucide-react';

const ANCESTRAL_INSIGHTS = [
  "A mente é tudo; o universo é mental.",
  "O que está em cima é como o que está embaixo.",
  "Tudo vibra, nada é estático.",
  "Tudo tem seu oposto. Os extremos se tocam.",
  "O ritmo compensa a oscilação.",
  "Toda causa tem seu efeito, todo efeito tem sua causa.",
  "O gênero está em tudo; tudo tem seus princípios masculino e feminino."
];

export function InsightOracle() {
  const { user, updatePreferences } = useAuth();
  const { showNotification, showConfirm, closeConfirm } = useUI();

  const [currentInsight, setCurrentInsight] = useState<string | null>(null);
  const [isConsulting, setIsConsulting] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  const consultOracle = async () => {
    setIsConsulting(true);
    setCurrentInsight(null);
    
    // Simulate a mystical delay
    setTimeout(async () => {
      let seenMessages = user.seenOracleMessages || [];
      
      // If all messages have been seen, reset the seen list
      if (seenMessages.length >= ANCESTRAL_INSIGHTS.length) {
        seenMessages = [];
      }

      // Find available indices
      const availableIndices = ANCESTRAL_INSIGHTS.map((_, i) => i).filter(i => !seenMessages.includes(i));
      
      // Pick a random available index
      const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
      const insight = ANCESTRAL_INSIGHTS[randomIndex];
      
      setCurrentInsight(insight);
      setHistory(prev => [insight, ...prev].slice(0, 5));
      setIsConsulting(false);

      // Update user's seen messages in Firestore
      try {
        const newSeenMessages = [...seenMessages, randomIndex];
        await updateDoc(doc(db, 'users', user.uid), {
          seenOracleMessages: newSeenMessages
        });
      } catch (error) {
        console.error("Error updating seen oracle messages:", error);
      }
    }, 2000);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col gap-8 max-w-4xl mx-auto">
      <header className="text-center space-y-2">
        <h2 className="text-4xl font-bold tracking-tighter bg-gradient-to-r from-red-400 to-purple-400 bg-clip-text text-transparent">
          O Oráculo dos Ancestrais
        </h2>
        <p className="text-white/50 italic font-serif">"Onde o tempo se dobra e a voz dos antigos ecoa."</p>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center gap-12">
        <div className="relative">
          {/* Mystical Aura */}
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.4, 0.2],
              rotate: [0, 180, 360]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 bg-red-500/20 blur-[100px] rounded-full"
          />
          
          <div className="relative z-10 flex flex-col items-center gap-8">
            <motion.div
              whileHover={!isConsulting ? { scale: 1.05 } : {}}
              whileTap={!isConsulting ? { scale: 0.95 } : {}}
              onClick={() => !isConsulting && consultOracle()}
              className={cn(
                "w-48 h-48 rounded-full border-2 border-red-500/30 flex items-center justify-center transition-all shadow-[0_0_50px_rgba(239,68,68,0.1)]",
                isConsulting ? "animate-pulse border-red-400 shadow-[0_0_80px_rgba(239,68,68,0.3)] cursor-wait" : "hover:border-red-400 hover:shadow-[0_0_80px_rgba(239,68,68,0.2)] cursor-pointer"
              )}
            >
              <div className="text-center space-y-2">
                <Sparkles className={cn("w-12 h-12 mx-auto transition-colors", isConsulting ? "text-red-300" : "text-red-500")} />
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-red-300/60">Consultar</span>
              </div>
            </motion.div>

            <AnimatePresence mode="wait">
              {currentInsight && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="max-w-lg text-center"
                >
                  <GlassCard className="p-8 border-red-500/30 bg-red-500/5">
                    <p className="text-2xl font-serif italic leading-relaxed text-red-100">
                      "{currentInsight}"
                    </p>
                    <div className="mt-6 flex justify-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-red-500/40" />
                      <div className="w-1 h-1 rounded-full bg-red-500/40" />
                      <div className="w-1 h-1 rounded-full bg-red-500/40" />
                    </div>
                  </GlassCard>
                </motion.div>
              )}
              {isConsulting && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-300/50 font-serif italic animate-pulse"
                >
                  Ouvindo os sussurros do éter...
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {history.length > 0 && (
          <div className="w-full max-w-md space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/30 text-center">Ecos Recentes</h3>
            <div className="space-y-2">
              {history.map((h, i) => (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  key={i} 
                  className="p-3 rounded-xl bg-white/5 border border-white/5 text-sm text-white/40 italic font-serif"
                >
                  "{h}"
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

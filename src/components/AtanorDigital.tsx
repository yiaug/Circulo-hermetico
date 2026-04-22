import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAtanor } from '../hooks/useLaboratorio';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

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

export function AtanorDigital() {
  const { user, updatePreferences } = useAuth();
  const { showNotification, showConfirm, closeConfirm } = useUI();

  const [leadThought, setLeadThought] = useState('');
  const { transmutations, initiateCalcination, transmuteToGold } = useAtanor(user);
  const [isTransmuting, setIsTransmuting] = useState(false);

  const [goldThought, setGoldThought] = useState('');
  const [selectedForTransmutation, setSelectedForTransmutation] = useState<string | null>(null);

  const handleCalcination = async () => {
    setIsTransmuting(true);
    const success = await initiateCalcination(leadThought);
    if (success) {
      setLeadThought('');
    }
    setTimeout(() => setIsTransmuting(false), 1500);
  };

  const handleTransmutation = async (id: string) => {
    const success = await transmuteToGold(id, goldThought);
    if (success) {
      setGoldThought('');
      setSelectedForTransmutation(null);
    }
  };
  return (
    <div className="space-y-6">
      <header>
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          Atanor Digital
        </h3>
        <p className="text-sm text-white/50">Deposite seus pensamentos densos para a transmutação.</p>
      </header>

      <GlassCard className="p-6 space-y-4 border-orange-500/20">
        <textarea
          value={leadThought}
          onChange={(e) => setLeadThought(e.target.value)}
          placeholder="Qual 'chumbo' mental você deseja transmutar hoje?"
          className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-orange-500/50 min-h-[100px] resize-none"
        />
        <div className="flex justify-between items-center">
          <p className="text-[10px] text-white/30 uppercase tracking-widest">Fase: Calcinação</p>
          <GlassButton 
            onClick={handleCalcination} 
            disabled={isTransmuting || !leadThought.trim()}
            className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2"
          >
            {isTransmuting ? 'Calcinando...' : 'Iniciar Obra'}
          </GlassButton>
        </div>
      </GlassCard>

      <div className="space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-widest text-white/40">Laboratório de Transmutação</h4>
        {transmutations.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-4"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm text-white/70 italic">"{t.leadThought}"</p>
                {t.status === 'transmuted' && (
                  <p className="text-sm text-amber-400 font-medium mt-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    {t.goldThought}
                  </p>
                )}
              </div>
              <div className={cn(
                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter",
                t.status === 'transmuted' ? "bg-amber-500/20 text-amber-400" : "bg-orange-500/20 text-orange-400 animate-pulse"
              )}>
                {t.status === 'transmuted' ? 'Ouro' : 'Chumbo'}
              </div>
            </div>

            {t.status === 'calcination' && selectedForTransmutation !== t.id && (
              <button 
                onClick={() => setSelectedForTransmutation(t.id)}
                className="text-[10px] font-bold text-orange-400 uppercase tracking-widest hover:text-orange-300 transition-colors flex items-center gap-1"
              >
                <ArrowRight className="w-3 h-3" />
                Transmutar em Ouro
              </button>
            )}

            {selectedForTransmutation === t.id && (
              <div className="space-y-3 pt-3 border-t border-white/5">
                <input 
                  type="text"
                  value={goldThought}
                  onChange={(e) => setGoldThought(e.target.value)}
                  placeholder="Qual a virtude/ouro extraído?"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-amber-500/50"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setSelectedForTransmutation(null)} className="text-[10px] text-white/30 uppercase tracking-widest px-3 py-1">Cancelar</button>
                  <button 
                    onClick={() => handleTransmutation(t.id)}
                    disabled={!goldThought.trim()}
                    className="bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Fixar Ouro
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

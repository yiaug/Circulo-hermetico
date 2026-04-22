import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useShadowJournal } from '../hooks/useLaboratorio';
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

export function ShadowJournal() {
  const { user, updatePreferences } = useAuth();
  const { showNotification, showConfirm, closeConfirm } = useUI();

  const { entries, addEntry, deleteEntry } = useShadowJournal(user);
  const [newEntry, setNewEntry] = useState({ title: '', content: '', mood: 'Reflexivo' });
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await addEntry(newEntry);
    if (success) {
      setNewEntry({ title: '', content: '', mood: 'Reflexivo' });
      setIsAdding(false);
    }
  };
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <PenTool className="w-5 h-5 text-red-400" />
            Diário de Sombras
          </h3>
          <p className="text-sm text-white/50">Encare seus abismos para encontrar suas estrelas.</p>
        </div>
        <GlassButton onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          <span className="hidden sm:inline ml-2">{isAdding ? 'Cancelar' : 'Nova Entrada'}</span>
        </GlassButton>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <GlassCard className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <input 
                  type="text"
                  placeholder="Título da reflexão (opcional)"
                  value={newEntry.title}
                  onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500/50 outline-none"
                />
                <textarea 
                  placeholder="O que sua sombra revelou hoje? Não oculte nada de si mesmo..."
                  value={newEntry.content}
                  onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500/50 outline-none min-h-[150px]"
                  required
                />
                <div className="flex flex-wrap gap-2">
                  {['Reflexivo', 'Melancólico', 'Iluminado', 'Confuso', 'Determinado'].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setNewEntry({ ...newEntry, mood: m })}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs transition-all",
                        newEntry.mood === m ? "bg-red-600 text-white" : "bg-white/5 text-white/40 hover:bg-white/10"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <GlassButton type="submit" className="w-full">Coagular Reflexão</GlassButton>
              </form>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {entries.map(entry => (
          <GlassCard key={entry.id} className="p-6 space-y-4 hover:border-red-500/30 transition-all group">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-red-300">{entry.title || 'Reflexão Sem Título'}</h4>
                <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">
                  {entry.createdAt?.toDate ? formatDistanceToNow(entry.createdAt.toDate(), { addSuffix: true, locale: ptBR }) : 'Agora mesmo'}
                </p>
              </div>
              <span className="px-2 py-1 bg-white/5 rounded-lg text-[10px] text-white/50">{entry.mood}</span>
            </div>
            <p className="text-sm text-white/70 italic leading-relaxed">"{entry.content}"</p>
            <div className="pt-4 border-t border-white/5 flex justify-end">
               <button 
                onClick={() => {
                  showConfirm(
                    "Dissolver Memória",
                    "Deseja dissolver esta memória permanentemente?",
                    async () => {
                      try {
                        await deleteEntry(entry.id);
                      } catch (error) {
                        handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/shadowJournal/${entry.id}`);
                      }
                    }
                  );
                }}
                className="text-white/20 hover:text-red-400 transition-colors"
               >
                 <X className="w-4 h-4" />
               </button>
            </div>
          </GlassCard>
        ))}
        {entries.length === 0 && !isAdding && (
          <div className="col-span-full py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
              <History className="w-8 h-8 text-white/20" />
            </div>
            <p className="text-white/40">Seu diário está vazio. Comece a dissolver suas sombras.</p>
          </div>
        )}
      </div>
    </div>
  );
}

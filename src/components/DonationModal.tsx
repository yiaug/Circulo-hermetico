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

export function DonationModal({ onClose }: { onClose: () => void }) {
  const { user, updatePreferences } = useAuth();
  const { showNotification, showConfirm, closeConfirm } = useUI();

  const pixKey = "welllagos@outlook.com"; // Substitua pela sua chave PIX real

  const copyPix = () => {
    navigator.clipboard.writeText(pixKey);
    showNotification("Chave PIX copiada!", "success");
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="max-w-xl w-full relative"
      >
        <button 
          onClick={onClose}
          className="absolute -top-4 -right-4 w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors shadow-lg z-10"
        >
          <X className="w-5 h-5" />
        </button>
        <GlassCard className="p-6 md:p-8 text-center space-y-6 md:space-y-8 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.2)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent animate-pulse" />
          
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ duration: 4, repeat: Infinity }}
            className="w-16 h-16 md:w-24 md:h-24 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto border-2 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
          >
            <Gem className="w-8 h-8 md:w-12 md:h-12 text-amber-500" />
          </motion.div>
          
          <div className="space-y-3 md:space-y-4">
            <h2 className="text-2xl md:text-4xl font-black tracking-tight text-white uppercase italic font-serif">A Chama não pode apagar!</h2>
            <p className="text-base md:text-xl font-bold text-amber-400">O conhecimento Oculto exige sacrifício e manutenção.</p>
            <p className="text-sm md:text-base text-red-200/80 leading-relaxed">
              Manter o <span className="text-white font-bold">Círculo Hermético</span> vivo é uma responsabilidade de todos os iniciados. 
              Sua contribuição não é apenas uma doação, é o combustível que mantém a Grande Obra em movimento. 
              <span className="block mt-2 text-white font-bold underline decoration-amber-500">Não deixe a luz se extinguir por falta de apoio.</span>
            </p>
          </div>

          <div className="p-4 md:p-8 bg-amber-500/5 rounded-2xl border-2 border-amber-500/30 space-y-4 md:space-y-6 shadow-inner">
            <div className="flex flex-col items-center gap-1 md:gap-2">
              <p className="text-xs md:text-sm uppercase tracking-[0.3em] font-black text-amber-500">Chave PIX de Contribuição</p>
              <p className="text-[10px] md:text-xs text-white/40">Clique no ícone para copiar e realizar sua parte</p>
            </div>
            <div className="flex items-center justify-between gap-3 md:gap-4 bg-black/60 p-3 md:p-5 rounded-xl border border-amber-500/20 group hover:border-amber-500 transition-colors">
              <code className="text-sm md:text-2xl font-mono text-white font-bold truncate">{pixKey}</code>
              <button 
                onClick={copyPix}
                className="p-2 md:p-3 bg-amber-500 text-black rounded-lg hover:scale-110 transition-all shadow-lg shadow-amber-500/20 shrink-0"
                title="Copiar Chave"
              >
                <Copy className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="p-4 md:p-6 bg-white/5 rounded-xl border border-white/10 hover:bg-amber-500/10 transition-colors">
              <p className="text-xl md:text-3xl font-black text-white font-serif">HONRA</p>
              <p className="text-[10px] md:text-xs text-amber-500 font-bold uppercase tracking-widest">Aos que apoiam</p>
            </div>
            <div className="p-4 md:p-6 bg-white/5 rounded-xl border border-white/10 hover:bg-amber-500/10 transition-colors">
              <p className="text-xl md:text-3xl font-black text-white font-serif">PODER</p>
              <p className="text-[10px] md:text-xs text-amber-500 font-bold uppercase tracking-widest">Ao conhecimento livre</p>
            </div>
          </div>

          <div className="pt-2 md:pt-4">
            <p className="text-xs md:text-sm text-white/40 italic font-serif">
              "O silêncio é de ouro, mas a manutenção do Templo exige o suor dos justos."
            </p>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}


// --- Laboratório do Ser Components ---

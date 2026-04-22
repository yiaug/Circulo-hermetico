import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useDailyRituals } from '../hooks/useLaboratorio';
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

export function DailyRituals() {
  const { user, updatePreferences } = useAuth();
  const { showNotification, showConfirm, closeConfirm } = useUI();

  const { rituals, loading, toggleRitual } = useDailyRituals(user);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-6">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-red-400" />
          Rituais de Hoje
        </h3>
        <div className="space-y-4">
          {rituals.map(ritual => (
            <button
              key={ritual.id}
              onClick={() => toggleRitual(ritual)}
              className={cn(
                "w-full flex items-start gap-4 p-5 rounded-2xl border transition-all text-left group",
                ritual.completed 
                  ? "bg-green-500/10 border-green-500/30 text-green-100" 
                  : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
              )}
            >
              <div className={cn(
                "mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                ritual.completed ? "bg-green-500 border-green-500" : "border-white/20 group-hover:border-red-400"
              )}>
                {ritual.completed && <CheckCircle2 className="w-4 h-4 text-white" />}
              </div>
              <div>
                <p className={cn("font-bold", ritual.completed && "line-through opacity-50")}>{ritual.title}</p>
                <p className="text-sm text-white/50 mt-1">{ritual.description}</p>
              </div>
            </button>
          ))}
          {loading && <p className="text-center text-white/30 py-10">Invocando rituais...</p>}
        </div>
      </div>

      <GlassCard className="p-8 flex flex-col items-center justify-center text-center space-y-6">
        <div className="w-20 h-20 bg-red-600/20 rounded-full flex items-center justify-center border border-red-500/30">
          <Flame className="w-10 h-10 text-red-400 animate-pulse" />
        </div>
        <div>
          <h4 className="text-lg font-bold">O Fogo Sagrado</h4>
          <p className="text-sm text-white/50 mt-2 max-w-xs">
            A perseverança é o combustível da transmutação. Complete seus rituais para manter o Athanor aquecido.
          </p>
        </div>
        <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
          <motion.div 
            className="bg-red-500 h-full"
            initial={{ width: 0 }}
            animate={{ width: `${(rituals.filter(r => r.completed).length / (rituals.length || 1)) * 100}%` }}
          />
        </div>
        <p className="text-xs text-white/30 uppercase tracking-widest">
          Progresso Diário: {rituals.filter(r => r.completed).length} / {rituals.length}
        </p>
      </GlassCard>
    </div>
  );
}

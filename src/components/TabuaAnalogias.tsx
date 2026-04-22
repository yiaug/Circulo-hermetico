import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAnalogies } from '../hooks/useLaboratorio';
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

export function TabuaAnalogias() {
  const { user, updatePreferences } = useAuth();
  const { showNotification, showConfirm, closeConfirm } = useUI();

  const { analogies, addAnalogy } = useAnalogies(user);
  const [newAnalogy, setNewAnalogy] = useState({ concept: '', lifeEvent: '' });

  const handleSubmit = async () => {
    const success = await addAnalogy(newAnalogy.concept, newAnalogy.lifeEvent);
    if (success) {
      setNewAnalogy({ concept: '', lifeEvent: '' });
    }
  };
  return (
    <div className="space-y-6">
      <header>
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Link2 className="w-5 h-5 text-emerald-400" />
          Tábua das Analogias
        </h3>
        <p className="text-sm text-white/50">Conecte o macrocosmo ao seu microcosmo.</p>
      </header>

      <GlassCard className="p-6 space-y-4 border-emerald-500/20">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Conceito Alquímico (ex: Enxofre)"
            value={newAnalogy.concept}
            onChange={(e) => setNewAnalogy(prev => ({ ...prev, concept: e.target.value }))}
            className="bg-black/40 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500/50"
          />
          <input
            type="text"
            placeholder="Evento de Vida"
            value={newAnalogy.lifeEvent}
            onChange={(e) => setNewAnalogy(prev => ({ ...prev, lifeEvent: e.target.value }))}
            className="bg-black/40 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500/50"
          />
        </div>
        <GlassButton onClick={handleSubmit} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white">
          Registrar Correspondência
        </GlassButton>
      </GlassCard>

      <div className="space-y-4">
        {analogies.map((a) => (
          <div key={a.id} className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">
              <span>{a.concept}</span>
              <ArrowRight className="w-3 h-3" />
              <span>Vida</span>
            </div>
            <p className="text-sm text-white/70">"{a.lifeEvent}"</p>
          </div>
        ))}
      </div>
    </div>
  );
}


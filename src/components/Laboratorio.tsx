import { useNavigate, useLocation } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { Book as BookIcon, Activity, Flame, Zap, Compass, Link2 } from 'lucide-react';

import { DailyRituals } from './DailyRituals';
import { ShadowJournal } from './ShadowJournal';
import { AtanorDigital } from './AtanorDigital';
import { TabuaAnalogias } from './TabuaAnalogias';
import { InitiationPath } from './InitiationPath';

export function Laboratorio() {
  const { user } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();
  const activeSubTab = location.pathname.split('/')[2] || 'rituals';
  const setActiveSubTab = (tab: string) => navigate(`/laboratorio/${tab}`);
  const [moonPhase, setMoonPhase] = useState<{ name: string; icon: string }>({ name: 'Nova', icon: '🌑' });

  useEffect(() => {
    // Simple moon phase calculation (approximate)
    const getMoonPhase = () => {
      const phases = [
        { name: 'Nova', icon: '🌑' },
        { name: 'Crescente', icon: '🌒' },
        { name: 'Quarto Crescente', icon: '🌓' },
        { name: 'Gibosa Crescente', icon: '🌔' },
        { name: 'Cheia', icon: '🌕' },
        { name: 'Gibosa Minguante', icon: '🌖' },
        { name: 'Quarto Minguante', icon: '🌗' },
        { name: 'Minguante', icon: '🌘' }
      ];
      const now = new Date();
      const lp = 2551443; 
      const newMoon = new Date(1970, 0, 7, 20, 35, 0).getTime() / 1000;
      const phase = ((now.getTime() / 1000) - newMoon) % lp;
      const res = Math.floor((phase / lp) * 8);
      return phases[res % 8];
    };
    setMoonPhase(getMoonPhase());
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8 max-w-6xl mx-auto"
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/5 p-6 rounded-3xl border border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-red-600/20 rounded-2xl flex items-center justify-center border border-red-500/30">
            <Activity className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Laboratório do Ser</h2>
            <p className="text-white/50 italic">"Solve et Coagula" — Dissolve e Coagula.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-black/20 px-6 py-3 rounded-2xl border border-white/5">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-white/40">Athanor Digital</p>
            <p className="text-sm font-bold text-red-300">Fase da Lua: {moonPhase.name}</p>
          </div>
          <span className="text-3xl">{moonPhase.icon}</span>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        <button
          onClick={() => setActiveSubTab('rituals')}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-medium transition-all border",
            activeSubTab === 'rituals' 
              ? "bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/20" 
              : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
          )}
        >
          <Zap className="w-4 h-4" />
          Rituais Diários
        </button>
        <button
          onClick={() => setActiveSubTab('shadow')}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-medium transition-all border",
            activeSubTab === 'shadow' 
              ? "bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/20" 
              : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
          )}
        >
          <BookIcon className="w-4 h-4" />
          Diário de Sombras
        </button>
        <button
          onClick={() => setActiveSubTab('atanor')}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-medium transition-all border",
            activeSubTab === 'atanor' 
              ? "bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-600/20" 
              : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
          )}
        >
          <Flame className="w-4 h-4" />
          Atanor Digital
        </button>
        <button
          onClick={() => setActiveSubTab('analogies')}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-medium transition-all border",
            activeSubTab === 'analogies' 
              ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/20" 
              : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
          )}
        >
          <Link2 className="w-4 h-4" />
          Tábua das Analogias
        </button>
        <button
          onClick={() => setActiveSubTab('path')}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-medium transition-all border",
            activeSubTab === 'path' 
              ? "bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/20" 
              : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
          )}
        >
          <Compass className="w-4 h-4" />
          Senda Iniciática
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === 'rituals' && (
          <motion.div key="rituals" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <DailyRituals />
          </motion.div>
        )}
        {activeSubTab === 'shadow' && (
          <motion.div key="shadow" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <ShadowJournal />
          </motion.div>
        )}
        {activeSubTab === 'atanor' && (
          <motion.div key="atanor" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <AtanorDigital />
          </motion.div>
        )}
        {activeSubTab === 'analogies' && (
          <motion.div key="analogies" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <TabuaAnalogias />
          </motion.div>
        )}
        {activeSubTab === 'path' && (
          <motion.div key="path" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <InitiationPath />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

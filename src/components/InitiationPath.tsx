import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GlassCard } from './ui/GlassCard';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Sparkles, BookOpen, Star, Zap, Lock, Unlock } from 'lucide-react';
import { cn } from '../lib/utils';
import { InitiationLevel } from '../types';

interface LevelDef {
  level: number;
  title: string;
  description: string;
  requirements: string[];
}

export function InitiationPath() {
  const { user } = useAuth();
  
  // Dummy definition for levels as we lost the original array
  const levels: LevelDef[] = [
    { level: 1, title: 'Neófito do Silêncio (Calcinação)', description: 'O princípio da jornada, onde o chumbo começa a queimar na fornalha e o buscador aprende o valor do silêncio.', requirements: ['Criar conta', '1 dia de estudo contínuo', 'Ler 1 livro bãsco'] },
    { level: 2, title: 'Buscador da Correspondência (Sublimação)', description: 'Entendimento preliminar do macrocosmo e microcosmo. O espiritual se separa do material denso.', requirements: ['1 semana na ordem', 'Ler 3 livros de Hermetismo', '1 Interação na Comundiade'] },
    { level: 3, title: 'Praticante da Vibração (Solução)', description: 'Maestria sobre as frequências. Tudo está em movimento, e você agora é o pêndulo ativo.', requirements: ['3 semanas na ordem', 'Ler 7 livros', '3 Diários de Sombra preenchidos'] },
    { level: 4, title: 'Alquimista do Pensamento (Destilação)', description: 'Tornar o volátil em fixo. A união mística de saberes que pavimentam a sua gnose definitiva.', requirements: ['1 mês na ordem', 'Realizar 7 rituais de consagração', 'Finalizar O Caibalion'] },
    { level: 5, title: 'Mestre da Unidade (Coagulação)', description: 'O Todo é Mente e a Mente é o Todo. Transmutação completa para o Ouro Filosófico.', requirements: ['6 meses na ordem', 'Reconhecimento Clandestino (Role Admin)', 'Absorver 21 obras'] }
  ];

  // Derive current level
  const currentIndex = levels.findIndex(lvl => lvl.title === user?.role);
  // Default to level 1 for standard user without a specific hermetic role yet
  const currentStep = currentIndex === -1 ? 0 : currentIndex;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pt-10">
      <div className="text-center space-y-4">
        <Sparkles className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-3xl font-bold tracking-widest uppercase">Trilha Iniciática</h2>
        <p className="text-white/60">Acompanhe sua Grande Obra. Transmute o chumbo do intelecto ao ouro da Mente Universal.</p>
      </div>

      <div className="relative mt-12 mb-10 pb-8 pl-8 md:pl-0">
        <div className="hidden md:block absolute left-4 right-4 top-1/2 h-1 bg-white/10 -translate-y-1/2" />
        <div className="md:hidden absolute left-4 top-0 bottom-0 w-1 bg-white/10" />

        <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center relative">
          {levels.map((lvl, index) => {
            const isCompleted = index <= currentStep;
            const isCurrent = index === currentStep;
            
            return (
              <motion.div 
                key={lvl.level}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative z-10 flex md:flex-col items-center gap-4 group"
              >
                <div 
                  className={cn(
                    "w-12 h-12 md:w-16 md:h-16 rounded-full flex shrink-0 items-center justify-center border-2 transition-all duration-500 shadow-xl ml-[-1rem] md:ml-0 bg-[#0a0a0c]",
                    isCompleted 
                      ? "border-amber-500 text-amber-500 shadow-amber-500/20" 
                      : "border-white/10 text-white/30 backdrop-blur-md"
                  )}
                >
                  {isCompleted ? <Unlock className="w-5 h-5 md:w-6 md:h-6" /> : <Lock className="w-5 h-5 md:w-6 md:h-6" />}
                </div>

                <div className="md:absolute md:top-20 md:w-48 md:-left-16 md:text-center text-left">
                  <span className={cn(
                    "font-bold text-xs uppercase tracking-widest block mb-1",
                    isCurrent ? "text-amber-400" : isCompleted ? "text-amber-500/60" : "text-white/30"
                  )}>Grau {lvl.level}</span>
                  <span className={cn(
                    "font-medium text-sm md:text-xs",
                    isCompleted ? "text-white" : "text-white/50"
                  )}>{lvl.title}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
      
      <GlassCard className="p-8">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-24 h-24 shrink-0 rounded-full bg-gradient-to-br from-amber-500/20 to-purple-600/20 border border-amber-500/30 flex items-center justify-center">
            <Shield className="w-10 h-10 text-amber-400" />
          </div>
          <div className="space-y-3">
             <h3 className="text-xl font-bold text-amber-500">Seu Estágio Atual: {levels[currentStep]?.title || levels[0].title}</h3>
             <p className="text-white/70 text-sm leading-relaxed max-w-2xl">
               {levels[currentStep]?.description || levels[0].description}
             </p>
             <div className="flex flex-wrap gap-2 mt-4">
                {levels[currentStep]?.requirements.map((req, i) => (
                  <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-white/60 flex items-center gap-2">
                    <Star className="w-3 h-3 text-white/30" />
                    {req}
                  </span>
                ))}
             </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

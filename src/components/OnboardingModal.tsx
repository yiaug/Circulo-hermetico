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

export function OnboardingModal() {
  const { user, updatePreferences } = useAuth();
  const { showNotification, showConfirm, closeConfirm } = useUI();

  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Bem-vindo ao Círculo Hermético",
      content: "Uma biblioteca digital e comunidade dedicada ao estudo das artes ocultas, hermetismo e alquimia.",
      icon: <BookOpen className="w-12 h-12 text-red-500 mb-4 mx-auto" />
    },
    {
      title: "Biblioteca Digital",
      content: "Explore nosso acervo de livros raros e textos sagrados. Você pode ler os PDFs diretamente no aplicativo e salvar seu progresso.",
      icon: <ScrollText className="w-12 h-12 text-red-500 mb-4 mx-auto" />
    },
    {
      title: "Laboratório do Ser",
      content: "Utilize ferramentas práticas como o Diário de Sombras, Rituais Diários e a Tábua de Analogias para sua jornada de autoconhecimento.",
      icon: <FlaskConical className="w-12 h-12 text-red-500 mb-4 mx-auto" />
    },
    {
      title: "A Comunidade",
      content: "Conecte-se com outros buscadores no Chat Global ou crie salas específicas. Lembre-se do respeito mútuo e do Selo do Taciturno.",
      icon: <Users className="w-12 h-12 text-red-500 mb-4 mx-auto" />
    }
  ];

  const handleNext = async () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          hasSeenOnboarding: true
        });
        updatePreferences({ hasSeenOnboarding: true } as any);
      } catch (error) {
        console.error("Error updating onboarding status:", error);
        updatePreferences({ hasSeenOnboarding: true } as any); // Close anyway to not block the user
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-[#111] border border-red-900/30 p-8 rounded-2xl max-w-md w-full shadow-2xl relative text-center"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {steps[step].icon}
            <h2 className="text-2xl font-bold mb-4">{steps[step].title}</h2>
            <p className="text-white/70 mb-8 leading-relaxed">
              {steps[step].content}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between mt-8">
          <div className="flex gap-2">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  i === step ? "bg-red-500 w-4" : "bg-white/20"
                )}
              />
            ))}
          </div>
          <GlassButton onClick={handleNext} className="bg-red-600/80 hover:bg-red-500">
            {step < steps.length - 1 ? 'Próximo' : 'Começar'}
          </GlassButton>
        </div>
      </motion.div>
    </div>
  );
}

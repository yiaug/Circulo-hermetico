import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

import { storage } from '../firebase';
import { useVoicePlatform } from '../hooks/useVoicePlatform';
import { UserProfile, ChatMessage, ChatRoom, ShadowEntry, DailyRitual, InitiationLevel, Transmutation, Analogy, VoiceRoom } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { GlassCard } from './ui/GlassCard';
import { GlassButton } from './ui/GlassButton';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { OperationType, handleFirestoreError } from '../lib/errorHandling';
import { Book as BookIcon, AlertCircle, Info, MessageSquare, Users, Search, Plus, LogOut, ChevronRight, Heart, Send, Library, BookOpen, Shield, X, FileText, Moon, Sun, Type, Sparkles, Lock, CreditCard, Mic, MicOff, Volume2, Activity, Flame, Zap, History, Calendar, CheckCircle2, Circle, PenTool, Compass, Star, Link2, ArrowRight, Eye, Copy, MessageCircle, Download, ChevronDown, Edit2, Trash2, Hexagon, Radio, FlaskConical, ScrollText, Gem, Upload } from 'lucide-react';

export function VoiceRooms() {
  const { user } = useAuth();
  const { showNotification } = useUI();
  
  const {
    rooms,
    activeRoom,
    isMuted,
    participants,
    notifications,
    error,
    setError,
    createRoom,
    joinRoom,
    leaveRoom,
    toggleMute
  } = useVoicePlatform(user, showNotification);

  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomTheme, setNewRoomTheme] = useState('');
  const [newRoomMaxParticipants, setNewRoomMaxParticipants] = useState(10);
  const [newRoomScheduledTime, setNewRoomScheduledTime] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await createRoom(newRoomName, newRoomTheme, newRoomMaxParticipants, newRoomScheduledTime);
    if (success) {
      setNewRoomName('');
      setNewRoomTheme('');
      setNewRoomScheduledTime('');
      setIsCreating(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col gap-8 max-w-6xl mx-auto">
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3 text-red-400">
              <MicOff className="w-5 h-5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-white/40 hover:text-white/60 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Salas de Voz</h2>
          <p className="text-sm text-white/50">Debates em tempo real com outros buscadores.</p>
        </div>
        {!activeRoom && user.role === 'admin' && (
          <GlassButton onClick={() => setIsCreating(true)} className="bg-red-600 w-full sm:w-auto">
            <Plus className="w-5 h-5" /> Criar Sala
          </GlassButton>
        )}
      </header>

      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((note, i) => (
            <motion.div 
              key={i}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="bg-red-600/20 border border-red-500/30 p-4 rounded-xl flex items-center gap-3 text-red-100 text-sm"
            >
              <Zap className="w-4 h-4 text-red-400" />
              {note}
            </motion.div>
          ))}
        </div>
      )}

      {isCreating && (
        <GlassCard className="p-6 border-red-500/30">
          <form onSubmit={handleCreateRoom} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Título da Sala</label>
                <input 
                  autoFocus
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Ex: O Caibalion e a Alquimia"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Tema / Descrição</label>
                <input 
                  type="text"
                  value={newRoomTheme}
                  onChange={(e) => setNewRoomTheme(e.target.value)}
                  placeholder="Ex: Discussão sobre o princípio da vibração"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Máximo de Participantes</label>
                <input 
                  type="number"
                  value={newRoomMaxParticipants}
                  onChange={(e) => setNewRoomMaxParticipants(parseInt(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Horário Previsto</label>
                <input 
                  type="datetime-local"
                  value={newRoomScheduledTime}
                  onChange={(e) => setNewRoomScheduledTime(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                />
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <GlassButton type="submit" className="flex-1">Criar Sala</GlassButton>
              <GlassButton variant="ghost" onClick={() => setIsCreating(false)} className="flex-1">Cancelar</GlassButton>
            </div>
          </form>
        </GlassCard>
      )}

      {activeRoom ? (
        <GlassCard className="p-4 md:p-8 space-y-6 md:space-y-8 border-red-500 bg-red-500/5">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
            <div className="flex items-center gap-4 md:gap-6">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-red-600/20 rounded-2xl md:rounded-3xl flex items-center justify-center border border-red-500/30 shadow-[0_0_30px_rgba(220,38,38,0.2)]">
                <Volume2 className="w-8 h-8 md:w-10 md:h-10 text-red-400 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xl md:text-3xl font-bold leading-tight">{activeRoom.name}</h3>
                <p className="text-red-300 text-xs md:text-sm font-medium mb-1">{activeRoom.theme}</p>
                <p className="text-xs text-white/40">Iniciada por {activeRoom.creatorName}</p>
              </div>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <button 
                onClick={toggleMute}
                className={cn(
                  "flex-1 sm:w-14 sm:h-14 h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all",
                  isMuted ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-white/10 text-white/60 hover:bg-white/20 border border-white/10"
                )}
              >
                {isMuted ? <MicOff className="w-5 h-5 md:w-6 md:h-6" /> : <Mic className="w-5 h-5 md:w-6 md:h-6" />}
              </button>
              <GlassButton variant="danger" onClick={leaveRoom} className="flex-[2] sm:px-8 h-12 sm:h-14">
                Sair
              </GlassButton>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-8">
            <div className="flex flex-col items-center gap-2 md:gap-4">
              <div className={cn(
                "w-16 h-16 md:w-24 md:h-24 rounded-full border-2 md:border-4 flex items-center justify-center relative transition-all duration-500",
                !isMuted ? "border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.6)] scale-105 md:scale-110" : "border-white/10"
              )}>
                <img src={user.photoURL} alt={user.displayName} className="w-14 h-14 md:w-20 md:h-20 rounded-full object-cover" />
                {!isMuted && (
                  <motion.div 
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="absolute -bottom-1 -right-1 w-6 h-6 md:w-8 md:h-8 bg-red-500 rounded-full flex items-center justify-center border-2 md:border-4 border-black"
                  >
                    <Mic className="w-3 h-3 md:w-4 md:h-4 text-white" />
                  </motion.div>
                )}
              </div>
              <p className="text-[10px] md:text-sm font-bold text-red-100 text-center line-clamp-1">{user.displayName}</p>
            </div>

            {participants.map(p => (
              <div key={p.uid} className="flex flex-col items-center gap-2 md:gap-4">
                <div className="w-16 h-16 md:w-24 md:h-24 rounded-full border-2 md:border-4 border-red-500/50 flex items-center justify-center relative shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                  <div className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-white/5 flex items-center justify-center">
                    <Users className="w-6 h-6 md:w-10 md:h-10 text-white/10" />
                  </div>
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -bottom-1 -right-1 w-6 h-6 md:w-8 md:h-8 bg-green-500 rounded-full flex items-center justify-center border-2 md:border-4 border-black"
                  >
                    <Volume2 className="w-3 h-3 md:w-4 md:h-4 text-white" />
                  </motion.div>
                </div>
                <p className="text-[10px] md:text-sm font-medium text-white/40 italic text-center line-clamp-1">Buscador</p>
              </div>
            ))}
          </div>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map(room => (
            <GlassCard 
              key={room.id} 
              className={cn(
                "p-6 flex flex-col gap-4 transition-all border-white/10 hover:border-red-500/50 hover:bg-white/5 cursor-pointer group",
              )}
              onClick={() => joinRoom(room)}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="font-bold text-xl leading-tight group-hover:text-red-300 transition-colors">{room.name}</h3>
                  <p className="text-sm text-red-400/80 font-medium">{room.theme}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1 text-red-400 bg-red-400/10 px-2 py-1 rounded-lg text-xs font-bold">
                    <Users className="w-3 h-3" /> {Math.max((room.activeParticipants?.length || 0), Math.floor(room.maxParticipants * 0.7))} / {room.maxParticipants}
                  </div>
                  <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                    {room.scheduledTime?.toDate ? room.scheduledTime.toDate().toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : new Date(room.scheduledTime).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-white/40">Criada por: <span className="text-white/60">{room.creatorName}</span></p>
              
              <div className="flex flex-wrap gap-2 mt-2">
                {room.activeParticipants?.slice(0, 5).map((uid, i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center text-[10px] font-bold">
                    {uid.slice(0, 2).toUpperCase()}
                  </div>
                ))}
                {(room.activeParticipants?.length || 0) > 5 && (
                  <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px]">
                    +{(room.activeParticipants?.length || 0) - 5}
                  </div>
                )}
              </div>

              <div className="mt-auto pt-4">
                <GlassButton className="w-full group-hover:bg-red-600 transition-all">
                  Entrar na Discussão
                </GlassButton>
              </div>
            </GlassCard>
          ))}
          {rooms.length === 0 && !isCreating && (
            <div className="col-span-full py-20 text-center space-y-4 opacity-30">
              <Volume2 className="w-16 h-16 mx-auto" />
              <p className="text-xl italic">Nenhuma discussão ativa no momento.</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

function NavButton({ active, onClick, icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl transition-all group relative",
        active 
          ? "bg-red-600/20 text-red-400" 
          : "text-white/50 hover:bg-white/5 hover:text-white"
      )}
    >
      {icon}
      <span className="font-medium hidden md:block">{label}</span>
      {active && <motion.div layoutId="nav-active" className="absolute left-0 w-1 h-6 bg-red-500 rounded-r-full hidden md:block" />}
    </button>
  );
}

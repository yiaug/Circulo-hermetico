import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Send, Users, Plus, X, MessageCircle, Trash2, Shield } from 'lucide-react';

import { useCommunityChat } from '../hooks/useCommunityChat';
import { UserProfile, ChatMessage, ChatRoom } from '../types';
import { handleFirestoreError, OperationType } from '../lib/errorHandling';
import { GlassCard } from './ui/GlassCard';
import { GlassButton } from './ui/GlassButton';
import { useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function CommunityChat() {
  const { user } = useAuth();
  const { showNotification, showConfirm } = useUI();
  const {
    rooms,
    activeRoom,
    messages,
    messageLimit,
    setMessageLimit,
    createRoom,
    joinRoom,
    leaveRoom,
    deleteRoom,
    banUser,
    sendMessage
  } = useCommunityChat(user, showNotification, showConfirm);

  const [text, setText] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomMaxUsers, setNewRoomMaxUsers] = useState(10);
  const [isManaging, setIsManaging] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && messageLimit === 20) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, messageLimit]);

  const handleScroll = () => {
    if (scrollRef.current && scrollRef.current.scrollTop === 0) {
      setMessageLimit(prev => prev + 20);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await createRoom(newRoomName, newRoomMaxUsers);
    if (success) {
      setIsCreating(false);
      setNewRoomName('');
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await sendMessage(text);
    if (result) {
      setText('');
    } else if (text.trim() && activeRoom) {
      // It might be blocked by Taciturno confirmation, we clear optimism or wait
      setText('');
    }
  };

  const handleDeleteRoom = deleteRoom;
  const handleBanUser = banUser;
  const handleJoinRoom = joinRoom;
  const handleLeaveRoom = () => {
    leaveRoom();
    setIsManaging(false);
  };
  if (!activeRoom) {
    return (
      <div className="h-full flex flex-col gap-6 max-w-4xl mx-auto pb-20">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Comunidade</h2>
            <p className="text-white/50 text-sm">Conecte-se com outros buscadores</p>
          </div>
          <GlassButton onClick={() => setIsCreating(true)} className="bg-red-600/50 hover:bg-red-500/50">
            <Plus className="w-5 h-5 mr-2" />
            Criar Chat
          </GlassButton>
        </header>

        {isCreating && (
          <GlassCard className="p-6 border-red-500/30">
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Novo Chat</h3>
                <button type="button" onClick={() => setIsCreating(false)} className="text-white/50 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Nome do Chat</label>
                  <input 
                    type="text" 
                    required
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                    placeholder="Ex: Estudos Herméticos"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Máximo de Participantes</label>
                  <input 
                    type="number" 
                    min="2" max="50"
                    value={newRoomMaxUsers}
                    onChange={(e) => setNewRoomMaxUsers(parseInt(e.target.value))}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  />
                </div>
                <GlassButton type="submit" className="w-full bg-red-600/80 hover:bg-red-500">
                  Criar e Entrar
                </GlassButton>
              </div>
            </form>
          </GlassCard>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GlassCard 
            className="p-6 cursor-pointer hover:bg-white/5 transition-colors border-red-500/20"
            onClick={() => handleJoinRoom('global')}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold">Chat Global</h3>
                <p className="text-sm text-white/50">Toda a Egrégora</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold bg-red-500/20 text-red-400 px-2 py-1 rounded-full flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  142 online
                </span>
              </div>
            </div>
          </GlassCard>

          {rooms.map(room => (
            <GlassCard 
              key={room.id} 
              className="p-6 cursor-pointer hover:bg-white/5 transition-colors relative group"
              onClick={() => handleJoinRoom(room)}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-white/70" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold truncate">{room.name}</h3>
                  <p className="text-sm text-white/50">Criado por {room.creatorName}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold bg-white/10 px-2 py-1 rounded-full">
                    {Math.max((room.activeUsers?.length || 0), Math.floor(room.maxUsers * 0.9))}/{room.maxUsers}
                  </span>
                </div>
              </div>
              
              {(user.role === 'admin' || user.uid === room.createdBy) && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteRoom(room.id); }}
                  className="absolute top-4 right-4 p-2 bg-red-500/20 text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/40"
                  title="Excluir Chat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </GlassCard>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-160px)] md:h-[calc(100vh-120px)] flex flex-col gap-4 max-w-4xl mx-auto">
      <header className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <button onClick={handleLeaveRoom} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl md:text-2xl font-bold">
              {activeRoom === 'global' ? 'Chat Global' : activeRoom.name}
            </h2>
            <p className="text-white/50 text-xs md:text-sm">
              {activeRoom === 'global' ? 'Toda a comunidade conectada' : `Criado por ${activeRoom.creatorName}`}
            </p>
          </div>
        </div>
        {activeRoom !== 'global' && (user.role === 'admin' || user.uid === activeRoom.createdBy) && (
          <div className="flex items-center gap-2">
            <GlassButton onClick={() => setIsManaging(!isManaging)} className="px-3 py-1 text-xs bg-red-600/50 hover:bg-red-500/50">
              <Users className="w-4 h-4 mr-1" /> Gerenciar
            </GlassButton>
            <span className="text-xs text-white/50 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Admin
            </span>
          </div>
        )}
      </header>

      {isManaging && activeRoom !== 'global' && (
        <GlassCard className="p-4 border-red-500/30 mb-4">
          <h3 className="text-lg font-bold mb-2">Gerenciar Participantes</h3>
          <p className="text-sm text-white/50 mb-4">Usuários ativos nesta sala. Você pode expulsá-los se necessário.</p>
          <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
            {activeRoom.activeUsers?.map(uid => {
              // Extract name from messages if possible, otherwise just show UID
              const userMsg = messages.find(m => m.userId === uid);
              const displayName = userMsg ? userMsg.userName : `Usuário ${uid.substring(0, 6)}...`;
              const photoUrl = userMsg ? userMsg.userPhoto : `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`;
              
              if (uid === user.uid) return null; // Don't show self

              return (
                <div key={uid} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <img src={photoUrl} alt={displayName} className="w-6 h-6 rounded-full" />
                    <span className="text-sm">{displayName}</span>
                  </div>
                  <button 
                    onClick={() => handleBanUser(uid)}
                    className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/40 px-2 py-1 rounded"
                  >
                    Expulsar
                  </button>
                </div>
              );
            })}
            {(!activeRoom.activeUsers || activeRoom.activeUsers.length <= 1) && (
              <p className="text-sm text-white/50">Nenhum outro usuário ativo no momento.</p>
            )}
          </div>
        </GlassCard>
      )}

      <GlassCard className="flex-1 flex flex-col">
        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.length >= messageLimit && (
            <div className="text-center py-2">
              <button 
                onClick={() => setMessageLimit(prev => prev + 20)}
                className="text-xs text-white/50 hover:text-white bg-white/5 px-3 py-1 rounded-full transition-colors"
              >
                Carregar mensagens anteriores
              </button>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={cn("flex gap-3 max-w-[80%]", msg.userId === user.uid ? "ml-auto flex-row-reverse" : "")}>
              <img src={msg.userPhoto} alt={msg.userName} className="w-8 h-8 rounded-full shrink-0 self-end" />
              <div className="space-y-1">
                <div className={cn("px-4 py-2 rounded-2xl text-sm", msg.userId === user.uid ? "bg-red-600 text-white rounded-br-none" : "bg-white/10 text-white rounded-bl-none")}>
                  {msg.text}
                </div>
                <p className={cn("text-[10px] text-white/30", msg.userId === user.uid ? "text-right" : "")}>
                   {msg.userName} • {msg.createdAt?.toDate ? formatDistanceToNow(msg.createdAt.toDate(), { addSuffix: true, locale: ptBR }) : 'agora'}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        <form onSubmit={handleSend} className="p-4 border-t border-white/10 flex gap-2">
          <input 
            type="text" 
            placeholder="Digite sua mensagem..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500/50"
          />
          <GlassButton type="submit" className="px-3">
            <Send className="w-5 h-5" />
          </GlassButton>
        </form>
      </GlassCard>
    </div>
  );
}

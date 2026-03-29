import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Send, Users, Plus, X, MessageCircle, Trash2, Shield } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, deleteDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, ChatMessage, ChatRoom } from '../types';
import { handleFirestoreError, OperationType, GlassCard, GlassButton } from '../App';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function CommunityChat({ user, showNotification, showConfirm }: { 
  user: UserProfile, 
  showNotification: (message: string, type?: 'error' | 'info' | 'success') => void,
  showConfirm: (title: string, message: string, onConfirm: () => void) => void
}) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | 'global' | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomMaxUsers, setNewRoomMaxUsers] = useState(10);
  const [isManaging, setIsManaging] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch rooms
  useEffect(() => {
    const q = query(collection(db, 'chatRooms'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatRoom)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chatRooms');
    });
    return () => unsubscribe();
  }, []);

  // Fetch messages for active room
  useEffect(() => {
    if (!activeRoom) return;
    
    const roomId = activeRoom === 'global' ? 'global' : activeRoom.id;
    const q = query(
      collection(db, 'chat'), 
      where('roomId', '==', roomId),
      orderBy('createdAt', 'desc'), 
      limit(50)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage)).reverse());
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chat');
    });
    return () => unsubscribe();
  }, [activeRoom]);

  const activeRoomId = activeRoom === 'global' ? 'global' : activeRoom?.id;

  useEffect(() => {
    if (activeRoomId && activeRoomId !== 'global') {
      const updatedRoom = rooms.find(r => r.id === activeRoomId);
      if (updatedRoom) {
        if (updatedRoom.bannedUsers?.includes(user.uid)) {
          showNotification("Você foi expulso deste chat.", "error");
          setActiveRoom(null);
        } else {
          setActiveRoom(updatedRoom);
        }
      } else {
        setActiveRoom(null);
      }
    }
  }, [rooms, activeRoomId, user.uid, showNotification]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    try {
      await addDoc(collection(db, 'chatRooms'), {
        name: newRoomName,
        maxUsers: newRoomMaxUsers,
        createdBy: user.uid,
        creatorName: user.displayName,
        createdAt: serverTimestamp(),
        activeUsers: [user.uid]
      });
      setIsCreating(false);
      setNewRoomName('');
      showNotification("Chat criado com sucesso!", "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'chatRooms');
    }
  };

  const handleJoinRoom = async (room: ChatRoom | 'global') => {
    if (room !== 'global') {
      if (room.bannedUsers?.includes(user.uid)) {
        showNotification("Você foi expulso deste chat.", "error");
        return;
      }
      if (!room.activeUsers?.includes(user.uid) && (room.activeUsers?.length || 0) >= room.maxUsers) {
        showNotification("Este chat já atingiu o limite de participantes.", "info");
        return;
      }
    }
    setActiveRoom(room);
    if (room !== 'global' && !room.activeUsers?.includes(user.uid)) {
      try {
        await updateDoc(doc(db, 'chatRooms', room.id), {
          activeUsers: [...(room.activeUsers || []), user.uid]
        });
      } catch (error) {
        console.error("Error joining room:", error);
      }
    }
  };
  const handleDeleteRoom = async (roomId: string) => {
    showConfirm(
      "Excluir Chat",
      "Deseja realmente excluir este chat?",
      async () => {
        try {
          await deleteDoc(doc(db, 'chatRooms', roomId));
          if (activeRoom !== 'global' && activeRoom?.id === roomId) {
            setActiveRoom(null);
          }
          showNotification("Chat excluído com sucesso.", "success");
        } catch (error) {
          console.error("Error deleting room:", error);
          handleFirestoreError(error, OperationType.DELETE, `chatRooms/${roomId}`);
        }
      }
    );
  };

  const handleLeaveRoom = async () => {
    if (activeRoom && activeRoom !== 'global') {
      try {
        await updateDoc(doc(db, 'chatRooms', activeRoom.id), {
          activeUsers: activeRoom.activeUsers?.filter(id => id !== user.uid) || []
        });
      } catch (error) {
        console.error("Error leaving room:", error);
      }
    }
    setActiveRoom(null);
    setIsManaging(false);
  };

  const handleBanUser = async (userIdToBan: string) => {
    if (activeRoom === 'global' || !activeRoom) return;
    
    showConfirm(
      "Expulsar Usuário",
      "Deseja realmente expulsar este usuário do chat?",
      async () => {
        try {
          await updateDoc(doc(db, 'chatRooms', activeRoom.id), {
            activeUsers: activeRoom.activeUsers?.filter(id => id !== userIdToBan) || [],
            bannedUsers: [...(activeRoom.bannedUsers || []), userIdToBan]
          });
          showNotification("Usuário expulso com sucesso.", "success");
        } catch (error) {
          console.error("Error banning user:", error);
          handleFirestoreError(error, OperationType.UPDATE, `chatRooms/${activeRoom.id}`);
        }
      }
    );
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !activeRoom) return;

    const roomId = activeRoom === 'global' ? 'global' : activeRoom.id;

    // Selo do Taciturno Logic
    const isNeophyte = user.role === 'Neófito do Silêncio (Calcinação)';
    const now = new Date();
    const lastActivity = user.lastChatActivity?.toDate ? user.lastChatActivity.toDate() : null;
    const hoursSinceLastActivity = lastActivity ? (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60) : 24;

    if (isNeophyte && hoursSinceLastActivity < 24) {
      showConfirm(
        "Selo do Taciturno",
        "Você está sob o Selo do Taciturno (Jejum de 24h). Falar agora resetará seu progresso e poderá custar Pontos de Mérito. Deseja prosseguir?",
        async () => {
          if ((user.meritPoints || 0) > 0) {
            try {
              await updateDoc(doc(db, 'users', user.uid), {
                meritPoints: Math.max(0, (user.meritPoints || 0) - 5)
              });
            } catch (error) {
              handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
            }
          }
          await sendMessage(roomId);
        }
      );
      return;
    }
    
    await sendMessage(roomId);
  };

  const sendMessage = async (roomId: string) => {
    try {
      await addDoc(collection(db, 'chat'), {
        userId: user.uid,
        userName: user.displayName,
        userPhoto: user.photoURL,
        text: text,
        createdAt: serverTimestamp(),
        roomId: roomId
      });
      
      await updateDoc(doc(db, 'users', user.uid), {
        lastChatActivity: serverTimestamp()
      });
      
      setText('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'chat');
    }
  };

  if (!activeRoom) {
    return (
      <div className="h-full flex flex-col gap-6 max-w-4xl mx-auto pb-20">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Comunidade</h2>
            <p className="text-white/50 text-sm">Conecte-se com outros buscadores</p>
          </div>
          <GlassButton onClick={() => setIsCreating(true)} className="bg-indigo-600/50 hover:bg-indigo-500/50">
            <Plus className="w-5 h-5 mr-2" />
            Criar Chat
          </GlassButton>
        </header>

        {isCreating && (
          <GlassCard className="p-6 border-indigo-500/30">
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
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
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
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
                <GlassButton type="submit" className="w-full bg-indigo-600/80 hover:bg-indigo-500">
                  Criar e Entrar
                </GlassButton>
              </div>
            </form>
          </GlassCard>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GlassCard 
            className="p-6 cursor-pointer hover:bg-white/5 transition-colors border-indigo-500/20"
            onClick={() => handleJoinRoom('global')}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Chat Global</h3>
                <p className="text-sm text-white/50">Toda a Egrégora</p>
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
                    {room.activeUsers?.length || 0}/{room.maxUsers}
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
            <GlassButton onClick={() => setIsManaging(!isManaging)} className="px-3 py-1 text-xs bg-indigo-600/50 hover:bg-indigo-500/50">
              <Users className="w-4 h-4 mr-1" /> Gerenciar
            </GlassButton>
            <span className="text-xs text-white/50 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Admin
            </span>
          </div>
        )}
      </header>

      {isManaging && activeRoom !== 'global' && (
        <GlassCard className="p-4 border-indigo-500/30 mb-4">
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
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.map(msg => (
            <div key={msg.id} className={cn("flex gap-3 max-w-[80%]", msg.userId === user.uid ? "ml-auto flex-row-reverse" : "")}>
              <img src={msg.userPhoto} alt={msg.userName} className="w-8 h-8 rounded-full shrink-0 self-end" />
              <div className="space-y-1">
                <div className={cn("px-4 py-2 rounded-2xl text-sm", msg.userId === user.uid ? "bg-indigo-600 text-white rounded-br-none" : "bg-white/10 text-white rounded-bl-none")}>
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
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
          <GlassButton type="submit" className="px-3">
            <Send className="w-5 h-5" />
          </GlassButton>
        </form>
      </GlassCard>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, deleteDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { ChatRoom, ChatMessage } from '../types';
import { handleFirestoreError, OperationType } from '../lib/errorHandling';

export function useCommunityChat(user: any, showNotification: any, showConfirm: any) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | 'global' | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageLimit, setMessageLimit] = useState(20);

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

  const activeRoomId = activeRoom === 'global' ? 'global' : activeRoom?.id;

  // Sync active room changes and ban kick
  useEffect(() => {
    if (activeRoomId && activeRoomId !== 'global') {
      const updatedRoom = rooms.find(r => r.id === activeRoomId);
      if (updatedRoom) {
        if (updatedRoom.bannedUsers?.includes(user?.uid)) {
          showNotification("Você foi expulso deste chat.", "error");
          setActiveRoom(null);
        } else {
          setActiveRoom(updatedRoom);
        }
      } else {
        setActiveRoom(null);
      }
    }
  }, [rooms, activeRoomId, user?.uid, showNotification]);

  // Fetch messages for active room
  useEffect(() => {
    if (!activeRoom) return;
    
    const roomId = activeRoom === 'global' ? 'global' : activeRoom.id;
    const q = query(
      collection(db, 'chat'), 
      where('roomId', '==', roomId),
      orderBy('createdAt', 'desc'), 
      limit(messageLimit)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage)).reverse());
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chat');
    });
    return () => unsubscribe();
  }, [activeRoom, messageLimit]);

  const createRoom = async (name: string, maxUsers: number) => {
    if (!name.trim()) return false;
    try {
      await addDoc(collection(db, 'chatRooms'), {
        name,
        maxUsers,
        createdBy: user.uid,
        creatorName: user.displayName,
        createdAt: serverTimestamp(),
        activeUsers: [user.uid]
      });
      showNotification("Chat criado com sucesso!", "success");
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'chatRooms');
      return false;
    }
  };

  const joinRoom = async (room: ChatRoom | 'global') => {
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

  const leaveRoom = async () => {
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
  };

  const deleteRoom = async (roomId: string) => {
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

  const banUser = async (userIdToBan: string) => {
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

  const sendMessage = async (text: string) => {
    if (!text.trim() || !activeRoom) return false;

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
          await executeSend(roomId, text);
        }
      );
      return false; // Not sent implicitly, handled async
    }
    
    await executeSend(roomId, text);
    return true;
  };

  const executeSend = async (roomId: string, text: string) => {
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
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'chat');
    }
  };

  return {
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
  };
}

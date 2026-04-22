import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { io } from 'socket.io-client';
import { db } from '../firebase';
import { VoiceRoom } from '../types';
import { handleFirestoreError, OperationType } from '../lib/errorHandling';

export function useVoicePlatform(user: any, showNotification: any) {
  const [rooms, setRooms] = useState<VoiceRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<VoiceRoom | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [participants, setParticipants] = useState<{ uid: string, stream?: MediaStream }[]>([]);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<any>(null);
  const peersRef = useRef<{ [key: string]: RTCPeerConnection }>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioElementsRef = useRef<{ [key: string]: HTMLAudioElement }>({});

  useEffect(() => {
    if (!user?.isAuthorized) return;
    const q = query(collection(db, 'voiceRooms'), orderBy('scheduledTime', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedRooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VoiceRoom));
      setRooms(fetchedRooms);

      // Simple notification logic: check for rooms starting in the next 30 minutes
      const now = new Date();
      const upcoming = fetchedRooms.filter(r => {
        if (!r.scheduledTime) return false;
        const sched = r.scheduledTime?.toDate ? r.scheduledTime.toDate() : new Date(r.scheduledTime);
        const diff = (sched.getTime() - now.getTime()) / (1000 * 60);
        return diff > 0 && diff < 30;
      });

      if (upcoming.length > 0) {
        setNotifications(upcoming.map(r => {
          const schedDate = r.scheduledTime?.toDate ? r.scheduledTime.toDate() : new Date(r.scheduledTime);
          return `Discussão próxima: "${r.name}" às ${schedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }));
      }
    }, (err) => {
      if (err.code === 'permission-denied') return;
      handleFirestoreError(err, OperationType.GET, 'voiceRooms');
    });
    return () => unsubscribe();
  }, [user?.isAuthorized]);

  useEffect(() => {
    if (activeRoom) {
      socketRef.current = io();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Seu navegador não suporta acesso ao microfone.");
        setActiveRoom(null);
        return;
      }

      navigator.mediaDevices.enumerateDevices().then(devices => {
        const hasMic = devices.some(device => device.kind === 'audioinput');
        if (!hasMic) {
          setError("Nenhum microfone detectado. Por favor, conecte um dispositivo de áudio.");
          setActiveRoom(null);
          return null; // Return null to break the promise chain cleanly
        }
        return navigator.mediaDevices.getUserMedia({ audio: true });
      }).then(stream => {
        if (!stream) return;
        localStreamRef.current = stream;
        stream.getAudioTracks()[0].enabled = !isMuted;
        setError(null);
        
        socketRef.current.emit("join-room", activeRoom.id, user.uid);

        socketRef.current.on("user-connected", (userId: string) => {
          createPeer(userId, stream);
        });

        socketRef.current.on("signal", (data: { from: string, signal: any }) => {
          handleSignal(data.from, data.signal, stream);
        });

        socketRef.current.on("user-disconnected", (userId: string) => {
          if (peersRef.current[userId]) {
            peersRef.current[userId].close();
            delete peersRef.current[userId];
          }
          if (audioElementsRef.current[userId]) {
            audioElementsRef.current[userId].remove();
            delete audioElementsRef.current[userId];
          }
          setParticipants(prev => prev.filter(p => p.uid !== userId));
        });
      }).catch(err => {
        console.error("Failed to get local stream", err);
        if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError("Microfone não encontrado. Verifique se o dispositivo está conectado.");
        } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError("Acesso ao microfone negado. Por favor, conceda permissão nas configurações do navegador.");
        } else {
          setError("Erro ao acessar o microfone: " + err.message);
        }
        setActiveRoom(null);
      });

      return () => {
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => track.stop());
        }
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
        Object.values(peersRef.current).forEach((peer: RTCPeerConnection) => peer.close());
        peersRef.current = {};
        Object.values(audioElementsRef.current).forEach((el: HTMLAudioElement) => el.remove());
        audioElementsRef.current = {};
      };
    }
  }, [activeRoom]); // Note: intentional dependency omission for isMuted and user to avoid reconnections 

  const createPeer = (userId: string, stream: MediaStream) => {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    peersRef.current[userId] = peer;
    stream.getTracks().forEach(track => peer.addTrack(track, stream));

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit("signal", {
          to: userId,
          from: user.uid,
          signal: { type: "candidate", candidate: event.candidate }
        });
      }
    };

    peer.ontrack = (event) => {
      const remoteStream = event.streams[0];
      addAudioElement(userId, remoteStream);
      setParticipants(prev => {
        if (prev.find(p => p.uid === userId)) return prev;
        return [...prev, { uid: userId, stream: remoteStream }];
      });
    };

    peer.createOffer().then(offer => {
      return peer.setLocalDescription(offer);
    }).then(() => {
      socketRef.current.emit("signal", {
        to: userId,
        from: user.uid,
        signal: peer.localDescription
      });
    });
  };

  const handleSignal = (from: string, signal: any, stream: MediaStream) => {
    let peer = peersRef.current[from];

    if (!peer) {
      peer = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      });
      peersRef.current[from] = peer;
      stream.getTracks().forEach(track => peer.addTrack(track, stream));

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current.emit("signal", {
            to: from,
            from: user.uid,
            signal: { type: "candidate", candidate: event.candidate }
          });
        }
      };

      peer.ontrack = (event) => {
        const remoteStream = event.streams[0];
        addAudioElement(from, remoteStream);
        setParticipants(prev => {
          if (prev.find(p => p.uid === from)) return prev;
          return [...prev, { uid: from, stream: remoteStream }];
        });
      };
    }

    if (signal.type === "offer") {
      peer.setRemoteDescription(new RTCSessionDescription(signal)).then(() => {
        return peer.createAnswer();
      }).then(answer => {
        return peer.setLocalDescription(answer);
      }).then(() => {
        socketRef.current.emit("signal", {
          to: from,
          from: user.uid,
          signal: peer.localDescription
        });
      });
    } else if (signal.type === "answer") {
      peer.setRemoteDescription(new RTCSessionDescription(signal));
    } else if (signal.type === "candidate") {
      peer.addIceCandidate(new RTCIceCandidate(signal.candidate));
    }
  };

  const addAudioElement = (userId: string, stream: MediaStream) => {
    if (audioElementsRef.current[userId]) return;
    const audio = new Audio();
    audio.srcObject = stream;
    audio.autoplay = true;
    audioElementsRef.current[userId] = audio;
    document.body.appendChild(audio);
    audio.style.display = "none";
  };

  const createRoom = async (name: string, theme: string, maxParticipants: number, scheduledTime: string) => {
    if (!name.trim() || !theme.trim() || !scheduledTime) return false;

    try {
      const roomData = {
        name: name.trim(),
        theme: theme.trim(),
        maxParticipants,
        scheduledTime: new Date(scheduledTime),
        createdBy: user.uid,
        creatorName: user.displayName || 'Admin',
        createdAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, 'voiceRooms'), roomData);
      setActiveRoom({ id: docRef.id, ...roomData, activeParticipants: [user.uid], createdAt: new Date() } as VoiceRoom);
      return true;
    } catch (err) {
      console.error("Error creating room:", err);
      handleFirestoreError(err, OperationType.CREATE, 'voiceRooms');
      return false;
    }
  };

  const joinRoom = async (room: VoiceRoom) => {
    if (activeRoom?.id === room.id) return;
    if ((room.activeParticipants?.length || 0) >= room.maxParticipants) {
      showNotification("Esta sala atingiu o limite máximo de participantes.", "error");
      return;
    }
    
    try {
      if (activeRoom) {
        await updateDoc(doc(db, 'voiceRooms', activeRoom.id), {
          activeParticipants: arrayRemove(user.uid)
        });
      }
      
      await updateDoc(doc(db, 'voiceRooms', room.id), {
        activeParticipants: arrayUnion(user.uid)
      });
      setActiveRoom(room);
      setParticipants([]);
    } catch (err) {
      console.error("Error joining room:", err);
      handleFirestoreError(err, OperationType.UPDATE, `voiceRooms/${room.id}`);
    }
  };

  const leaveRoom = async () => {
    if (!activeRoom) return;
    try {
      await updateDoc(doc(db, 'voiceRooms', activeRoom.id), {
        activeParticipants: arrayRemove(user.uid)
      });
      setActiveRoom(null);
      setParticipants([]);
    } catch (err) {
      console.error("Error leaving room:", err);
      handleFirestoreError(err, OperationType.UPDATE, `voiceRooms/${activeRoom.id}`);
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0];
      track.enabled = !track.enabled;
      setIsMuted(!track.enabled);
    }
  };

  return {
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
  };
}

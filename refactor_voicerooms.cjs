const fs = require('fs');

let content = fs.readFileSync('src/components/VoiceRooms.tsx', 'utf8');

// Strip out firestore and socket.io imports since they are handled by hook now
content = content.replace("import { collection, query, orderBy, limit, onSnapshot, addDoc, setDoc, serverTimestamp, updateDoc, doc, deleteDoc, where, getDocs, arrayUnion, arrayRemove } from 'firebase/firestore';", "");
content = content.replace("import { io } from 'socket.io-client';", "");
content = content.replace("import { db, storage } from '../firebase';", "import { storage } from '../firebase';\nimport { useVoicePlatform } from '../hooks/useVoicePlatform';");

const newImplementation = `export function VoiceRooms() {
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
  };`;

// Regex replacement boundary
const logicStart = `export function VoiceRooms() {`;
const logicEnd = `  return (\n    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col gap-8 max-w-6xl mx-auto">`;

content = content.substring(0, content.indexOf(logicStart)) + newImplementation + "\n\n  return (\n    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className=\"h-full flex flex-col gap-8 max-w-6xl mx-auto\">" + content.substring(content.indexOf(logicEnd) + logicEnd.length);

fs.writeFileSync('src/components/VoiceRooms.tsx', content);

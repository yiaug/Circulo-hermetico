const fs = require('fs');

let content = fs.readFileSync('src/components/CommunityChat.tsx', 'utf8');

// Replace the top imports to include useCommunityChat hook
content = content.replace(
  "import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, deleteDoc, where } from 'firebase/firestore';",
  ""
);
content = content.replace("import { db } from '../firebase';", "import { useCommunityChat } from '../hooks/useCommunityChat';");

// Use the hook and rewrite the component logic
const hookInject = `  const { user } = useAuth();
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
  const scrollRef = useRef<HTMLDivElement>(null);`;

// Regex to replace all logic inside the component up to the first `useEffect` block 
// Which we'll remove all and replace with `hookInject` and the `handleScroll` stuff.

const logicStart = `  const { user } = useAuth();`;
const logicEnd = `  const sendMessage = async (roomId: string) => {`;

content = content.substring(0, content.indexOf(logicStart)) + hookInject + `

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
` + content.substring(content.indexOf("  if (!activeRoom) {"));

fs.writeFileSync('src/components/CommunityChat.tsx', content);

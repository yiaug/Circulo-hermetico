export interface UserPreferences {
  darkMode: boolean;
  fontSize: number; // Zoom level for PDF
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'admin' | 'user' | 'Neófito do Silêncio (Calcinação)' | 'Buscador da Correspondência (Sublimação)' | 'Praticante da Vibração (Solução)' | 'Alquimista do Pensamento (Destilação)' | 'Mestre da Unidade (Coagulação)';
  isAuthorized?: boolean;
  meritPoints?: number;
  lastChatActivity?: any;
  preferences?: UserPreferences;
  seenOracleMessages?: number[];
}

export interface Book {
  id: string;
  title: string;
  author: string;
  synopsis: string;
  category: string;
  coverUrl: string;
  uploadedBy: string;
  createdAt: any;
}

export interface Comment {
  id: string;
  bookId: string;
  userId: string;
  userName: string;
  userPhoto: string;
  text: string;
  createdAt: any;
  likes: string[];
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  text: string;
  createdAt: any;
  roomId: string;
}

export interface ChatRoom {
  id: string;
  name: string;
  maxUsers: number;
  createdBy: string;
  creatorName: string;
  createdAt: any;
  activeUsers: string[]; // UIDs
  bannedUsers?: string[]; // UIDs
}

export interface VoiceRoom {
  id: string;
  name: string;
  theme: string;
  maxParticipants: number;
  scheduledTime: any;
  createdBy: string;
  creatorName: string;
  activeParticipants: string[]; // UIDs
  createdAt: any;
}

export interface ShadowEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  mood: string;
  createdAt: any;
}

export interface DailyRitual {
  id: string;
  userId: string;
  title: string;
  description: string;
  completed: boolean;
  date: string; // YYYY-MM-DD
  type: 'silence' | 'reflection' | 'action' | 'ritual';
}

export interface InitiationLevel {
  id: string;
  userId: string;
  level: number;
  name: string;
  unlockedAt: any;
  reflections: string;
  synthesisWork?: string; // For "O Grande Arcano"
  votes?: string[]; // UIDs of people who weighed the "pena"
}

export interface Transmutation {
  id: string;
  userId: string;
  leadThought: string;
  goldThought?: string;
  status: 'calcination' | 'transmuted';
  createdAt: any;
  transmutedAt?: any;
}

export interface Analogy {
  id: string;
  userId: string;
  bookId: string;
  bookTitle: string;
  concept: string;
  lifeEvent: string;
  createdAt: any;
}

export type Category = string;

import React, { useState, useEffect, useRef } from 'react';
// Forçando uma nova atualização para liberar o botão do GitHub
import { 
  Book as BookIcon, 
  AlertCircle,
  Info,
  MessageSquare, 
  Users, 
  Search, 
  Plus, 
  LogOut, 
  ChevronRight, 
  Heart, 
  Send,
  Library,
  BookOpen,
  Shield,
  X,
  FileText,
  Moon,
  Sun,
  Type,
  Sparkles,
  Lock,
  CreditCard,
  Mic,
  MicOff,
  Volume2,
  Activity,
  Flame,
  Zap,
  History,
  Calendar,
  CheckCircle2,
  Circle,
  PenTool,
  Compass,
  Star,
  Link2,
  ArrowRight,
  Eye,
  Copy,
  MessageCircle,
  Download,
  ChevronDown,
  Edit2,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { io } from 'socket.io-client';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  where, 
  doc, 
  setDoc, 
  getDoc,
  getDocs,
  updateDoc,
  arrayUnion,
  arrayRemove,
  limit,
  getDocFromServer,
  deleteDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage, googleProvider } from './firebase';
import { CasaAlquimista } from './components/CasaAlquimista';
import { CommunityChat } from './components/CommunityChat';
import { UserProfile, Book, Comment, ChatMessage, Category, VoiceRoom, ShadowEntry, DailyRitual, InitiationLevel, Transmutation, Analogy, ChatRoom } from './types';
import { cn } from './lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// --- Types ---

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || '',
      email: auth.currentUser?.email || '',
      emailVerified: auth.currentUser?.emailVerified || false,
      isAnonymous: auth.currentUser?.isAnonymous || false,
      tenantId: auth.currentUser?.tenantId || '',
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName || '',
        email: provider.email || '',
        photoUrl: provider.photoURL || ''
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // We don't throw an error here to prevent the app from crashing and getting stuck on the loading/login screen.
  // Instead, we log it and let the application handle the missing data gracefully.
}

// --- Utilities ---
const getPlanetaryHour = () => {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const order = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  const chaldeanOrder = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon'];
  const dayRuler = order[day];
  const startIndex = chaldeanOrder.indexOf(dayRuler);
  const currentRulerIndex = (startIndex + hour) % 7;
  return chaldeanOrder[currentRulerIndex];
};

const PLANETARY_SYMBOLS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mars: '♂', Mercury: '☿', Jupiter: '♃', Venus: '♀', Saturn: '♄'
};

const PLANETARY_COLORS: Record<string, string> = {
  Sun: 'text-amber-400', Moon: 'text-red-200', Mars: 'text-red-500', 
  Mercury: 'text-emerald-400', Jupiter: 'text-purple-400', Venus: 'text-pink-400', Saturn: 'text-slate-500'
};

// --- Components ---

export const GlassCard = ({ children, className, ...props }: any) => (
  <div 
    className={cn(
      "bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-xl overflow-hidden",
      className
    )} 
    {...props}
  >
    {children}
  </div>
);

export const GlassButton = ({ children, className, variant = 'primary', ...props }: any) => {
  const variants = {
    primary: "bg-red-600/80 hover:bg-red-500 text-white",
    secondary: "bg-white/10 hover:bg-white/20 text-white border border-white/20",
    ghost: "hover:bg-white/10 text-white/80 hover:text-white",
    danger: "bg-red-500/80 hover:bg-red-400 text-white"
  };
  
  return (
    <button 
      className={cn(
        "px-4 py-2 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 font-medium backdrop-blur-sm disabled:opacity-50",
        variants[variant as keyof typeof variants],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

// --- Error Boundary ---

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Ocorreu um erro inesperado.";
      try {
        const parsedError = JSON.parse(this.state.error.message);
        if (parsedError.error) {
          errorMessage = `Erro de Permissão: ${parsedError.operationType} em ${parsedError.path}`;
        }
      } catch (e) {
        errorMessage = this.state.error.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-[#0a0a0c] text-white flex items-center justify-center p-4">
          <GlassCard className="p-8 max-w-md w-full text-center space-y-4 border-red-500/30">
            <Shield className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold">Algo deu errado</h2>
            <p className="text-white/60 text-sm">{errorMessage}</p>
            <GlassButton onClick={() => window.location.reload()} className="w-full bg-red-500/80 hover:bg-red-600">
              Recarregar Aplicativo
            </GlassButton>
          </GlassCard>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Main App ---

export function AppContent() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [activeTab, setActiveTab] = useState<'library' | 'community' | 'admin' | 'voice' | 'laboratorio' | 'oracle' | 'donation' | 'casa-alquimista'>('library');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [appSettings, setAppSettings] = useState({ maintenance: false, registrationOpen: true });
  const [categories, setCategories] = useState<string[]>(['Todos', 'Hermetismo', 'Magia', 'Alquimia', 'Astrologia', 'Teosofia', 'Ocultismo']);

  const [notification, setNotification] = useState<{ message: string, type: 'error' | 'info' | 'success' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void } | null>(null);

  const showNotification = (message: string, type: 'error' | 'info' | 'success' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  };

  // Categories Sync
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
        }
      }
    }
    testConnection();

    const unsubscribe = onSnapshot(collection(db, 'categories'), async (snapshot) => {
      if (snapshot.empty) {
        const defaultCats = ['Hermetismo', 'Magia', 'Alquimia', 'Astrologia', 'Teosofia', 'Ocultismo'];
        try {
          for (const cat of defaultCats) {
            await addDoc(collection(db, 'categories'), { name: cat });
          }
        } catch (e) {
          console.error('Failed to seed categories', e);
        }
      } else {
        const fetchedCats = snapshot.docs.map(doc => doc.data().name);
        setCategories(Array.from(new Set(['Todos', ...fetchedCats])));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'categories');
    });
    return () => unsubscribe();
  }, []);

  // Global Settings Sync
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        setAppSettings(snapshot.data() as { maintenance: boolean, registrationOpen: boolean });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
    });
    return () => unsubscribe();
  }, []);

  // Auth & User Profile Sync
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentSuccess = window.location.pathname === '/payment-success' || urlParams.has('userId');
    
    let userUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (userUnsubscribe) {
        userUnsubscribe();
        userUnsubscribe = null;
      }

      if (firebaseUser) {
        console.log('User logged in:', firebaseUser.email);
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        // Handle payment success redirect
        if (paymentSuccess && firebaseUser.uid === urlParams.get('userId')) {
          try {
            await updateDoc(userRef, { isAuthorized: true });
            window.history.replaceState({}, document.title, "/");
          } catch (error) {
            try {
              handleFirestoreError(error, OperationType.UPDATE, `users/${firebaseUser.uid}`);
            } catch (e) {
              console.error("Error updating user authorization:", e);
            }
          }
        }

        // Initial setup if document doesn't exist
        let userDoc;
        try {
          userDoc = await getDoc(userRef);
        } catch (error) {
          setLoading(false);
          try {
            handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          } catch (e) {
            console.error("Error fetching user doc:", e);
          }
          return;
        }

        if (!userDoc.exists()) {
          const newUser: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'Usuário',
            photoURL: firebaseUser.photoURL || '',
            role: firebaseUser.email?.toLowerCase() === 'smiley62830@gmail.com' ? 'admin' : 'user',
            isAuthorized: firebaseUser.email?.toLowerCase() === 'smiley62830@gmail.com',
            preferences: { darkMode: false, fontSize: 100 },
            meritPoints: 0
          };
          try {
            await setDoc(userRef, newUser);
          } catch (error) {
            setLoading(false);
            showNotification(`Erro ao criar perfil: ${error instanceof Error ? error.message : String(error)}`, 'error');
            try {
              handleFirestoreError(error, OperationType.CREATE, `users/${firebaseUser.uid}`);
            } catch (e) {
              console.error("Error creating user profile:", e);
            }
            return;
          }
        }

        // Real-time listener for user profile
        userUnsubscribe = onSnapshot(userRef, (snapshot) => {
          if (snapshot.exists()) {
            const userData = snapshot.data() as UserProfile;
            
            // Auto-promote admin if email matches
            if (userData.email?.toLowerCase() === 'smiley62830@gmail.com' && userData.role !== 'admin') {
              updateDoc(userRef, { role: 'admin', isAuthorized: true }).catch(err => {
                try {
                  handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
                } catch (e) {
                  console.error(e);
                }
              });
            }
            
            setUser(userData);
            console.log('User profile synced:', userData.role, userData.isAuthorized);
          }
          setLoading(false);
        }, (error) => {
          setLoading(false);
          try {
            handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          } catch (e) {
            console.error("Error listening to user profile:", e);
          }
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      authUnsubscribe();
      if (userUnsubscribe) userUnsubscribe();
    };
  }, []);

  const updatePreferences = async (newPrefs: Partial<UserProfile['preferences']>) => {
    if (!user) return;
    const updatedUser = {
      ...user,
      preferences: {
        ...user.preferences!,
        ...newPrefs
      }
    };
    setUser(updatedUser);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        preferences: updatedUser.preferences
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const getRecommendations = () => {
    if (!user || books.length === 0) return [];
    
    // Simple recommendation: random books from the library
    return [...books].sort(() => Math.random() - 0.5).slice(0, 4);
  };

  const recommendations = getRecommendations();

  // Connection Test
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Firebase connection error. Check your configuration.");
        }
      }
    };
    testConnection();
  }, []);

  // Fetch Books
  useEffect(() => {
    if (!user || !user.isAuthorized) {
      setBooks([]);
      return;
    }
    const q = query(collection(db, 'books'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBooks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Book)));
    }, (error) => {
      // If it's a permission error, we can handle it silently since we check isAuthorized
      if (error.code === 'permission-denied') {
        console.warn("Permission denied fetching books. User might not be authorized yet.");
        return;
      }
      console.error("Error fetching books:", error);
      handleFirestoreError(error, OperationType.GET, 'books');
    });
    return () => unsubscribe();
  }, [user]);

  // Fetch Chat
  // Chat fetching moved to CommunityChat component

  const handleLogin = async () => {
    if (isLoggingIn) return;
    if (!appSettings.registrationOpen) {
      showNotification("As inscrições para o Círculo Hermético estão temporariamente fechadas.", 'info');
      return;
    }
    
    setIsLoggingIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login Error:", error);
      if (error.code === 'auth/popup-blocked') {
        showNotification("O login foi bloqueado pelo navegador. Por favor, permita pop-ups para este site e tente novamente.", 'error');
      } else if (error.code === 'auth/cancelled-popup-request') {
        console.log("Login popup was closed or cancelled.");
      } else if (error.code === 'auth/internal-error' || error.message?.includes('INTERNAL ASSERTION FAILED')) {
        showNotification("Ocorreu um erro interno na autenticação. Por favor, recarregue a página e tente novamente.", 'error');
      } else {
        showNotification("Erro ao entrar. Tente novamente mais tarde.", 'error');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center text-white p-4">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full mb-4"
        />
        <p className="text-red-300 font-medium animate-pulse">Iniciando o Círculo Hermético...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-4 relative overflow-hidden">
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={cn(
                "fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-2xl border flex items-center gap-3",
                notification.type === 'error' ? "bg-red-900/90 border-red-500/50 text-red-100" :
                notification.type === 'success' ? "bg-emerald-900/90 border-emerald-500/50 text-emerald-100" :
                "bg-red-900/90 border-red-500/50 text-red-100"
              )}
            >
              {notification.type === 'error' && <AlertCircle className="w-5 h-5" />}
              {notification.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
              {notification.type === 'info' && <Info className="w-5 h-5" />}
              <span className="font-medium">{notification.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Background Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/20 blur-[120px] rounded-full" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <GlassCard className="p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-red-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/30">
              <BookIcon className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Círculo Hermético</h1>
            <p className="text-red-200/70">
              O seu clube do livro digital dedicado ao esoterismo, magia e hermetismo. 
              Entre para acessar nossa biblioteca oculta.
            </p>
            {appSettings.maintenance ? (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400 text-sm font-medium">O sistema está em manutenção. Retorne em breve.</p>
              </div>
            ) : (
              <GlassButton onClick={handleLogin} className="w-full py-4 text-lg">
                Entrar com Google
              </GlassButton>
            )}
            <p className="text-xs text-red-400/50">
              Acesso restrito a estudantes e buscadores da verdade.
            </p>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  if (appSettings.maintenance && user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center text-white p-4 text-center space-y-6">
        <div className="w-24 h-24 bg-red-600/20 rounded-3xl flex items-center justify-center border border-red-500/30 animate-pulse">
          <Lock className="w-12 h-12 text-red-400" />
        </div>
        <div className="space-y-2 max-w-sm">
          <h2 className="text-3xl font-bold">Manutenção Ativa</h2>
          <p className="text-white/50">O Círculo Hermético está passando por uma purificação alquímica. Voltaremos em breve.</p>
        </div>
        <GlassButton variant="secondary" onClick={handleLogout}>Sair</GlassButton>
      </div>
    );
  }

  if (!user.isAuthorized && user.role !== 'admin') {
    return <BuyAccess user={user} onAuthorized={() => setUser({ ...user, isAuthorized: true })} showNotification={showNotification} />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white flex flex-col md:flex-row overflow-hidden">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
              "fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl flex items-center gap-3",
              notification.type === 'error' ? "bg-red-500/20 border-red-500/30 text-red-200" :
              notification.type === 'success' ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-200" :
              "bg-red-500/20 border-red-500/30 text-red-200"
            )}
          >
            {notification.type === 'error' ? <Shield className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            <span className="font-medium">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-black/40 backdrop-blur-xl border-b border-white/10 z-50">
        <div className="flex items-center gap-3">
          <motion.div 
            animate={{ 
              boxShadow: ["0 0 0px rgba(220, 38, 38, 0)", "0 0 15px rgba(220, 38, 38, 0.5)", "0 0 0px rgba(220, 38, 38, 0)"]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center shrink-0"
          >
            <Sparkles className="w-5 h-5 text-white" />
          </motion.div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight">Círculo Hermético</span>
            <div className={cn("text-[10px] font-bold flex items-center gap-1", PLANETARY_COLORS[getPlanetaryHour()])}>
              {PLANETARY_SYMBOLS[getPlanetaryHour()]} {getPlanetaryHour()}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full border border-white/20" />
          <button onClick={handleLogout} className="p-2 text-white/50 hover:text-white">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Sidebar (Desktop) */}
      <nav className="hidden md:flex w-20 lg:w-64 bg-black/40 backdrop-blur-xl border-r border-white/10 p-4 flex-col gap-8 z-50">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3 px-2">
            <motion.div 
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ duration: 5, repeat: Infinity }}
              className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(220,38,38,0.3)]"
            >
              <Sparkles className="w-6 h-6 text-white" />
            </motion.div>
            <div className="hidden lg:flex flex-col">
              <span className="font-bold text-xl tracking-tight">Círculo Hermético</span>
              <div className={cn("text-xs font-bold flex items-center gap-1", PLANETARY_COLORS[getPlanetaryHour()])}>
                {PLANETARY_SYMBOLS[getPlanetaryHour()]} Hora de {getPlanetaryHour()}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 flex-1">
          {user.role === 'admin' && (
            <NavButton 
              active={activeTab === 'admin'} 
              onClick={() => { setActiveTab('admin'); setSelectedBook(null); }}
              icon={<Shield className="w-5 h-5" />}
              label="Painel Admin"
            />
          )}
          <NavButton 
            active={activeTab === 'library'} 
            onClick={() => { setActiveTab('library'); setSelectedBook(null); }}
            icon={<Library className="w-5 h-5" />}
            label="Biblioteca"
          />
          <NavButton 
            active={activeTab === 'casa-alquimista'} 
            onClick={() => { setActiveTab('casa-alquimista'); setSelectedBook(null); }}
            icon={<Star className="w-5 h-5" />}
            label="Casa do Alquimista"
          />
          <NavButton 
            active={activeTab === 'community'} 
            onClick={() => { setActiveTab('community'); setSelectedBook(null); }}
            icon={<Users className="w-5 h-5" />}
            label="Comunidade"
          />
          <NavButton 
            active={activeTab === 'oracle'} 
            onClick={() => { setActiveTab('oracle'); setSelectedBook(null); }}
            icon={<Sparkles className="w-5 h-5" />}
            label="Oráculo"
          />
          <NavButton 
            active={activeTab === 'voice'} 
            onClick={() => { setActiveTab('voice'); setSelectedBook(null); }}
            icon={<Volume2 className="w-5 h-5" />}
            label="Salas de Voz"
          />
          <NavButton 
            active={activeTab === 'laboratorio'} 
            onClick={() => { setActiveTab('laboratorio'); setSelectedBook(null); }}
            icon={<Activity className="w-5 h-5" />}
            label="Laboratório"
          />
          <NavButton 
            active={activeTab === 'donation'} 
            onClick={() => { setActiveTab('donation'); setSelectedBook(null); }}
            icon={<Heart className="w-5 h-5" />}
            label="Doação PIX"
          />
        </div>

        <div className="mt-auto pt-4 border-t border-white/10 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <img src={user.photoURL} alt={user.displayName} className="w-10 h-10 rounded-full border border-white/20" />
            <div className="hidden lg:block overflow-hidden">
              <p className="text-sm font-medium truncate">{user.displayName}</p>
              <p className={cn(
                "text-xs truncate capitalize",
                user.role === 'admin' ? "text-red-400 font-bold" : "text-white/50"
              )}>{user.role}</p>
            </div>
          </div>
          <GlassButton variant="ghost" onClick={handleLogout} className="w-full justify-start lg:px-4 px-2">
            <LogOut className="w-5 h-5" />
            <span className="hidden lg:block ml-2">Sair</span>
          </GlassButton>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 relative overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
        <AnimatePresence mode="wait">
          {selectedBook ? (
            <BookDetails 
              book={selectedBook} 
              onBack={() => setSelectedBook(null)} 
            />
          ) : activeTab === 'library' ? (
            <motion.div 
              key="library"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 md:space-y-8"
            >
              <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">Biblioteca Digital</h2>
                  <p className="text-white/50">Explore o conhecimento ancestral em PDF.</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative group w-full md:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-red-400 transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Buscar livro ou autor..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 w-full md:w-80 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all"
                    />
                  </div>
                </div>
              </header>

              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all border",
                      selectedCategory === cat 
                        ? "bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/20" 
                        : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Recommendations Section */}
              {recommendations.length > 0 && selectedCategory === 'Todos' && !searchQuery && (
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-red-400">
                    <Sparkles className="w-5 h-5" />
                    <h3 className="text-xl font-bold">Recomendações para Você</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
                    {recommendations.map(book => (
                      <BookCard 
                        key={`rec-${book.id}`} 
                        book={book} 
                        onClick={() => { 
                          setSelectedBook(book);
                        }} 
                      />
                    ))}
                  </div>
                </section>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
                {books
                  .filter(b => (selectedCategory === 'Todos' || (b.categories && b.categories.includes(selectedCategory))) && 
                    (b.title.toLowerCase().includes(searchQuery.toLowerCase()) || b.author.toLowerCase().includes(searchQuery.toLowerCase())))
                  .map(book => (
                    <BookCard 
                      key={book.id} 
                      book={book} 
                      onClick={() => { 
                        setSelectedBook(book);
                      }} 
                    />
                  ))}
                {books.length === 0 && (
                  <div className="col-span-full py-20 text-center space-y-4">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                      <BookOpen className="w-8 h-8 text-white/20" />
                    </div>
                    <p className="text-white/40">Nenhum livro encontrado nesta categoria.</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : activeTab === 'casa-alquimista' ? (
            <CasaAlquimista />
          ) : activeTab === 'community' ? (
            <CommunityChat user={user} showNotification={showNotification} showConfirm={showConfirm} />
          ) : activeTab === 'oracle' ? (
            <InsightOracle user={user} />
          ) : activeTab === 'voice' ? (
            <VoiceRooms user={user} showNotification={showNotification} />
          ) : activeTab === 'laboratorio' ? (
            <Laboratorio user={user} showConfirm={showConfirm} />
          ) : activeTab === 'donation' ? (
            <DonationPanel showNotification={showNotification} />
          ) : (
            <AdminPanel user={user} appSettings={appSettings} categories={categories} books={books} showConfirm={showConfirm} />
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black/60 backdrop-blur-2xl border-t border-white/10 px-2 py-3 flex justify-around items-center z-50">
        <MobileNavButton 
          active={activeTab === 'library'} 
          onClick={() => { setActiveTab('library'); setSelectedBook(null); }}
          icon={<Library className="w-5 h-5" />}
          label="Biblioteca"
        />
        <MobileNavButton 
          active={activeTab === 'casa-alquimista'} 
          onClick={() => { setActiveTab('casa-alquimista'); setSelectedBook(null); }}
          icon={<Star className="w-5 h-5" />}
          label="A Casa"
        />
        <MobileNavButton 
          active={activeTab === 'community'} 
          onClick={() => { setActiveTab('community'); setSelectedBook(null); }}
          icon={<Users className="w-5 h-5" />}
          label="Comunidade"
        />
        <MobileNavButton 
          active={activeTab === 'oracle'} 
          onClick={() => { setActiveTab('oracle'); setSelectedBook(null); }}
          icon={<Sparkles className="w-5 h-5" />}
          label="Oráculo"
        />
        <MobileNavButton 
          active={activeTab === 'voice'} 
          onClick={() => { setActiveTab('voice'); setSelectedBook(null); }}
          icon={<Volume2 className="w-5 h-5" />}
          label="Voz"
        />
        <MobileNavButton 
          active={activeTab === 'laboratorio'} 
          onClick={() => { setActiveTab('laboratorio'); setSelectedBook(null); }}
          icon={<Activity className="w-5 h-5" />}
          label="Lab"
        />
        <MobileNavButton 
          active={activeTab === 'donation'} 
          onClick={() => { setActiveTab('donation'); setSelectedBook(null); }}
          icon={<Heart className="w-5 h-5" />}
          label="Doação"
        />
      </nav>

      {/* Notification UI */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={cn(
              "fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl border shadow-2xl flex items-center gap-3 min-w-[300px]",
              notification.type === 'error' ? "bg-red-500/10 border-red-500/20 text-red-400" :
              notification.type === 'success' ? "bg-green-500/10 border-green-500/20 text-green-400" :
              "bg-red-500/10 border-red-500/20 text-red-400"
            )}
          >
            {notification.type === 'error' ? <AlertCircle className="w-5 h-5" /> :
             notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> :
             <Info className="w-5 h-5" />}
            <span className="font-bold text-sm tracking-tight">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal?.isOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="max-w-md w-full"
            >
              <GlassCard className="p-8 space-y-6 border-white/10 shadow-2xl">
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white italic">{confirmModal.title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{confirmModal.message}</p>
                </div>
                <div className="flex gap-3 justify-end">
                  <button 
                    onClick={() => setConfirmModal(prev => prev ? { ...prev, isOpen: false } : null)}
                    className="px-6 py-2 rounded-xl text-sm font-bold text-white/40 hover:text-white/60 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => {
                      confirmModal.onConfirm();
                      setConfirmModal(prev => prev ? { ...prev, isOpen: false } : null);
                    }}
                    className="px-6 py-2 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-500 text-white transition-colors shadow-lg shadow-red-600/20"
                  >
                    Confirmar
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MobileNavButton({ active, onClick, icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-all",
        active ? "text-red-400" : "text-white/40"
      )}
    >
      <div className={cn(
        "p-2 rounded-xl transition-all",
        active ? "bg-red-600/20" : ""
      )}>
        {icon}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
    </button>
  );
}

// --- Subcomponents ---

function BuyAccess({ user, onAuthorized, showNotification }: { user: UserProfile, onAuthorized: () => void, showNotification: (msg: string, type?: 'info' | 'error' | 'success') => void }) {
  const [loading, setLoading] = useState(false);

  const handleContactSupport = () => {
    window.open('https://wa.me/5541995647137', '_blank'); // Atualizado para o WhatsApp de suporte
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-4 relative overflow-hidden text-white">
      {/* Mystical Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-900/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/20 blur-[120px] rounded-full" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="max-w-md w-full z-10"
      >
        <GlassCard className="p-8 text-center space-y-8 border-amber-500/30 shadow-[0_0_40px_rgba(245,158,11,0.1)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent animate-pulse" />
          
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 10, -10, 0]
            }}
            transition={{ duration: 4, repeat: Infinity }}
            className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto border-2 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
          >
            <Flame className="w-10 h-10 text-amber-500" />
          </motion.div>
          
          <div className="space-y-4">
            <h2 className="text-3xl font-black tracking-tight uppercase italic text-white">Acesso Restrito</h2>
            <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-sm text-amber-100/90 leading-relaxed shadow-inner">
              <p className="font-bold text-lg mb-2">Atenção, <span className="text-white">{user.displayName}</span>!</p>
              <p className="text-left">
                O conhecimento hermético não é para todos. Apenas os que demonstram <span className="text-white font-bold underline">comprometimento real</span> podem cruzar este portal.
              </p>
              <p className="mt-4 text-left font-bold text-white">
                Como você já realizou o seu pagamento, clique no botão abaixo para verificar sua honra e liberar seu acesso.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <GlassButton onClick={() => window.location.reload()} className="w-full py-4 text-lg bg-amber-600 hover:bg-amber-500 text-black font-black uppercase tracking-widest shadow-lg shadow-amber-600/20">
              Verificar Minha Honra
            </GlassButton>

            <div className="grid grid-cols-1 gap-2">
              <button 
                onClick={handleContactSupport}
                className="w-full py-3 text-sm font-bold text-green-400 hover:text-green-300 transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Enviar Comprovante via WhatsApp
              </button>

              <button 
                onClick={() => signOut(auth)}
                className="w-full py-3 text-sm font-bold text-white/40 hover:text-white/60 transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Trocar de conta
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-white/5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-bold mb-4">A Grande Obra exige manutenção</p>
            <p className="text-xs text-white/40 italic">
              "O que não tem preço, exige valor."
            </p>
          </div>

          <div className="flex items-center justify-center gap-4 text-white/40 text-[10px] uppercase tracking-widest font-bold mt-4">
            <div className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> Seguro</div>
            <div className="flex items-center gap-1"><Shield className="w-3 h-3" /> Verificado</div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}


const ANCESTRAL_INSIGHTS = [
  "O silêncio é o útero onde a verdadeira sabedoria é concebida.",
  "Como acima, tal como abaixo; o macrocosmo reflete-se no teu próprio ser.",
  "A paciência é o fogo lento que transmuta o chumbo da alma no ouro do espírito.",
  "Tua vontade é o cinzel; a realidade é o mármore esperando tua forma.",
  "O universo não fala por palavras, mas por sincronicidades e símbolos.",
  "A morte não é um fim, mas a sublimação da forma para uma nova essência.",
  "Onde o pensamento se aquieta, a voz dos ancestrais se faz ouvir.",
  "Não busques a Pedra Filosofal fora de ti; tu és o Atanor e a Matéria.",
  "A verdade é um espelho quebrado; cada fragmento reflete uma parte do Todo.",
  "O tempo é a imagem móvel da eternidade imóvel; vive o agora.",
  "A dualidade é a ilusão que esconde a Unidade primordial.",
  "Teu corpo é o templo; tua mente é o altar; tua alma é a chama.",
  "O conhecimento sem prática é como uma semente em solo estéril.",
  "A verdadeira magia é a arte de causar mudanças na consciência conforme a vontade.",
  "Ouve o vento, pois ele traz os sussurros daqueles que vieram antes.",
  "A escuridão da Nigredo é necessária para que a luz da Albedo se revele.",
  "O equilíbrio é a chave que abre os portais dos sete céus.",
  "Toda causa tem seu efeito; toda ação é uma semente de destino.",
  "O amor é a força de coesão que mantém as estrelas em seus cursos.",
  "Sê como o mercúrio: fluido, adaptável, mas sempre fiel à sua natureza.",
  "A sabedoria é o sal da terra; sem ela, a vida perde seu sabor sagrado.",
  "O mestre aparece quando o discípulo está pronto para ouvir o silêncio.",
  "As estrelas inclinam, mas não obrigam; tu és o capitão da tua nau.",
  "A Grande Obra começa com um único suspiro de intenção pura.",
  "O que está oculto aos olhos da carne é visível aos olhos do espírito.",
  "A natureza é o livro aberto onde a divindade escreve suas leis.",
  "O medo é a sombra que desaparece quando a luz da consciência brilha.",
  "Cada obstáculo é um degrau na escada de Jacob rumo à ascensão.",
  "A palavra é prata, o silêncio é ouro, mas a ação é o diamante.",
  "Não temas o fogo da provação; ele apenas queima o que não é eterno.",
  "O destino é o mapa, mas a jornada é escrita pelos teus passos.",
  "A intuição é o fio de Ariadne no labirinto da existência.",
  "O Todo é Mente; o Universo é Mental. Pensa com pureza.",
  "A harmonia é o ritmo do cosmos; dança conforme a música das esferas.",
  "O segredo dos segredos reside na simplicidade do coração.",
  "A alma viaja através de muitas vestes antes de retornar à fonte.",
  "O poder sem sabedoria é uma espada sem punho; fere quem a empunha.",
  "A gratidão é o selo que atrai as bênçãos do plano invisível.",
  "Sê firme como a terra, fluido como a água, leve como o ar e ardente como o fogo.",
  "O mistério não é algo a ser resolvido, mas algo a ser vivido.",
  "A luz que buscas está nos olhos de quem vê a divindade em tudo.",
  "O passado é memória, o futuro é sonho; o presente é o único portal.",
  "A humildade é a base sobre a qual se constrói a pirâmide da ascensão.",
  "Ouve a batida do teu coração; é o tambor da eternidade em ti.",
  "A vida é um sonho de Deus; acorda dentro do sonho.",
  "Onde há vontade, há um caminho; onde há fé, há uma ponte.",
  "A beleza é o esplendor da verdade manifestada na forma.",
  "O buscador que olha para fora sonha; o que olha para dentro desperta.",
  "A unidade é o destino final de todos os caminhos divergentes.",
  "Tu és o universo experimentando a si mesmo em forma humana.",
  "A verdadeira alquimia não transforma metais, mas a própria alma em luz.",
  "O que está dentro de ti é o que projeta o universo ao teu redor.",
  "O silêncio absoluto é a linguagem mais alta da Egrégora.",
  "A magia é a ciência de compreender a si mesmo e ao Todo.",
  "Cada pensamento é um feitiço sussurrado ao cosmos.",
  "O fogo purifica, a água molda, o ar eleva e a terra estabiliza.",
  "A ilusão da separação é a única barreira entre ti e a divindade.",
  "O tempo é um círculo; o fim de uma jornada é o início de outra.",
  "A sabedoria não é acumulada, é lembrada pela alma desperta.",
  "O caos é apenas a ordem que ainda não compreendeste.",
  "A tua intenção é a bússola que guia a energia universal.",
  "O verdadeiro mestre é aquele que reconhece o mestre em todos os seres.",
  "A escuridão não é o mal, é o útero onde a luz se prepara para nascer.",
  "O microcosmo do teu corpo contém os segredos do macrocosmo estelar.",
  "A vibração que emites é a realidade que atrais.",
  "O desapego não é não possuir nada, é não ser possuído por nada.",
  "A palavra falada tem o poder de criar mundos ou destruí-los.",
  "O equilíbrio entre o masculino e o feminino internos gera a pedra filosofal.",
  "A dor é o fogo da forja que tempera o aço do teu espírito.",
  "A gratidão transforma o que tens em suficiente e o suficiente em abundância.",
  "O medo é uma sombra; a luz da consciência o faz desaparecer.",
  "A intuição é a voz da tua alma sussurrando verdades ancestrais.",
  "O universo é um espelho que reflete o teu estado interior.",
  "A paciência é a virtude dos que compreendem o ritmo da natureza.",
  "A verdadeira força reside na vulnerabilidade de ser autêntico.",
  "O perdão é a alquimia que transforma o veneno do ressentimento em paz.",
  "A mente é um jardim; os pensamentos são as sementes que escolhes plantar.",
  "A sincronicidade é o universo piscando o olho para ti.",
  "O amor incondicional é a frequência mais alta da criação.",
  "A morte do ego é o nascimento do verdadeiro Eu.",
  "A jornada interior é a única viagem que realmente importa.",
  "O conhecimento é poder, mas a sabedoria é a aplicação amorosa desse poder.",
  "A beleza da vida está na impermanência de todas as coisas.",
  "O silêncio entre as palavras é onde reside o verdadeiro significado.",
  "A tua respiração é a ponte entre o corpo físico e o corpo espiritual.",
  "O universo conspira a favor daqueles que estão alinhados com o seu propósito.",
  "A verdadeira liberdade é a libertação das correntes da própria mente.",
  "O sofrimento nasce da resistência ao fluxo natural da vida.",
  "A alegria é a assinatura da alma em harmonia com o Todo.",
  "O mistério da existência não é um problema a ser resolvido, mas uma realidade a ser experimentada.",
  "A tua presença é o maior presente que podes oferecer ao mundo.",
  "O passado não te define; é apenas o solo onde a tua flor desabrocha hoje.",
  "A compaixão é a chave que abre os corações mais fechados.",
  "O universo é uma sinfonia; encontra a tua nota e toca-a com paixão.",
  "A verdadeira riqueza é a abundância de paz no coração.",
  "O caminho do meio é a trilha que leva à iluminação.",
  "A tua luz interior é a única bússola que precisas na escuridão.",
  "O amor é a resposta, não importa qual seja a pergunta.",
  "A vida é uma dança; não te preocupes com os passos, apenas sente a música.",
  "O Todo está em ti, e tu estás no Todo. Sois um só."
];

function InsightOracle({ user }: { user: UserProfile }) {
  const [currentInsight, setCurrentInsight] = useState<string | null>(null);
  const [isConsulting, setIsConsulting] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  const consultOracle = async () => {
    setIsConsulting(true);
    setCurrentInsight(null);
    
    // Simulate a mystical delay
    setTimeout(async () => {
      let seenMessages = user.seenOracleMessages || [];
      
      // If all messages have been seen, reset the seen list
      if (seenMessages.length >= ANCESTRAL_INSIGHTS.length) {
        seenMessages = [];
      }

      // Find available indices
      const availableIndices = ANCESTRAL_INSIGHTS.map((_, i) => i).filter(i => !seenMessages.includes(i));
      
      // Pick a random available index
      const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
      const insight = ANCESTRAL_INSIGHTS[randomIndex];
      
      setCurrentInsight(insight);
      setHistory(prev => [insight, ...prev].slice(0, 5));
      setIsConsulting(false);

      // Update user's seen messages in Firestore
      try {
        const newSeenMessages = [...seenMessages, randomIndex];
        await updateDoc(doc(db, 'users', user.uid), {
          seenOracleMessages: newSeenMessages
        });
      } catch (error) {
        console.error("Error updating seen oracle messages:", error);
      }
    }, 2000);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col gap-8 max-w-4xl mx-auto">
      <header className="text-center space-y-2">
        <h2 className="text-4xl font-bold tracking-tighter bg-gradient-to-r from-red-400 to-purple-400 bg-clip-text text-transparent">
          O Oráculo dos Ancestrais
        </h2>
        <p className="text-white/50 italic font-serif">"Onde o tempo se dobra e a voz dos antigos ecoa."</p>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center gap-12">
        <div className="relative">
          {/* Mystical Aura */}
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.4, 0.2],
              rotate: [0, 180, 360]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 bg-red-500/20 blur-[100px] rounded-full"
          />
          
          <div className="relative z-10 flex flex-col items-center gap-8">
            <motion.div
              whileHover={!isConsulting ? { scale: 1.05 } : {}}
              whileTap={!isConsulting ? { scale: 0.95 } : {}}
              onClick={() => !isConsulting && consultOracle()}
              className={cn(
                "w-48 h-48 rounded-full border-2 border-red-500/30 flex items-center justify-center transition-all shadow-[0_0_50px_rgba(239,68,68,0.1)]",
                isConsulting ? "animate-pulse border-red-400 shadow-[0_0_80px_rgba(239,68,68,0.3)] cursor-wait" : "hover:border-red-400 hover:shadow-[0_0_80px_rgba(239,68,68,0.2)] cursor-pointer"
              )}
            >
              <div className="text-center space-y-2">
                <Sparkles className={cn("w-12 h-12 mx-auto transition-colors", isConsulting ? "text-red-300" : "text-red-500")} />
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-red-300/60">Consultar</span>
              </div>
            </motion.div>

            <AnimatePresence mode="wait">
              {currentInsight && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="max-w-lg text-center"
                >
                  <GlassCard className="p-8 border-red-500/30 bg-red-500/5">
                    <p className="text-2xl font-serif italic leading-relaxed text-red-100">
                      "{currentInsight}"
                    </p>
                    <div className="mt-6 flex justify-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-red-500/40" />
                      <div className="w-1 h-1 rounded-full bg-red-500/40" />
                      <div className="w-1 h-1 rounded-full bg-red-500/40" />
                    </div>
                  </GlassCard>
                </motion.div>
              )}
              {isConsulting && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-300/50 font-serif italic animate-pulse"
                >
                  Ouvindo os sussurros do éter...
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {history.length > 0 && (
          <div className="w-full max-w-md space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/30 text-center">Ecos Recentes</h3>
            <div className="space-y-2">
              {history.map((h, i) => (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  key={i} 
                  className="p-3 rounded-xl bg-white/5 border border-white/5 text-sm text-white/40 italic font-serif"
                >
                  "{h}"
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function VoiceRooms({ user, showNotification }: { user: UserProfile, showNotification: (msg: string, type?: 'info' | 'error' | 'success') => void }) {
  const [rooms, setRooms] = useState<VoiceRoom[]>([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomTheme, setNewRoomTheme] = useState('');
  const [newRoomMaxParticipants, setNewRoomMaxParticipants] = useState(10);
  const [newRoomScheduledTime, setNewRoomScheduledTime] = useState('');
  const [activeRoom, setActiveRoom] = useState<VoiceRoom | null>(null);
  const [isCreating, setIsCreating] = useState(false);
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
        const sched = r.scheduledTime?.toDate ? r.scheduledTime.toDate() : new Date(r.scheduledTime);
        const diff = (sched.getTime() - now.getTime()) / (1000 * 60);
        return diff > 0 && diff < 30;
      });

      if (upcoming.length > 0) {
        setNotifications(upcoming.map(r => `Discussão próxima: "${r.name}" às ${new Date(r.scheduledTime?.toDate ? r.scheduledTime.toDate() : r.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`));
      }
    }, (error) => {
      if (error.code === 'permission-denied') return;
      handleFirestoreError(error, OperationType.GET, 'voiceRooms');
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

      // Check if any audio input devices are available
      navigator.mediaDevices.enumerateDevices().then(devices => {
        const hasMic = devices.some(device => device.kind === 'audioinput');
        if (!hasMic) {
          setError("Nenhum microfone detectado. Por favor, conecte um dispositivo de áudio.");
          setActiveRoom(null);
          return;
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
  }, [activeRoom]);

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

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim() || !newRoomTheme.trim() || !newRoomScheduledTime) return;

    try {
      const roomData = {
        name: newRoomName.trim(),
        theme: newRoomTheme.trim(),
        maxParticipants: newRoomMaxParticipants,
        scheduledTime: new Date(newRoomScheduledTime),
        createdBy: user.uid,
        creatorName: user.displayName || 'Admin',
        createdAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, 'voiceRooms'), roomData);
      setActiveRoom({ id: docRef.id, ...roomData, activeParticipants: [user.uid], createdAt: new Date() });
      setNewRoomName('');
      setNewRoomTheme('');
      setNewRoomScheduledTime('');
      setIsCreating(false);
    } catch (error) {
      console.error("Error creating room:", error);
      handleFirestoreError(error, OperationType.CREATE, 'voiceRooms');
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
    } catch (error) {
      console.error("Error joining room:", error);
      handleFirestoreError(error, OperationType.UPDATE, `voiceRooms/${room.id}`);
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
    } catch (error) {
      console.error("Error leaving room:", error);
      handleFirestoreError(error, OperationType.UPDATE, `voiceRooms/${activeRoom.id}`);
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0];
      track.enabled = !track.enabled;
      setIsMuted(!track.enabled);
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

function BookCard({ book, onClick }: any) {
  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const message = encodeURIComponent(`Olá! Gostaria de solicitar o PDF do livro: ${book.title}`);
    window.open(`https://wa.me/5541995647137?text=${message}`, '_blank');
  };

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      onClick={onClick}
      className="cursor-pointer group"
    >
      <GlassCard className="h-full flex flex-col">
        <div className="aspect-[3/4] overflow-hidden relative">
          <img 
            src={book.coverUrl || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400'} 
            alt={book.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
            <GlassButton onClick={handleWhatsApp} className="w-full bg-green-600/80 hover:bg-green-500">
              <MessageCircle className="w-4 h-4 mr-2" />
              Pedir PDF
            </GlassButton>
          </div>
        </div>
        <div className="p-4 space-y-1 flex-1">
          <h3 className="font-bold text-lg leading-tight line-clamp-2 group-hover:text-red-400 transition-colors">{book.title}</h3>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function BookDetails({ book, onBack }: { book: Book, onBack: () => void }) {
  const [isReading, setIsReading] = useState(false);

  const handleWhatsApp = async () => {
    const message = encodeURIComponent(`Olá! Gostaria de solicitar o livro: ${book.title}`);
    window.open(`https://wa.me/5541995647137?text=${message}`, '_blank');
  };

  if (isReading && book.pdfUrl) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4 max-w-5xl mx-auto h-[80vh] flex flex-col"
      >
        <div className="flex items-center gap-3 md:gap-4">
          <GlassButton variant="ghost" onClick={() => setIsReading(false)} className="p-2 rounded-full shrink-0">
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </GlassButton>
          <h2 className="text-xl md:text-2xl font-bold truncate">{book.title}</h2>
        </div>
        <GlassCard className="flex-1 w-full overflow-hidden p-0">
          <iframe 
            src={book.pdfUrl} 
            className="w-full h-full border-0 rounded-2xl"
            title={`Lendo ${book.title}`}
            allow="autoplay"
          />
        </GlassCard>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-4xl mx-auto"
    >
      <div className="flex items-center gap-3 md:gap-4">
        <GlassButton variant="ghost" onClick={onBack} className="p-2 rounded-full shrink-0">
          <X className="w-5 h-5 md:w-6 md:h-6" />
        </GlassButton>
        <h2 className="text-xl md:text-2xl font-bold truncate">{book.title}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 md:gap-8">
        <div className="space-y-4">
          <GlassCard className="aspect-[3/4] max-w-[240px] mx-auto md:max-w-none">
            <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
          </GlassCard>
          
          {book.pdfUrl ? (
            <GlassButton onClick={() => setIsReading(true)} className="w-full py-4 text-lg bg-red-600/80 hover:bg-red-500">
              <BookOpen className="w-5 h-5 mr-2" />
              Ler Livro Agora
            </GlassButton>
          ) : (
            <GlassButton onClick={handleWhatsApp} className="w-full py-4 text-lg bg-green-600/80 hover:bg-green-500">
              <MessageCircle className="w-5 h-5 mr-2" />
              Solicitar via WhatsApp
            </GlassButton>
          )}
        </div>
        <div className="space-y-6 text-center md:text-left">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{book.title}</h1>
            <p className="text-lg md:text-xl text-red-400">{book.author}</p>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-bold border-b border-white/10 pb-2">Sinopse</h3>
            <p className="text-white/70 text-sm md:text-base leading-relaxed whitespace-pre-wrap">{book.synopsis}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function DonationPanel({ showNotification }: { showNotification: (msg: string, type?: 'info' | 'error' | 'success') => void }) {
  const pixKey = "welllagos@outlook.com"; // Substitua pela sua chave PIX real

  const copyPix = () => {
    navigator.clipboard.writeText(pixKey);
    showNotification("Chave PIX copiada!", "success");
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <GlassCard className="p-8 text-center space-y-8 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.2)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent animate-pulse" />
        
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ duration: 4, repeat: Infinity }}
          className="w-24 h-24 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto border-2 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
        >
          <Sparkles className="w-12 h-12 text-amber-500" />
        </motion.div>
        
        <div className="space-y-4">
          <h2 className="text-4xl font-black tracking-tight text-white uppercase italic">A Chama não pode apagar!</h2>
          <p className="text-xl font-bold text-amber-400">O conhecimento Oculto exige sacrifício e manutenção.</p>
          <p className="text-red-200/80 leading-relaxed">
            Manter o <span className="text-white font-bold">Círculo Hermético</span> vivo é uma responsabilidade de todos os iniciados. 
            Sua contribuição não é apenas uma doação, é o combustível que mantém a Grande Obra em movimento. 
            <span className="block mt-2 text-white font-bold underline decoration-amber-500">Não deixe a luz se extinguir por falta de apoio.</span>
          </p>
        </div>

        <div className="p-8 bg-amber-500/5 rounded-2xl border-2 border-amber-500/30 space-y-6 shadow-inner">
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm uppercase tracking-[0.3em] font-black text-amber-500">Chave PIX de Contribuição</p>
            <p className="text-xs text-white/40">Clique no ícone para copiar e realizar sua parte</p>
          </div>
          <div className="flex items-center justify-between gap-4 bg-black/60 p-5 rounded-xl border border-amber-500/20 group hover:border-amber-500 transition-colors">
            <code className="text-lg md:text-2xl font-mono text-white font-bold truncate">{pixKey}</code>
            <button 
              onClick={copyPix}
              className="p-3 bg-amber-500 text-black rounded-lg hover:scale-110 transition-all shadow-lg shadow-amber-500/20"
              title="Copiar Chave"
            >
              <Copy className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-6 bg-white/5 rounded-xl border border-white/10 hover:bg-amber-500/10 transition-colors">
            <p className="text-3xl font-black text-white">HONRA</p>
            <p className="text-xs text-amber-500 font-bold uppercase tracking-widest">Aos que apoiam</p>
          </div>
          <div className="p-6 bg-white/5 rounded-xl border border-white/10 hover:bg-amber-500/10 transition-colors">
            <p className="text-3xl font-black text-white">PODER</p>
            <p className="text-xs text-amber-500 font-bold uppercase tracking-widest">Ao conhecimento livre</p>
          </div>
        </div>

        <div className="pt-4">
          <p className="text-sm text-white/40 italic font-serif">
            "O silêncio é de ouro, mas a manutenção do Templo exige o suor dos justos."
          </p>
        </div>
      </GlassCard>
    </div>
  );
}

function AdminPanel({ user, appSettings, categories, books, showConfirm }: { user: UserProfile, appSettings: any, categories: string[], books: Book[], showConfirm: (title: string, message: string, onConfirm: () => void) => void }) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [bookCategories, setBookCategories] = useState<string[]>([categories[1] || 'Hermetismo']);
  const [coverUrl, setCoverUrl] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [adminTab, setAdminTab] = useState<'books' | 'categories' | 'users' | 'moderation' | 'settings'>('books');
  const [selectedUserForPath, setSelectedUserForPath] = useState<UserProfile | null>(null);
  const [targetUserPath, setTargetUserPath] = useState<InitiationLevel[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, authorizedUsers: 0, totalBooks: 0, totalMessages: 0 });
  const [newCategoryName, setNewCategoryName] = useState('');
  const [modMessages, setModMessages] = useState<ChatMessage[]>([]);

  const availableCategories = categories.filter(c => c !== 'Todos');

  useEffect(() => {
    if (availableCategories.length > 0 && bookCategories.length === 0) {
      setBookCategories([availableCategories[0]]);
    }
  }, [categories]);

  useEffect(() => {
    // Fetch Stats
    const fetchStats = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const booksSnap = await getDocs(collection(db, 'books'));
        const messagesSnap = await getDocs(collection(db, 'chat'));
        
        setStats({
          totalUsers: usersSnap.size,
          authorizedUsers: usersSnap.docs.filter(d => (d.data() as UserProfile).isAuthorized).length,
          totalBooks: booksSnap.size,
          totalMessages: messagesSnap.size
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
        handleFirestoreError(error, OperationType.GET, 'stats');
      }
    };

    fetchStats();
  }, [adminTab]);

  useEffect(() => {
    if (adminTab === 'moderation') {
      const q = query(collection(db, 'chat'), orderBy('createdAt', 'desc'), limit(50));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setModMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage)));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'chat');
      });
      return () => unsubscribe();
    }
  }, [adminTab]);

  const deleteMessage = (msgId: string) => {
    showConfirm(
      "Deletar Mensagem",
      "Deseja realmente deletar esta mensagem?",
      async () => {
        try {
          await deleteDoc(doc(db, 'chat', msgId));
        } catch (error) {
          console.error("Error deleting message:", error);
          handleFirestoreError(error, OperationType.DELETE, `chat/${msgId}`);
        }
      }
    );
  };

  const updateSetting = async (key: string, value: boolean) => {
    try {
      await setDoc(doc(db, 'settings', 'global'), { [key]: value }, { merge: true });
    } catch (error) {
      console.error("Error updating setting:", error);
      handleFirestoreError(error, OperationType.WRITE, 'settings/global');
    }
  };

  useEffect(() => {
    if (adminTab === 'users') {
      const q = query(collection(db, 'users'), limit(50));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'users');
      });
      return () => unsubscribe();
    }
  }, [adminTab]);

  useEffect(() => {
    if (selectedUserForPath) {
      const q = query(collection(db, 'users', selectedUserForPath.uid, 'initiationPath'), orderBy('level', 'asc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setTargetUserPath(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InitiationLevel)));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${selectedUserForPath.uid}/initiationPath`);
      });
      return () => unsubscribe();
    }
  }, [selectedUserForPath]);

  const toggleLevel = async (targetUser: UserProfile, step: any, isUnlocked: boolean) => {
    try {
      const levelRef = doc(db, 'users', targetUser.uid, 'initiationPath', step.level.toString());
      if (isUnlocked) {
        await deleteDoc(levelRef);
        // If unmarking, maybe revert role to previous level? 
        // For simplicity, we'll just update to the highest remaining level or 'user'
        const remainingLevels = targetUserPath.filter(l => l.level !== step.level);
        const maxLevel = remainingLevels.length > 0 ? Math.max(...remainingLevels.map(l => l.level)) : 0;
        const initiationSteps = [
          { level: 1, name: 'Neófito do Silêncio (Calcinação)' },
          { level: 2, name: 'Buscador da Correspondência (Sublimação)' },
          { level: 3, name: 'Praticante da Vibração (Solução)' },
          { level: 4, name: 'Alquimista do Pensamento (Destilação)' },
          { level: 5, name: 'Mestre da Unidade (Coagulação)' }
        ];
        const newRole = maxLevel > 0 ? initiationSteps.find(s => s.level === maxLevel)?.name : 'user';
        await updateDoc(doc(db, 'users', targetUser.uid), { role: newRole });
      } else {
        await setDoc(levelRef, {
          userId: targetUser.uid,
          level: step.level,
          name: step.name,
          unlockedAt: serverTimestamp(),
          reflections: 'Atribuído pelo Administrador'
        });
        await updateDoc(doc(db, 'users', targetUser.uid), { role: step.name });
      }
    } catch (error) {
      console.error("Error toggling level:", error);
      handleFirestoreError(error, OperationType.WRITE, `users/${targetUser.uid}/initiationPath/${step.level}`);
    }
  };

  const toggleAuthorization = async (targetUser: UserProfile) => {
    try {
      await updateDoc(doc(db, 'users', targetUser.uid), {
        isAuthorized: !targetUser.isAuthorized
      });
    } catch (error) {
      console.error("Error toggling authorization:", error);
      handleFirestoreError(error, OperationType.UPDATE, `users/${targetUser.uid}`);
    }
  };

  const seedData = async () => {
    setStatus('loading');
    const initialBooks = [
      {
        title: "O Caibalion",
        author: "Três Iniciados",
        synopsis: "Um estudo sobre a filosofia hermética do antigo Egito e da Grécia. Os sete princípios herméticos que regem o universo.",
        categories: ["Hermetismo"],
        coverUrl: "https://images.unsplash.com/photo-1516414447565-b14be0adf13e?auto=format&fit=crop&q=80&w=400"
      },
      {
        title: "Dogma e Ritual da Alta Magia",
        author: "Eliphas Levi",
        synopsis: "A obra fundamental do ocultismo moderno, dividida em Dogma (teoria) e Ritual (prática).",
        categories: ["Magia"],
        coverUrl: "https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&q=80&w=400"
      },
      {
        title: "A Voz do Silêncio",
        author: "Helena Blavatsky",
        synopsis: "Fragmentos escolhidos do 'Livro dos Preceitos de Ouro'. Um guia para o caminho da iluminação e compaixão.",
        categories: ["Teosofia"],
        coverUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&q=80&w=400"
      },
      {
        title: "Livro de Teste",
        author: "Sistema",
        synopsis: "Um documento de teste com texto aleatório para verificar as funcionalidades.",
        categories: ["Ocultismo"],
        coverUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=400"
      }
    ];

    try {
      for (const book of initialBooks) {
        await addDoc(collection(db, 'books'), {
          ...book,
          uploadedBy: user.uid,
          createdAt: serverTimestamp()
        });
      }
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      console.error("Seed Error:", error);
      handleFirestoreError(error, OperationType.CREATE, 'books');
      setStatus('error');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    
    try {
      if (editingBookId) {
        await updateDoc(doc(db, 'books', editingBookId), {
          title,
          author,
          synopsis,
          categories: bookCategories,
          coverUrl,
          pdfUrl
        });
        setStatus('success');
        setEditingBookId(null);
      } else {
        await addDoc(collection(db, 'books'), {
          title,
          author,
          synopsis,
          categories: bookCategories,
          coverUrl,
          pdfUrl,
          uploadedBy: user.uid,
          createdAt: serverTimestamp()
        });
        setStatus('success');
      }
      setTitle(''); setAuthor(''); setSynopsis(''); setCoverUrl(''); setPdfUrl(''); setBookCategories([categories.filter(c => c !== 'Todos')[0] || 'Hermetismo']);
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      console.error("Upload Error:", error);
      handleFirestoreError(error, editingBookId ? OperationType.UPDATE : OperationType.CREATE, 'books');
      setStatus('error');
    }
  };

  const startEditingBook = (book: Book) => {
    setEditingBookId(book.id);
    setTitle(book.title);
    setAuthor(book.author);
    setSynopsis(book.synopsis);
    setBookCategories(book.categories || []);
    setCoverUrl(book.coverUrl);
    setPdfUrl(book.pdfUrl || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditing = () => {
    setEditingBookId(null);
    setTitle(''); setAuthor(''); setSynopsis(''); setCoverUrl(''); setPdfUrl('');
    setBookCategories([categories.filter(c => c !== 'Todos')[0] || 'Hermetismo']);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold">Painel do Administrador</h2>
          <p className="text-white/50">Gerencie a biblioteca, usuários e monetização.</p>
        </div>
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 overflow-x-auto no-scrollbar">
          {['books', 'categories', 'users', 'moderation', 'settings'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setAdminTab(tab as any)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize whitespace-nowrap", 
                adminTab === tab ? "bg-red-600 text-white shadow-lg" : "text-white/50 hover:text-white"
              )}
            >
              {tab === 'books' ? 'Livros' : tab === 'categories' ? 'Categorias' : tab === 'users' ? 'Usuários' : tab === 'moderation' ? 'Moderação' : 'Configurações'}
            </button>
          ))}
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total de Buscadores', value: stats.totalUsers, icon: Users },
          { label: 'Acessos Autorizados', value: stats.authorizedUsers, icon: Shield },
          { label: 'Obras na Biblioteca', value: stats.totalBooks, icon: BookOpen },
          { label: 'Mensagens no Éter', value: stats.totalMessages, icon: MessageSquare },
        ].map((stat, i) => (
          <GlassCard key={i} className="p-4 flex flex-col items-center text-center gap-2">
            <stat.icon className="w-5 h-5 text-red-400" />
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{stat.label}</div>
          </GlassCard>
        ))}
      </div>

      {adminTab === 'books' ? (
        <GlassCard className="p-8">
          <form onSubmit={handleUpload} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/70">Título do Livro</label>
                <input 
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500/50 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/70">Autor</label>
                <input 
                  required
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500/50 outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">Categoria</label>
              <div className="flex flex-wrap gap-2 p-2 bg-white/5 border border-white/10 rounded-xl min-h-[42px]">
                {availableCategories.map(cat => (
                  <label key={cat} className="flex items-center gap-2 cursor-pointer p-1">
                    <input 
                      type="checkbox" 
                      className="rounded border-white/20 bg-white/5 text-red-500 focus:ring-red-500"
                      checked={bookCategories.includes(cat)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setBookCategories([...bookCategories, cat]);
                        } else {
                          setBookCategories(bookCategories.filter(c => c !== cat));
                        }
                      }}
                    />
                    <span className="text-sm">{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">Sinopse</label>
              <textarea 
                required
                rows={4}
                value={synopsis}
                onChange={(e) => setSynopsis(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500/50 outline-none resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">URL da Capa (Imagem)</label>
              <input 
                required
                type="url"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500/50 outline-none"
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">URL do PDF (Opcional)</label>
              <input 
                type="url"
                value={pdfUrl}
                onChange={(e) => setPdfUrl(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500/50 outline-none"
                placeholder="https://... (Link direto para o PDF)"
              />
            </div>

            <div className="flex gap-4">
              <GlassButton 
                type="submit" 
                disabled={status === 'loading'}
                className="flex-1 py-4 text-lg"
              >
                {status === 'loading' ? 'Salvando...' : editingBookId ? 'Salvar Alterações' : 'Adicionar Livro à Biblioteca'}
              </GlassButton>
              {editingBookId && (
                <GlassButton 
                  type="button" 
                  variant="secondary"
                  onClick={cancelEditing}
                  disabled={status === 'loading'}
                  className="py-4 px-8 text-lg"
                >
                  Cancelar
                </GlassButton>
              )}
            </div>

            {status === 'success' && <p className="text-green-400 text-center font-medium">{editingBookId ? 'Livro atualizado' : 'Livro adicionado'} com sucesso!</p>}
            {status === 'error' && <p className="text-red-400 text-center font-medium">Erro ao salvar livro. Tente novamente.</p>}
          </form>

          <div className="mt-12 pt-8 border-t border-white/10">
            <h3 className="text-xl font-bold mb-6">Livros na Biblioteca</h3>
            <div className="space-y-4">
              {books.map(book => (
                <GlassCard key={book.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <img src={book.coverUrl} alt={book.title} className="w-12 h-16 object-cover rounded shadow-md" />
                    <div>
                      <h4 className="font-bold text-lg">{book.title}</h4>
                      <p className="text-sm text-white/50">{book.author} • {book.categories?.join(', ')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => startEditingBook(book)}
                      className="p-2 text-white/50 hover:text-red-400 transition-colors bg-white/5 rounded-lg"
                      title="Editar"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => {
                        showConfirm(
                          "Remover Livro",
                          `Tem certeza que deseja remover "${book.title}" da biblioteca?`,
                          async () => {
                            try {
                              await deleteDoc(doc(db, 'books', book.id));
                            } catch (error) {
                              console.error("Error deleting book:", error);
                              handleFirestoreError(error, OperationType.DELETE, `books/${book.id}`);
                            }
                          }
                        );
                      }}
                      className="p-2 text-white/50 hover:text-red-400 transition-colors bg-white/5 rounded-lg"
                      title="Remover"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </GlassCard>
              ))}
              {books.length === 0 && (
                <p className="text-center text-white/50 py-8">Nenhum livro na biblioteca.</p>
              )}
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/10">
            <h3 className="text-lg font-bold mb-4">Ações Rápidas</h3>
            <GlassButton variant="secondary" onClick={seedData} disabled={status === 'loading'}>
              Semear Biblioteca Inicial (Mock Data)
            </GlassButton>
            <p className="text-xs text-white/30 mt-2 italic">
              Isso adicionará 3 livros clássicos do esoterismo para popular sua biblioteca.
            </p>
          </div>
        </GlassCard>
      ) : adminTab === 'categories' ? (
        <div className="space-y-6">
          <GlassCard className="p-6">
            <h3 className="text-xl font-bold mb-4">Gerenciar Categorias</h3>
            <div className="flex gap-4">
              <input 
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nova categoria..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500/50 outline-none"
              />
              <GlassButton 
                onClick={async () => {
                  if (!newCategoryName.trim()) return;
                  try {
                    await addDoc(collection(db, 'categories'), { name: newCategoryName.trim() });
                    setNewCategoryName('');
                  } catch (error) {
                    console.error("Error adding category:", error);
                    handleFirestoreError(error, OperationType.CREATE, 'categories');
                  }
                }}
              >
                Adicionar
              </GlassButton>
            </div>
          </GlassCard>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {availableCategories.map(cat => (
              <GlassCard key={cat} className="p-4 flex items-center justify-between">
                <span className="font-medium">{cat}</span>
                <button 
                  onClick={() => {
                    showConfirm(
                      "Remover Categoria",
                      `Tem certeza que deseja remover a categoria "${cat}"?`,
                      async () => {
                        try {
                          const q = query(collection(db, 'categories'), where('name', '==', cat));
                          const snapshot = await getDocs(q);
                          snapshot.docs.forEach(async (d) => {
                            await deleteDoc(doc(db, 'categories', d.id));
                          });
                        } catch (error) {
                          console.error("Error deleting category:", error);
                          handleFirestoreError(error, OperationType.DELETE, 'categories');
                        }
                      }
                    );
                  }}
                  className="p-2 text-white/20 hover:text-red-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </GlassCard>
            ))}
          </div>
        </div>
      ) : adminTab === 'moderation' ? (
        <div className="space-y-6">
          <header>
            <h3 className="text-xl font-bold">Moderação de Conteúdo</h3>
            <p className="text-sm text-white/50">Monitore e remova mensagens inadequadas da comunidade.</p>
          </header>
          
          <div className="space-y-3">
            {modMessages.length === 0 && (
              <div className="text-center py-12 text-white/20 italic">Nenhuma mensagem recente encontrada.</div>
            )}
            {modMessages.map((msg) => (
              <GlassCard key={msg.id} className="p-4 flex items-start justify-between gap-4 border-white/5 hover:border-white/10 transition-all">
                <div className="flex gap-4">
                  <img src={msg.userPhoto} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-red-300">{msg.userName}</span>
                      <span className="text-[10px] text-white/30">{msg.createdAt?.toDate ? formatDistanceToNow(msg.createdAt.toDate(), { addSuffix: true, locale: ptBR }) : 'Recentemente'}</span>
                    </div>
                    <p className="text-sm text-white/80 mt-1">{msg.text}</p>
                  </div>
                </div>
                <button 
                  onClick={() => deleteMessage(msg.id)}
                  className="p-2 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                  title="Deletar Mensagem"
                >
                  <X className="w-5 h-5" />
                </button>
              </GlassCard>
            ))}
          </div>
        </div>
      ) : adminTab === 'settings' ? (
        <div className="space-y-6">
          <header>
            <h3 className="text-xl font-bold">Configurações Globais</h3>
            <p className="text-sm text-white/50">Controle o estado geral do aplicativo.</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard className="p-6 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-bold">Modo de Manutenção</h4>
                <p className="text-xs text-white/40">Bloqueia o acesso de todos os usuários não-admin.</p>
              </div>
              <button 
                onClick={() => updateSetting('maintenance', !appSettings.maintenance)}
                className={cn(
                  "w-12 h-6 rounded-full relative transition-all",
                  appSettings.maintenance ? "bg-red-500" : "bg-white/10"
                )}
              >
                <motion.div 
                  animate={{ x: appSettings.maintenance ? 24 : 4 }}
                  className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg"
                />
              </button>
            </GlassCard>

            <GlassCard className="p-6 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-bold">Inscrições Abertas</h4>
                <p className="text-xs text-white/40">Permite que novos usuários se registrem no app.</p>
              </div>
              <button 
                onClick={() => updateSetting('registrationOpen', !appSettings.registrationOpen)}
                className={cn(
                  "w-12 h-6 rounded-full relative transition-all",
                  appSettings.registrationOpen ? "bg-green-500" : "bg-white/10"
                )}
              >
                <motion.div 
                  animate={{ x: appSettings.registrationOpen ? 24 : 4 }}
                  className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg"
                />
              </button>
            </GlassCard>
          </div>

          <GlassCard className="p-8 border-red-500/20 bg-red-500/5">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-red-600/20 rounded-xl flex items-center justify-center border border-red-500/30">
                <Shield className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h4 className="font-bold">Segurança do Sistema</h4>
                <p className="text-xs text-white/40">Protocolos de proteção ativa.</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span className="text-sm">Firestore Security Rules Ativas</span>
                </div>
                <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Protegido</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span className="text-sm">Autenticação Google OAuth 2.0</span>
                </div>
                <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Verificado</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 opacity-50">
                <div className="flex items-center gap-3">
                  <Circle className="w-4 h-4 text-white/20" />
                  <span className="text-sm">Logs de Auditoria (Firebase Cloud Functions)</span>
                </div>
                <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Opcional</span>
              </div>
            </div>
          </GlassCard>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-xl font-bold">Gerenciamento de Usuários</h3>
              <p className="text-sm text-white/40">Libere acessos e gerencie graus iniciáticos.</p>
            </div>
            <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 flex items-center gap-4">
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-widest text-white/30">Total</p>
                <p className="text-lg font-bold">{users.length}</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-widest text-amber-400">Pendentes</p>
                <p className="text-lg font-bold text-amber-400">{users.filter(u => !u.isAuthorized).length}</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            {users.sort((a, b) => (a.isAuthorized === b.isAuthorized) ? 0 : a.isAuthorized ? 1 : -1).map(u => (
              <GlassCard key={u.uid} className={cn(
                "p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all",
                !u.isAuthorized ? "border-amber-500/30 bg-amber-500/5" : "border-white/5"
              )}>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="relative">
                    <img src={u.photoURL} alt={u.displayName} className="w-12 h-12 rounded-full border border-white/10" />
                    {!u.isAuthorized && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-[#0a0a0c] flex items-center justify-center">
                        <Activity className="w-2 h-2 text-white animate-pulse" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-white">{u.displayName}</p>
                    <p className="text-xs text-white/40">{u.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">{u.role}</span>
                      <span className="w-1 h-1 bg-white/20 rounded-full" />
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest",
                        u.isAuthorized ? "text-green-400" : "text-amber-400"
                      )}>
                        {u.isAuthorized ? 'Autorizado' : 'Aguardando Liberação'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button 
                    onClick={() => setSelectedUserForPath(u)}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <Compass className="w-4 h-4" />
                    Senda
                  </button>
                  <button 
                    onClick={() => toggleAuthorization(u)}
                    className={cn(
                      "flex-1 sm:flex-none px-6 py-2 rounded-xl transition-all text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg",
                      u.isAuthorized 
                        ? "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20" 
                        : "bg-amber-500 text-black hover:bg-amber-400 shadow-amber-500/20"
                    )}
                  >
                    {u.isAuthorized ? (
                      <>
                        <Lock className="w-4 h-4" />
                        Bloquear
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        Liberar Acesso
                      </>
                    )}
                  </button>
                </div>
              </GlassCard>
            ))}
            {users.length === 0 && (
              <div className="text-center py-20 text-white/20 italic">Nenhum buscador encontrado no éter.</div>
            )}
          </div>

          {selectedUserForPath && (
            <div className="mt-12 p-6 bg-red-500/5 rounded-3xl border border-red-500/20 space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <img src={selectedUserForPath.photoURL} alt="" className="w-12 h-12 rounded-full border-2 border-red-500/30" />
                  <div>
                    <h4 className="font-bold">Senda de {selectedUserForPath.displayName}</h4>
                    <p className="text-xs text-white/40">Grau Atual: {selectedUserForPath.role}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedUserForPath(null)}
                  className="text-xs font-bold text-white/30 hover:text-white uppercase tracking-widest"
                >
                  Fechar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { level: 1, name: 'Neófito do Silêncio (Calcinação)' },
                  { level: 2, name: 'Buscador da Correspondência (Sublimação)' },
                  { level: 3, name: 'Praticante da Vibração (Solução)' },
                  { level: 4, name: 'Alquimista do Pensamento (Destilação)' },
                  { level: 5, name: 'Mestre da Unidade (Coagulação)' }
                ].map((step) => {
                  const isUnlocked = targetUserPath.some(l => l.level === step.level);
                  return (
                    <button
                      key={step.level}
                      onClick={() => toggleLevel(selectedUserForPath, step, isUnlocked)}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-2xl border transition-all text-left",
                        isUnlocked 
                          ? "bg-red-600/20 border-red-500/50 text-white" 
                          : "bg-white/5 border-white/10 text-white/40 hover:border-white/20"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                          isUnlocked ? "bg-red-600 text-white" : "bg-white/10 text-white/30"
                        )}>
                          {step.level}
                        </div>
                        <span className="text-sm font-medium">{step.name}</span>
                      </div>
                      {isUnlocked ? <CheckCircle2 className="w-4 h-4 text-red-400" /> : <Circle className="w-4 h-4 opacity-20" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Laboratório do Ser Components ---

function Laboratorio({ user, showConfirm }: { user: UserProfile, showConfirm: (title: string, message: string, onConfirm: () => void) => void }) {
  const [activeSubTab, setActiveSubTab] = useState<'shadow' | 'rituals' | 'path' | 'atanor' | 'analogies'>('rituals');
  const [moonPhase, setMoonPhase] = useState<{ name: string; icon: string }>({ name: 'Nova', icon: '🌑' });

  useEffect(() => {
    // Simple moon phase calculation (approximate)
    const getMoonPhase = () => {
      const phases = [
        { name: 'Nova', icon: '🌑' },
        { name: 'Crescente', icon: '🌒' },
        { name: 'Quarto Crescente', icon: '🌓' },
        { name: 'Gibosa Crescente', icon: '🌔' },
        { name: 'Cheia', icon: '🌕' },
        { name: 'Gibosa Minguante', icon: '🌖' },
        { name: 'Quarto Minguante', icon: '🌗' },
        { name: 'Minguante', icon: '🌘' }
      ];
      const now = new Date();
      const lp = 2551443; 
      const newMoon = new Date(1970, 0, 7, 20, 35, 0).getTime() / 1000;
      const phase = ((now.getTime() / 1000) - newMoon) % lp;
      const res = Math.floor((phase / lp) * 8);
      return phases[res % 8];
    };
    setMoonPhase(getMoonPhase());
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8 max-w-6xl mx-auto"
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/5 p-6 rounded-3xl border border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-red-600/20 rounded-2xl flex items-center justify-center border border-red-500/30">
            <Activity className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Laboratório do Ser</h2>
            <p className="text-white/50 italic">"Solve et Coagula" — Dissolve e Coagula.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-black/20 px-6 py-3 rounded-2xl border border-white/5">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-white/40">Athanor Digital</p>
            <p className="text-sm font-bold text-red-300">Fase da Lua: {moonPhase.name}</p>
          </div>
          <span className="text-3xl">{moonPhase.icon}</span>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        <button
          onClick={() => setActiveSubTab('rituals')}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-medium transition-all border",
            activeSubTab === 'rituals' 
              ? "bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/20" 
              : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
          )}
        >
          <Zap className="w-4 h-4" />
          Rituais Diários
        </button>
        <button
          onClick={() => setActiveSubTab('shadow')}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-medium transition-all border",
            activeSubTab === 'shadow' 
              ? "bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/20" 
              : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
          )}
        >
          <BookIcon className="w-4 h-4" />
          Diário de Sombras
        </button>
        <button
          onClick={() => setActiveSubTab('atanor')}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-medium transition-all border",
            activeSubTab === 'atanor' 
              ? "bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-600/20" 
              : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
          )}
        >
          <Flame className="w-4 h-4" />
          Atanor Digital
        </button>
        <button
          onClick={() => setActiveSubTab('analogies')}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-medium transition-all border",
            activeSubTab === 'analogies' 
              ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/20" 
              : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
          )}
        >
          <Link2 className="w-4 h-4" />
          Tábua das Analogias
        </button>
        <button
          onClick={() => setActiveSubTab('path')}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-medium transition-all border",
            activeSubTab === 'path' 
              ? "bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/20" 
              : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
          )}
        >
          <Compass className="w-4 h-4" />
          Senda Iniciática
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === 'rituals' && (
          <motion.div key="rituals" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <DailyRituals user={user} />
          </motion.div>
        )}
        {activeSubTab === 'shadow' && (
          <motion.div key="shadow" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <ShadowJournal user={user} showConfirm={showConfirm} />
          </motion.div>
        )}
        {activeSubTab === 'atanor' && (
          <motion.div key="atanor" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <AtanorDigital user={user} />
          </motion.div>
        )}
        {activeSubTab === 'analogies' && (
          <motion.div key="analogies" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <TabuaAnalogias user={user} />
          </motion.div>
        )}
        {activeSubTab === 'path' && (
          <motion.div key="path" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <InitiationPath user={user} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DailyRituals({ user }: { user: UserProfile }) {
  const [rituals, setRituals] = useState<DailyRitual[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const q = query(
      collection(db, 'users', user.uid, 'dailyRituals'),
      where('date', '==', today)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyRitual));
      setRituals(data);
      setLoading(false);
      
      if (snapshot.empty) {
        seedTodayRituals();
      }
    });

    return () => unsubscribe();
  }, [user.uid]);

  const seedTodayRituals = async () => {
    const today = new Date().toISOString().split('T')[0];
    const initialRituals: Omit<DailyRitual, 'id' | 'userId'>[] = [
      { title: 'Vigília da Lâmpada de Hermes', description: 'Permaneça 15 minutos em imobilidade absoluta e vacuidade mental.', completed: false, date: today, type: 'silence' },
      { title: 'Reflexão Hermética', description: 'Medite sobre o Princípio do Mentalismo: "O Todo é Mente; o Universo é Mental".', completed: false, date: today, type: 'reflection' },
      { title: 'Ato Consciente', description: 'Realize uma tarefa mundana (como lavar louça ou caminhar) com presença total.', completed: false, date: today, type: 'action' }
    ];

    for (const r of initialRituals) {
      await addDoc(collection(db, 'users', user.uid, 'dailyRituals'), {
        ...r,
        userId: user.uid
      });
    }
  };

  const toggleRitual = async (ritual: DailyRitual) => {
    await updateDoc(doc(db, 'users', user.uid, 'dailyRituals', ritual.id), {
      completed: !ritual.completed
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-6">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-red-400" />
          Rituais de Hoje
        </h3>
        <div className="space-y-4">
          {rituals.map(ritual => (
            <button
              key={ritual.id}
              onClick={() => toggleRitual(ritual)}
              className={cn(
                "w-full flex items-start gap-4 p-5 rounded-2xl border transition-all text-left group",
                ritual.completed 
                  ? "bg-green-500/10 border-green-500/30 text-green-100" 
                  : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
              )}
            >
              <div className={cn(
                "mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                ritual.completed ? "bg-green-500 border-green-500" : "border-white/20 group-hover:border-red-400"
              )}>
                {ritual.completed && <CheckCircle2 className="w-4 h-4 text-white" />}
              </div>
              <div>
                <p className={cn("font-bold", ritual.completed && "line-through opacity-50")}>{ritual.title}</p>
                <p className="text-sm text-white/50 mt-1">{ritual.description}</p>
              </div>
            </button>
          ))}
          {loading && <p className="text-center text-white/30 py-10">Invocando rituais...</p>}
        </div>
      </div>

      <GlassCard className="p-8 flex flex-col items-center justify-center text-center space-y-6">
        <div className="w-20 h-20 bg-red-600/20 rounded-full flex items-center justify-center border border-red-500/30">
          <Flame className="w-10 h-10 text-red-400 animate-pulse" />
        </div>
        <div>
          <h4 className="text-lg font-bold">O Fogo Sagrado</h4>
          <p className="text-sm text-white/50 mt-2 max-w-xs">
            A perseverança é o combustível da transmutação. Complete seus rituais para manter o Athanor aquecido.
          </p>
        </div>
        <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
          <motion.div 
            className="bg-red-500 h-full"
            initial={{ width: 0 }}
            animate={{ width: `${(rituals.filter(r => r.completed).length / (rituals.length || 1)) * 100}%` }}
          />
        </div>
        <p className="text-xs text-white/30 uppercase tracking-widest">
          Progresso Diário: {rituals.filter(r => r.completed).length} / {rituals.length}
        </p>
      </GlassCard>
    </div>
  );
}

function ShadowJournal({ user, showConfirm }: { user: UserProfile, showConfirm: (title: string, message: string, onConfirm: () => void) => void }) {
  const [entries, setEntries] = useState<ShadowEntry[]>([]);
  const [newEntry, setNewEntry] = useState({ title: '', content: '', mood: 'Reflexivo' });
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'users', user.uid, 'shadowJournal'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShadowEntry)));
    });

    return () => unsubscribe();
  }, [user.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.content) return;

    await addDoc(collection(db, 'users', user.uid, 'shadowJournal'), {
      ...newEntry,
      userId: user.uid,
      createdAt: serverTimestamp()
    });

    setNewEntry({ title: '', content: '', mood: 'Reflexivo' });
    setIsAdding(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <PenTool className="w-5 h-5 text-red-400" />
            Diário de Sombras
          </h3>
          <p className="text-sm text-white/50">Encare seus abismos para encontrar suas estrelas.</p>
        </div>
        <GlassButton onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          <span className="hidden sm:inline ml-2">{isAdding ? 'Cancelar' : 'Nova Entrada'}</span>
        </GlassButton>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <GlassCard className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <input 
                  type="text"
                  placeholder="Título da reflexão (opcional)"
                  value={newEntry.title}
                  onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500/50 outline-none"
                />
                <textarea 
                  placeholder="O que sua sombra revelou hoje? Não oculte nada de si mesmo..."
                  value={newEntry.content}
                  onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500/50 outline-none min-h-[150px]"
                  required
                />
                <div className="flex flex-wrap gap-2">
                  {['Reflexivo', 'Melancólico', 'Iluminado', 'Confuso', 'Determinado'].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setNewEntry({ ...newEntry, mood: m })}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs transition-all",
                        newEntry.mood === m ? "bg-red-600 text-white" : "bg-white/5 text-white/40 hover:bg-white/10"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <GlassButton type="submit" className="w-full">Coagular Reflexão</GlassButton>
              </form>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {entries.map(entry => (
          <GlassCard key={entry.id} className="p-6 space-y-4 hover:border-red-500/30 transition-all group">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-red-300">{entry.title || 'Reflexão Sem Título'}</h4>
                <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">
                  {entry.createdAt?.toDate ? formatDistanceToNow(entry.createdAt.toDate(), { addSuffix: true, locale: ptBR }) : 'Agora mesmo'}
                </p>
              </div>
              <span className="px-2 py-1 bg-white/5 rounded-lg text-[10px] text-white/50">{entry.mood}</span>
            </div>
            <p className="text-sm text-white/70 italic leading-relaxed">"{entry.content}"</p>
            <div className="pt-4 border-t border-white/5 flex justify-end">
               <button 
                onClick={() => {
                  showConfirm(
                    "Dissolver Memória",
                    "Deseja dissolver esta memória permanentemente?",
                    async () => {
                      try {
                        await deleteDoc(doc(db, 'users', user.uid, 'shadowJournal', entry.id));
                      } catch (error) {
                        handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/shadowJournal/${entry.id}`);
                      }
                    }
                  );
                }}
                className="text-white/20 hover:text-red-400 transition-colors"
               >
                 <X className="w-4 h-4" />
               </button>
            </div>
          </GlassCard>
        ))}
        {entries.length === 0 && !isAdding && (
          <div className="col-span-full py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
              <History className="w-8 h-8 text-white/20" />
            </div>
            <p className="text-white/40">Seu diário está vazio. Comece a dissolver suas sombras.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AtanorDigital({ user }: { user: UserProfile }) {
  const [leadThought, setLeadThought] = useState('');
  const [transmutations, setTransmutations] = useState<Transmutation[]>([]);
  const [isTransmuting, setIsTransmuting] = useState(false);

  const [goldThought, setGoldThought] = useState('');
  const [selectedForTransmutation, setSelectedForTransmutation] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'atanor'), orderBy('createdAt', 'desc'), limit(10));
    return onSnapshot(q, (snapshot) => {
      setTransmutations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transmutation)));
    });
  }, [user.uid]);

  const handleCalcination = async () => {
    if (!leadThought.trim()) return;
    setIsTransmuting(true);
    
    await addDoc(collection(db, 'users', user.uid, 'atanor'), {
      userId: user.uid,
      leadThought,
      status: 'calcination',
      createdAt: serverTimestamp()
    });

    setLeadThought('');
    setTimeout(() => setIsTransmuting(false), 1500);
  };

  const handleTransmutation = async (id: string) => {
    if (!goldThought.trim()) return;
    
    await updateDoc(doc(db, 'users', user.uid, 'atanor', id), {
      status: 'transmuted',
      goldThought,
      transmutedAt: serverTimestamp()
    });

    setGoldThought('');
    setSelectedForTransmutation(null);
  };

  return (
    <div className="space-y-6">
      <header>
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          Atanor Digital
        </h3>
        <p className="text-sm text-white/50">Deposite seus pensamentos densos para a transmutação.</p>
      </header>

      <GlassCard className="p-6 space-y-4 border-orange-500/20">
        <textarea
          value={leadThought}
          onChange={(e) => setLeadThought(e.target.value)}
          placeholder="Qual 'chumbo' mental você deseja transmutar hoje?"
          className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-orange-500/50 min-h-[100px] resize-none"
        />
        <div className="flex justify-between items-center">
          <p className="text-[10px] text-white/30 uppercase tracking-widest">Fase: Calcinação</p>
          <GlassButton 
            onClick={handleCalcination} 
            disabled={isTransmuting || !leadThought.trim()}
            className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2"
          >
            {isTransmuting ? 'Calcinando...' : 'Iniciar Obra'}
          </GlassButton>
        </div>
      </GlassCard>

      <div className="space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-widest text-white/40">Laboratório de Transmutação</h4>
        {transmutations.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-4"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm text-white/70 italic">"{t.leadThought}"</p>
                {t.status === 'transmuted' && (
                  <p className="text-sm text-amber-400 font-medium mt-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    {t.goldThought}
                  </p>
                )}
              </div>
              <div className={cn(
                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter",
                t.status === 'transmuted' ? "bg-amber-500/20 text-amber-400" : "bg-orange-500/20 text-orange-400 animate-pulse"
              )}>
                {t.status === 'transmuted' ? 'Ouro' : 'Chumbo'}
              </div>
            </div>

            {t.status === 'calcination' && selectedForTransmutation !== t.id && (
              <button 
                onClick={() => setSelectedForTransmutation(t.id)}
                className="text-[10px] font-bold text-orange-400 uppercase tracking-widest hover:text-orange-300 transition-colors flex items-center gap-1"
              >
                <ArrowRight className="w-3 h-3" />
                Transmutar em Ouro
              </button>
            )}

            {selectedForTransmutation === t.id && (
              <div className="space-y-3 pt-3 border-t border-white/5">
                <input 
                  type="text"
                  value={goldThought}
                  onChange={(e) => setGoldThought(e.target.value)}
                  placeholder="Qual a virtude/ouro extraído?"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-amber-500/50"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setSelectedForTransmutation(null)} className="text-[10px] text-white/30 uppercase tracking-widest px-3 py-1">Cancelar</button>
                  <button 
                    onClick={() => handleTransmutation(t.id)}
                    disabled={!goldThought.trim()}
                    className="bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Fixar Ouro
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function TabuaAnalogias({ user }: { user: UserProfile }) {
  const [analogies, setAnalogies] = useState<Analogy[]>([]);
  const [newAnalogy, setNewAnalogy] = useState({ concept: '', lifeEvent: '' });

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'analogies'), orderBy('createdAt', 'desc'), limit(5));
    return onSnapshot(q, (snapshot) => {
      setAnalogies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Analogy)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/analogies`);
    });
  }, [user.uid]);

  const handleSubmit = async () => {
    if (!newAnalogy.concept || !newAnalogy.lifeEvent) return;
    await addDoc(collection(db, 'users', user.uid, 'analogies'), {
      userId: user.uid,
      concept: newAnalogy.concept,
      lifeEvent: newAnalogy.lifeEvent,
      createdAt: serverTimestamp(),
      bookTitle: 'Meditação Pessoal'
    });
    setNewAnalogy({ concept: '', lifeEvent: '' });
  };

  return (
    <div className="space-y-6">
      <header>
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Link2 className="w-5 h-5 text-emerald-400" />
          Tábua das Analogias
        </h3>
        <p className="text-sm text-white/50">Conecte o macrocosmo ao seu microcosmo.</p>
      </header>

      <GlassCard className="p-6 space-y-4 border-emerald-500/20">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Conceito Alquímico (ex: Enxofre)"
            value={newAnalogy.concept}
            onChange={(e) => setNewAnalogy(prev => ({ ...prev, concept: e.target.value }))}
            className="bg-black/40 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500/50"
          />
          <input
            type="text"
            placeholder="Evento de Vida"
            value={newAnalogy.lifeEvent}
            onChange={(e) => setNewAnalogy(prev => ({ ...prev, lifeEvent: e.target.value }))}
            className="bg-black/40 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500/50"
          />
        </div>
        <GlassButton onClick={handleSubmit} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white">
          Registrar Correspondência
        </GlassButton>
      </GlassCard>

      <div className="space-y-4">
        {analogies.map((a) => (
          <div key={a.id} className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">
              <span>{a.concept}</span>
              <ArrowRight className="w-3 h-3" />
              <span>Vida</span>
            </div>
            <p className="text-sm text-white/70">"{a.lifeEvent}"</p>
          </div>
        ))}
      </div>
    </div>
  );
}


function InitiationPath({ user }: { user: UserProfile }) {
  const [levels, setLevels] = useState<InitiationLevel[]>([]);
  const [communityProgress, setCommunityProgress] = useState<{ userName: string, userPhoto: string, level: number }[]>([]);

  const initiationSteps = [
    { 
      level: 1, 
      name: 'Neófito do Silêncio (Calcinação)', 
      requirement: '3 Rituais + 15min de Vigília + 1h de Selo do Taciturno', 
      description: 'O ego é reduzido a cinzas para que a essência respire. Pratique a Escuta Absoluta.' 
    },
    { 
      level: 2, 
      name: 'Buscador da Correspondência (Sublimação)', 
      requirement: '5 Livros + 3 Analogias na Tábua + 1 Consulta ao Oráculo', 
      description: 'Como acima, tal como abaixo. Extraia o Mercúrio Filosófico da tinta dos livros.' 
    },
    { 
      level: 3, 
      name: 'Praticante da Vibração (Solução)', 
      requirement: 'Responda 1 Neófito + 1h em Círculo de Ressonância', 
      description: 'O universo é mental. Sua palavra é o cinzel que molda a realidade.' 
    },
    { 
      level: 4, 
      name: 'Alquimista do Pensamento (Destilação)', 
      requirement: '1 Nigredo no Diário + 3 Transmutações no Atanor', 
      description: 'Separe o sutil do denso. Transmute vício em virtude no seu laboratório interno.' 
    },
    { 
      level: 5, 
      name: 'Mestre da Unidade (Coagulação)', 
      requirement: 'Submeta o Grande Arcano + 5 Pesos na Balança de Maat', 
      description: 'Onde o Ponto e o Círculo se tornam o Todo. A Pedra Filosofal é a própria consciência.' 
    }
  ];

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'initiationPath'), orderBy('level', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLevels(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InitiationLevel)));
    });

    const qComm = query(collection(db, 'users'), where('isAuthorized', '==', true), limit(10));
    const unsubscribeComm = onSnapshot(qComm, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        const roleToLevel = (role: string) => {
          if (role === 'admin') return 5;
          if (role === 'Mestre da Unidade (Coagulação)') return 5;
          if (role === 'Alquimista do Pensamento (Destilação)') return 4;
          if (role === 'Praticante da Vibração (Solução)') return 3;
          if (role === 'Buscador da Correspondência (Sublimação)') return 2;
          if (role === 'Neófito do Silêncio (Calcinação)') return 1;
          return 0;
        };
        return {
          userName: d.displayName,
          userPhoto: d.photoURL,
          level: roleToLevel(d.role || '')
        };
      });
      setCommunityProgress(data);
    });

    return () => {
      unsubscribe();
      unsubscribeComm();
    };
  }, [user.uid]);

  const currentLevel = user.role === 'admin' ? 5 : (levels.length > 0 ? Math.max(...levels.map(l => l.level)) : 0);

  const unlockLevel = async (step: typeof initiationSteps[0]) => {
    if (user.role === 'admin') return; 
    
    const levelRef = doc(db, 'users', user.uid, 'initiationPath', step.level.toString());
    await setDoc(levelRef, {
      userId: user.uid,
      level: step.level,
      name: step.name,
      unlockedAt: serverTimestamp(),
      reflections: ''
    });

    // Update user role to match the new level
    await updateDoc(doc(db, 'users', user.uid), {
      role: step.name
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Compass className="w-5 h-5 text-red-400" />
            O Véu de Ísis
          </h3>
          <p className="text-sm text-white/50">Sua jornada através dos mistérios graduais.</p>
        </div>

        <div className="relative space-y-12 before:absolute before:left-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/5">
          {initiationSteps.map((step) => {
            const isUnlocked = currentLevel >= step.level;
            const isNext = currentLevel + 1 === step.level;

            return (
              <div key={step.level} className="relative pl-16 group">
                <div className={cn(
                  "absolute left-0 top-0 w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all z-10",
                  isUnlocked ? "bg-red-600 border-red-400 text-white shadow-lg shadow-red-600/40" : 
                  isNext ? "bg-white/5 border-red-500/50 text-red-400 animate-pulse" : "bg-black border-white/10 text-white/20"
                )}>
                  {isUnlocked ? <CheckCircle2 className="w-6 h-6" /> : <span className="font-bold">{step.level}</span>}
                </div>
                
                <div className={cn(
                  "p-6 rounded-2xl border transition-all",
                  isUnlocked ? "bg-white/5 border-white/10" : 
                  isNext ? "bg-red-500/5 border-red-500/20" : "opacity-40 border-transparent"
                )}>
                  <div className="flex justify-between items-start">
                    <h4 className={cn("text-lg font-bold", isUnlocked ? "text-white" : "text-white/40")}>{step.name}</h4>
                    {!isUnlocked && <Lock className="w-4 h-4 text-white/20" />}
                  </div>
                  <p className="text-sm text-white/50 mt-2">{step.description}</p>
                  {isNext && (
                    <div className="mt-4 pt-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <p className="text-xs font-bold text-red-400 uppercase tracking-widest flex items-center gap-2">
                        <Star className="w-3 h-3" />
                        Requisito: {step.requirement}
                      </p>
                      <button 
                        onClick={() => unlockLevel(step)}
                        className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors shadow-lg shadow-red-600/20"
                      >
                        Ascender ao Grau {step.level}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Visão de Ísis - Only for Masters or Admins */}
        {(currentLevel >= 5 || user.role === 'admin') && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="p-8 rounded-3xl bg-gradient-to-br from-red-900/40 to-purple-900/40 border border-red-500/30 space-y-8"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-red-600/20 rounded-2xl flex items-center justify-center border border-red-500/30">
                <Eye className="w-10 h-10 text-red-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight">Visão de Ísis</h3>
                <p className="text-red-200/60">Estatísticas Ocultas e Decretos de Unidade.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-white/40">Buscadores Ativos</p>
                <p className="text-2xl font-bold text-red-400">{communityProgress.length * 42}</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-white/40">Transmutações Totais</p>
                <p className="text-2xl font-bold text-red-400">1.618</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-white/40">Frequência da Egrégora</p>
                <p className="text-2xl font-bold text-red-400">432 Hz</p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-widest text-white/40">Decretos de Unidade</h4>
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 italic text-red-200/80 text-sm">
                "Que a luz da consciência dissipe as brumas da ilusão. Somos todos um no Círculo Hermético."
              </div>
              <GlassButton className="w-full py-4 text-sm bg-red-600/20 border-red-500/30 text-red-300">
                Emitir Novo Decreto
              </GlassButton>
            </div>
          </motion.div>
        )}
      </div>

      <div className="space-y-8">
        <GlassCard className="p-6 space-y-6">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-red-400" />
            Egrégora Digital
          </h3>
          <p className="text-xs text-white/40 leading-relaxed">
            "O que está em cima é como o que está embaixo". Veja o reflexo da Unidade no progresso de seus iguais.
          </p>
          <div className="space-y-4">
            {communityProgress.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <img src={p.userPhoto} alt={p.userName} className="w-8 h-8 rounded-full border border-white/10" />
                  <span className="text-sm font-medium truncate max-w-[100px]">{p.userName}</span>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(l => (
                    <div 
                      key={l} 
                      className={cn(
                        "w-1.5 h-3 rounded-full",
                        l <= p.level ? "bg-red-500" : "bg-white/10"
                      )} 
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-6 bg-gradient-to-br from-red-600/20 to-purple-600/20 border-red-500/30">
          <h4 className="font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-red-400" />
            Gnose Diária
          </h4>
          <p className="text-sm text-white/70 mt-3 italic leading-relaxed">
            "A mente, assim como todos os metais e elementos, pode ser transmutada de estado em estado; de grau em grau; de condição em condição; de polo em polo; de vibração em vibração."
          </p>
          <p className="text-[10px] text-white/30 mt-4 uppercase tracking-widest">— O Caibalion</p>
        </GlassCard>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

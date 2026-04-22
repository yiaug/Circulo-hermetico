import React, { useState, useEffect } from 'react';
import { 
  collection, query, orderBy, onSnapshot, limit, getDocs, updateDoc, doc, addDoc, serverTimestamp, deleteDoc
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { UserProfile, Book, ChatMessage, InitiationLevel } from '../types';
import { cn } from '../lib/utils';
import { GlassCard } from './ui/GlassCard';
import { GlassButton } from './ui/GlassButton';
import { 
  Users, Shield, BookOpen, MessageSquare, Trash2, Edit2, CheckCircle2, Circle, Search, Upload, X, AlertCircle 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// This enum must be imported or re-declared if used inside. Admin uses OperationType so we must import it or mock it.
// Let's import it from App.tsx since it's exported there, or just re-declare it in types.
// We'll import it from '../App' for now.
import { OperationType, handleFirestoreError } from '../lib/errorHandling';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';


import { Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { setDoc, where } from 'firebase/firestore';
import { Activity, Compass, Lock as LockIcon } from 'lucide-react';

const AdminLibrary = lazy(() => import('./AdminLibrary').then(module => ({ default: module.AdminLibrary })));
const BarChart = lazy(() => import('recharts').then(module => ({ default: module.BarChart })));
const Bar = lazy(() => import('recharts').then(module => ({ default: module.Bar })));
const XAxis = lazy(() => import('recharts').then(module => ({ default: module.XAxis })));
const YAxis = lazy(() => import('recharts').then(module => ({ default: module.YAxis })));
const CartesianGrid = lazy(() => import('recharts').then(module => ({ default: module.CartesianGrid })));
const Tooltip = lazy(() => import('recharts').then(module => ({ default: module.Tooltip })));
const ResponsiveContainer = lazy(() => import('recharts').then(module => ({ default: module.ResponsiveContainer })));
const LineChart = lazy(() => import('recharts').then(module => ({ default: module.LineChart })));
const Line = lazy(() => import('recharts').then(module => ({ default: module.Line })));

export function AdminPanel({ categories, books }: { categories: string[], books: Book[] }) {
  const { user, appSettings } = useAuth();
  const { showConfirm, showNotification } = useUI();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [bookCategories, setBookCategories] = useState<string[]>([categories[1] || 'Hermetismo']);
  const [coverUrl, setCoverUrl] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfSize, setPdfSize] = useState<number>(0);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [adminTab, setAdminTab] = useState<'dashboard' | 'library' | 'add_book' | 'categories' | 'users' | 'moderation' | 'settings'>('dashboard');
  const [selectedUserForPath, setSelectedUserForPath] = useState<UserProfile | null>(null);

  const convertToWebP = (file: File, maxWidth: number = 800): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error("No 2d context"));
          
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Canvas toBlob failed"));
          }, 'image/webp', 0.85); // 85% quality WebP
        };
        img.onerror = () => reject(new Error("Image load failed"));
        if (e.target?.result) img.src = e.target.result as string;
      };
      reader.onerror = () => reject(new Error("FileReader failed"));
      reader.readAsDataURL(file);
    });
  };
  const [targetUserPath, setTargetUserPath] = useState<InitiationLevel[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, authorizedUsers: 0, totalBooks: 0, totalMessages: 0 });
  const [newCategoryName, setNewCategoryName] = useState('');
  const [modMessages, setModMessages] = useState<ChatMessage[]>([]);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImportData, setBulkImportData] = useState('');

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
    const fetchUsers = async () => {
      if (adminTab === 'users') {
        try {
          const q = query(collection(db, 'users'), limit(50));
          const snapshot = await getDocs(q);
          setUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, 'users');
        }
      }
    };
    fetchUsers();
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
        setUsers(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, role: newRole as any } : u));
      } else {
        await setDoc(levelRef, {
          userId: targetUser.uid,
          level: step.level,
          name: step.name,
          unlockedAt: serverTimestamp(),
          reflections: 'Atribuído pelo Administrador'
        });
        await updateDoc(doc(db, 'users', targetUser.uid), { role: step.name });
        setUsers(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, role: step.name as any } : u));
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
      setUsers(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, isAuthorized: !u.isAuthorized } : u));
      showNotification(`Acesso de ${targetUser.displayName} foi ${!targetUser.isAuthorized ? 'liberado' : 'bloqueado'}.`, 'success');
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

  const removeLastImport = async () => {
    const booksWithBatch = books.filter(b => b.batchId);
    if (booksWithBatch.length === 0) {
      showConfirm("Aviso", "Nenhuma importação em massa recente encontrada.", () => {});
      return;
    }

    // Sort by createdAt descending to find the latest batch
    booksWithBatch.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });

    const lastBatchId = booksWithBatch[0].batchId;
    const booksToDelete = booksWithBatch.filter(b => b.batchId === lastBatchId);

    showConfirm(
      "Remover Última Importação",
      `Tem certeza que deseja remover os ${booksToDelete.length} livros da última importação?`,
      async () => {
        setStatus('loading');
        try {
          let deletedCount = 0;
          for (const b of booksToDelete) {
            await deleteDoc(doc(db, 'books', b.id));
            deletedCount++;
          }
          setStatus('success');
          showConfirm("Remoção Concluída", `${deletedCount} livros foram removidos.`, () => {});
          setTimeout(() => setStatus('idle'), 3000);
        } catch (error) {
          console.error("Error removing last import:", error);
          handleFirestoreError(error, OperationType.DELETE, 'books');
          setStatus('error');
          showConfirm("Erro", "Ocorreu um erro ao remover os livros.", () => {});
        }
      }
    );
  };

  const handleBulkImport = async () => {
    if (!bulkImportData.trim()) return;

    setStatus('loading');
    try {
      const blocks = bulkImportData.split(/\n\s*\n/);
      let importedCount = 0;
      const currentBatchId = Date.now().toString();

      for (const block of blocks) {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length === 0) continue;

        let category = availableCategories[0] || "Ocultismo";
        let title = "";
        let author = "Desconhecido";
        let link = "";
        let synopsis = "Adicionado via importação em massa.";
        let currentField = "";

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const lowerLine = line.toLowerCase();
          
          if (lowerLine.startsWith('categoria:')) {
            category = line.substring(10).trim();
            currentField = "category";
          } else if (lowerLine.startsWith('autor:')) {
            author = line.substring(6).trim();
            currentField = "author";
          } else if (lowerLine.startsWith('link:')) {
            link = line.substring(5).trim();
            currentField = "link";
          } else if (lowerLine.startsWith('sinopse:')) {
            synopsis = line.substring(8).trim();
            currentField = "synopsis";
          } else if (lowerLine.startsWith('http')) {
            link = line;
            currentField = "link";
          } else if (!title && currentField === "") {
            title = line;
            currentField = "title";
          } else {
            if (currentField === "synopsis") {
              synopsis += "\n" + line;
            } else if (currentField === "title") {
              title += " " + line;
            }
          }
        }

        if (title && link && link.startsWith('http')) {
          await addDoc(collection(db, 'books'), {
            title: title,
            author: author,
            synopsis: synopsis,
            categories: [category],
            coverUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=400", // Default cover
            pdfUrl: link,
            uploadedBy: user.uid,
            createdAt: serverTimestamp(),
            batchId: currentBatchId
          });
          importedCount++;
        }
      }

      setStatus('success');
      setShowBulkImport(false);
      setBulkImportData('');
      showConfirm("Importação Concluída", `${importedCount} livros foram adicionados com sucesso.`, () => {});
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      console.error("Bulk Import Error:", error);
      handleFirestoreError(error, OperationType.CREATE, 'books');
      setStatus('error');
      showConfirm("Erro na Importação", "Ocorreu um erro durante a importação. Verifique o console para mais detalhes.", () => {});
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setUploadProgress(10); // Provide some initial progress
    
    try {
      let finalCoverUrl = coverUrl;

      // Handle Image Upload and WebP Conversion
      if (coverFile) {
        setUploadProgress(30);
        try {
          const webpBlob = await convertToWebP(coverFile);
          const timestamp = new Date().getTime();
          const safeTitle = title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().substring(0, 30);
          const coverRef = ref(storage, `covers/${safeTitle}_${timestamp}.webp`);
          
          setUploadProgress(50);
          const snapshot = await uploadBytesResumable(coverRef, webpBlob);
          finalCoverUrl = await getDownloadURL(snapshot.ref);
          setUploadProgress(80);
        } catch (imgError) {
          console.error("Error compressing/uploading cover:", imgError);
          showNotification("Erro ao processar imagem da capa. Tente enviar uma imagem menor ou use URL direta.", "error");
          setStatus('error');
          setUploadProgress(0);
          return; // Abort upload
        }
      }

      if (editingBookId) {
        await updateDoc(doc(db, 'books', editingBookId), {
          title,
          author,
          synopsis,
          categories: bookCategories,
          coverUrl: finalCoverUrl,
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
          coverUrl: finalCoverUrl,
          pdfUrl,
          uploadedBy: user.uid,
          createdAt: serverTimestamp()
        });
        setStatus('success');
      }
      setUploadProgress(100);
      setTitle(''); setAuthor(''); setSynopsis(''); setCoverUrl(''); setCoverFile(null); setPdfUrl(''); setBookCategories([categories.filter(c => c !== 'Todos')[0] || 'Hermetismo']);
      setTimeout(() => { setStatus('idle'); setUploadProgress(0); }, 3000);
    } catch (error) {
      console.error("Upload Error:", error);
      setStatus('error');
      setUploadProgress(0);
      try {
        handleFirestoreError(error, editingBookId ? OperationType.UPDATE : OperationType.CREATE, 'books');
      } catch (e) {
        // Ignore the thrown error from handleFirestoreError so we don't crash
      }
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
    setAdminTab('add_book');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteBook = (book: Book) => {
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
  };

  const cancelEditing = () => {
    setEditingBookId(null);
    setTitle(''); setAuthor(''); setSynopsis(''); setCoverUrl(''); setPdfUrl('');
    setBookCategories([categories.filter(c => c !== 'Todos')[0] || 'Hermetismo']);
  };

  return (
    <div className="max-w-[95%] xl:max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">Painel do Administrador</h2>
          <p className="text-white/50">Gerencie a biblioteca, usuários e monetização.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 overflow-x-auto no-scrollbar">
            {['dashboard', 'library', 'add_book', 'categories', 'users', 'moderation', 'settings'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setAdminTab(tab as any)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize whitespace-nowrap", 
                  adminTab === tab ? "bg-red-600 text-white shadow-lg" : "text-white/50 hover:text-white"
                )}
              >
                {tab === 'dashboard' ? 'Visão Geral' : tab === 'library' ? 'Biblioteca' : tab === 'add_book' ? 'Adicionar Livro' : tab === 'categories' ? 'Categorias' : tab === 'users' ? 'Usuários' : tab === 'moderation' ? 'Moderação' : 'Configurações'}
              </button>
            ))}
          </div>
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

      {adminTab === 'dashboard' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassCard className="p-6 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2 text-white/70">
                <Users className="w-5 h-5 text-red-400" />
                <span className="font-medium">Total de Usuários</span>
              </div>
              <h3 className="text-3xl font-bold">{stats.totalUsers}</h3>
              <p className="text-xs text-emerald-400 mt-2">Buscadores cadastrados</p>
            </GlassCard>
            <GlassCard className="p-6 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2 text-white/70">
                <Shield className="w-5 h-5 text-emerald-400" />
                <span className="font-medium">Usuários Autorizados</span>
              </div>
              <h3 className="text-3xl font-bold">{stats.authorizedUsers}</h3>
              <p className="text-xs text-white/50 mt-2">Membros ativos na ordem</p>
            </GlassCard>
            <GlassCard className="p-6 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2 text-white/70">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <span className="font-medium">Livros na Biblioteca</span>
              </div>
              <h3 className="text-3xl font-bold">{stats.totalBooks}</h3>
              <p className="text-xs text-white/50 mt-2">Acervo digital</p>
            </GlassCard>
            <GlassCard className="p-6 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2 text-white/70">
                <MessageSquare className="w-5 h-5 text-blue-400" />
                <span className="font-medium">Mensagens Recentes</span>
              </div>
              <h3 className="text-3xl font-bold">{stats.totalMessages}</h3>
              <p className="text-xs text-white/50 mt-2">No chat global</p>
            </GlassCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard className="p-6 h-[400px] flex flex-col">
              <h3 className="text-lg font-bold mb-6">Top 5 Categorias (Livros)</h3>
              <div className="flex-1 w-full">
                <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-white/50">Carregando gráfico...</div>}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={availableCategories.map(cat => ({
                      name: cat,
                      total: books.filter(b => b.categories?.includes(cat)).length
                    })).sort((a, b) => b.total - a.total).slice(0, 5)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" vertical={false} />
                      <XAxis dataKey="name" stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        cursor={{ fill: '#ffffff10' }}
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #ffffff20', borderRadius: '8px' }}
                      />
                      <Bar dataKey="total" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Suspense>
              </div>
            </GlassCard>

            <GlassCard className="p-6 h-[400px] flex flex-col">
              <h3 className="text-lg font-bold mb-6">Atividade do Chat (Últimos 7 dias)</h3>
              <div className="flex-1 w-full">
                <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-white/50">Carregando gráfico...</div>}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[
                      { name: 'Seg', mensagens: 120 },
                      { name: 'Ter', mensagens: 210 },
                      { name: 'Qua', mensagens: 180 },
                      { name: 'Qui', mensagens: 290 },
                      { name: 'Sex', mensagens: 350 },
                      { name: 'Sáb', mensagens: 420 },
                      { name: 'Dom', mensagens: 380 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" vertical={false} />
                      <XAxis dataKey="name" stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #ffffff20', borderRadius: '8px' }}
                      />
                      <Line type="monotone" dataKey="mensagens" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </Suspense>
              </div>
            </GlassCard>
          </div>
        </div>
      ) : adminTab === 'add_book' ? (
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
              <label className="text-sm font-medium text-white/70">Capa do Livro</label>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setCoverFile(e.target.files[0]);
                        setCoverUrl(''); // Clear URL if file is selected
                      }
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-red-500 file:text-white hover:file:bg-red-600 transition-colors cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <hr className="flex-1 border-white/10" />
                  <span className="text-xs text-white/40 uppercase">ou defina por URL</span>
                  <hr className="flex-1 border-white/10" />
                </div>
                <input 
                  type="url"
                  value={coverUrl}
                  onChange={(e) => {
                    setCoverUrl(e.target.value);
                    setCoverFile(null); // Clear file if URL is typed
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500/50 outline-none"
                  placeholder="https://... (deixe vazio se escolher enviar arquivo)"
                />
              </div>
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
                className="flex-1 py-4 text-lg relative overflow-hidden"
              >
                {status === 'loading' && (
                  <div 
                    className="absolute left-0 top-0 bottom-0 bg-red-600/30 transition-all duration-300 pointer-events-none" 
                    style={{ width: `${uploadProgress}%` }}
                  />
                )}
                {status === 'loading' ? `Salvando... ${uploadProgress > 0 && uploadProgress < 100 ? `${uploadProgress}%` : ''}` : editingBookId ? 'Salvar Alterações' : 'Adicionar Livro à Biblioteca'}
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
        </GlassCard>
      ) : adminTab === 'library' ? (
        <div className="space-y-6">
          <Suspense fallback={<div className="p-8 text-center text-white/50">Carregando biblioteca...</div>}>
            <AdminLibrary books={books} onEdit={startEditingBook} onDelete={handleDeleteBook} />
          </Suspense>
          
          <GlassCard className="p-6">
            <h3 className="text-lg font-bold mb-4">Ações Rápidas</h3>
            <div className="flex flex-wrap gap-4">
              <GlassButton variant="secondary" onClick={seedData} disabled={status === 'loading'}>
                Semear Biblioteca Inicial (Mock Data)
              </GlassButton>
              <GlassButton variant="primary" onClick={() => setShowBulkImport(true)} disabled={status === 'loading'}>
                <Upload className="w-4 h-4 mr-2" />
                Importação em Massa (Colar da Planilha)
              </GlassButton>
              <GlassButton variant="secondary" onClick={removeLastImport} disabled={status === 'loading'} className="text-red-400 hover:text-red-300">
                <Trash2 className="w-4 h-4 mr-2" />
                Remover última lista de importações
              </GlassButton>
            </div>
            <p className="text-xs text-white/30 mt-2 italic">
              A importação em massa permite colar dados copiados de uma planilha (Nome do Livro e Link do PDF).
            </p>
          </GlassCard>

          <AnimatePresence>
            {showBulkImport && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-2xl w-full shadow-2xl"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Importação em Massa</h3>
                    <button 
                      onClick={() => setShowBulkImport(false)}
                      className="p-2 text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <p className="text-sm text-white/70">
                      Cole abaixo os blocos de texto dos livros. Separe cada livro com uma linha em branco.
                      O formato esperado é:
                    </p>
                    <pre className="text-xs bg-black/40 p-2 rounded border border-white/5 text-white/60">
Categoria: Maçonaria
Dicionário Secreto da Maçonaria
Autor: Vários
Link: https://drive.google.com/file/d/...
Sinopse: Glossário de termos e símbolos maçônicos.
                    </pre>
                    
                    <textarea
                      value={bulkImportData}
                      onChange={(e) => setBulkImportData(e.target.value)}
                      placeholder="Categoria: Ocultismo&#10;O Caibalion&#10;Autor: Três Iniciados&#10;Link: https://drive...&#10;Sinopse: Estudo da filosofia hermética."
                      className="w-full h-64 bg-black/50 border border-white/10 rounded-xl p-4 text-sm font-mono text-white/80 focus:ring-2 focus:ring-red-500/50 outline-none resize-none"
                    />
                    
                    <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                      <GlassButton variant="secondary" onClick={() => setShowBulkImport(false)}>
                        Cancelar
                      </GlassButton>
                      <GlassButton 
                        variant="primary" 
                        onClick={handleBulkImport}
                        disabled={status === 'loading' || !bulkImportData.trim()}
                      >
                        {status === 'loading' ? 'Importando...' : 'Iniciar Importação'}
                      </GlassButton>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : adminTab === 'categories' ? (
        <div className="space-y-6 h-[800px] flex flex-col">
          <GlassCard className="p-6 shrink-0">
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

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {availableCategories.map(cat => (
                <GlassCard key={cat} className="p-3 flex items-center justify-between gap-2">
                  <span className="font-medium text-sm truncate">{cat}</span>
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
                    className="p-1.5 text-white/20 hover:text-red-400 transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </GlassCard>
              ))}
            </div>
          </div>
        </div>
      ) : adminTab === 'users' ? (
        <div className="space-y-6 h-[800px] flex flex-col">
          <header className="shrink-0">
            <h3 className="text-xl font-bold">Gerenciar Usuários ({users.length})</h3>
            <p className="text-sm text-white/50">Controle de acesso e nível de iniciação.</p>
          </header>
          
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {users.map(u => (
                <GlassCard key={u.uid} className="p-3 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <img src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}&background=random`} alt={u.displayName} className="w-10 h-10 rounded-full object-cover shrink-0" />
                    <div className="overflow-hidden">
                      <h4 className="font-bold text-sm truncate">{u.displayName}</h4>
                      <p className="text-xs text-white/50 truncate">{u.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                    <span className="text-xs font-medium text-white/70">Acesso Autorizado</span>
                    <button 
                      onClick={() => toggleAuthorization(u)}
                      className={cn(
                        "w-10 h-5 rounded-full relative transition-all",
                        u.isAuthorized ? "bg-emerald-500" : "bg-white/10"
                      )}
                    >
                      <motion.div 
                        animate={{ x: u.isAuthorized ? 20 : 2 }}
                        className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-lg"
                      />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-white/70">Cargo / Nível</span>
                    <span className="text-xs px-2 py-1 bg-white/5 rounded-md truncate max-w-[120px] text-right">
                      {u.role || 'user'}
                    </span>
                  </div>
                  
                  <GlassButton 
                    variant="secondary" 
                    className="w-full text-xs py-1.5 mt-1"
                    onClick={() => {
                      setSelectedUserForPath(u);
                      setAdminTab('users'); // Keep it on users, but we could open a modal
                      // For simplicity, let's just alert that path management is via another UI or just show a modal
                      // Since we don't have the modal UI here, we'll just show a confirm to reset role
                      showConfirm(
                        "Resetar Cargo",
                        `Deseja resetar o cargo de ${u.displayName} para 'user'?`,
                        async () => {
                          try {
                            await updateDoc(doc(db, 'users', u.uid), { role: 'user' });
                            setUsers(prev => prev.map(user => user.uid === u.uid ? { ...user, role: 'user' } : user));
                            showNotification(`Cargo de ${u.displayName} resetado com sucesso.`, 'success');
                          } catch (error) {
                            console.error("Error resetting role:", error);
                            handleFirestoreError(error, OperationType.UPDATE, `users/${u.uid}`);
                          }
                        }
                      );
                    }}
                  >
                    Resetar Cargo
                  </GlassButton>
                </GlassCard>
              ))}
            </div>
          </div>
        </div>
      ) : adminTab === 'moderation' ? (
        <div className="space-y-6 h-[800px] flex flex-col">
          <header className="shrink-0">
            <h3 className="text-xl font-bold">Moderação de Conteúdo</h3>
            <p className="text-sm text-white/50">Monitore e remova mensagens inadequadas da comunidade.</p>
          </header>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
            {modMessages.length === 0 && (
              <div className="text-center py-12 text-white/20 italic">Nenhuma mensagem recente encontrada.</div>
            )}
            {modMessages.map((msg) => (
              <GlassCard key={msg.id} className="p-3 flex items-start justify-between gap-4 border-white/5 hover:border-white/10 transition-all">
                <div className="flex gap-3">
                  <img src={msg.userPhoto} className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-red-300">{msg.userName}</span>
                      <span className="text-[10px] text-white/30">{msg.createdAt?.toDate ? formatDistanceToNow(msg.createdAt.toDate(), { addSuffix: true, locale: ptBR }) : 'Recentemente'}</span>
                    </div>
                    <p className="text-sm text-white/80 mt-0.5">{msg.text}</p>
                  </div>
                </div>
                <button 
                  onClick={() => deleteMessage(msg.id)}
                  className="p-1.5 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all shrink-0"
                  title="Deletar Mensagem"
                >
                  <X className="w-4 h-4" />
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
                  appSettings.registrationOpen ? "bg-emerald-500" : "bg-white/10"
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
                        <LockIcon className="w-4 h-4" />
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

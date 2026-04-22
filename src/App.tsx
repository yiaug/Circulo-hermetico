import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Book as BookIcon, AlertCircle, Users, Library, Shield, Heart, Compass, Mic, Hexagon, FlaskConical } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { AppRoutes } from './components/AppRoutes';
import { useLibrary } from './hooks/useLibrary';
import { useAuth, AuthProvider } from './contexts/AuthContext';
import { useUI, UIProvider } from './contexts/UIContext';
import { cn } from './lib/utils';
import { OperationType, handleFirestoreError } from './lib/errorHandling';

// Lazy loaded modals
const BuyAccess = lazy(() => import('./components/BuyAccess').then(module => ({ default: module.BuyAccess })));
const OnboardingModal = lazy(() => import('./components/OnboardingModal').then(module => ({ default: module.OnboardingModal })));

export function AppContent() {
  const { user, loading, isLoggingIn } = useAuth();
  
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = (location.pathname === '/' || location.pathname.startsWith('/book')) ? 'library' : location.pathname.split('/')[1] || 'library';

  const { books, categories, hasMoreBooks, fetchingMoreBooks, fetchBooks, getRecommendations } = useLibrary(user);
  const recommendations = getRecommendations();

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (loading || isLoggingIn) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Suspense fallback={null}><BuyAccess /></Suspense>;
  }

  return (
    <div className="flex h-screen bg-[#0a0a0c] text-white overflow-hidden font-sans selection:bg-red-500/30">
      {/* Sidebar - Desktop Only */}
      <nav className="hidden md:flex flex-col w-64 bg-black/40 backdrop-blur-xl border-r border-white/10 p-6 z-10 shrink-0">
        <div className="flex items-center gap-3 mb-10 text-red-500 hover:text-red-400 transition-colors cursor-pointer group" onClick={() => navigate('/')}>
          <div className="relative">
             <BookIcon className="w-8 h-8 group-hover:scale-110 transition-transform duration-300" />
          </div>
          <span className="text-2xl font-bold tracking-tighter uppercase">R.C.</span>
        </div>

        <div className="space-y-2 flex-1">
          <NavButton active={activeTab === 'library'} onClick={() => navigate('/')} icon={<Library className="w-5 h-5" />} label="Biblioteca" />
          <NavButton active={activeTab === 'casa-alquimista'} onClick={() => navigate('/casa-alquimista')} icon={<Hexagon className="w-5 h-5" />} label="A Casa do Alquimista" />
          <NavButton active={activeTab === 'community'} onClick={() => navigate('/community')} icon={<Users className="w-5 h-5" />} label="Comunidade" />
          <NavButton active={activeTab === 'oracle'} onClick={() => navigate('/oracle')} icon={<Compass className="w-5 h-5" />} label="Oráculo" />
          <NavButton active={activeTab === 'voice'} onClick={() => navigate('/voice')} icon={<Mic className="w-5 h-5" />} label="Salas de Áudio" />
          <NavButton active={activeTab === 'laboratorio'} onClick={() => navigate('/laboratorio')} icon={<FlaskConical className="w-5 h-5" />} label="Laboratório" />
          {user?.role === 'admin' && (
            <NavButton active={activeTab === 'admin'} onClick={() => navigate('/admin')} icon={<Shield className="w-5 h-5" />} label="Painel Admin" />
          )}
        </div>
      </nav>

      <main className="flex-1 relative overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
        <Suspense fallback={<div className="flex-1 flex items-center justify-center p-8"><div className="w-16 h-16 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin"></div></div>}>
          <AppRoutes 
            books={books} 
            categories={categories} 
            fetchBooks={fetchBooks}
            hasMoreBooks={hasMoreBooks}
            fetchingMoreBooks={fetchingMoreBooks}
            recommendations={recommendations}
          />
        </Suspense>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-white/10 pb-safe z-50">
        <div className="flex justify-around p-4">
          <MobileNavButton active={activeTab === 'library'} onClick={() => navigate('/')} icon={<Library className="w-6 h-6" />} />
          <MobileNavButton active={activeTab === 'casa-alquimista'} onClick={() => navigate('/casa-alquimista')} icon={<Hexagon className="w-6 h-6" />} />
          <MobileNavButton active={activeTab === 'community'} onClick={() => navigate('/community')} icon={<Users className="w-6 h-6" />} />
          <MobileNavButton active={activeTab === 'oracle'} onClick={() => navigate('/oracle')} icon={<Compass className="w-6 h-6" />} />
          <MobileNavButton active={activeTab === 'voice'} onClick={() => navigate('/voice')} icon={<Mic className="w-6 h-6" />} />
          <MobileNavButton active={activeTab === 'laboratorio'} onClick={() => navigate('/laboratorio')} icon={<FlaskConical className="w-6 h-6" />} />
        </div>
      </nav>

      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-20 md:bottom-6 right-6 bg-red-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 z-50 backdrop-blur-md"
          >
            <AlertCircle className="w-5 h-5" />
            <div>
              <p className="font-bold text-sm">Sem Conexão</p>
              <p className="text-xs text-white/80">Trabalhando offline. Alterações serão salvas.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {user && user.isAuthorized && user.hasSeenOnboarding === false && (
          <Suspense fallback={null}><OnboardingModal /></Suspense>
        )}
      </AnimatePresence>
    </div>
  );
}

function MobileNavButton({ active, onClick, icon }: any) {
  return (
    <button onClick={onClick} className={cn("flex flex-col items-center gap-1 transition-all", active ? "text-red-400" : "text-white/40")}>
      <div className={cn("p-2 rounded-xl transition-all", active ? "bg-red-600/20" : "")}>{icon}</div>
    </button>
  );
}

function NavButton({ active, onClick, icon, label }: any) {
  return (
    <button onClick={onClick} className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative overflow-hidden group", active ? "bg-white/10 text-white font-bold shadow-lg" : "text-white/60 hover:bg-white/5 hover:text-white")} >
      {icon}
      <span className="font-medium hidden md:block">{label}</span>
      {active && <motion.div layoutId="nav-active" className="absolute left-0 w-1 h-6 bg-red-500 rounded-r-full hidden md:block" />}
    </button>
  );
}

export default function App() {
  return (
    <UIProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </UIProvider>
  );
}

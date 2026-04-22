const fs = require('fs');

let appContent = fs.readFileSync('src/App.tsx', 'utf8');

// Find the index of line 245
const lines = appContent.split('\\n');

// Basically replace from `return () => {` (which is at line 245) or effectively from `if (!user) {\n    return <BuyAccess />;\n  }`
const replaceStartStr = "  if (!user) {\\n    return <BuyAccess />;\\n  }";

const replaceEndStr = "      {/* Onboarding Modal */}\\n      <AnimatePresence>\\n        {user && user.isAuthorized && user.hasSeenOnboarding === false && (\\n          <OnboardingModal />\\n        )}\\n      </AnimatePresence>\\n    </div>\\n  );\\n}";

const startIndex = appContent.indexOf("  if (!user) {");
const endIndex = appContent.indexOf("</AnimatePresence>\\n    </div>\\n  );\\n}") + "</AnimatePresence>\\n    </div>\\n  );\\n}".length;

const goodChunk = `  if (!user) {
    return <BuyAccess />;
  }

  return (
    <div className="flex h-screen bg-[#0a0a0c] text-white overflow-hidden font-sans selection:bg-red-500/30">
      {/* Sidebar - Desktop Only */}
      <nav className="hidden md:flex flex-col w-64 bg-black/40 backdrop-blur-xl border-r border-white/10 p-6 z-10 shrink-0">
        <div className="flex items-center gap-3 mb-10 text-red-500 hover:text-red-400 transition-colors cursor-pointer group" onClick={() => navigate('/')}>
          <div className="relative">
             <BookIcon className="w-8 h-8 group-hover:scale-110 transition-transform duration-300" />
             <Flame className="w-4 h-4 absolute -bottom-1 -right-1 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <span className="text-2xl font-bold tracking-tighter uppercase">R.C.</span>
        </div>

        <div className="space-y-2 flex-1">
          <NavButton 
            active={activeTab === 'library'} 
            onClick={() => navigate('/')} 
            icon={<Library className="w-5 h-5" />} 
            label="Biblioteca" 
          />
          <NavButton 
            active={activeTab === 'casa-alquimista'} 
            onClick={() => navigate('/casa-alquimista')} 
            icon={<Hexagon className="w-5 h-5" />} 
            label="A Casa do Alquimista" 
          />
          <NavButton 
            active={activeTab === 'community'} 
            onClick={() => navigate('/community')} 
            icon={<Users className="w-5 h-5" />} 
            label="Comunidade" 
          />
          <NavButton 
            active={activeTab === 'oracle'} 
            onClick={() => navigate('/oracle')} 
            icon={<Compass className="w-5 h-5" />} 
            label="Oráculo" 
          />
          <NavButton 
            active={activeTab === 'voice'} 
            onClick={() => navigate('/voice')} 
            icon={<Mic className="w-5 h-5" />} 
            label="Salas de Áudio" 
          />
          <NavButton 
            active={activeTab === 'laboratorio'} 
            onClick={() => navigate('/laboratorio')} 
            icon={<FlaskConical className="w-5 h-5" />} 
            label="Laboratório" 
          />
          {user?.role === 'admin' && (
            <NavButton 
              active={activeTab === 'admin'} 
              onClick={() => navigate('/admin')} 
              icon={<Shield className="w-5 h-5" />} 
              label="Painel Admin" 
            />
          )}
        </div>

        <div className="mt-auto space-y-4 pt-6 border-t border-white/10">
          <button
            onClick={() => window.open('https://buy.stripe.com/abc', '_blank')}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-600 to-red-400 hover:from-red-500 hover:to-red-300 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 hover:shadow-red-500/40 transition-all group"
          >
            <Heart className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="text-sm">Apoiar Obra</span>
          </button>
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
          <MobileNavButton 
            active={activeTab === 'library'} 
            onClick={() => navigate('/')} 
            icon={<Library className="w-6 h-6" />}
          />
          <MobileNavButton 
            active={activeTab === 'casa-alquimista'} 
            onClick={() => navigate('/casa-alquimista')} 
            icon={<Hexagon className="w-6 h-6" />}
          />
          <MobileNavButton 
            active={activeTab === 'community'} 
            onClick={() => navigate('/community')} 
            icon={<MessageSquare className="w-6 h-6" />}
          />
          <MobileNavButton 
            active={activeTab === 'oracle'} 
            onClick={() => navigate('/oracle')} 
            icon={<Compass className="w-6 h-6" />}
          />
          <MobileNavButton 
            active={activeTab === 'voice'} 
            onClick={() => navigate('/voice')} 
            icon={<Mic className="w-6 h-6" />}
          />
          <MobileNavButton 
            active={activeTab === 'laboratorio'} 
            onClick={() => navigate('/laboratorio')} 
            icon={<FlaskConical className="w-6 h-6" />}
          />
        </div>
      </nav>

      {/* Connection Indicator */}
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
          <OnboardingModal />
        )}
      </AnimatePresence>
    </div>
  );
}`;

appContent = appContent.substring(0, startIndex) + goodChunk + appContent.substring(endIndex);

fs.writeFileSync('src/App.tsx', appContent);

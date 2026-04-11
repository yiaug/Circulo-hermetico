const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

// Add imports
code = `import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
` + code;

const mainBlockRegex = /<main className="flex-1 relative overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">([\s\S]*?)<\/main>/;
const mainBlockMatch = code.match(mainBlockRegex);

if (!mainBlockMatch) {
    console.error("Main block not found");
    process.exit(1);
}

let mainBlock = mainBlockMatch[1];

let newRender = `
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
           <ProtectedRoute>
             <MainLayout 
               notification={notification} 
               isDonationModalOpen={isDonationModalOpen} 
               setIsDonationModalOpen={setIsDonationModalOpen} 
             />
           </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/biblioteca" replace />} />
          
          <Route path="biblioteca" element={
            <div className="p-4 md:p-8 space-y-6 md:space-y-8 pb-24 md:pb-8">
              <AnimatePresence mode="wait">
                {selectedBook ? (
                  <BookDetails 
                    book={selectedBook} 
                    user={user}
                    onBack={() => setSelectedBook(null)} 
                  />
                ) : (
                  <motion.div 
                    key="library"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6 md:space-y-8"
                  >
                    {/* Re-inject header and everything else from Library UI */}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          } />
          
          <Route path="casa-alquimista" element={<CasaAlquimista />} />
          <Route path="comunidade" element={<CommunityChat user={user} showNotification={showNotification} showConfirm={showConfirm} />} />
          <Route path="oraculo" element={<InsightOracle user={user} />} />
          <Route path="voz" element={<VoiceRooms user={user} showNotification={showNotification} />} />
          <Route path="laboratorio" element={<Laboratorio user={user} showConfirm={showConfirm} />} />
          <Route path="admin" element={<AdminPanel user={user} appSettings={appSettings} categories={categories} books={books} showConfirm={showConfirm} showNotification={showNotification} />} />

        </Route>
      </Routes>

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

      {/* Donation Modal */}
      <AnimatePresence>
        {isDonationModalOpen && (
          <DonationModal 
            onClose={() => setIsDonationModalOpen(false)}
            showNotification={showNotification}
          />
        )}
      </AnimatePresence>

      {/* Onboarding Modal */}
      <AnimatePresence>
        {user && user.isAuthorized && user.hasSeenOnboarding === false && (
          <OnboardingModal 
            user={user}
            onClose={() => {
              // Optimistically update local state to hide it immediately
              setUser({ ...user, hasSeenOnboarding: true });
            }}
          />
        )}
      </AnimatePresence>
    </BrowserRouter>
  );
`;

const beforeRenderRegex = /return \(\n    <div className="min-h-screen bg-\[#0a0a0c\] text-white flex flex-col md:flex-row overflow-hidden">[\s\S]*?<\/AnimatePresence>\n    <\/div>\n  \);/;
code = code.replace(beforeRenderRegex, newRender);

const libJSXRegex = /<header className="flex flex-col md:flex-row md:items-center justify-between gap-4">([\s\S]*?)<\/motion\.div>/;
const libJSXMatch = mainBlockMatch[1].match(libJSXRegex);

if(libJSXMatch) {
  const pureLib = `<header className="flex flex-col md:flex-row md:items-center justify-between gap-4">` + libJSXMatch[1];
  code = code.replace(`{/* Re-inject header and everything else from Library UI */}`, pureLib);
}

const loginBlockRegex = /if \(!user\) \{[\s\S]*?\}\n\n  if \(appSettings.maintenance && user(?:.*)\) \{[\s\S]*?\}\n\n  if \(!user.isAuthorized && user(?:.*)\) \{[\s\S]*?\}/;
code = code.replace(loginBlockRegex, '');

fs.writeFileSync('src/App.tsx', code);
console.log("Refactored App.tsx successfully");

const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// We are going to replace everything inside AppContent down to the return statement.
// Notice that AppContent still holds useAuth, useUI, etc. that's okay, we can pass them or just use AppRoutes.

// First, insert AppRoutes and useLibrary at the top:
if(!code.includes('import { AppRoutes }')) {
  code = code.replace("import { CasaAlquimista }", "import { AppRoutes } from './components/AppRoutes';\nimport { useLibrary } from './hooks/useLibrary';\nimport { CasaAlquimista }");
}

let appContentRegex = /export function AppContent\(\) \{[\s\S]*?return \(/;

const newAppContentStart = `export function AppContent() {
  const { user, loading, isLoggingIn } = useAuth();
  const { showNotification } = useUI();
  
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const location = useLocation();
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
    return <BuyAccess />;
  }

  return (`;

code = code.replace(appContentRegex, newAppContentStart);

// Now, inside the `return (`, we need to find the `<main>` tag and replace its contents with `<AppRoutes ... />`.
const mainContentRegex = /<main className="flex-1 relative overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">[\s\S]*?<\/main>/;

const newMainContent = `<main className="flex-1 relative overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
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
</main>`;

code = code.replace(mainContentRegex, newMainContent);

fs.writeFileSync('src/App.tsx', code);

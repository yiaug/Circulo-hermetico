const fs = require('fs');
let appContent = fs.readFileSync('src/App.tsx', 'utf8');

appContent = appContent.replace(
  /const \[activeTab, setActiveTab\] = useState<\s*'library'\s*\|\s*'community'\s*\|\s*'admin'\s*\|\s*'voice'\s*\|\s*'laboratorio'\s*\|\s*'oracle'\s*\|\s*'casa-alquimista'\s*>\('library'\);/,
  `const navigate = useNavigate();\n  const location = useLocation();\n  const activeTab = location.pathname === '/' ? 'library' : location.pathname.split('/')[1] || 'library';\n  const setActiveTab = (tab: string) => {\n    if (tab === 'library') navigate('/');\n    else navigate(\`/\${tab}\`);\n  };`
);

// We should also handle the <AnimatePresence mode="wait"> block to use <Routes>
// Actually, it's easier to manually create a LibraryView component from the library code
// But keeping it mostly intact and just using <Routes> is even easier.

// Let's replace the conditional block with Routes
// But since the current code is deeply nested, let's keep the conditional block inside App for now, and it works perfectly well because activeTab is synced with the URL.
// That is the "poor man's router" but supported by react-router-dom URL structure!
// Wait, `selectedBook` is still a local state! We can leave it as a state or move it to a param. Let's do a sub-component for the library.

fs.writeFileSync('src/App.tsx', appContent);

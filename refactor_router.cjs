const fs = require('fs');

let appContent = fs.readFileSync('src/App.tsx', 'utf8');

// Add react-router-dom imports
const routerImports = "import { Routes, Route, useNavigate, useLocation, Outlet, useParams } from 'react-router-dom';\n";
appContent = appContent.replace("import { motion, AnimatePresence } from 'motion/react';", routerImports + "import { motion, AnimatePresence } from 'motion/react';");

fs.writeFileSync('src/App.tsx', appContent);

const fs = require('fs');

const content = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

const additionalImports = `
import { Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { setDoc, where } from 'firebase/firestore';
import { Activity, Compass, Lock } from 'lucide-react';

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
`;

const updatedContent = content.replace("export function AdminPanel", additionalImports + "\nexport function AdminPanel");

fs.writeFileSync('src/components/AdminPanel.tsx', updatedContent);

const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Remove duplicate global settings sync
content = content.replace(/\/\/ Global Settings Sync[\s\S]*?\}, \[\]\);/, '');

// 2. Fix the setUser at line 474 (now around 450)
content = content.replace("setUser({ ...user, isAuthorized: true })", "window.location.reload()");

// 3. Fix setConfirmModal references in the confirm modal
content = content.replace("setConfirmModal(prev => prev ? { ...prev, isOpen: false } : null)", "closeConfirm()");
content = content.replace("setConfirmModal(prev => prev ? { ...prev, isOpen: false } : null);", "closeConfirm();");

// 4. Fix setUser for OnboardingModal
content = content.replace("setUser({ ...user, hasSeenOnboarding: true });", "updatePreferences({ hasSeenOnboarding: true } as any);");

fs.writeFileSync('src/App.tsx', content);

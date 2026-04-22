const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Find start and end of Auth Sync
const startAuthSync = content.indexOf('// Auth & User Profile Sync');
const startGetRecs = content.indexOf('const getRecommendations = () => {');

if (startAuthSync !== -1 && startGetRecs !== -1) {
  content = content.substring(0, startAuthSync) + content.substring(startGetRecs);
}

// Remove updatePreferences completely as it's provided by AuthContext now
const startUpdatePrefs = content.indexOf("const updatePreferences = async (newPrefs: Partial<UserProfile['preferences']>) => {");
const startGetRecs2 = content.indexOf('const getRecommendations = () => {');
if(startUpdatePrefs !== -1 && startUpdatePrefs < startGetRecs2) {
    content = content.substring(0, startUpdatePrefs) + content.substring(startGetRecs2);
}


fs.writeFileSync('src/App.tsx', content);

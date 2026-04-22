const fs = require('fs');

function removeProp(file, propRegex) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(propRegex, '');
    fs.writeFileSync(file, content);
}

// In App.tsx
removeProp('src/App.tsx', /\s+user=\{user\}/g);
removeProp('src/App.tsx', /\s+showNotification=\{showNotification\}/g);
removeProp('src/App.tsx', /\s+showConfirm=\{showConfirm\}/g);

// In components/Laboratorio.tsx
removeProp('src/components/Laboratorio.tsx', /\s+user=\{user\}/g);
removeProp('src/components/Laboratorio.tsx', /\s+showConfirm=\{showConfirm\}/g);

// In components/VoiceRooms.tsx
removeProp('src/components/VoiceRooms.tsx', /\s+showNotification=\{showNotification\}/g);

// In components/BuyAccess.tsx
removeProp('src/components/BuyAccess.tsx', /\s+showNotification=\{showNotification\}/g);

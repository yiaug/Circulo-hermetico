const fs = require('fs');

let appContent = fs.readFileSync('src/App.tsx', 'utf8');

// The class ErrorBoundary spans from line 205 to 247. Let's delete it with regex.
// We can use a regex to match from "class ErrorBoundary" down to "return this.props.children; } }"
const errorBoundaryRegex = /class ErrorBoundary extends React\.Component[\s\S]*?return this\.props\.children;\s*\}\s*\}/;

appContent = appContent.replace(errorBoundaryRegex, '');

fs.writeFileSync('src/App.tsx', appContent);

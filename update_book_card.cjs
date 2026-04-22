const fs = require('fs');

let bookCardContent = fs.readFileSync('src/components/books/BookCard.tsx', 'utf8');

// Replace onClick inside BookCard with navigate to book route
if (!bookCardContent.includes('import { useNavigate } from')) {
    bookCardContent = "import { useNavigate } from 'react-router-dom';\n" + bookCardContent;
}

bookCardContent = bookCardContent.replace(
    /export function BookCard\(\{ book, onClick \}: \{ book: Book, onClick: \(\) => void \}\) \{/g,
    `export function BookCard({ book, onClick }: { book: Book, onClick?: () => void }) {\n  const navigate = useNavigate();`
);

// We need to find the main card div or trigger onClick
// Right now, the BookCard returns a GlassCard. 
bookCardContent = bookCardContent.replace(
    /onClick=\{onClick\}/g,
    `onClick={() => { if (onClick) onClick(); else navigate(\`/book/\${book.id}\`); }}`
);

fs.writeFileSync('src/components/books/BookCard.tsx', bookCardContent);

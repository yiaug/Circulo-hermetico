const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Sync selectedBook with URL
content = content.replace(
  "const activeTab = location.pathname === '/' ? 'library' : location.pathname.split('/')[1] || 'library';",
  "const activeTab = (location.pathname === '/' || location.pathname.startsWith('/book')) ? 'library' : location.pathname.split('/')[1] || 'library';"
);

content = content.replace(
  /const \[selectedBook, setSelectedBook\] = useState<Book \| null>\(null\);/,
  `const [selectedBook, _setSelectedBook] = useState<Book | null>(null);
  
  // Sync URL with selected book
  const setSelectedBook = (book: Book | null) => {
    _setSelectedBook(book);
    if (book) {
      navigate(\`/book/\${book.id}\`);
    } else {
      navigate('/');
    }
  };

  useEffect(() => {
    if (location.pathname.startsWith('/book/')) {
      const bookId = location.pathname.split('/')[2];
      if (!selectedBook || selectedBook.id !== bookId) {
        // Find in loaded books or load it?
        // Since we don't have a direct fetch for single book here, it might be tricky.
        // Actually, we can fetch the book here if it's missing!
        const b = books.find(b => b.id === bookId);
        if (b) _setSelectedBook(b);
        else if (bookId && user) {
           getDocFromServer(doc(db, 'books', bookId)).then(snap => {
             if (snap.exists()) _setSelectedBook({ id: snap.id, ...snap.data() } as Book);
             else navigate('/'); // book not found
           });
        }
      }
    } else if (selectedBook) {
      _setSelectedBook(null);
    }
  }, [location.pathname, books, user]);`
);

fs.writeFileSync('src/App.tsx', content);

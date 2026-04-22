const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// I'll swap the declarations!
code = code.replace(
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
  }, [location.pathname, books, user]);`,
  `const [selectedBook, _setSelectedBook] = useState<Book | null>(null);`
);

let insertAfter = "const [books, setBooks] = useState<Book[]>([]);\n";
let hookCode = `
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
        const b = books.find(b => b.id === bookId);
        if (b) _setSelectedBook(b);
        else if (bookId && user) {
           getDocFromServer(doc(db, 'books', bookId)).then(snap => {
             if (snap.exists()) _setSelectedBook({ id: snap.id, ...snap.data() } as Book);
             else navigate('/');
           });
        }
      }
    } else if (selectedBook) {
      _setSelectedBook(null);
    }
  }, [location.pathname, books, user]);
`;
code = code.replace(insertAfter, insertAfter + hookCode);

fs.writeFileSync('src/App.tsx', code);

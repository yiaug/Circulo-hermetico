import { Route, Routes, Navigate } from 'react-router-dom';
import { CasaAlquimista } from './CasaAlquimista';
import { CommunityChat } from './CommunityChat';
import { PDFReader } from './PDFReader';
import { BookDetails } from './books/BookDetails';
import { InsightOracle } from './InsightOracle';
import { VoiceRooms } from './VoiceRooms';
import { Laboratorio } from './Laboratorio';
import { LibraryView } from '../pages/LibraryView';
import { AdminPanel } from './AdminPanel';

export function AppRoutes({ books, categories, fetchBooks, hasMoreBooks, fetchingMoreBooks, recommendations }: any) {
  return (
    <Routes>
      <Route path="/" element={
        <LibraryView 
          books={books} 
          categories={categories} 
          fetchBooks={fetchBooks}
          hasMoreBooks={hasMoreBooks}
          fetchingMoreBooks={fetchingMoreBooks}
          recommendations={recommendations}
        />
      } />
      <Route path="/book/:id" element={<BookWrapper books={books} />} />
      <Route path="/casa-alquimista" element={<CasaAlquimista />} />
      <Route path="/community" element={<CommunityChat />} />
      <Route path="/oracle" element={<InsightOracle />} />
      <Route path="/voice" element={<VoiceRooms />} />
      <Route path="/laboratorio/*" element={<Laboratorio />} />
      <Route path="/admin" element={<AdminPanel categories={categories} books={books} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Helper wrapper to match router ID with loaded book
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDocFromServer } from 'firebase/firestore';
import { db } from '../firebase';
import { useEffect, useState } from 'react';
import { Book } from '../types';

function BookWrapper({ books }: { books: Book[] }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);

  useEffect(() => {
    if (!id) return;
    const found = books.find(b => b.id === id);
    if (found) {
      setBook(found);
    } else {
      getDocFromServer(doc(db, 'books', id)).then(snap => {
        if (snap.exists()) setBook({ id: snap.id, ...snap.data() } as Book);
        else navigate('/');
      });
    }
  }, [id, books, navigate]);

  if (!book) return <div className="flex justify-center p-8"><div className="w-8 h-8 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin" /></div>;

  return <BookDetails book={book} onBack={() => navigate('/')} />;
}

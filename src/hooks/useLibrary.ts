import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, startAfter, getDocs, onSnapshot, addDoc, getDocFromServer, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Book } from '../types';
import { handleFirestoreError, OperationType } from '../lib/errorHandling';

export function useLibrary(user: any) {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<string[]>(['Todos', 'Hermetismo', 'Magia', 'Alquimia', 'Astrologia', 'Teosofia', 'Ocultismo']);
  const [lastVisibleBook, setLastVisibleBook] = useState<any>(null);
  const [hasMoreBooks, setHasMoreBooks] = useState(true);
  const [fetchingMoreBooks, setFetchingMoreBooks] = useState(false);
  const bookLimit = 20;

  // Categories Sync
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check Firebase configuration. Offline.");
        }
      }
    }
    testConnection();

    const unsubscribe = onSnapshot(collection(db, 'categories'), async (snapshot) => {
      if (snapshot.empty) {
        const defaultCats = ['Hermetismo', 'Magia', 'Alquimia', 'Astrologia', 'Teosofia', 'Ocultismo'];
        try {
          for (const cat of defaultCats) {
            await addDoc(collection(db, 'categories'), { name: cat });
          }
        } catch (e) {
          console.error('Failed to seed categories', e);
        }
      } else {
        const fetchedCats = snapshot.docs.map(doc => doc.data().name);
        setCategories(Array.from(new Set(['Todos', ...fetchedCats])));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'categories');
    });
    return () => unsubscribe();
  }, []);

  const fetchBooks = async (loadMore = false) => {
    if (fetchingMoreBooks || (!hasMoreBooks && loadMore)) return;
    
    setFetchingMoreBooks(true);
    try {
      let q = query(
        collection(db, 'books'),
        orderBy('createdAt', 'desc'),
        limit(bookLimit)
      );

      if (loadMore && lastVisibleBook) {
        q = query(q, startAfter(lastVisibleBook));
      }

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setHasMoreBooks(false);
      } else {
        const booksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Book[];
        setLastVisibleBook(snapshot.docs[snapshot.docs.length - 1]);
        setBooks(prev => loadMore ? [...prev, ...booksData] : booksData);
        setHasMoreBooks(snapshot.docs.length === bookLimit);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'books');
    } finally {
      setFetchingMoreBooks(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchBooks();
    }
  }, [user]);

  const getRecommendations = () => {
    if (!user || books.length === 0) return [];
    return [...books].sort(() => Math.random() - 0.5).slice(0, 4);
  };

  return {
    books,
    categories,
    hasMoreBooks,
    fetchingMoreBooks,
    fetchBooks,
    getRecommendations
  };
}

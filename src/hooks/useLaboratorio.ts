import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, deleteDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { DailyRitual, ShadowEntry, Transmutation, Analogy } from '../types';
import { handleFirestoreError, OperationType } from '../lib/errorHandling';

// Hook for Daily Rituals
export function useDailyRituals(user: any) {
  const [rituals, setRituals] = useState<DailyRitual[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    
    const today = new Date().toISOString().split('T')[0];
    const q = query(
      collection(db, 'users', user.uid, 'dailyRituals'),
      where('date', '==', today)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyRitual));
      setRituals(data);
      setLoading(false);
      
      if (snapshot.empty) {
        seedTodayRituals(user.uid, today);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/dailyRituals`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const seedTodayRituals = async (uid: string, today: string) => {
    const initialRituals: Omit<DailyRitual, 'id' | 'userId'>[] = [
      { title: 'Vigília da Lâmpada de Hermes', description: 'Permaneça 15 minutos em imobilidade absoluta e vacuidade mental.', completed: false, date: today, type: 'silence' },
      { title: 'Reflexão Hermética', description: 'Medite sobre o Princípio do Mentalismo: "O Todo é Mente; o Universo é Mental".', completed: false, date: today, type: 'reflection' },
      { title: 'Ato Consciente', description: 'Realize uma tarefa mundana (como lavar louça ou caminhar) com presença total.', completed: false, date: today, type: 'action' }
    ];

    for (const r of initialRituals) {
      try {
        await addDoc(collection(db, 'users', uid, 'dailyRituals'), {
          ...r,
          userId: uid
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `users/${uid}/dailyRituals`);
      }
    }
  };

  const toggleRitual = async (ritual: DailyRitual) => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'dailyRituals', ritual.id), {
        completed: !ritual.completed
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/dailyRituals/${ritual.id}`);
    }
  };

  return { rituals, loading, toggleRitual };
}


// Hook for Shadow Journal
export function useShadowJournal(user: any) {
  const [entries, setEntries] = useState<ShadowEntry[]>([]);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'users', user.uid, 'shadowJournal'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShadowEntry)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/shadowJournal`);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const addEntry = async (entry: { title: string, content: string, mood: string }) => {
    if (!user?.uid || !entry.content) return false;

    try {
      await addDoc(collection(db, 'users', user.uid, 'shadowJournal'), {
        ...entry,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/shadowJournal`);
      return false;
    }
  };

  const deleteEntry = async (entryId: string) => {
    if (!user?.uid) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'shadowJournal', entryId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/shadowJournal/${entryId}`);
    }
  };

  return { entries, addEntry, deleteEntry };
}


// Hook for Atanor Digital
export function useAtanor(user: any) {
  const [transmutations, setTransmutations] = useState<Transmutation[]>([]);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'users', user.uid, 'atanor'), orderBy('createdAt', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTransmutations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transmutation)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/atanor`);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  const initiateCalcination = async (leadThought: string) => {
    if (!user?.uid || !leadThought.trim()) return false;
    try {
      await addDoc(collection(db, 'users', user.uid, 'atanor'), {
        userId: user.uid,
        leadThought,
        status: 'calcination',
        createdAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/atanor`);
      return false;
    }
  };

  const transmuteToGold = async (id: string, goldThought: string) => {
    if (!user?.uid || !goldThought.trim()) return false;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'atanor', id), {
        status: 'transmuted',
        goldThought,
        transmutedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/atanor/${id}`);
      return false;
    }
  };

  return { transmutations, initiateCalcination, transmuteToGold };
}


// Hook for Tabua de Analogias
export function useAnalogies(user: any) {
  const [analogies, setAnalogies] = useState<Analogy[]>([]);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'users', user.uid, 'analogies'), orderBy('createdAt', 'desc'), limit(5));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAnalogies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Analogy)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/analogies`);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  const addAnalogy = async (concept: string, lifeEvent: string) => {
    if (!user?.uid || !concept || !lifeEvent) return false;
    try {
      await addDoc(collection(db, 'users', user.uid, 'analogies'), {
        userId: user.uid,
        concept,
        lifeEvent,
        createdAt: serverTimestamp(),
        bookTitle: 'Meditação Pessoal'
      });
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/analogies`);
      return false;
    }
  };

  return { analogies, addAnalogy };
}

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { UserProfile } from '../types';
import { useUI } from './UIContext';
import { handleFirestoreError, OperationType } from '../lib/errorHandling';

interface AuthContextData {
  user: UserProfile | null;
  loading: boolean;
  appSettings: any;
  isLoggingIn: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  updatePreferences: (newPrefs: Partial<UserProfile['preferences']>) => Promise<void>;
}

export const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [appSettings, setAppSettings] = useState({ maintenance: false, registrationOpen: true });
  const { showNotification } = useUI();

  useEffect(() => {
    // Listen to settings
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setAppSettings(docSnap.data() as any);
      }
    });

    const urlParams = new URLSearchParams(window.location.search);
    const paymentSuccess = window.location.pathname === '/payment-success' || urlParams.has('userId');
    
    let userUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (userUnsubscribe) {
        userUnsubscribe();
        userUnsubscribe = null;
      }

      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        // Handle payment success redirect
        if (paymentSuccess && firebaseUser.uid === urlParams.get('userId')) {
          try {
            await updateDoc(userRef, { isAuthorized: true });
            window.history.replaceState({}, document.title, "/");
          } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, `users/${firebaseUser.uid}`);
          }
        }

        let userDoc;
        try {
          userDoc = await getDoc(userRef);
        } catch (error) {
          setLoading(false);
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          return;
        }

        if (!userDoc.exists()) {
          const newUser: UserProfile = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || 'Buscador Anônimo',
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || '',
            role: 'user',
            isAuthorized: false,
            createdAt: new Date()
          };
          try {
            await setDoc(userRef, { ...newUser, createdAt: serverTimestamp() });
          } catch (error) {
            setLoading(false);
            handleFirestoreError(error, OperationType.CREATE, `users/${firebaseUser.uid}`);
            return;
          }
        }

        userUnsubscribe = onSnapshot(userRef, (snapshot) => {
          if (snapshot.exists()) {
            const userData = snapshot.data() as UserProfile;
            
            // Auto-promote admin
            if (userData.email?.toLowerCase() === 'smiley62830@gmail.com' && userData.role !== 'admin') {
              updateDoc(userRef, { role: 'admin', isAuthorized: true }).catch(err => {
                handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
              });
            }
            
            setUser(userData);
          }
          setLoading(false);
        }, (error) => {
          setLoading(false);
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubSettings();
      authUnsubscribe();
      if (userUnsubscribe) userUnsubscribe();
    };
  }, [showNotification]);

  const login = useCallback(async () => {
    setIsLoggingIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Error signing in with Google", error);
      if (error.code !== 'auth/popup-closed-by-user') {
        showNotification("Erro ao fazer login com o Google.", "error");
      }
    } finally {
      setIsLoggingIn(false);
    }
  }, [showNotification]);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  }, []);

  const updatePreferences = useCallback(async (newPrefs: Partial<UserProfile['preferences']>) => {
    if (!user) return;
    const updatedUser = {
      ...user,
      preferences: {
        ...user.preferences!,
        ...newPrefs
      }
    };
    setUser(updatedUser);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        preferences: updatedUser.preferences
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, appSettings, isLoggingIn, login, logout, updatePreferences }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

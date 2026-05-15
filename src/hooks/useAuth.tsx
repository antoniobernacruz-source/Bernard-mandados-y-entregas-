import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User as FirebaseUser 
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { AppUser, UserRole } from '../types';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signIn: (role?: UserRole) => Promise<void>;
  updateRole: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUser(userDoc.data() as AppUser);
        } else {
          // If user exists in Auth but not in Firestore, they might be new
          // We'll handle creation in the signIn method or here if needed
          // For now, let's keep it null until they pick a role
          console.log('User signed in but no profile found');
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (defaultRole: UserRole = 'client') => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const firebaseUser = result.user;

    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      const newUser: AppUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || 'Usuario',
        photoURL: firebaseUser.photoURL || '',
        role: defaultRole,
        status: 'active',
        createdAt: serverTimestamp(),
      };
      await setDoc(userDocRef, newUser);
      setUser(newUser);
    } else {
      setUser(userDoc.data() as AppUser);
    }
  };

  const updateRole = async (role: UserRole) => {
    if (!auth.currentUser) return;
    const userDocRef = doc(db, 'users', auth.currentUser.uid);
    await setDoc(userDocRef, { role }, { merge: true });
    setUser(prev => prev ? { ...prev, role } : null);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, updateRole, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

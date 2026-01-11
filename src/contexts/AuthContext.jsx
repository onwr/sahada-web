import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChange, logoutUser } from '../services/authService';
import { getUserData } from '../services/firestoreService';

export const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    // Development modunda uyarı ver ama production'da hata fırlat
    if (process.env.NODE_ENV === 'development') {
      console.warn('useAuth hook AuthProvider içinde kullanılmalıdır. Context bulunamadı.');
    }
    throw new Error('useAuth hook AuthProvider içinde kullanılmalıdır');
  }
  return context;
};

import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    let unsubscribeFirestore = null;

    const unsubscribeAuth = onAuthStateChange((firebaseUser) => {
      if (firebaseUser) {
        // Kullanıcı giriş yapmış
        setUser(firebaseUser);
        setIsAuthenticated(true);
        setIsLoading(true); // Veri gelene kadar loading
        
        // Real-time listener başlat
        if (unsubscribeFirestore) {
           unsubscribeFirestore();
        }
        
        const userRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeFirestore = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData(data);
            setNeedsOnboarding(!data.onboardingCompleted);
          } else {
             // Veri yoksa (yeni kayıt vb gecikme durumunda)
             // Varsayılan veri ile devam et veya bekle
             console.warn('Kullanıcı dökümanı bulunamadı, varsayılan oluşturuluyor...');
             setUserData({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                userType: 'player', 
                onboardingCompleted: false
             });
             setNeedsOnboarding(true);
          }
          setIsLoading(false);
        }, (error) => {
          console.error('Kullanıcı verisi dinleme hatası:', error);
          setIsLoading(false);
        });

      } else {
        // Kullanıcı çıkış yapmış
        if (unsubscribeFirestore) {
            unsubscribeFirestore();
            unsubscribeFirestore = null;
        }
        setUser(null);
        setUserData(null);
        setIsAuthenticated(false);
        setNeedsOnboarding(false);
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  const logout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const value = {
    user,
    userData,
    isAuthenticated,
    isLoading,
    needsOnboarding,
    setUserData,
    setNeedsOnboarding,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

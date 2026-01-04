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

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      setIsLoading(true);
      
      if (firebaseUser) {
        // Kullanıcı giriş yapmış
        setUser(firebaseUser);
        setIsAuthenticated(true);
        
        // Firestore'dan kullanıcı verilerini al
        let userDataResult = await getUserData(firebaseUser.uid);
        
        // Eğer veri bulunamadıysa, kayıt işlemi yeni tamamlanmış olabilir
        // Birkaç kez tekrar dene (Firestore yazma işlemi gecikebilir)
        if (!userDataResult.success && userDataResult.error === 'Kullanıcı bulunamadı') {
          for (let i = 0; i < 3; i++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            userDataResult = await getUserData(firebaseUser.uid);
            if (userDataResult.success) {
              break;
            }
          }
        }
        
        if (userDataResult.success) {
          setUserData(userDataResult.data);
          // Onboarding durumunu kontrol et
          setNeedsOnboarding(!userDataResult.data.onboardingCompleted);
        } else {
          console.error('Kullanıcı verileri alınamadı:', userDataResult.error);
          // Kullanıcı verileri alınamadıysa varsayılan veriler oluştur
          setUserData({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            userType: 'player', // Varsayılan olarak player
            onboardingCompleted: false
          });
          setNeedsOnboarding(true);
        }
      } else {
        // Kullanıcı çıkış yapmış
        setUser(null);
        setUserData(null);
        setIsAuthenticated(false);
        setNeedsOnboarding(false);
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
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

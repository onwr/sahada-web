import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const PublicRoute = ({ children }) => {
  // Context'i direkt kullan ve null kontrolü yap
  const authContext = useContext(AuthContext);
  
  // Eğer context yoksa (hot reload sırasında olabilir), children'ı render et
  if (!authContext) {
    return children;
  }
  
  const { isAuthenticated, userData, isLoading } = authContext;

  // Yükleme durumunda loading göster
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Kullanıcı giriş yapmışsa dashboard'a yönlendir
  if (isAuthenticated && userData) {
    if (userData.userType === 'player') {
      return <Navigate to="/oyuncu/dashboard" replace />;
    } else if (userData.userType === 'owner') {
      return <Navigate to="/saha-sahibi/dashboard" replace />;
    }
  }

  return children;
};

export default PublicRoute;

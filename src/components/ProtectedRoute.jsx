import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredUserType = null }) => {
  const location = useLocation();
  
  // Context'i direkt kullan ve null kontrolü yap
  const authContext = useContext(AuthContext);
  
  // Eğer context yoksa (hot reload sırasında olabilir), loading göster
  if (!authContext) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }
  
  const { isAuthenticated, userData, isLoading, needsOnboarding } = authContext;

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

  // Kullanıcı giriş yapmamışsa login sayfasına yönlendir
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Belirli kullanıcı tipi gerekiyorsa kontrol et
  if (requiredUserType && userData?.userType !== requiredUserType) {
    // Yanlış kullanıcı tipi, doğru sayfaya yönlendir
    if (userData?.userType === 'player') {
      return <Navigate to="/oyuncu/dashboard" replace />;
    } else if (userData?.userType === 'owner') {
      return <Navigate to="/saha-sahibi/dashboard" replace />;
    } else if (userData?.userType === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
  }

  // Onboarding tamamlanmamışsa onboarding sayfasına yönlendir
  // Ama eğer zaten onboarding sayfasındaysa yönlendirme yapma
  if (needsOnboarding && !location.pathname.includes('/onboarding')) {
    if (userData?.userType === 'player') {
      return <Navigate to="/oyuncu/onboarding" replace />;
    } else if (userData?.userType === 'owner') {
      return <Navigate to="/saha-sahibi/onboarding" replace />;
    }
  }

  // Onboarding tamamlandıysa ve onboarding sayfasındaysa dashboard'a yönlendir
  if (!needsOnboarding && location.pathname.includes('/onboarding')) {
    if (userData?.userType === 'player') {
      return <Navigate to="/oyuncu/dashboard" replace />;
    } else if (userData?.userType === 'owner') {
      return <Navigate to="/saha-sahibi/dashboard" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;

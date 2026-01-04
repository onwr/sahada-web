import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';

const LogoutButton = ({ className = "" }) => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { userData } = useAuth();

  const handleLogout = async () => {
    setIsLoading(true);
    
    try {
      const result = await logoutUser();
      
      if (result.success) {
        navigate('/');
      } else {
        console.error('Çıkış hatası:', result.error);
      }
    } catch (error) {
      console.error('Çıkış hatası:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className={`flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors ${className}`}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      )}
      <span>{isLoading ? 'Çıkış yapılıyor...' : 'Çıkış Yap'}</span>
    </button>
  );
};

export default LogoutButton;

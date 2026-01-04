// Admin kullanıcı oluşturma yardımcı fonksiyonu
// Bu dosya sadece geliştirme amaçlı kullanılmalıdır
// Production'da kaldırılmalı veya güvenli hale getirilmelidir

import { updateUserType } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';

/**
 * Mevcut kullanıcıyı admin yapmak için
 * Browser console'da çalıştırın:
 * 
 * import { updateUserType } from './services/firestoreService';
 * import { getAuth } from 'firebase/auth';
 * const auth = getAuth();
 * updateUserType(auth.currentUser.uid, 'admin').then(() => {
 *   console.log('Kullanıcı admin yapıldı!');
 *   window.location.reload();
 * });
 */

export const makeCurrentUserAdmin = async () => {
  try {
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    
    if (!auth.currentUser) {
      console.error('Kullanıcı giriş yapmamış');
      return { success: false, error: 'Kullanıcı giriş yapmamış' };
    }

    const result = await updateUserType(auth.currentUser.uid, 'admin');
    
    if (result.success) {
      console.log('✅ Kullanıcı admin yapıldı! Sayfa yenileniyor...');
      setTimeout(() => {
        window.location.href = '/admin/dashboard';
      }, 1000);
    }
    
    return result;
  } catch (error) {
    console.error('Admin yapma hatası:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Browser console'da kullanım için global fonksiyon
if (typeof window !== 'undefined') {
  window.makeMeAdmin = async () => {
    const result = await makeCurrentUserAdmin();
    if (result.success) {
      alert('Kullanıcı admin yapıldı! Sayfa yenileniyor...');
    } else {
      alert('Hata: ' + result.error);
    }
  };
}


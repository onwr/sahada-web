import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { updateUserType } from '../../services/firestoreService';
import { AlertCircle, CheckCircle, Shield } from 'lucide-react';

const AdminSetup = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleMakeAdmin = async () => {
    if (!user) {
      setError('Lütfen önce giriş yapın');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await updateUserType(user.uid, 'admin');
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = '/admin/dashboard';
        }, 2000);
      } else {
        setError(result.error || 'Admin yapma işlemi başarısız');
      }
    } catch (err) {
      console.error('Admin yapma hatası:', err);
      setError('Bir hata oluştu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Giriş Gerekli</h2>
          <p className="text-gray-600 text-center mb-6">
            Admin olmak için önce giriş yapmalısınız
          </p>
          <a
            href="/login"
            className="block w-full text-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Giriş Yap
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <Shield className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Ol</h2>
          <p className="text-gray-600">
            Mevcut kullanıcıyı admin yapmak için butona tıklayın
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            Kullanıcı admin yapıldı! Yönlendiriliyorsunuz...
          </div>
        )}

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-600 mb-2">
            <strong>Kullanıcı:</strong> {user.email}
          </p>
          <p className="text-sm text-gray-600">
            <strong>UID:</strong> {user.uid}
          </p>
        </div>

        <button
          onClick={handleMakeAdmin}
          disabled={loading || success}
          className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>İşleniyor...</span>
            </>
          ) : success ? (
            <>
              <CheckCircle className="w-5 h-5" />
              <span>Başarılı!</span>
            </>
          ) : (
            <>
              <Shield className="w-5 h-5" />
              <span>Admin Yap</span>
            </>
          )}
        </button>

        <p className="text-xs text-gray-500 text-center mt-4">
          ⚠️ Bu sayfa sadece geliştirme amaçlıdır. Production'da kaldırılmalıdır.
        </p>
      </div>
    </div>
  );
};

export default AdminSetup;


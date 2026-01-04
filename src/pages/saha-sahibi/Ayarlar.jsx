import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import SahaSahibiSidebar from '../../components/SahaSahibiSidebar';
import { 
  updateUserData,
  updateUserSettings,
  updateUserPassword,
  getTesisler
} from '../../services/firestoreService';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { 
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  Bell,
  Shield,
  Key,
  Save,
  Eye,
  EyeOff,
  Check,
  X,
  AlertCircle,
  Camera,
  Globe,
  CreditCard,
  Smartphone,
  Calendar,
  Clock
} from 'lucide-react';

const Ayarlar = () => {
  const { user, userData, setUserData } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    email: '',
    phone: '',
    businessName: '',
    city: '',
    address: '',
    website: '',
    description: ''
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    reservationReminders: true,
    paymentReminders: true,
    marketingEmails: false,
    weeklyReports: true
  });

  // Business settings
  const [businessSettings, setBusinessSettings] = useState({
    timezone: 'Europe/Istanbul',
    workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    workingHours: '08:00 - 22:00',
    advanceBookingDays: 30,
    cancellationPolicy: '24 hours'
  });

  // Security settings
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    loginAlerts: true,
    sessionTimeout: 30
  });

  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const isSavingRef = useRef(false); // Kaydetme sırasında listener'ın formu güncellememesi için
  const lastSavedDataRef = useRef(null); // Son kaydedilen veriyi takip et

  // Load user data and setup real-time listener
  useEffect(() => {
    if (!user) return;
    
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Eğer kaydetme işlemi devam ediyorsa, listener'ı görmezden gel
        if (isSavingRef.current) {
          return;
        }
        
        // Eğer bu veriler zaten kaydedildiyse, görmezden gel
        const dataString = JSON.stringify({
          displayName: data.displayName,
          email: data.email,
          phone: data.phone,
          businessName: data.businessName,
          city: data.city,
          address: data.address,
          website: data.website,
          description: data.description
        });
        
        if (lastSavedDataRef.current === dataString) {
          return;
        }
        
        setProfileForm({
          displayName: data.displayName || '',
          email: data.email || '',
          phone: data.phone || '',
          businessName: data.businessName || '',
          city: data.city || '',
          address: data.address || '',
          website: data.website || '',
          description: data.description || ''
        });

        setNotificationSettings({
          emailNotifications: data.emailNotifications ?? true,
          smsNotifications: data.smsNotifications ?? false,
          pushNotifications: data.pushNotifications ?? true,
          reservationReminders: data.reservationReminders ?? true,
          paymentReminders: data.paymentReminders ?? true,
          marketingEmails: data.marketingEmails ?? false,
          weeklyReports: data.weeklyReports ?? true
        });

        setBusinessSettings({
          timezone: data.timezone || 'Europe/Istanbul',
          workingDays: data.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
          workingHours: data.workingHours || '08:00 - 22:00',
          advanceBookingDays: data.advanceBookingDays || 30,
          cancellationPolicy: data.cancellationPolicy || '24 hours'
        });

        setSecuritySettings({
          twoFactorAuth: data.twoFactorAuth ?? false,
          loginAlerts: data.loginAlerts ?? true,
          sessionTimeout: data.sessionTimeout || 30
        });
      }
    }, (error) => {
      console.error('Ayarlar listener hatası:', error);
    });

    return () => unsubscribe();
  }, [user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    isSavingRef.current = true; // Listener'ı devre dışı bırak

    try {
      const result = await updateUserData(user.uid, profileForm);
      if (result.success) {
        // Son kaydedilen veriyi sakla
        lastSavedDataRef.current = JSON.stringify({
          displayName: profileForm.displayName,
          email: profileForm.email,
          phone: profileForm.phone,
          businessName: profileForm.businessName,
          city: profileForm.city,
          address: profileForm.address,
          website: profileForm.website,
          description: profileForm.description
        });
        
        setUserData({ ...userData, ...profileForm });
        setSuccess('Profil bilgileri başarıyla güncellendi');
      } else {
        setError(result.error || 'Profil güncellenirken hata oluştu');
      }
    } catch (err) {
      setError('Profil güncellenirken hata oluştu');
    } finally {
      setLoading(false);
      // Kısa bir gecikme ile listener'ı tekrar aktif et (Firestore güncellemesinin tamamlanması için)
      setTimeout(() => {
        isSavingRef.current = false;
      }, 1000);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('Yeni şifreler eşleşmiyor');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError('Yeni şifre en az 6 karakter olmalıdır');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await updateUserPassword(passwordForm.currentPassword, passwordForm.newPassword);
      if (result.success) {
        setSuccess('Şifre başarıyla güncellendi');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        setError(result.error || 'Şifre güncellenirken hata oluştu');
      }
    } catch (err) {
      setError('Şifre güncellenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationUpdate = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await updateUserSettings(user.uid, notificationSettings);
      if (result.success) {
        setUserData({ ...userData, ...notificationSettings });
        setSuccess('Bildirim ayarları güncellendi');
      } else {
        setError('Bildirim ayarları güncellenirken hata oluştu');
      }
    } catch (err) {
      setError('Bildirim ayarları güncellenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleBusinessUpdate = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await updateUserSettings(user.uid, businessSettings);
      if (result.success) {
        setUserData({ ...userData, ...businessSettings });
        setSuccess('İşletme ayarları güncellendi');
      } else {
        setError('İşletme ayarları güncellenirken hata oluştu');
      }
    } catch (err) {
      setError('İşletme ayarları güncellenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSecurityUpdate = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await updateUserSettings(user.uid, securitySettings);
      if (result.success) {
        setUserData({ ...userData, ...securitySettings });
        setSuccess('Güvenlik ayarları güncellendi');
      } else {
        setError('Güvenlik ayarları güncellenirken hata oluştu');
      }
    } catch (err) {
      setError('Güvenlik ayarları güncellenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <SahaSahibiSidebar />
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Ayarlar</h1>
              <p className="text-gray-600 mt-1">Hesap ve sistem ayarlarınızı yönetin</p>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="bg-white border-b px-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'profile'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <User className="w-4 h-4 inline mr-2" />
              Profil
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'security'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Shield className="w-4 h-4 inline mr-2" />
              Güvenlik
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'notifications'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Bell className="w-4 h-4 inline mr-2" />
              Bildirimler
            </button>
            <button
              onClick={() => setActiveTab('business')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'business'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Building2 className="w-4 h-4 inline mr-2" />
              İşletme
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Success/Error Messages */}
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
              <Check className="w-5 h-5 mr-2" />
              {success}
            </div>
          )}
          
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Profil Bilgileri</h3>
                
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ad Soyad
                      </label>
                      <input
                        type="text"
                        value={profileForm.displayName}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, displayName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Adınız ve soyadınız"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        E-posta
                      </label>
                      <input
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="ornek@email.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Telefon
                      </label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="0555 123 45 67"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        İşletme Adı
                      </label>
                      <input
                        type="text"
                        value={profileForm.businessName}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, businessName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="İşletmenizin adı"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Şehir
                      </label>
                      <input
                        type="text"
                        value={profileForm.city}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, city: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="İstanbul"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Website
                      </label>
                      <input
                        type="url"
                        value={profileForm.website}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, website: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="https://website.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adres
                    </label>
                    <textarea
                      value={profileForm.address}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      rows="3"
                      placeholder="Detaylı adres bilginiz"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hakkında
                    </label>
                    <textarea
                      value={profileForm.description}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      rows="4"
                      placeholder="İşletmeniz hakkında kısa bilgi"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>Kaydet</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Password Change */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Şifre Değiştir</h3>
                
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mevcut Şifre
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword.current ? 'text' : 'password'}
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Mevcut şifreniz"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(prev => ({ ...prev, current: !prev.current }))}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Yeni Şifre
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword.new ? 'text' : 'password'}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Yeni şifreniz"
                        required
                        minLength="6"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(prev => ({ ...prev, new: !prev.new }))}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Yeni Şifre Tekrar
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword.confirm ? 'text' : 'password'}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Yeni şifrenizi tekrar girin"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(prev => ({ ...prev, confirm: !prev.confirm }))}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      <Key className="w-4 h-4" />
                      <span>Şifreyi Güncelle</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Security Settings */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Güvenlik Ayarları</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">İki Faktörlü Kimlik Doğrulama</h4>
                      <p className="text-sm text-gray-500">Hesabınız için ek güvenlik katmanı</p>
                    </div>
                    <button
                      onClick={() => setSecuritySettings(prev => ({ ...prev, twoFactorAuth: !prev.twoFactorAuth }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        securitySettings.twoFactorAuth ? 'bg-green-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          securitySettings.twoFactorAuth ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">Giriş Bildirimleri</h4>
                      <p className="text-sm text-gray-500">Yeni girişlerde e-posta bildirimi al</p>
                    </div>
                    <button
                      onClick={() => setSecuritySettings(prev => ({ ...prev, loginAlerts: !prev.loginAlerts }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        securitySettings.loginAlerts ? 'bg-green-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          securitySettings.loginAlerts ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Oturum Zaman Aşımı (dakika)
                    </label>
                    <select
                      value={securitySettings.sessionTimeout}
                      onChange={(e) => setSecuritySettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value={15}>15 dakika</option>
                      <option value={30}>30 dakika</option>
                      <option value={60}>1 saat</option>
                      <option value={120}>2 saat</option>
                      <option value={480}>8 saat</option>
                    </select>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleSecurityUpdate}
                      disabled={loading}
                      className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      <Shield className="w-4 h-4" />
                      <span>Güvenlik Ayarlarını Kaydet</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Bildirim Ayarları</h3>
                
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Genel Bildirimler</h4>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium text-gray-700">E-posta Bildirimleri</h5>
                        <p className="text-sm text-gray-500">Sistem güncellemeleri ve önemli duyurular</p>
                      </div>
                      <button
                        onClick={() => setNotificationSettings(prev => ({ ...prev, emailNotifications: !prev.emailNotifications }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          notificationSettings.emailNotifications ? 'bg-green-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            notificationSettings.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium text-gray-700">SMS Bildirimleri</h5>
                        <p className="text-sm text-gray-500">Acil durumlar ve önemli güncellemeler</p>
                      </div>
                      <button
                        onClick={() => setNotificationSettings(prev => ({ ...prev, smsNotifications: !prev.smsNotifications }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          notificationSettings.smsNotifications ? 'bg-green-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            notificationSettings.smsNotifications ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium text-gray-700">Push Bildirimleri</h5>
                        <p className="text-sm text-gray-500">Anlık bildirimler ve hatırlatmalar</p>
                      </div>
                      <button
                        onClick={() => setNotificationSettings(prev => ({ ...prev, pushNotifications: !prev.pushNotifications }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          notificationSettings.pushNotifications ? 'bg-green-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            notificationSettings.pushNotifications ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h4 className="font-medium text-gray-900 mb-4">Rezervasyon Bildirimleri</h4>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium text-gray-700">Rezervasyon Hatırlatmaları</h5>
                        <p className="text-sm text-gray-500">Yaklaşan rezervasyonlar için hatırlatma</p>
                      </div>
                      <button
                        onClick={() => setNotificationSettings(prev => ({ ...prev, reservationReminders: !prev.reservationReminders }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          notificationSettings.reservationReminders ? 'bg-green-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            notificationSettings.reservationReminders ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <div>
                        <h5 className="font-medium text-gray-700">Ödeme Hatırlatmaları</h5>
                        <p className="text-sm text-gray-500">Bekleyen ödemeler için hatırlatma</p>
                      </div>
                      <button
                        onClick={() => setNotificationSettings(prev => ({ ...prev, paymentReminders: !prev.paymentReminders }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          notificationSettings.paymentReminders ? 'bg-green-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            notificationSettings.paymentReminders ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h4 className="font-medium text-gray-900 mb-4">Diğer</h4>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium text-gray-700">Pazarlama E-postaları</h5>
                        <p className="text-sm text-gray-500">Yeni özellikler ve kampanyalar</p>
                      </div>
                      <button
                        onClick={() => setNotificationSettings(prev => ({ ...prev, marketingEmails: !prev.marketingEmails }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          notificationSettings.marketingEmails ? 'bg-green-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            notificationSettings.marketingEmails ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <div>
                        <h5 className="font-medium text-gray-700">Haftalık Raporlar</h5>
                        <p className="text-sm text-gray-500">Haftalık performans raporları</p>
                      </div>
                      <button
                        onClick={() => setNotificationSettings(prev => ({ ...prev, weeklyReports: !prev.weeklyReports }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          notificationSettings.weeklyReports ? 'bg-green-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            notificationSettings.weeklyReports ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleNotificationUpdate}
                      disabled={loading}
                      className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      <Bell className="w-4 h-4" />
                      <span>Bildirim Ayarlarını Kaydet</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Business Tab */}
          {activeTab === 'business' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">İşletme Ayarları</h3>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Çalışma Saatleri
                      </label>
                      <input
                        type="text"
                        value={businessSettings.workingHours}
                        onChange={(e) => setBusinessSettings(prev => ({ ...prev, workingHours: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="08:00 - 22:00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        İptal Politikası
                      </label>
                      <select
                        value={businessSettings.cancellationPolicy}
                        onChange={(e) => setBusinessSettings(prev => ({ ...prev, cancellationPolicy: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="1 hour">1 saat öncesi</option>
                        <option value="24 hours">24 saat öncesi</option>
                        <option value="48 hours">48 saat öncesi</option>
                        <option value="1 week">1 hafta öncesi</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Önceden Rezervasyon (gün)
                      </label>
                      <input
                        type="number"
                        value={businessSettings.advanceBookingDays}
                        onChange={(e) => setBusinessSettings(prev => ({ ...prev, advanceBookingDays: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        min="1"
                        max="365"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Çalışma Günleri
                    </label>
                    <div className="grid grid-cols-7 gap-2">
                      {[
                        { key: 'monday', label: 'Pzt' },
                        { key: 'tuesday', label: 'Sal' },
                        { key: 'wednesday', label: 'Çar' },
                        { key: 'thursday', label: 'Per' },
                        { key: 'friday', label: 'Cum' },
                        { key: 'saturday', label: 'Cmt' },
                        { key: 'sunday', label: 'Paz' }
                      ].map(day => (
                        <label key={day.key} className="flex flex-col items-center">
                          <input
                            type="checkbox"
                            checked={businessSettings.workingDays.includes(day.key)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setBusinessSettings(prev => ({
                                  ...prev,
                                  workingDays: [...prev.workingDays, day.key]
                                }));
                              } else {
                                setBusinessSettings(prev => ({
                                  ...prev,
                                  workingDays: prev.workingDays.filter(d => d !== day.key)
                                }));
                              }
                            }}
                            className="mb-1"
                          />
                          <span className="text-sm text-gray-600">{day.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleBusinessUpdate}
                      disabled={loading}
                      className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      <Building2 className="w-4 h-4" />
                      <span>İşletme Ayarlarını Kaydet</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Ayarlar;

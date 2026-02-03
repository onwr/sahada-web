import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import SahaSahibiSidebar from '../../components/SahaSahibiSidebar';
import { 
  updateUserData,
  updateUserSettings,
  updateUserPassword,
  getTesisler,
  getPlatformSettings,
  updateTesis
} from '../../services/firestoreService';
import { uploadProfileImage } from '../../services/cdnService';
import toast from '../../utils/toast';
import { doc, onSnapshot, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { 
  User,
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
  CreditCard,
  AlertTriangle,
  Camera,
  Globe
} from 'lucide-react';
import { createPaymentForm, retrieveCheckoutForm } from '../../services/paymentApiService';

// ... (existing imports)

const PaymentModal = ({ content, onClose }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current && content) {
      // 1. HTML içeriğini set et
      containerRef.current.innerHTML = content;

      // 2. Scriptleri bul ve çalıştır
      const scripts = containerRef.current.querySelectorAll('script');
      scripts.forEach(oldScript => {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
        newScript.appendChild(document.createTextNode(oldScript.innerHTML));
        oldScript.parentNode.replaceChild(newScript, oldScript);
      });
    }
  }, [content]);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Güvenli Ödeme</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>
        <div className="p-0" ref={containerRef}>
             {/* Iyzico Form will be rendered here */}
             <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
             </div>
        </div>
      </div>
    </div>
  );
};

const Ayarlar = () => {
  const { user, userData, setUserData } = useAuth();
  const location = useLocation();
  
  // URL parametrelerinden aktif tab'ı al
  const getInitialTab = () => {
      if (location?.search) {
          const params = new URLSearchParams(location.search);
          const tab = params.get('tab');
          if (tab && ['profile', 'membership', 'business', 'security', 'notifications'].includes(tab)) {
              return tab;
          }
      }
      return 'profile';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  
  // URL değiştiğinde tab'ı güncelle (Back/Forward navigasyonu için)
  useEffect(() => {
      const tab = getInitialTab();
      if(tab && tab !== activeTab) {
          setActiveTab(tab);
      }
  }, [location.search]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [platformSettings, setPlatformSettings] = useState(null);
  
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const result = await getPlatformSettings();
        if (result.success && result.data) {
           setPlatformSettings(result.data);
        }
      } catch (err) {
        console.error('Error fetching platform settings:', err);
      }
    };
    fetchSettings();
  }, []);

  const isSavingRef = useRef(false);
  const lastSavedDataRef = useRef(null);

  // Polling Refs
  const paymentTokenRef = useRef(null);
  const paymentConversationIdRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const pollingTimeoutRef = useRef(null);
  const pollingStartTimeRef = useRef(null);
  const hasHandledPaymentRef = useRef(false);

  // Payment History State
  const [paymentHistory, setPaymentHistory] = useState([]);

  // Fetch Payment History
  useEffect(() => {
    // ... (keep existing fetch logic)
    if(!user || activeTab !== 'membership') return;

    const fetchPayments = async () => {
        try {
            const paymentsRef = collection(db, 'payments');
            const q = query(
                paymentsRef, 
                where('buyerId', '==', user.uid)
            );
            
            const snapshot = await getDocs(q);
            const history = [];
            snapshot.forEach(doc => {
                history.push({ id: doc.id, ...doc.data() });
            });
            
            history.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                return dateB - dateA;
            });

            setPaymentHistory(history.slice(0, 10));
        } catch (err) {
            console.error("Error fetching payment history:", err);
        }
    };

    fetchPayments();
  }, [user, activeTab]);

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
    }
    if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
    }
  };

  const startPolling = (token, conversationId) => {
    stopPolling();
    paymentTokenRef.current = token;
    paymentConversationIdRef.current = conversationId;
    pollingStartTimeRef.current = Date.now();
    hasHandledPaymentRef.current = false;

    // Timeout after 5 mins
    pollingTimeoutRef.current = setTimeout(() => {
        stopPolling();
        setLoading(false);
        if (!hasHandledPaymentRef.current) {
             console.warn('Polling timeout');
        }
    }, 5 * 60 * 1000);

    pollingIntervalRef.current = setInterval(async () => {
        if (!paymentTokenRef.current) {
            stopPolling();
            return;
        }

        try {
            const result = await retrieveCheckoutForm(paymentTokenRef.current, paymentConversationIdRef.current);
            console.log('Polling result:', result);

            if (result.success && result.data) {
                const status = result.data.paymentStatus;
                
                if (status === 'SUCCESS' || result.data.status === 'success') {
                    console.log('Payment success detected via polling');
                    stopPolling();
                    if (hasHandledPaymentRef.current) return;
                    hasHandledPaymentRef.current = true;

                    // Success actions
                    await handlePaymentSuccess();
                } else if (status === 'FAILURE') {
                    // Don't stop polling immediately, let user retry or close popup
                    // But if explicit failure...
                    // console.warn('Payment failed state detected');
                }
            }
        } catch (err) {
            console.error('Polling error:', err);
        }
    }, 3000);
  };

  const handlePaymentSuccess = async () => {
      setSuccess('Ödeme başarıyla alındı. Üyeliğiniz aktif edildi.');
      setUserData(prev => ({ ...prev, subscriptionStatus: 'active' }));
      setLoading(false);
      
      try {
           await updateUserData(user.uid, { subscriptionStatus: 'active' });
           // Refresh history after a short delay
           setTimeout(() => {
             setActiveTab('profile'); // Force re-render trick or just let effect run?
             setActiveTab('membership');
           }, 1500);
      } catch (e) {
          console.error("Status update error", e);
      }
  };

  // Replace Payment Logic with Popup
  const handlePayment = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    hasHandledPaymentRef.current = false;

    try {
        // Calculate Amount
        let amount = platformSettings?.membership?.monthlyFee || 1500;
        if (platformSettings?.specialRules) {
            const rule = platformSettings.specialRules.find(r => r.userId === user?.uid);
            if (rule && rule.monthlyFee) {
                amount = rule.monthlyFee;
            }
        }

        const names = (userData.displayName || 'Saha Sahibi').split(' ');
        const surname = names.length > 1 ? names.pop() : 'Yazılım';
        const name = names.join(' ') || 'Saha';

        const conversationId = `sub_${user.uid}_${Date.now()}`;

        const paymentData = {
          conversationId: conversationId,
          price: amount,
          paidPrice: amount,
          basketId: `SUB-${user.uid}-${Date.now()}`,
          paymentGroup: 'PRODUCT',
          callbackUrl: `${window.location.origin}/saha-sahibi/ayarlar`, // Popup closes anyway
          frontendOrigin: window.location.origin,
          
          buyerId: user.uid,
          buyerName: name,
          buyerSurname: surname,
          buyerPhone: userData.phone || '+905555555555',
          buyerEmail: userData.email,
          buyerIdentityNumber: userData.identityNumber || '11111111111',
          buyerAddress: userData.address || 'Istanbul',
          buyerCity: userData.city || 'Istanbul',
          buyerZipCode: '34732',
          
          basketItems: [
            {
              id: 'MEMBERSHIP_MONTHLY',
              name: 'Aylık Saha Üyeliği',
              category1: 'Membership',
              category2: 'Monthly',
              itemType: 'VIRTUAL',
              price: amount
            }
          ]
        };

        const result = await createPaymentForm(paymentData);

        if (result.success && result.data && result.data.paymentPageUrl) {
            // Start polling
            if(result.data.token) {
                startPolling(result.data.token, conversationId);
            }

            // Open Popup
            const width = 800;
            const height = 600;
            const left = (window.innerWidth - width) / 2;
            const top = (window.innerHeight - height) / 2;
            
            const popup = window.open(
                result.data.paymentPageUrl, 
                'OdemeEkrani', 
                `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`
            );

            if (!popup) {
                alert('Popup tarayıcı tarafından engellendi. Lütfen izin verin.');
                setLoading(false);
                return;
            }

            // Monitor popup close
             const checkInterval = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkInterval);
                    console.log('Popup closed by user');
                    if (!hasHandledPaymentRef.current) {
                         stopPolling();
                         setLoading(false);
                         console.log('Payment polling stopped due to popup closure.');
                    }
                }
            }, 1000);

        } else {
            console.error('Iyzico Init Error:', result);
            setError('Ödeme sayfası oluşturulamadı: ' + (result.error || 'Bilinmeyen hata'));
            setLoading(false);
        }

    } catch (err) {
        console.error("Payment init error:", err);
        setError('Ödeme başlatılamadı. Lütfen destek ekibi ile iletişime geçin.');
        setLoading(false);
    }
  };




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



  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    loginAlerts: true,
    sessionTimeout: 30
  });

  const formatPhoneNumber = (value) => {
    if (!value) return '';
    const numbers = value.replace(/\D/g, '');
    let formatted = '';
    if (numbers.length > 0) {
      formatted += '(' + numbers.substring(0, 3);
    }
    if (numbers.length >= 3) {
      formatted += ') ' + numbers.substring(3, 6);
    }
    if (numbers.length >= 6) {
      formatted += ' ' + numbers.substring(6, 8);
    }
    if (numbers.length >= 8) {
      formatted += ' ' + numbers.substring(8, 10);
    }
    return formatted;
  };

  const handlePhoneChange = (e) => {
    const val = e.target.value;
    const numbers = val.replace(/\D/g, '');
    if (numbers.length <= 10) {
       const formatted = formatPhoneNumber(val);
       setProfileForm(prev => ({ ...prev, phone: formatted }));
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    setLoading(true);
    setError(null);
    try {
      const result = await uploadProfileImage(file, user.uid);
      if (result.success) {
        const newPhotoURL = result.data.url;
        await updateUserData(user.uid, { photoURL: newPhotoURL });
        setUserData(prev => ({ ...prev, photoURL: newPhotoURL }));
        toast.success('Profil fotoğrafı başarıyla güncellendi');
      } else {
        setError(result.error || 'Fotoğraf yüklenirken hata oluştu');
      }
    } catch (err) {
      setError('Fotoğraf yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  // Populate form with user data on load
  useEffect(() => {
    if (userData) {
      setProfileForm(prev => ({
        ...prev,
        displayName: userData.displayName || userData.fullName || '',
        email: userData.email || '',
        phone: formatPhoneNumber(userData.phone || userData.phoneNumber || userData.businessPhone || ''),
        businessName: userData.businessName || '',
        city: userData.city || '',
        address: userData.address || '',
        website: userData.website || '',
        description: userData.description || ''
      }));

       // Also populate notification settings if they exist
       if (userData.emailNotifications !== undefined) {
         setNotificationSettings(prev => ({
           ...prev,
           emailNotifications: userData.emailNotifications ?? true,
           smsNotifications: userData.smsNotifications ?? false,
           pushNotifications: userData.pushNotifications ?? true,
           reservationReminders: userData.reservationReminders ?? true,
           paymentReminders: userData.paymentReminders ?? true,
           marketingEmails: userData.marketingEmails ?? false,
           weeklyReports: userData.weeklyReports ?? true
         }));
       }
    }
  }, [userData]);   

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    isSavingRef.current = true; // Listener'ı devre dışı bırak
    
    try {

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
        
        const updatePayload = {
          ...profileForm,
          businessPhone: profileForm.phone // Consistency
        };
        const result = await updateUserData(user.uid, updatePayload);
        
        if (result.success) {
          // Optional: Update first tesis description if it matches
          try {
            const tesisler = await getTesisler(user.uid);
            if (tesisler.success && tesisler.data.length > 0) {
              const firstTesis = tesisler.data[0];
              await updateTesis(firstTesis.id, { description: profileForm.description });
            }
          } catch (tesisErr) {
            console.warn('Facility description update skipped', tesisErr);
          }

          setUserData({ ...userData, ...updatePayload });
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
      
      {showPaymentModal && (
        <PaymentModal 
            content={paymentFormContent} 
            onClose={() => setShowPaymentModal(false)} 
        />
      )}
      
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
              onClick={() => setActiveTab('membership')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'membership'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <CreditCard className="w-4 h-4 inline mr-2" />
              Üyelik & Ödeme
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
                <div className="flex flex-col md:flex-row md:items-center gap-6 mb-8 pb-8 border-b border-gray-50">
                   <div className="relative">
                      <div className="w-24 h-24 rounded-2xl bg-green-50 border-2 border-green-100 flex items-center justify-center overflow-hidden">
                        {userData?.photoURL || user?.photoURL ? (
                          <img src={userData.photoURL || user.photoURL} alt="Profil" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-10 h-10 text-green-600" />
                        )}
                      </div>
                      <label className="absolute -bottom-2 -right-2 p-2 bg-white rounded-xl shadow-lg border border-gray-100 text-green-600 cursor-pointer hover:bg-green-50 transition-colors">
                        <Camera size={16} />
                        <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                      </label>
                   </div>
                   <div>
                      <h4 className="text-lg font-bold text-gray-900">{profileForm.displayName || 'İsimsiz Kullanıcı'}</h4>
                      <p className="text-sm text-gray-500">{profileForm.businessName || 'İşletme Belirtilmemiş'}</p>
                      <span className="inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 uppercase tracking-wider">
                        SAHA SAHİBİ
                      </span>
                   </div>
                </div>

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
                        onChange={handlePhoneChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="(555) 123 45 67"
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

          {/* Membership Tab */}
          {activeTab === 'membership' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Üyelik Durumu & Ödemeler</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Status Card */}
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                <Shield className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500 uppercase">Hesap Durumu</p>
                                <p className={`text-xl font-bold ${userData?.subscriptionStatus === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                                    {userData?.subscriptionStatus === 'active' ? 'Aktif Üyelik' : 'Ödeme Bekleniyor'}
                                </p>
                            </div>
                        </div>
                        {userData?.subscriptionStatus !== 'active' ? (
                            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <p>Sistem erişiminiz şu an kısıtlıdır. Aktif etmek için lütfen ödeme yapınız.</p>
                            </div>
                        ) : (
                            <div className="mt-4">
                                <button
                                    onClick={() => {
                                        if(window.confirm('Üyeliğinizi iptal etmek istediğinize emin misiniz? Bu işlem geri alınamaz ve sistem erişiminiz kısıtlanacaktır.')) {
                                            handleCancelSubscription();
                                        }
                                    }}
                                    disabled={loading}
                                    className="text-sm text-red-600 hover:text-red-800 underline font-medium cursor-pointer"
                                >
                                    Üyeliği İptal Et
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Fee Card */}
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                                <CreditCard className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500 uppercase">Aylık Ödeme Tutarı</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {(() => {
                                        let amount = platformSettings?.membership?.monthlyFee || 1500;
                                        // Check for special rule
                                        if (platformSettings?.specialRules) {
                                            const rule = platformSettings.specialRules.find(r => r.userId === user?.uid);
                                            if (rule && rule.monthlyFee) {
                                                amount = rule.monthlyFee;
                                            }
                                        }
                                        return `₺${amount}`;
                                    })()}
                                    <span className="text-sm font-normal text-gray-500 ml-1">/ay</span>
                                </p>
                            </div>
                        </div>
                        <div className="space-y-3 mt-4">
                            <button 
                                onClick={handlePayment}
                                disabled={loading}
                                className={`w-full font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md ${
                                    userData?.subscriptionStatus === 'active' 
                                    ? 'bg-white border-2 border-green-600 text-green-600 hover:bg-green-50'
                                    : 'bg-green-600 hover:bg-green-700 text-white'
                                }`}
                            >
                                <CreditCard className="w-5 h-5" />
                                {loading ? 'Ödeme Sayfası Açılıyor...' : (userData?.subscriptionStatus === 'active' ? 'Üyeliği Uzat / Ödeme Yap' : 'Şimdi Ödeme Yap')}
                            </button>
                            
                            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                                <Shield className="w-3 h-3" />
                                <span>Iyzico Altyapısı ile Güvenli Ödeme</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t pt-6">
                    <h4 className="font-medium text-gray-900 mb-4">Ödeme Geçmişi</h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3">Tarih</th>
                                    <th className="px-4 py-3">Tutar</th>
                                    <th className="px-4 py-3">Durum</th>
                                    <th className="px-4 py-3">Fatura</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paymentHistory.length > 0 ? (
                                    paymentHistory.map((payment) => (
                                        <tr key={payment.id} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                {payment.createdAt?.toDate 
                                                    ? payment.createdAt.toDate().toLocaleDateString('tr-TR') 
                                                    : new Date(payment.createdAt).toLocaleDateString('tr-TR')}
                                                <br/>
                                                <span className="text-xs text-gray-400">
                                                    {payment.createdAt?.toDate 
                                                        ? payment.createdAt.toDate().toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'}) 
                                                        : ''}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-medium text-gray-900">
                                                ₺{payment.price}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                    payment.status === 'success' ? 'bg-green-100 text-green-700' :
                                                    payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                    {payment.status === 'success' ? 'Başarılı' : 
                                                     payment.status === 'pending' ? 'Bekliyor' : 'Başarısız'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                Aylık Üyelik
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr className="bg-white border-b">
                                        <td className="px-4 py-3" colSpan="4">
                                            <div className="text-center py-4 text-gray-400">
                                                Henüz ödeme geçmişi bulunmuyor
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
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

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getPlayerStats, 
  updatePlayerProfile, 
  deleteUserAccount,
  getPlayerPaymentMethods,
  addPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod,
  getUserData
} from '../../services/firestoreService';
import { storage } from '../../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import OyuncuSidebar from '../../components/OyuncuSidebar';
import { 
  User, 
  CreditCard, 
  Camera, 
  Save, 
  X, 
  Trash2, 
  AlertCircle, 
  CheckCircle,
  Plus,
  Lock,
  MapPin,
  Calendar,
  Star,
  Edit2,
  Check,
  RotateCcw,
  Award,
  Flame,
  Shield,
  Zap,
  Target
} from 'lucide-react';
import toast from '../../utils/toast';

const Profil = () => {
  const { id } = useParams();
  const { user, userData } = useAuth();
  const [viewingUserId, setViewingUserId] = useState(null);
  const [viewingUserData, setViewingUserData] = useState(null);
  const isViewingOwnProfile = !id || id === user?.uid;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [stats, setStats] = useState({ totalMatches: 0, upcomingMatches: 0, completedMatches: 0 });
  const [activeTab, setActiveTab] = useState('profile');
  
  useEffect(() => {
    // Başka bir kullanıcının profilini görüntülüyorsa, sadece profil tab'ını göster
    if (!isViewingOwnProfile) {
      setActiveTab('profile');
    }
  }, [isViewingOwnProfile]);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = useRef(null);
  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    type: 'card',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardHolder: '',
    isDefault: false
  });
  const [cardFlipped, setCardFlipped] = useState(false);
  const [cardErrors, setCardErrors] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardHolder: ''
  });
  
  const isSavingRef = useRef(false); // Kaydetme sırasında listener'ın formu güncellememesi için
  const lastSavedDataRef = useRef(null); // Son kaydedilen veriyi takip et
  
  const [editForm, setEditForm] = useState({
    displayName: userData?.displayName || '',
    fullName: userData?.fullName || '',
    phone: userData?.phone || '',
    email: user?.email || '',
    birthYear: userData?.birthYear || '',
    gender: userData?.gender || '',
    bio: '',
    favoriteSports: userData?.favoriteSports || [],
    sportPreferences: userData?.sportPreferences || [], // Her spor için ayrı tercihler
    city: userData?.city || '',
    district: userData?.district || '',
    preferredHours: userData?.preferredHours || []
  });

  const sports = [
    { id: 'football', name: 'Futbol', icon: '⚽' },
    { id: 'basketball', name: 'Basketbol', icon: '🏀' },
    { id: 'tennis', name: 'Tenis', icon: '🎾' },
    { id: 'volleyball', name: 'Voleybol', icon: '🏐' },
    { id: 'badminton', name: 'Badminton', icon: '🏸' },
    { id: 'swimming', name: 'Yüzme', icon: '🏊' },
  ];

  // Helper for achievements
  const getAchievements = (userData) => {
    return [
        {
            id: 'newbie',
            title: 'Sahaya Adım Attı',
            desc: 'Aramıza katıldı.',
            icon: User,
            color: 'bg-gray-100 text-gray-600',
            earned: true
        },
        {
            id: 'first_match',
            title: 'İlk Maç Heyecanı',
            desc: '1 maçı tamamladı.',
            icon: Zap,
            color: 'bg-yellow-100 text-yellow-600',
            earned: (userData?.ratingCount || 0) >= 1
        },
        {
            id: 'experienced',
            title: 'Deneyimli Oyuncu',
            desc: '10+ maç deneyimi.',
            icon: Star,
            color: 'bg-blue-100 text-blue-600',
            earned: (userData?.ratingCount || 0) >= 10
        },
        {
            id: 'veteran',
            title: 'Saha Efsanesi',
            desc: '50+ maçın tozunu attırdı.',
            icon: Award,
            color: 'bg-purple-100 text-purple-600',
            earned: (userData?.ratingCount || 0) >= 50
        },
        {
          id: 'reliable',
          title: 'Güvenilir',
          desc: 'Sportmenlik > 4.5',
          icon: Shield,
          color: 'bg-green-100 text-green-600',
          earned: (userData?.sportsmanshipRating || 0) >= 4.5
        },
        {
          id: 'scorer',
          title: 'Yetenekli',
          desc: 'Beceri > 4.5',
          icon: Target,
          color: 'bg-red-100 text-red-600',
          earned: (userData?.skillRating || 0) >= 4.5
        },
        {
            id: 'mvp',
            title: 'MVP',
            desc: 'Genel Puan > 4.8',
            icon: Flame,
            color: 'bg-orange-100 text-orange-600',
            earned: (userData?.rating || 0) >= 4.8
        }
    ];
  };

  const skillLevels = [
    { id: 'beginner', name: 'Başlangıç' },
    { id: 'amateur', name: 'Amatör' },
    { id: 'intermediate', name: 'Orta' },
    { id: 'advanced', name: 'İleri' },
    { id: 'professional', name: 'Profesyonel' },
  ];

  const sportPositions = {
    football: ['Kaleci', 'Defans', 'Orta Saha', 'Forvet', 'Kanat', 'Libero', 'Stoper'],
    basketball: ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center'],
    tennis: ['Tekler', 'Çiftler'],
    volleyball: ['Pasör', 'Smaçör', 'Orta Oyuncu', 'Libero', 'Pasör Çaprazı'],
    badminton: ['Tekler', 'Çiftler', 'Karışık Çiftler'],
    swimming: ['Serbest', 'Sırtüstü', 'Kurbağalama', 'Kelebek']
  };
  const playFrequencies = [
    'Haftada 1 kez',
    'Haftada 2-3 kez',
    'Haftada 4-5 kez',
    'Her gün',
    'Sadece hafta sonu',
  ];

  useEffect(() => {
    if (!user) return;
    
    const targetUserId = id || user.uid;
    setViewingUserId(targetUserId);    
    
    if (isViewingOwnProfile) {
      loadProfileData();
      loadPaymentMethods();
      const cleanup = setupRealtimeListener();
      
      return () => {
        if (cleanup) cleanup();
      };
    } else {
      loadOtherUserProfile(targetUserId);
    }
  }, [user, id]);
  
  const loadOtherUserProfile = async (userId) => {
    setLoading(true);
    try {
      const result = await getUserData(userId);
      if (result.success) {
        setViewingUserData(result.data);
      } else {
        toast.error('Kullanıcı bulunamadı');
      }
    } catch (error) {
      console.error('Profil yükleme hatası:', error);
      toast.error('Profil yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userData) {
      const favoriteSports = userData.favoriteSports || [];
      const sportPreferences = userData.sportPreferences || [];
      
      // Eğer eski format varsa (skillLevel, position, playFrequency direkt), yeni formata çevir
      let newSportPreferences = sportPreferences;
      if (userData.skillLevel && favoriteSports.length > 0 && sportPreferences.length === 0) {
        newSportPreferences = favoriteSports.map(sportId => ({
          sportId,
          skillLevel: userData.skillLevel || '',
          position: userData.position || '',
          playFrequency: userData.playFrequency || ''
        }));
      }
      
      setEditForm(prev => ({
        ...prev,
        displayName: userData.displayName || '',
        fullName: userData.fullName || '',
        phone: userData.phone || '',
        email: user?.email || '',
        birthYear: userData.birthYear || '',
        gender: userData.gender || '',
        bio: userData.bio || '',
        favoriteSports,
        sportPreferences: newSportPreferences,
        city: userData.city || '',
        district: userData.district || '',
        preferredHours: userData.preferredHours || []
      }));
    }
  }, [userData, user]);

  const setupRealtimeListener = () => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    const paymentMethodsRef = collection(db, 'users', user.uid, 'paymentMethods');

    const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Eğer kaydetme işlemi devam ediyorsa, listener'ı görmezden gel
        if (isSavingRef.current) {
          return;
        }
        
        // Eğer bu veriler zaten kaydedildiyse, görmezden gel
        const dataString = JSON.stringify({
          displayName: data.displayName,
          fullName: data.fullName,
          phone: data.phone,
          birthYear: data.birthYear,
          gender: data.gender,
          bio: data.bio,
          favoriteSports: data.favoriteSports,
          sportPreferences: data.sportPreferences,
          city: data.city,
          district: data.district,
          preferredHours: data.preferredHours
        });
        
        if (lastSavedDataRef.current === dataString) {
          return;
        }
        
        const favoriteSports = data.favoriteSports || [];
        const sportPreferences = data.sportPreferences || [];
        
        // Eğer eski format varsa, yeni formata çevir
        let newSportPreferences = sportPreferences;
        if (data.skillLevel && favoriteSports.length > 0 && sportPreferences.length === 0) {
          newSportPreferences = favoriteSports.map(sportId => ({
            sportId,
            skillLevel: data.skillLevel || '',
            position: data.position || '',
            playFrequency: data.playFrequency || ''
          }));
        }
        
        setEditForm(prev => ({
          ...prev,
          displayName: data.displayName || '',
          fullName: data.fullName || '',
          phone: data.phone || '',
          email: user?.email || '',
          birthYear: data.birthYear || '',
          gender: data.gender || '',
          bio: data.bio || '',
          favoriteSports,
          sportPreferences: newSportPreferences,
          city: data.city || '',
          district: data.district || '',
          preferredHours: data.preferredHours || []
        }));
      }
    }, (error) => {
      console.error('Profil listener hatası:', error);
    });

    const unsubscribePayments = onSnapshot(paymentMethodsRef, (snapshot) => {
      const methods = [];
      snapshot.forEach((doc) => {
        methods.push({ id: doc.id, ...doc.data() });
      });
      methods.sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return 0;
      });
      setPaymentMethods(methods);
    }, (error) => {
      console.error('Ödeme yöntemleri listener hatası:', error);
    });

    return () => {
      unsubscribeUser();
      unsubscribePayments();
    };
  };

  const loadProfileData = async () => {
    if (!user) return;
    
    setLoading(false);
    try {
      const statsResult = await getPlayerStats(user.uid);
      if (statsResult.success) {
        setStats(statsResult.data);
      }
    } catch (err) {
      console.error('Profil yükleme hatası:', err);
    }
  };

  const loadPaymentMethods = async () => {
    if (!user) return;
    
    try {
      const result = await getPlayerPaymentMethods(user.uid);
      if (result.success) {
        setPaymentMethods(result.data);
      }
    } catch (err) {
      console.error('Ödeme yöntemleri yükleme hatası:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFavoriteSportsChange = (sportId) => {
    setEditForm(prev => {
      const isSelected = prev.favoriteSports.includes(sportId);
      const newFavoriteSports = isSelected
        ? prev.favoriteSports.filter((item) => item !== sportId)
        : [...prev.favoriteSports, sportId];
      
      // Spor seçildiyse veya kaldırıldıysa sportPreferences'i güncelle
      let newSportPreferences = [...prev.sportPreferences];
      if (isSelected) {
        // Spor kaldırıldıysa, o sporun tercihlerini de kaldır
        newSportPreferences = newSportPreferences.filter(sp => sp.sportId !== sportId);
      } else {
        // Spor eklendiyse, yeni bir tercih objesi ekle
        newSportPreferences.push({
          sportId,
          skillLevel: '',
          position: '',
          playFrequency: ''
        });
      }
      
      return {
        ...prev,
        favoriteSports: newFavoriteSports,
        sportPreferences: newSportPreferences
      };
    });
  };

  const handleSportPreferenceChange = (sportId, field, value) => {
    setEditForm(prev => {
      const newSportPreferences = prev.sportPreferences.map(sp => {
        if (sp.sportId === sportId) {
          return { ...sp, [field]: value };
        }
        return sp;
      });
      return {
        ...prev,
        sportPreferences: newSportPreferences
      };
    });
  };

  const getSportPreference = (sportId) => {
    return editForm.sportPreferences.find(sp => sp.sportId === sportId) || {
      sportId,
      skillLevel: '',
      position: '',
      playFrequency: ''
    };
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    isSavingRef.current = true; // Listener'ı devre dışı bırak
    
    try {
      const profileData = {
        ...editForm,
        displayName: editForm.fullName || editForm.displayName,
        sportPreferences: editForm.sportPreferences // Her spor için ayrı tercihler
      };
      
      // Eski format uyumluluğu için (geriye dönük uyumluluk)
      if (editForm.sportPreferences.length > 0) {
        // İlk sporun tercihlerini genel alanlara da kaydet (geriye dönük uyumluluk)
        const firstPreference = editForm.sportPreferences[0];
        profileData.skillLevel = firstPreference.skillLevel;
        profileData.position = firstPreference.position;
        profileData.playFrequency = firstPreference.playFrequency;
      }
      
      const result = await updatePlayerProfile(user.uid, profileData);
      
      if (result.success) {
        // Son kaydedilen veriyi sakla
        lastSavedDataRef.current = JSON.stringify({
          displayName: profileData.displayName,
          fullName: profileData.fullName,
          phone: profileData.phone,
          birthYear: profileData.birthYear,
          gender: profileData.gender,
          bio: profileData.bio,
          favoriteSports: profileData.favoriteSports,
          sportPreferences: profileData.sportPreferences,
          city: profileData.city,
          district: profileData.district,
          preferredHours: profileData.preferredHours
        });
        
        toast.success('Profil başarıyla güncellendi');
        
        if (profileData.displayName) {
          await updateProfile(user, {
            displayName: profileData.displayName
          });
        }
      } else {
        toast.error(result.error || 'Profil güncellenirken hata oluştu');
      }
    } catch (err) {
      console.error('Profil kaydetme hatası:', err);
      toast.error('Profil kaydedilirken hata oluştu');
    } finally {
      setSaving(false);
      // Kısa bir gecikme ile listener'ı tekrar aktif et (Firestore güncellemesinin tamamlanması için)
      setTimeout(() => {
        isSavingRef.current = false;
      }, 1000);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dosya boyutu 5MB\'dan küçük olmalıdır');
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      toast.error('Sadece resim dosyaları yüklenebilir');
      return;
    }
    
    setUploadingPhoto(true);
    
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
      
      const storageRef = ref(storage, `profiles/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      await updatePlayerProfile(user.uid, { photoURL: downloadURL });
      
      await updateProfile(user, {
        photoURL: downloadURL
      });
      
      toast.success('Profil fotoğrafı başarıyla yüklendi');
    } catch (err) {
      console.error('Fotoğraf yükleme hatası:', err);
      toast.error('Fotoğraf yüklenirken hata oluştu');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user || !securityForm.currentPassword || !securityForm.newPassword) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }
    
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      toast.error('Yeni şifreler eşleşmiyor');
      return;
    }
    
    if (securityForm.newPassword.length < 6) {
      toast.error('Şifre en az 6 karakter olmalıdır');
      return;
    }
    
    try {
      const credential = EmailAuthProvider.credential(user.email, securityForm.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, securityForm.newPassword);
      
      toast.success('Şifre başarıyla değiştirildi');
      setSecurityForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      console.error('Şifre değiştirme hatası:', err);
      if (err.code === 'auth/wrong-password') {
        toast.error('Mevcut şifre yanlış');
      } else if (err.code === 'auth/weak-password') {
        toast.error('Şifre çok zayıf');
      } else {
        toast.error('Şifre değiştirilirken hata oluştu');
      }
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    const password = prompt('Hesabınızı silmek için şifrenizi girin:');
    if (!password) {
      setShowDeleteAccount(false);
      return;
    }
    
    if (!confirm('Hesabınızı silmek istediğinize emin misiniz? Bu işlem geri alınamaz!')) {
      setShowDeleteAccount(false);
      return;
    }
    
    try {
      toast.loading('Hesap siliniyor...');
      const result = await deleteUserAccount(user.uid, password);
      if (result.success) {
        toast.dismiss();
        toast.success('Hesabınız başarıyla silindi');
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else {
        toast.dismiss();
        toast.error(result.error || 'Hesap silinemedi');
        setShowDeleteAccount(false);
      }
    } catch (error) {
      console.error('Hesap silme hatası:', error);
      toast.dismiss();
      toast.error('Hesap silinirken hata oluştu');
      setShowDeleteAccount(false);
    }
  };

  const detectCardType = (cardNumber) => {
    const num = cardNumber.replace(/\s/g, '');
    if (/^4/.test(num)) return 'visa';
    if (/^5[1-5]/.test(num)) return 'mastercard';
    if (/^3[47]/.test(num)) return 'amex';
    return 'unknown';
  };

  const validateCardNumber = (cardNumber) => {
    const num = cardNumber.replace(/\s/g, '');
    if (!num) return 'Kart numarası gereklidir';
    if (num.length < 13 || num.length > 19) return 'Geçersiz kart numarası uzunluğu';
    
    // Luhn algoritması
    let sum = 0;
    let isEven = false;
    for (let i = num.length - 1; i >= 0; i--) {
      let digit = parseInt(num[i]);
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      isEven = !isEven;
    }
    if (sum % 10 !== 0) return 'Geçersiz kart numarası';
    return '';
  };

  const validateExpiryDate = (expiryDate) => {
    if (!expiryDate) return 'Son kullanma tarihi gereklidir';
    const [month, year] = expiryDate.split('/');
    if (!month || !year) return 'Geçersiz format (MM/YY)';
    const expMonth = parseInt(month);
    const expYear = 2000 + parseInt(year);
    const now = new Date();
    const expDate = new Date(expYear, expMonth - 1);
    if (expDate < now) return 'Kartın son kullanma tarihi geçmiş';
    return '';
  };

  const validateCVV = (cvv, cardNumber) => {
    if (!cvv) return 'CVV gereklidir';
    const cardType = detectCardType(cardNumber);
    if (cardType === 'amex' && cvv.length !== 4) return 'Amex kartları için 4 haneli CVV gerekir';
    if (cardType !== 'amex' && cvv.length !== 3) return 'CVV 3 haneli olmalıdır';
    return '';
  };

  const handleAddPaymentMethod = async (e) => {
    e.preventDefault();
    if (!user) return;

    // Validasyon - Tüm alanları kontrol et
    const cardNumber = paymentForm.cardNumber.replace(/\s/g, '');
    const cardNumberError = validateCardNumber(cardNumber);
    const expiryDateError = validateExpiryDate(paymentForm.expiryDate);
    const cvvError = validateCVV(paymentForm.cvv, cardNumber);
    const cardHolderError = !paymentForm.cardHolder || paymentForm.cardHolder.trim() === '' ? 'Kart sahibi adı gereklidir' : '';

    setCardErrors({
      cardNumber: cardNumberError,
      expiryDate: expiryDateError,
      cvv: cvvError,
      cardHolder: cardHolderError
    });

    if (cardNumberError || expiryDateError || cvvError || cardHolderError) {
      const errorMessages = [];
      if (cardNumberError) errorMessages.push('Kart numarası: ' + cardNumberError);
      if (expiryDateError) errorMessages.push('Son kullanma tarihi: ' + expiryDateError);
      if (cvvError) errorMessages.push('CVV: ' + cvvError);
      if (cardHolderError) errorMessages.push('Kart sahibi: ' + cardHolderError);
      
      toast.error(errorMessages.length > 0 ? errorMessages[0] : 'Lütfen tüm alanları doğru şekilde doldurun');
      return;
    }

    try {
      const cleanCardNumber = paymentForm.cardNumber.replace(/\s/g, '');
      const lastFour = cleanCardNumber.slice(-4);
      
      const paymentData = {
        type: 'card',
        isDefault: paymentForm.isDefault,
        createdAt: new Date(),
        updatedAt: new Date(),
        cardNumber: `****${lastFour}`, // Sadece son 4 haneyi sakla
        expiryDate: paymentForm.expiryDate,
        cardHolder: paymentForm.cardHolder.trim(),
        maskedCardNumber: `**** **** **** ${lastFour}`,
        cardType: detectCardType(cleanCardNumber)
      };

      if (editingPaymentMethod) {
        const result = await updatePaymentMethod(user.uid, editingPaymentMethod.id, paymentData);
        if (result.success) {
          toast.success('Ödeme yöntemi güncellendi');
          setShowPaymentModal(false);
          resetPaymentForm();
        } else {
          toast.error(result.error || 'Ödeme yöntemi güncellenemedi');
        }
      } else {
        const result = await addPaymentMethod(user.uid, paymentData);
        if (result.success) {
          toast.success('Ödeme yöntemi eklendi');
          setShowPaymentModal(false);
          resetPaymentForm();
        } else {
          toast.error(result.error || 'Ödeme yöntemi eklenemedi');
        }
      }
    } catch (error) {
      console.error('Ödeme yöntemi ekleme/güncelleme hatası:', error);
      toast.error('Ödeme yöntemi eklenirken hata oluştu');
    }
  };

  const handleDeletePaymentMethod = async (paymentMethodId) => {
    if (!confirm('Bu ödeme yöntemini silmek istediğinize emin misiniz?')) return;

    try {
      const result = await deletePaymentMethod(user.uid, paymentMethodId);
      if (result.success) {
        toast.success('Ödeme yöntemi silindi');
      } else {
        toast.error(result.error || 'Ödeme yöntemi silinemedi');
      }
    } catch (error) {
      console.error('Ödeme yöntemi silme hatası:', error);
      toast.error('Ödeme yöntemi silinirken hata oluştu');
    }
  };

  const handleSetDefaultPaymentMethod = async (paymentMethodId) => {
    try {
      const result = await setDefaultPaymentMethod(user.uid, paymentMethodId);
      if (result.success) {
        toast.success('Varsayılan ödeme yöntemi güncellendi');
      } else {
        toast.error(result.error || 'Varsayılan ödeme yöntemi ayarlanamadı');
      }
    } catch (error) {
      console.error('Varsayılan ödeme yöntemi ayarlama hatası:', error);
      toast.error('Varsayılan ödeme yöntemi ayarlanırken hata oluştu');
    }
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      type: 'card',
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      cardHolder: '',
      isDefault: false
    });
    setEditingPaymentMethod(null);
    setCardFlipped(false);
    setCardErrors({
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      cardHolder: ''
    });
  };

  const openPaymentModal = (method = null) => {
    if (method && method.type === 'card') {
      setEditingPaymentMethod(method);
      setPaymentForm({
        type: 'card',
        cardNumber: method.maskedCardNumber || '',
        expiryDate: method.expiryDate || '',
        cvv: '',
        cardHolder: method.cardHolder || '',
        isDefault: method.isDefault || false
      });
    } else {
      resetPaymentForm();
    }
    setShowPaymentModal(true);
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };


  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const displayUserData = isViewingOwnProfile ? userData : viewingUserData;
  
  const getInitials = () => {
    const data = displayUserData;
    if (data?.fullName) {
      const names = data.fullName.split(' ');
      if (names.length >= 2) {
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
      }
      return data.fullName.slice(0, 2).toUpperCase();
    }
    if (data?.displayName) {
      return data.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return 'OY';
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
      <OyuncuSidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isViewingOwnProfile ? 'Profil' : `${displayUserData?.fullName || displayUserData?.displayName || 'Oyuncu'} Profili`}
            </h1>
            <p className="text-gray-600">
              {isViewingOwnProfile ? 'Kişisel bilgilerinizi ve ödeme yöntemlerinizi yönetin' : 'Oyuncu profil bilgileri'}
            </p>
          </div>

          {/* Tabs */}
          {isViewingOwnProfile && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 mb-6">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'profile'
                    ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <User className="w-5 h-5" />
                  <span>Profil Bilgileri</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('payment')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'payment'
                    ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  <span>Ödeme Yöntemleri</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'security'
                    ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Lock className="w-5 h-5" />
                  <span>Güvenlik</span>
                </div>
              </button>
            </div>
          </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Profil Fotoğrafı */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center space-x-6">
                  <div className="relative">
                    {photoPreview || userData?.photoURL || user?.photoURL ? (
                      <img
                        src={photoPreview || userData?.photoURL || user?.photoURL}
                        alt="Profil"
                        className="w-24 h-24 rounded-full object-cover border-4 border-green-100"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-gradient-to-br from-green-600 to-green-700 rounded-full flex items-center justify-center border-4 border-green-100">
                        <span className="text-3xl font-bold text-white">{getInitials()}</span>
                      </div>
                    )}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="absolute bottom-0 right-0 w-10 h-10 bg-gradient-to-r from-green-600 to-green-700 rounded-full flex items-center justify-center shadow-lg hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50"
                    >
                      {uploadingPhoto ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Camera className="w-5 h-5 text-white" />
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">
                      {userData?.fullName || userData?.displayName || user?.email}
                    </h3>
                    <p className="text-gray-600 mb-3">{user?.email}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{stats.totalMatches || 0} Maç</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4" />
                        <span>{userData?.city || 'İstanbul'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Başarılar & Rozetler */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                  <Award className="w-6 h-6 text-green-600" />
                  Başarılar & Rozetler
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {getAchievements(displayUserData).map((achievement) => {
                    const Icon = achievement.icon;
                    return (
                      <div 
                        key={achievement.id}
                        className={`rounded-xl p-4 border transition-all ${
                            achievement.earned 
                            ? 'bg-white border-green-100 shadow-sm' 
                            : 'bg-gray-50 border-gray-100 opacity-60 grayscale'
                        }`}
                      >
                         <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${achievement.earned ? achievement.color : 'bg-gray-200 text-gray-400'}`}>
                             <Icon size={24} />
                         </div>
                         <h4 className="font-bold text-gray-900 mb-1">{achievement.title}</h4>
                         <p className="text-xs text-gray-500">{achievement.desc}</p>
                         {achievement.earned && (
                             <div className="mt-2 flex items-center gap-1 text-xs font-bold text-green-600">
                                 <CheckCircle size={12} />
                                 <span>Kazanıldı</span>
                             </div>
                         )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Kişisel Bilgiler */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                  <User className="w-6 h-6 text-green-600" />
                  Kişisel Bilgiler
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ad Soyad</label>
                    <input
                      type="text"
                      name="fullName"
                      value={editForm.fullName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Mehmet Özkan"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={editForm.email}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                      placeholder="mehmet@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                    <input
                      type="tel"
                      name="phone"
                      value={editForm.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="+90 532 123 45 67"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Doğum Yılı</label>
                    <input
                      type="number"
                      name="birthYear"
                      value={editForm.birthYear}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="1990"
                      min="1950"
                      max="2010"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cinsiyet</label>
                    <select
                      name="gender"
                      value={editForm.gender}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">Seçiniz</option>
                      <option value="male">Erkek</option>
                      <option value="female">Kadın</option>
                      <option value="other">Diğer</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Biyografi</label>
                    <textarea
                      name="bio"
                      value={editForm.bio}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Futbol tutkunu, hafta sonları sahada! ⚽"
                    />
                  </div>
                </div>
              </div>

              {/* Spor Bilgileri */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                  <Star className="w-6 h-6 text-green-600" />
                  Spor Bilgileri
                </h3>
                
                {/* Favori Sporlar */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Favori Sporlarınız *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {sports.map((sport) => (
                      <button
                        key={sport.id}
                        type="button"
                        onClick={() => handleFavoriteSportsChange(sport.id)}
                        className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all duration-200 ${
                          editForm.favoriteSports.includes(sport.id)
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-green-300'
                        }`}
                      >
                        <span className="text-2xl">{sport.icon}</span>
                        <span className="text-sm font-medium">{sport.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Her seçilen spor için dinamik alanlar */}
                {editForm.favoriteSports.map((sportId) => {
                  const sport = sports.find(s => s.id === sportId);
                  const preference = getSportPreference(sportId);
                  
                  return (
                    <div
                      key={sportId}
                      className="mb-6 space-y-4 rounded-lg border-2 border-green-200 bg-green-50 p-4"
                    >
                      <h4 className="flex items-center gap-2 text-lg font-semibold text-green-900">
                        <span className="text-2xl">{sport?.icon}</span>
                        {sport?.name} Tercihleri
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Spor Seviyeniz */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Spor Seviyeniz *
                          </label>
                          <select
                            value={preference.skillLevel}
                            onChange={(e) => handleSportPreferenceChange(sportId, 'skillLevel', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          >
                            <option value="">Seçiniz</option>
                            {skillLevels.map((level) => (
                              <option key={level.id} value={level.id}>
                                {level.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Favori Mevki/Pozisyon */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Favori Mevki/Pozisyon *
                          </label>
                          <select
                            value={preference.position}
                            onChange={(e) => handleSportPreferenceChange(sportId, 'position', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          >
                            <option value="">Seçiniz</option>
                            {(sportPositions[sportId] || []).map((position) => (
                              <option key={position} value={position}>
                                {position}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Oyun Sıklığı */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Oyun Sıklığı *
                          </label>
                          <select
                            value={preference.playFrequency}
                            onChange={(e) => handleSportPreferenceChange(sportId, 'playFrequency', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          >
                            <option value="">Seçiniz</option>
                            {playFrequencies.map((frequency) => (
                              <option key={frequency} value={frequency}>
                                {frequency}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Konum */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-green-600" />
                  Konum
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">İl</label>
                    <input
                      type="text"
                      name="city"
                      value={editForm.city}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="İstanbul"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">İlçe</label>
                    <input
                      type="text"
                      name="district"
                      value={editForm.district}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Kadıköy"
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all flex items-center space-x-2 shadow-lg disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Kaydediliyor...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span>Değişiklikleri Kaydet</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Payment Methods Tab */}
          {activeTab === 'payment' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Ödeme Yöntemleri</h2>
                  <p className="text-gray-600">Kart bilgilerinizi yönetin</p>
                </div>
                <button
                  onClick={() => openPaymentModal()}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all flex items-center gap-2 shadow-lg"
                >
                  <Plus className="w-5 h-5" />
                  Yeni Ödeme Yöntemi
                </button>
              </div>

              {paymentMethods.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                  <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Henüz ödeme yöntemi eklenmemiş</p>
                  <button
                    onClick={() => openPaymentModal()}
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all"
                  >
                    İlk Ödeme Yöntemini Ekle
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className={`bg-white rounded-xl shadow-sm border-2 p-6 ${
                        method.isDefault ? 'border-green-500 bg-green-50' : 'border-gray-100'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                            <CreditCard className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">Kredi/Banka Kartı</h3>
                            {method.isDefault && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 mt-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                <Check className="w-3 h-3" />
                                Varsayılan
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!method.isDefault && (
                            <button
                              onClick={() => handleSetDefaultPaymentMethod(method.id)}
                              className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                              title="Varsayılan yap"
                            >
                              <Star className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            onClick={() => openPaymentModal(method)}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Düzenle"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeletePaymentMethod(method.id)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            title="Sil"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">Kart Numarası</p>
                        <p className="text-lg font-mono font-semibold text-gray-900">
                          {method.maskedCardNumber || method.cardNumber || '**** **** **** ****'}
                        </p>
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>Son Kullanma: {method.expiryDate || '**/**'}</span>
                          <span>{method.cardHolder || 'Kart Sahibi'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Güvenlik</h2>
                <p className="text-gray-600">Hesap güvenliğinizi yönetin</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Şifre Değiştir</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mevcut Şifre</label>
                    <input
                      type="password"
                      value={securityForm.currentPassword}
                      onChange={(e) => setSecurityForm({ ...securityForm, currentPassword: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Mevcut şifrenizi girin"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Yeni Şifre</label>
                    <input
                      type="password"
                      value={securityForm.newPassword}
                      onChange={(e) => setSecurityForm({ ...securityForm, newPassword: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Yeni şifrenizi girin"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Yeni Şifre (Tekrar)</label>
                    <input
                      type="password"
                      value={securityForm.confirmPassword}
                      onChange={(e) => setSecurityForm({ ...securityForm, confirmPassword: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Yeni şifrenizi tekrar girin"
                    />
                  </div>
                  <button
                    onClick={handleChangePassword}
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-lg"
                  >
                    Şifreyi Değiştir
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Payment Method Modal */}
        {showPaymentModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 bg-white rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingPaymentMethod ? 'Kart Düzenle' : 'Yeni Kart Ekle'}
                </h2>
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    resetPaymentForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <form onSubmit={handleAddPaymentMethod} className="p-6 space-y-6">
              {/* Card Prototype */}
              <div className="relative mb-8 flex justify-center" style={{ perspective: '1200px' }}>
                <div 
                  className="relative transition-transform duration-700 cursor-pointer"
                  onClick={() => setCardFlipped(!cardFlipped)}
                  style={{ 
                    transformStyle: 'preserve-3d',
                    transform: cardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    width: '100%',
                    maxWidth: '540px',
                    aspectRatio: '85.6/53.98'
                  }}
                >
                    {/* Front of Card */}
                    <div 
                      className="relative w-full h-full mx-auto rounded-2xl shadow-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-6 sm:p-8 text-white overflow-hidden"
                      style={{ 
                        backfaceVisibility: 'hidden', 
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(0deg)',
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        top: 0,
                        left: 0
                      }}
                    >
                      {/* Decorative Circles */}
                      <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                      <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                      
                      {/* Card Type Logo */}
                      <div className="absolute top-6 right-6 flex items-center gap-2">
                        {detectCardType(paymentForm.cardNumber) === 'visa' && (
                          <div className="text-3xl sm:text-5xl font-bold tracking-wider">VISA</div>
                        )}
                        {detectCardType(paymentForm.cardNumber) === 'mastercard' && (
                          <div className="text-2xl sm:text-4xl font-bold tracking-wider">MC</div>
                        )}
                        {detectCardType(paymentForm.cardNumber) === 'amex' && (
                          <div className="text-xl sm:text-3xl font-bold tracking-wider">AMEX</div>
                        )}
                      </div>
                      
                      {/* Chip */}
                      <div className="absolute top-6 left-6">
                        <div className="w-12 h-10 sm:w-14 sm:h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-md shadow-lg"></div>
                        <div className="w-12 h-10 sm:w-14 sm:h-12 bg-gradient-to-br from-yellow-300/50 to-transparent rounded-md absolute top-0 left-0"></div>
                      </div>
                      
                      {/* Card Number */}
                      <div className="absolute bottom-20 left-6 right-6">
                        <div className="text-xs sm:text-sm text-white/80 mb-2 font-medium">Kart Numarası</div>
                        <div className="text-xl sm:text-3xl font-mono tracking-wider font-semibold">
                          {paymentForm.cardNumber || '•••• •••• •••• ••••'}
                        </div>
                      </div>
                      
                      {/* Card Holder and Expiry */}
                      <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                        <div className="flex-1 min-w-0 mr-4">
                          <div className="text-xs sm:text-sm text-white/80 mb-1 font-medium">Kart Sahibi</div>
                          <div className="text-base sm:text-xl font-semibold uppercase truncate">
                            {paymentForm.cardHolder || 'KART SAHİBİ'}
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <div className="text-xs sm:text-sm text-white/80 mb-1 font-medium">Son Kullanma</div>
                          <div className="text-base sm:text-xl font-semibold">
                            {paymentForm.expiryDate || 'MM/YY'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Back of Card */}
                    <div 
                      className="relative w-full h-full mx-auto rounded-2xl shadow-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-6 sm:p-8 text-white overflow-hidden"
                      style={{ 
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        top: 0,
                        left: 0
                      }}
                    >
                      {/* Decorative Circles */}
                      <div className="absolute -top-20 -left-20 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                      <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                      
                      {/* Magnetic Strip */}
                      <div className="absolute top-0 left-0 right-0 h-12 sm:h-16 bg-black/40 mt-6"></div>
                      
                      {/* CVV Area */}
                      <div className="absolute bottom-6 left-6 right-6">
                        <div className="bg-white/95 rounded-lg p-4 flex items-center justify-end mb-3">
                          <div className="text-right">
                            <div className="text-xs text-gray-600 mb-1 font-medium">CVV</div>
                            <div className="text-2xl sm:text-3xl font-mono font-bold text-gray-900 tracking-wider">
                              {paymentForm.cvv || '•••'}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs sm:text-sm text-white/70 text-center">
                          Kartı çevirmek için tıklayın
                        </div>
                      </div>
                    </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCardFlipped(!cardFlipped)}
                  className="absolute bottom-4 right-4 p-3 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors z-10 shadow-lg"
                  title="Kartı Çevir"
                >
                  <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kart Numarası</label>
                  <input
                    type="text"
                    value={paymentForm.cardNumber}
                    onChange={(e) => {
                      const formatted = formatCardNumber(e.target.value);
                      setPaymentForm({ ...paymentForm, cardNumber: formatted });
                      const cleanNumber = formatted.replace(/\s/g, '');
                      const error = validateCardNumber(cleanNumber);
                      setCardErrors(prev => ({ ...prev, cardNumber: error }));
                    }}
                    onBlur={() => {
                      const cleanNumber = paymentForm.cardNumber.replace(/\s/g, '');
                      const error = validateCardNumber(cleanNumber);
                      setCardErrors(prev => ({ ...prev, cardNumber: error }));
                    }}
                    className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-base sm:text-lg ${
                      cardErrors.cardNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    required
                  />
                  {cardErrors.cardNumber && (
                    <p className="mt-1 text-xs sm:text-sm text-red-600">{cardErrors.cardNumber}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Son Kullanma Tarihi</label>
                  <input
                    type="text"
                    value={paymentForm.expiryDate}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, '');
                      if (value.length >= 2) {
                        value = value.slice(0, 2) + '/' + value.slice(2, 4);
                      }
                      setPaymentForm({ ...paymentForm, expiryDate: value });
                      const error = validateExpiryDate(value);
                      setCardErrors(prev => ({ ...prev, expiryDate: error }));
                    }}
                    onBlur={() => {
                      const error = validateExpiryDate(paymentForm.expiryDate);
                      setCardErrors(prev => ({ ...prev, expiryDate: error }));
                    }}
                    className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-base sm:text-lg ${
                      cardErrors.expiryDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="MM/YY"
                    maxLength={5}
                    required
                  />
                  {cardErrors.expiryDate && (
                    <p className="mt-1 text-sm text-red-600">{cardErrors.expiryDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">CVV</label>
                  <input
                    type="text"
                    value={paymentForm.cvv}
                    onChange={(e) => {
                      const cardType = detectCardType(paymentForm.cardNumber);
                      const maxLength = cardType === 'amex' ? 4 : 3;
                      const value = e.target.value.replace(/\D/g, '').slice(0, maxLength);
                      setPaymentForm({ ...paymentForm, cvv: value });
                      if (value) {
                        setCardFlipped(true);
                      }
                      const error = validateCVV(value, paymentForm.cardNumber);
                      setCardErrors(prev => ({ ...prev, cvv: error }));
                    }}
                    onFocus={() => setCardFlipped(true)}
                    onBlur={() => {
                      const error = validateCVV(paymentForm.cvv, paymentForm.cardNumber);
                      setCardErrors(prev => ({ ...prev, cvv: error }));
                      if (!paymentForm.cvv) {
                        setCardFlipped(false);
                      }
                    }}
                    className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-base sm:text-lg ${
                      cardErrors.cvv ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder={detectCardType(paymentForm.cardNumber) === 'amex' ? '1234' : '123'}
                    maxLength={detectCardType(paymentForm.cardNumber) === 'amex' ? 4 : 3}
                    required
                  />
                  {cardErrors.cvv && (
                    <p className="mt-1 text-sm text-red-600">{cardErrors.cvv}</p>
                  )}
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kart Sahibi Adı</label>
                  <input
                    type="text"
                    value={paymentForm.cardHolder}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase();
                      setPaymentForm({ ...paymentForm, cardHolder: value });
                      const error = !value ? 'Kart sahibi adı gereklidir' : '';
                      setCardErrors(prev => ({ ...prev, cardHolder: error }));
                    }}
                    onBlur={() => {
                      const error = !paymentForm.cardHolder ? 'Kart sahibi adı gereklidir' : '';
                      setCardErrors(prev => ({ ...prev, cardHolder: error }));
                    }}
                    className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-base sm:text-lg ${
                      cardErrors.cardHolder ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="MEHMET ÖZKAN"
                    required
                  />
                  {cardErrors.cardHolder && (
                    <p className="mt-1 text-sm text-red-600">{cardErrors.cardHolder}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center pt-4 border-t">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={paymentForm.isDefault}
                  onChange={(e) => setPaymentForm({ ...paymentForm, isDefault: e.target.checked })}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <label htmlFor="isDefault" className="ml-2 text-sm text-gray-700">
                  Varsayılan ödeme yöntemi olarak ayarla
                </label>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    resetPaymentForm();
                  }}
                  className="w-full sm:w-auto px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-lg font-medium"
                >
                  {editingPaymentMethod ? 'Güncelle' : 'Kartı Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      </div>
    </div>
  );
};

export default Profil;

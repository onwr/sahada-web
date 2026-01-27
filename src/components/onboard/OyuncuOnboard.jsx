import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Calendar,
  Phone,
  Camera,
  ChevronRight,
  ChevronLeft,
  Check,
  Star,
  Clock,
  Target,
  Activity,
  Mars,
  Venus,
  CircleAlert,
  Loader2,
  MessageCircle,
} from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { useAuth } from '../../contexts/AuthContext';
import { updateUserData } from '../../services/authService';
import { uploadProfileImage, getImageUrl, getOptimizedImageUrl } from '../../services/cdnService';
import ProfileImageUploader from '../ProfileImageUploader';
import toast from '../../utils/toast';

const OyuncuOnboard = () => {
  const navigate = useNavigate();
  const { user, userData, setUserData, setNeedsOnboarding } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    // Temel Bilgiler
    fullName: '',
    profilePhoto: null,
    birthYear: '',
    gender: '',
    phone: '',
    whatsapp: '',
    usePhoneForWhatsapp: false,

    // Spor Bilgileri - Her spor için ayrı alanlar
    favoriteSports: [],
    sportPreferences: [], // [{ sportId: 'football', skillLevel: '', position: '', playFrequency: '' }]
    preferredHours: [],

    // Koşullu Alanlar
    clubName: '',
    licenseNumber: '',
    height: '',
    weight: '',
    favoriteTeam: '',
    sportsHistory: '',
    emergencyContact: '',
    emergencyPhone: '',
  });

  const [errors, setErrors] = useState({});
  const [profileCompletion, setProfileCompletion] = useState(20);
  const [showReward, setShowReward] = useState(false);
  const [profileImageData, setProfileImageData] = useState(null);
  const dataLoadedRef = useRef(false);
  const [agreements, setAgreements] = useState({
    terms: false,
    kvkk: false,
    campaigns: false,
    whatsapp: false,
    membershipAgreement: false
  });
  
  // SMS Verification States
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);

  const steps = [
    { id: 1, title: 'Temel Bilgiler', description: 'Profilinizi tamamlayın' },
    { id: 2, title: 'Spor Bilgileri', description: 'Spor tercihlerinizi belirtin' },
    { id: 3, title: 'Tamamlandı', description: 'Profiliniz hazır!' },
  ];

  const sports = [
    { id: 'football', name: 'Futbol', icon: '⚽' },
    { id: 'basketball', name: 'Basketbol', icon: '🏀' },
    { id: 'tennis', name: 'Tenis', icon: '🎾' },
    { id: 'volleyball', name: 'Voleybol', icon: '🏐' },
    { id: 'badminton', name: 'Badminton', icon: '🏸' },
    { id: 'swimming', name: 'Yüzme', icon: '🏊' },
  ];

  const skillLevels = [
    { id: 'beginner', name: 'Başlangıç', description: 'Yeni başlıyorum' },
    { id: 'amateur', name: 'Amatör', description: 'Hobi olarak oynuyorum' },
    { id: 'intermediate', name: 'Orta', description: 'Düzenli oynuyorum' },
    { id: 'advanced', name: 'İyi', description: 'Deneyimliyim' },
    { id: 'professional', name: 'Profesyonel', description: 'Profesyonel seviyede' },
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

  const timeSlots = [
    '06:00-09:00',
    '09:00-12:00',
    '12:00-15:00',
    '15:00-18:00',
    '18:00-21:00',
    '21:00-24:00',
  ];

  // Kullanıcı verilerini yükle (sadece bir kez)
  useEffect(() => {
    // Sadece veri yüklenmediyse ve userData varsa çalış
    if (!dataLoadedRef.current && userData && !userData.onboardingCompleted) {
      const favoriteSports = userData.favoriteSports || [];
      const sportPreferences = userData.sportPreferences || [];
      
      // Eğer eski format varsa (skillLevel, position, playFrequency direkt), yeni formata çevir
      let newSportPreferences = sportPreferences;
      if (userData.skillLevel && favoriteSports.length > 0 && sportPreferences.length === 0) {
        // Eski format: tüm sporlar için aynı değerler
        newSportPreferences = favoriteSports.map(sportId => ({
          sportId,
          skillLevel: userData.skillLevel || '',
          position: userData.position || '',
          playFrequency: userData.playFrequency || ''
        }));
      }
      
      setFormData(prev => ({
        ...prev,
        fullName: userData.fullName || userData.displayName || '',
        birthYear: userData.birthYear || '',
        gender: userData.gender || '',
        phone: userData.phone || '',
        whatsapp: userData.whatsapp || userData.phone || '', // Fallback to phone if whatsapp empty
        usePhoneForWhatsapp: userData.whatsapp === userData.phone,
        favoriteSports,
        sportPreferences: newSportPreferences,
        preferredHours: userData.preferredHours || [],
        clubName: userData.clubName || '',
        licenseNumber: userData.licenseNumber || '',
        height: userData.height || '',
        weight: userData.weight || '',
        favoriteTeam: userData.favoriteTeam || '',
        sportsHistory: userData.sportsHistory || '',
        emergencyContact: userData.emergencyContact || '',
        emergencyPhone: userData.emergencyPhone || '',
      }));
      
      if (userData.profilePhoto) {
        setProfileImageData(userData.profilePhoto);
        setFormData(prev => ({
          ...prev,
          profilePhoto: userData.profilePhoto.url || userData.profilePhoto
        }));
      }
      
      dataLoadedRef.current = true;
    }
  }, [userData]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Hata mesajını temizle
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    }

    // Progressive profiling - puan hesaplama
    updateProfileCompletion();
  };

  const handleMultiSelect = (field, value) => {
    if (field === 'favoriteSports') {
      setFormData((prev) => {
        const isSelected = prev.favoriteSports.includes(value);
        const newFavoriteSports = isSelected
          ? prev.favoriteSports.filter((item) => item !== value)
          : [...prev.favoriteSports, value];
        
        // Spor seçildiyse veya kaldırıldıysa sportPreferences'i güncelle
        let newSportPreferences = [...prev.sportPreferences];
        if (isSelected) {
          // Spor kaldırıldıysa, o sporun tercihlerini de kaldır
          newSportPreferences = newSportPreferences.filter(sp => sp.sportId !== value);
        } else {
          // Spor eklendiyse, yeni bir tercih objesi ekle
          newSportPreferences.push({
            sportId: value,
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
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: prev[field].includes(value)
          ? prev[field].filter((item) => item !== value)
          : [...prev[field], value],
      }));
    }

    // Progressive profiling - puan hesaplama
    updateProfileCompletion();
  };

  const handleSportPreferenceChange = (sportId, field, value) => {
    setFormData((prev) => {
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
    updateProfileCompletion();
  };

  const getSportPreference = (sportId) => {
    return formData.sportPreferences.find(sp => sp.sportId === sportId) || {
      sportId,
      skillLevel: '',
      position: '',
      playFrequency: ''
    };
  };

  const formatPhoneNumber = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    let formatted = digits;
    if (digits.length > 0) formatted = '(' + digits.substring(0, 3);
    if (digits.length >= 4) formatted += ') ' + digits.substring(3, 6);
    if (digits.length >= 7) formatted += ' ' + digits.substring(6, 8);
    if (digits.length >= 9) formatted += ' ' + digits.substring(8, 10);
    return formatted;
  };

  const handlePhoneChange = (e, field) => {
      const raw = e.target.value;
      const formatted = formatPhoneNumber(raw);
      
      setFormData(prev => {
          const newState = { ...prev, [field]: formatted };
          if (field === 'phone' && prev.usePhoneForWhatsapp) {
              newState.whatsapp = formatted;
          }
          return newState;
      });
      
      if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
      setTimeout(updateProfileCompletion, 0); 
  };
  
  const handleSyncToggle = (e) => {
      const isChecked = e.target.checked;
      setFormData(prev => ({
          ...prev,
          usePhoneForWhatsapp: isChecked,
          whatsapp: isChecked ? prev.phone : prev.whatsapp
      }));
  };

  const updateProfileCompletion = () => {
    let completion = 20; // Başlangıç puanı (kayıt)

    // Temel bilgiler (+10 puan)
    if (formData.fullName) completion += 5;
    if (formData.birthYear) completion += 5;
    if (formData.gender) completion += 3;
    if (formData.whatsapp) completion += 2;

    // Profil fotoğrafı (+10 puan)
    if (formData.profilePhoto) completion += 10;

    // Spor bilgileri (+15 puan)
    if (formData.favoriteSports.length > 0) completion += 5;
    // Her spor için tercihler kontrol edilir
    formData.sportPreferences.forEach(sp => {
      if (sp.skillLevel) completion += 3;
      if (sp.position) completion += 2;
      if (sp.playFrequency) completion += 1;
    });

    // Ek puanlar
    if (formData.preferredHours.length > 0) completion += 5;

    // Maksimum %100
    completion = Math.min(completion, 100);

    setProfileCompletion(completion);
  };

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.fullName || formData.fullName.trim().length < 3) {
        newErrors.fullName = 'Geçerli bir ad soyad giriniz';
      }

      if (!formData.birthYear) {
        newErrors.birthYear = 'Doğum yılı gereklidir';
      } else if (new Date().getFullYear() - parseInt(formData.birthYear) < 13) {
        newErrors.birthYear = 'En az 13 yaşında olmalısınız';
      }

      if (!formData.gender) {
        newErrors.gender = 'Cinsiyet seçimi gereklidir';
      }

      if (!formData.phone) {
        newErrors.phone = 'Telefon numarası gereklidir';
      } else if (formData.phone.replace(/\D/g, '').length < 10) {
        newErrors.phone = 'Geçerli bir telefon numarası girin';
      }

      if (!formData.whatsapp) {
        newErrors.whatsapp = 'WhatsApp numarası gereklidir';
      } else if (formData.whatsapp.replace(/\D/g, '').length < 10) {
        newErrors.whatsapp = 'Geçerli bir telefon numarası girin';
      }
    } else if (step === 2) {
      if (formData.favoriteSports.length === 0) {
        newErrors.favoriteSports = 'En az bir spor seçmelisiniz';
      }

      // Her seçilen spor için tercihler kontrol edilir
      formData.favoriteSports.forEach(sportId => {
        const preference = getSportPreference(sportId);
        if (!preference.skillLevel) {
          newErrors[`skillLevel_${sportId}`] = `${sports.find(s => s.id === sportId)?.name || 'Spor'} için seviye seçimi gereklidir`;
        }
        if (!preference.position) {
          newErrors[`position_${sportId}`] = `${sports.find(s => s.id === sportId)?.name || 'Spor'} için mevki/pozisyon seçimi gereklidir`;
        }
        if (!preference.playFrequency) {
          newErrors[`playFrequency_${sportId}`] = `${sports.find(s => s.id === sportId)?.name || 'Spor'} için oyun sıklığı seçimi gereklidir`;
        }
      });
    }

    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      toast.error(firstError);
      
      // Hatalı alana kaydır
      setTimeout(() => {
        const firstErrorKey = Object.keys(newErrors)[0];
        const element = document.getElementById(firstErrorKey);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return false;
    }
    
    return true;
  };

  // SMS Functions
  const sendOTP = async (phone, code) => {
    console.log('=== SMS GÖNDERME BAŞLADI ===');
    console.log('1. Gelen telefon:', phone);
    console.log('2. Gelen kod:', code);
    
    try {
      const username = '8503059015';
      const password = '4A33D@1';
      const header = 'Bigabe';
      
      console.log('3. NetGSM Bilgileri:', { username, header });
      
      let formattedPhone = String(phone).replace(/\D/g, '').replace(/^90/, '').replace(/^\+90/, '').replace(/^0/, '');
      console.log('4. Temizlenmiş telefon:', formattedPhone);
      
      if (formattedPhone.length === 10) formattedPhone = '0' + formattedPhone;
      console.log('5. Formatlanmış telefon:', formattedPhone);
      
      const message = `Saha Merkezi Doğrulama Kodunuz: ${code}\nTelefon numaranızı doğrulamak için bu kodu girin.`;
      console.log('6. Mesaj:', message);
      
      const apiUrl = 'https://api.netgsm.com.tr/sms/send/get';
      const requestData = new URLSearchParams({
        usercode: username,
        password: password,
        gsmno: formattedPhone,
        message: message,
        msgheader: header,
        dil: 'TR'
      });
      
      console.log('7. API URL:', apiUrl);
      console.log('8. Request Data:', Object.fromEntries(requestData));
      
      try {
        console.log('9. Fetch başlatılıyor...');
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: requestData
        });
        
        console.log('10. Response status:', response.status);
        console.log('11. Response ok:', response.ok);
        
        const text = await response.text();
        console.log('12. NetGSM Yanıt:', text);
        
        const success = text.startsWith('00') || text.startsWith('01') || text.startsWith('02');
        console.log('13. Başarılı mı?:', success);
        console.log('=== SMS GÖNDERME BİTTİ ===');
        
        return success;
      } catch (fetchError) {
        console.error('14. FETCH HATASI:', fetchError);
        console.error('Hata detayı:', fetchError.message);
        console.log('=== SMS GÖNDERME HATA İLE BİTTİ (FETCH) ===');
        return true;
      }
    } catch (error) {
      console.error('15. GENEL HATA:', error);
      console.error('Hata detayı:', error.message);
      console.log('=== SMS GÖNDERME HATA İLE BİTTİ (GENEL) ===');
      return false;
    }
  };
  
  const verifyOTP = (inputCode, generatedCode) => {
    return inputCode === generatedCode;
  };
  
  const handleSendOTP = async () => {
    console.log('>>> handleSendOTP çağrıldı');
    console.log('Form telefon:', formData.phone);
    
    if (!formData.phone || formData.phone.replace(/\D/g, '').length < 10) {
      console.error('Telefon numarası geçersiz');
      toast.error('Geçerli bir telefon numarası girin');
      return;
    }
    
    setOtpLoading(true);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('Oluşturulan OTP:', otp);
    setGeneratedOTP(otp);
    
    console.log('sendOTP fonksiyonu çağrılıyor...');
    const sent = await sendOTP(formData.phone, otp);
    console.log('sendOTP sonucu:', sent);
    
    setOtpLoading(false);
    
    if (sent) {
      console.log('✅ SMS başarıyla gönderildi');
      setShowOTPModal(true);
      toast.success('SMS gönderildi!');
    } else {
      console.error('❌ SMS gönderilemedi');
      toast.error('SMS gönderilemedi');
    }
  };
  
  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast.error('6 haneli kodu girin');
      return;
    }
    
    setOtpLoading(true);
    const isValid = verifyOTP(otpCode, generatedOTP);
    setOtpLoading(false);
    
    if (isValid) {
      setPhoneVerified(true);
      setShowOTPModal(false);
      setOtpCode('');
      toast.success('Telefon doğrulandı!');
      
      await updateUserData(user.uid, { phoneVerified: true, phone: formData.phone });
    } else {
      toast.error('Kod hatalı');
    }
  };

  const nextStep = () => {
    if (currentStep === 1 && !phoneVerified && (!userData?.phoneVerified)) {
      toast.error('Lütfen telefon numaranızı doğrulayın');
      return;
    }
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Profil fotoğrafı değişikliği
  const handleProfileImageChange = (imageData) => {
    setProfileImageData(imageData);
    setFormData(prev => ({
      ...prev,
      profilePhoto: imageData ? (imageData.url || imageData) : null
    }));
    updateProfileCompletion();
  };

  // Anlaşma değişikliği
  const handleAgreementChange = (field, value) => {
    setAgreements(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Form gönderme
  const handleSubmit = async () => {
    if (!user) {
      console.error('Kullanıcı giriş yapmamış');
      return;
    }

    // Zorunlu anlaşmaları kontrol et
    if (!agreements.terms || !agreements.kvkk || !agreements.membershipAgreement) {
      const errorMsg = 'Lütfen tüm zorunlu sözleşmeleri onaylayın';
      setErrors({ submit: errorMsg });
      toast.error(errorMsg);
      
      const agreementIds = ['terms', 'kvkk', 'membershipAgreement'];
      for (const id of agreementIds) {
        if (!agreements[id]) {
          const element = document.getElementById(id);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          break;
        }
      }
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Profil verilerini hazırla
      const profileData = {
        ...formData,
        profilePhoto: profileImageData,
        photoURL: profileImageData?.url || (typeof formData.profilePhoto === 'string' ? formData.profilePhoto : formData.profilePhoto?.url) || '', //photoURL alanını da ekleyelim, sidebar buna bakıyor
        agreements,
        onboardingCompleted: true,
        profileCompleted: true,
        sportPreferences: formData.sportPreferences, // Her spor için ayrı tercihler
        updatedAt: new Date()
      };
      
      // Eski format uyumluluğu için (geriye dönük uyumluluk)
      if (formData.sportPreferences.length > 0) {
        // İlk sporun tercihlerini genel alanlara da kaydet (geriye dönük uyumluluk)
        const firstPreference = formData.sportPreferences[0];
        profileData.skillLevel = firstPreference.skillLevel;
        profileData.position = firstPreference.position;
        profileData.playFrequency = firstPreference.playFrequency;
      }

      // Firebase'e kaydet
      const result = await updateUserData(user.uid, profileData);
      
      if (result.success) {
        // Onboarding tamamlandı olarak işaretle (önce bunu yap)
        if (setNeedsOnboarding) {
          setNeedsOnboarding(false);
        }

        // Firebase Auth profilini de güncelle
        const finalPhotoURL = profileImageData?.url || formData.profilePhoto;
        if (finalPhotoURL) {
          try {
            await updateProfile(user, {
              photoURL: finalPhotoURL
            });
          } catch (authError) {
            console.error('Auth profile update error:', authError);
          }
        }
        
        // Context'i güncelle
        setUserData(prev => ({
          ...prev,
          ...profileData
        }));

        // Başarılı olduğunda kısa bir gecikme ile yönlendir (state güncellemelerinin tamamlanması için)
        setTimeout(() => {
          navigate('/oyuncu/dashboard', { replace: true });
        }, 100);
      } else {
        setErrors({ submit: result.error || 'Profil güncellenirken hata oluştu' });
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Profil güncelleme hatası:', error);
      setErrors({ submit: 'Profil güncellenirken hata oluştu' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercentage = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className='min-h-screen bg-gray-50 py-8'>
      <div className='container mx-auto w-full max-w-4xl px-4'>
      <h2 className='text-2xl text-center font-bold text-gray-900'>{steps[currentStep - 1].title}</h2>
      <p className='mt-1 text-gray-600 text-center mb-5'>{steps[currentStep - 1].description}</p>


        {/* Progress Bar */}
         <div className='mb-8'>
           <div className='flex w-full items-center justify-between '>
             {steps.map((step, index) => (
               <div key={step.id} className='flex items-center'>
                 <div
                   className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                     currentStep >= step.id
                       ? 'border-green-500 bg-green-500 text-white'
                       : 'border-gray-300 bg-white text-gray-400'
                   }`}
                 >
                   {currentStep > step.id ? (
                     <Check size={20} />
                   ) : (
                     <span className='text-sm font-semibold'>{step.id}</span>
                   )}
                 </div>
                 {index < steps.length - 1 && (
                   <div
                     className={`h-0.5 transition-all duration-300 ${
                       currentStep > step.id ? 'bg-green-500' : 'bg-gray-300'
                     }`}
                   />
                 )}
               </div>
             ))}
           </div>

          <div className='mt-4 text-center'>


            {/* Profil Tamamlama Göstergesi */}
            <div className='mt-4 rounded-lg bg-gray-100 p-4'>
              <div className='mb-2 flex items-center justify-between'>
                <span className='text-sm font-medium text-gray-700'>Profil Tamamlama</span>
                <span className='text-sm font-bold text-green-600'>{profileCompletion}%</span>
              </div>
              <div className='h-2 w-full rounded-full bg-gray-200'>
                <motion.div
                  className='h-2 rounded-full bg-gradient-to-r from-green-500 to-green-600'
                  initial={{ width: 0 }}
                  animate={{ width: `${profileCompletion}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </div>
        </div>


        {/* Form Content */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className='rounded-2xl bg-white p-6 shadow-xl sm:p-8'
        >
          <AnimatePresence mode='wait'>
            {currentStep === 1 && (
              <motion.div
                key='step1'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className='space-y-6'
              >
                <h3 className='mb-6 text-xl font-semibold text-gray-900'>
                  Temel Bilgilerinizi Tamamlayın
                </h3>

                {/* Profil Fotoğrafı */}
                <div className='text-center'>
                  <ProfileImageUploader
                    userId={user?.uid}
                    currentImage={profileImageData}
                    onImageChange={handleProfileImageChange}
                    size="large"
                    className="mb-4"
                  />
                  <p className='text-sm text-gray-600'>
                    Profil fotoğrafınızı ekleyin (opsiyonel)
                  </p>
                </div>

                {/* Ad Soyad */}
                <div>
                  <label className='mb-2 block text-sm font-medium text-gray-700'>
                    Ad Soyad *
                  </label>
                  <div className='relative'>
                    <User
                      className='absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400'
                      size={20}
                    />
                    <input
                      id="fullName"
                      type='text'
                      value={formData.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      placeholder='Adınız ve Soyadınız'
                      className={`w-full rounded-lg border py-3 pr-4 pl-10 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-green-500 focus:outline-none ${
                        errors.fullName ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  {errors.fullName && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className='mt-1 text-sm text-red-500'
                    >
                      {errors.fullName}
                    </motion.p>
                  )}
                </div>

                {/* Doğum Yılı */}
                <div>
                  <label id="birthYear" className='mb-2 text-sm font-medium text-gray-700 flex justify-between items-center'>
                    <span>Doğum Yılı *</span>
                    <span className="text-xl font-bold text-green-600 bg-green-50 px-3 py-1 rounded-lg">
                        {formData.birthYear || 'Seçiniz'}
                    </span>
                  </label>
                  <div className='relative pt-2 px-1'>
                    <input
                      type="range"
                      min={new Date().getFullYear() - 60}
                      max={new Date().getFullYear() - 13}
                      value={formData.birthYear || (new Date().getFullYear() - 18)}
                      onChange={(e) => handleInputChange('birthYear', e.target.value)}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                    />
                     <div className="flex justify-between text-xs font-medium text-gray-400 mt-2">
                        <span>{new Date().getFullYear() - 60}</span>
                        <span>{new Date().getFullYear() - 13}</span>
                    </div>
                  </div>
                  {errors.birthYear && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className='mt-2 text-sm text-red-500'
                    >
                      {errors.birthYear}
                    </motion.p>
                  )}
                </div>

                {/* Cinsiyet */}
                <div id="gender">
                  <label className='mb-3 block text-sm font-medium text-gray-700'>Cinsiyet *</label>
                  <div className='grid grid-cols-3 gap-3'>
                    {[
                      { id: 'male', label: 'Erkek', icon: <Mars /> },
                      { id: 'female', label: 'Kadın', icon: <Venus /> },
                      { id: 'other', label: 'Belirtmek istemiyorum', icon: <CircleAlert /> },
                    ].map((option) => (
                      <motion.button
                        key={option.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleInputChange('gender', option.id)}
                        className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all duration-200 ${
                          formData.gender === option.id
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-green-300'
                        }`}
                      >
                        <span className='text-2xl'>{option.icon}</span>
                        <span className='text-sm font-medium'>{option.label}</span>
                      </motion.button>
                    ))}
                  </div>
                  {errors.gender && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className='mt-1 text-sm text-red-500'
                    >
                      {errors.gender}
                    </motion.p>
                  )}
                </div>

                {/* Telefon ve WhatsApp */}
                <div className="space-y-4">
                     {/* Telefon */}
                    <div>
                      <label className='mb-2 block text-sm font-medium text-gray-700'>
                        Telefon Numarası *
                      </label>
                      <div className='relative'>
                        <Phone
                          className='absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400'
                          size={20}
                        />
                        <input
                          id="phone"
                          type='tel'
                          value={formData.phone}
                          onChange={(e) => handlePhoneChange(e, 'phone')}
                          placeholder='(5XX) XXX XX XX'
                          className={`w-full rounded-lg border py-3 pr-4 pl-10 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-green-500 focus:outline-none ${
                            errors.phone ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      {errors.phone && (
                        <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className='mt-1 text-sm text-red-500'>
                          {errors.phone}
                        </motion.p>
                      )}
                      
                      {/* Verify Button */}
                      {formData.phone && !phoneVerified && !userData?.phoneVerified && (
                        <button
                          onClick={handleSendOTP}
                          disabled={otpLoading}
                          className="mt-2 w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                          {otpLoading ? 'Gönderiliyor...' : 'Telefonu Doğrula'}
                        </button>
                      )}
                      
                      {(phoneVerified || userData?.phoneVerified) && (
                        <div className="mt-2 flex items-center gap-2 text-green-600 text-sm">
                          <Check size={16} />
                          <span>Telefon doğrulandı</span>
                        </div>
                      )}
                    </div>

                     {/* Sync Checkbox */}
                     <div className="flex items-center pl-1">
                        <label className="flex items-center cursor-pointer group">
                             <div className="relative flex items-center">
                                <input
                                    id="usePhone"
                                    type="checkbox"
                                    checked={formData.usePhoneForWhatsapp}
                                    onChange={handleSyncToggle}
                                    className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 transition-all checked:border-green-500 checked:bg-green-500"
                                />
                                <Check size={14} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100" />
                             </div>
                             <span className="ml-3 text-sm text-gray-600 group-hover:text-gray-900 transition-colors">WhatsApp için de aynı numarayı kullan</span>
                        </label>
                    </div>

                    {/* WhatsApp */}
                    <div className={`transition-all duration-300 ${formData.usePhoneForWhatsapp ? 'opacity-50 grayscale' : ''}`}>
                      <label className='mb-2 block text-sm font-medium text-gray-700'>
                        WhatsApp Numarası *
                      </label>
                      <div className='relative'>
                        <MessageCircle
                          className='absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400'
                          size={20}
                        />
                        <input
                          id="whatsapp"
                          type='tel'
                          value={formData.whatsapp}
                          onChange={(e) => handlePhoneChange(e, 'whatsapp')}
                          placeholder='(5XX) XXX XX XX'
                          disabled={formData.usePhoneForWhatsapp}
                          className={`w-full rounded-lg border py-3 pr-4 pl-10 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-green-500 focus:outline-none ${
                            errors.whatsapp ? 'border-red-500' : 'border-gray-300'
                          } ${formData.usePhoneForWhatsapp ? 'bg-gray-50' : ''}`}
                        />
                      </div>
                      {errors.whatsapp && (
                        <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className='mt-1 text-sm text-red-500'>
                          {errors.whatsapp}
                        </motion.p>
                      )}
                    </div>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key='step2'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className='space-y-6'
              >
                <h3 className='mb-6 text-xl font-semibold text-gray-900'>
                  Spor Tercihlerinizi Belirtin
                </h3>

                {/* Favori Sporlar */}
                <div>
                  <label className='mb-3 block text-sm font-medium text-gray-700'>
                    Favori Sporlarınız *
                  </label>
                  <div id="favoriteSports" className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
                    {sports.map((sport) => (
                      <motion.button
                        key={sport.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleMultiSelect('favoriteSports', sport.id)}
                        className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all duration-200 ${
                          formData.favoriteSports.includes(sport.id)
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-green-300'
                        }`}
                      >
                        <span className='text-2xl'>{sport.icon}</span>
                        <span className='text-sm font-medium'>{sport.name}</span>
                      </motion.button>
                    ))}
                  </div>
                  {errors.favoriteSports && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className='mt-1 text-sm text-red-500'
                    >
                      {errors.favoriteSports}
                    </motion.p>
                  )}
                </div>

                {/* Her seçilen spor için dinamik alanlar */}
                {formData.favoriteSports.map((sportId) => {
                  const sport = sports.find(s => s.id === sportId);
                  const preference = getSportPreference(sportId);
                  
                  return (
                    <motion.div
                      key={sportId}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className='space-y-4 rounded-lg border-2 border-green-200 bg-green-50 p-4'
                    >
                      <h4 className='flex items-center gap-2 text-lg font-semibold text-green-900'>
                        <span className='text-2xl'>{sport?.icon}</span>
                        {sport?.name} Tercihleri
                      </h4>

                      {/* Spor Seviyeniz */}
                      <div>
                        <label id={`skillLevel_${sportId}`} className='mb-3 block text-sm font-medium text-gray-700'>
                          Spor Seviyeniz *
                        </label>
                        <div className='space-y-2'>
                          {skillLevels.map((level) => (
                            <motion.button
                              key={level.id}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              onClick={() => handleSportPreferenceChange(sportId, 'skillLevel', level.id)}
                              className={`w-full rounded-lg border-2 p-3 text-left transition-all duration-200 ${
                                preference.skillLevel === level.id
                                  ? 'border-green-500 bg-green-100 text-green-700'
                                  : 'border-gray-300 bg-white text-gray-700 hover:border-green-300'
                              }`}
                            >
                              <div className='flex items-center justify-between'>
                                <div>
                                  <div className='font-medium'>{level.name}</div>
                                  <div className='text-xs text-gray-500'>{level.description}</div>
                                </div>
                                <div className='flex'>
                                  {Array.from({ length: 5 }, (_, i) => (
                                    <Star
                                      key={i}
                                      size={14}
                                      className={`${
                                        i < skillLevels.indexOf(level) + 1
                                          ? 'fill-current text-yellow-400'
                                          : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                            </motion.button>
                          ))}
                        </div>
                        {errors[`skillLevel_${sportId}`] && (
                          <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className='mt-1 text-sm text-red-500'
                          >
                            {errors[`skillLevel_${sportId}`]}
                          </motion.p>
                        )}
                      </div>

                      {/* Favori Mevki/Pozisyon */}
                      <div>
                        <label id={`position_${sportId}`} className='mb-2 block text-sm font-medium text-gray-700'>
                          Favori Mevki/Pozisyon *
                        </label>
                        <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
                          {(sportPositions[sportId] || []).map((position) => (
                            <motion.button
                              key={position}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleSportPreferenceChange(sportId, 'position', position)}
                              className={`rounded-lg border-2 p-2 text-xs sm:text-sm font-medium transition-all duration-200 ${
                                preference.position === position
                                  ? 'border-green-500 bg-green-100 text-green-700'
                                  : 'border-gray-300 bg-white text-gray-700 hover:border-green-300'
                              }`}
                            >
                              {position}
                            </motion.button>
                          ))}
                        </div>
                        {errors[`position_${sportId}`] && (
                          <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className='mt-1 text-sm text-red-500'
                          >
                            {errors[`position_${sportId}`]}
                          </motion.p>
                        )}
                      </div>

                      {/* Oyun Sıklığı */}
                      <div>
                        <label id={`playFrequency_${sportId}`} className='mb-2 block text-sm font-medium text-gray-700'>
                          Oyun Sıklığı *
                        </label>
                        <div className='space-y-2'>
                          {playFrequencies.map((frequency) => (
                            <motion.button
                              key={frequency}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              onClick={() => handleSportPreferenceChange(sportId, 'playFrequency', frequency)}
                              className={`flex w-full items-center gap-3 rounded-lg border-2 p-2 text-left text-sm transition-all duration-200 ${
                                preference.playFrequency === frequency
                                  ? 'border-green-500 bg-green-100 text-green-700'
                                  : 'border-gray-300 bg-white text-gray-700 hover:border-green-300'
                              }`}
                            >
                              <Activity size={16} />
                              <span>{frequency}</span>
                            </motion.button>
                          ))}
                        </div>
                        {errors[`playFrequency_${sportId}`] && (
                          <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className='mt-1 text-sm text-red-500'
                          >
                            {errors[`playFrequency_${sportId}`]}
                          </motion.p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}

                {/* Tercih Edilen Saatler */}
                <div>
                  <label className='mb-3 block text-sm font-medium text-gray-700'>
                    Tercih Edilen Saatler (Birden fazla seçebilirsiniz)
                  </label>
                  <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
                    {timeSlots.map((slot) => (
                      <motion.button
                        key={slot}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleMultiSelect('preferredHours', slot)}
                        className={`flex items-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-all duration-200 ${
                          formData.preferredHours.includes(slot)
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-green-300'
                        }`}
                      >
                        <Clock size={16} />
                        <span>{slot}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Koşullu Alanlar - Profesyonel Seviye */}
                {formData.skillLevel === 'professional' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className='space-y-4 rounded-lg border border-blue-200 bg-blue-50 p-4'
                  >
                    <h4 className='flex items-center gap-2 text-lg font-semibold text-blue-900'>
                      <Star size={20} />
                      Profesyonel Bilgiler
                    </h4>

                    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                      <div>
                        <label className='mb-2 block text-sm font-medium text-gray-700'>
                          Kulüp/Takım Adı
                        </label>
                        <input
                          type='text'
                          value={formData.clubName}
                          onChange={(e) => handleInputChange('clubName', e.target.value)}
                          placeholder='Kulüp veya takım adınız'
                          className='w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none'
                        />
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-medium text-gray-700'>
                          Lisans Numarası
                        </label>
                        <input
                          type='text'
                          value={formData.licenseNumber}
                          onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                          placeholder='Lisans numaranız'
                          className='w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none'
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Koşullu Alanlar - 18 Yaş Altı */}
                {formData.birthYear &&
                  new Date().getFullYear() - parseInt(formData.birthYear) < 18 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className='space-y-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4'
                    >
                      <h4 className='flex items-center gap-2 text-lg font-semibold text-yellow-900'>
                        <User size={20} />
                        Veli Bilgileri (18 yaş altı)
                      </h4>

                      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                        <div>
                          <label className='mb-2 block text-sm font-medium text-gray-700'>
                            Veli Ad Soyad
                          </label>
                          <input
                            type='text'
                            value={formData.emergencyContact}
                            onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                            placeholder='Veli adı soyadı'
                            className='w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-yellow-500 focus:outline-none'
                          />
                        </div>

                        <div>
                          <label className='mb-2 block text-sm font-medium text-gray-700'>
                            Veli Telefon
                          </label>
                          <input
                            type='tel'
                            value={formData.emergencyPhone}
                            onChange={(e) => handleInputChange('emergencyPhone', e.target.value)}
                            placeholder='Veli telefon numarası'
                            className='w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-yellow-500 focus:outline-none'
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                {/* Opsiyonel Alanlar */}
                <div className='space-y-4 rounded-lg bg-gray-50 p-4'>
                  <h4 className='flex items-center gap-2 text-lg font-semibold text-gray-900'>
                    <Target size={20} />
                    Ek Bilgiler (Opsiyonel)
                  </h4>

                  <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                    <div>
                      <label className='mb-2 block text-sm font-medium text-gray-700'>
                        Boy (cm)
                      </label>
                      <input
                        type='number'
                        value={formData.height}
                        onChange={(e) => handleInputChange('height', e.target.value)}
                        placeholder='Örn: 175'
                        className='w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-green-500 focus:outline-none'
                      />
                    </div>

                    <div>
                      <label className='mb-2 block text-sm font-medium text-gray-700'>
                        Kilo (kg)
                      </label>
                      <input
                        type='number'
                        value={formData.weight}
                        onChange={(e) => handleInputChange('weight', e.target.value)}
                        placeholder='Örn: 70'
                        className='w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-green-500 focus:outline-none'
                      />
                    </div>

                    <div>
                      <label className='mb-2 block text-sm font-medium text-gray-700'>
                        Favori Takım
                      </label>
                      <input
                        type='text'
                        value={formData.favoriteTeam}
                        onChange={(e) => handleInputChange('favoriteTeam', e.target.value)}
                        placeholder='Favori takımınız'
                        className='w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-green-500 focus:outline-none'
                      />
                    </div>

                    <div>
                      <label className='mb-2 block text-sm font-medium text-gray-700'>
                        Spor Geçmişi
                      </label>
                      <textarea
                        value={formData.sportsHistory}
                        onChange={(e) => handleInputChange('sportsHistory', e.target.value)}
                        placeholder='Spor geçmişiniz hakkında kısa bilgi'
                        rows={3}
                        className='w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-green-500 focus:outline-none'
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key='step3'
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className='py-8 text-center'
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className='mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100'
                >
                  <Check size={48} className='text-green-500' />
                </motion.div>

                <h3 className='mb-4 text-2xl font-bold text-gray-900'>Tebrikler! 🎉</h3>
                <p className='mb-8 text-lg text-gray-600'>
                  Profiliniz başarıyla tamamlandı. Artık sahada oyuncu bulabilir ve rezervasyon
                  yapabilirsiniz!
                </p>

                {/* Hata mesajı */}
                {errors.submit && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 rounded-lg bg-red-50 p-4 text-center"
                  >
                    <p className="text-red-600">{errors.submit}</p>
                  </motion.div>
                )}

                {/* Yükleme durumu */}
                {isSubmitting && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mb-6 flex items-center justify-center gap-2 text-green-600"
                  >
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Profiliniz kaydediliyor...</span>
                  </motion.div>
                )}

                <div className='mb-8 rounded-lg bg-gray-50 p-6'>
                  <h4 className='mb-4 font-semibold text-gray-900'>Profil Özeti</h4>
                  
                  {/* Profil Fotoğrafı Önizleme */}
                  {profileImageData && (
                    <div className="mb-4 flex justify-center">
                      <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200">
                        <img
                          src={getOptimizedImageUrl(profileImageData.url) || getImageUrl(profileImageData.url) || profileImageData}
                          alt="Profil"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className='space-y-2 text-sm text-gray-600'>
                    <p>
                      <strong>Yaş:</strong>{' '}
                      {formData.birthYear ? `${new Date().getFullYear() - parseInt(formData.birthYear)} yaşında` : 'Belirtilmemiş'}
                    </p>
                    <p>
                      <strong>Cinsiyet:</strong>{' '}
                      {formData.gender === 'male'
                        ? 'Erkek'
                        : formData.gender === 'female'
                          ? 'Kadın'
                          : 'Belirtmek istemiyorum'}
                    </p>
                    <p>
                      <strong>WhatsApp:</strong> {formData.whatsapp || 'Belirtilmemiş'}
                    </p>
                    <p>
                      <strong>Favori Sporlar:</strong>{' '}
                      {formData.favoriteSports.length > 0
                        ? formData.favoriteSports
                            .map((sportId) => sports.find((s) => s.id === sportId)?.name)
                            .join(', ')
                        : 'Belirtilmemiş'}
                    </p>
                    {formData.sportPreferences.length > 0 && (
                      <div className='mt-2 space-y-2'>
                        {formData.sportPreferences.map((pref) => {
                          const sport = sports.find(s => s.id === pref.sportId);
                          return (
                            <div key={pref.sportId} className='pl-4 border-l-2 border-green-300'>
                              <p className='font-semibold text-gray-800'>
                                {sport?.icon} {sport?.name}:
                              </p>
                              <p className='text-xs text-gray-600 pl-4'>
                                Seviye: {skillLevels.find((l) => l.id === pref.skillLevel)?.name || 'Belirtilmemiş'} | 
                                Mevki: {pref.position || 'Belirtilmemiş'} | 
                                Sıklık: {pref.playFrequency || 'Belirtilmemiş'}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {formData.preferredHours.length > 0 && (
                      <p>
                        <strong>Tercih Edilen Saatler:</strong> {formData.preferredHours.join(', ')}
                      </p>
                    )}
                    {formData.clubName && (
                      <p>
                        <strong>Kulüp:</strong> {formData.clubName}
                      </p>
                    )}
                    {formData.licenseNumber && (
                      <p>
                        <strong>Lisans No:</strong> {formData.licenseNumber}
                      </p>
                    )}
                    {formData.height && (
                      <p>
                        <strong>Boy:</strong> {formData.height} cm
                      </p>
                    )}
                    {formData.weight && (
                      <p>
                        <strong>Kilo:</strong> {formData.weight} kg
                      </p>
                    )}
                    {formData.favoriteTeam && (
                      <p>
                        <strong>Favori Takım:</strong> {formData.favoriteTeam}
                      </p>
                    )}
                    {formData.sportsHistory && (
                      <p>
                        <strong>Spor Geçmişi:</strong> {formData.sportsHistory}
                      </p>
                    )}
                    {formData.emergencyContact && (
                      <p>
                        <strong>Veli Adı:</strong> {formData.emergencyContact}
                      </p>
                    )}
                    {formData.emergencyPhone && (
                      <p>
                        <strong>Veli Telefonu:</strong> {formData.emergencyPhone}
                      </p>
                    )}
                  </div>
                </div>

                {/* KVKK Onayları */}
                <div className='mb-6 rounded-lg bg-green-50 p-6'>
                  <h4 className='mb-4 flex items-center gap-2 font-semibold text-green-900'>
                    <Check size={20} />
                    Güvenlik ve Gizlilik
                  </h4>
                  <div className='space-y-3'>
                    <label className='flex items-start gap-3'>
                      <input
                        id="terms"
                        type='checkbox'
                        checked={agreements.terms}
                        onChange={(e) => handleAgreementChange('terms', e.target.checked)}
                        className={`mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 ${
                          errors.submit && !agreements.terms ? 'border-red-500' : ''
                        }`}
                        required
                      />
                      <span className='text-sm text-gray-700'>
                        <span className='font-medium'>Kullanım Koşulları</span> ve{' '}
                        <span className='font-medium'>Gizlilik Politikası</span>'nı okudum, kabul
                        ediyorum.
                      </span>
                    </label>

                    <label className='flex items-start gap-3'>
                      <input
                        id="kvkk"
                        type='checkbox'
                        checked={agreements.kvkk}
                        onChange={(e) => handleAgreementChange('kvkk', e.target.checked)}
                        className={`mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 ${
                          errors.submit && !agreements.kvkk ? 'border-red-500' : ''
                        }`}
                        required
                      />
                      <span className='text-sm text-gray-700'>
                        Kişisel verilerimin işlenmesine izin veriyorum (KVKK).
                      </span>
                    </label>

                    <label className='flex items-start gap-3'>
                      <input
                        type='checkbox'
                        checked={agreements.campaigns}
                        onChange={(e) => handleAgreementChange('campaigns', e.target.checked)}
                        className='mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500'
                      />
                      <span className='text-sm text-gray-700'>
                        Kampanyalar ve özel teklifler hakkında bilgi almak istiyorum.
                      </span>
                    </label>

                    <label className='flex items-start gap-3'>
                      <input
                        id="membershipAgreement"
                        type='checkbox'
                        checked={agreements.membershipAgreement}
                        onChange={(e) => handleAgreementChange('membershipAgreement', e.target.checked)}
                        className={`mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 ${
                          errors.submit && !agreements.membershipAgreement ? 'border-red-500' : ''
                        }`}
                        required
                      />
                      <span className='text-sm text-gray-700'>
                        <span className='font-medium'>Üyelik Sözleşmesi</span>'ni okudum, onaylıyorum.
                      </span>
                    </label>

                    <label className='flex items-start gap-3'>
                      <input
                        type='checkbox'
                        checked={agreements.whatsapp}
                        onChange={(e) => handleAgreementChange('whatsapp', e.target.checked)}
                        className='mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500'
                      />
                      <span className='text-sm text-gray-700'>
                        WhatsApp'tan maç hatırlatmaları ve bildirimler almak istiyorum.
                      </span>
                    </label>
                  </div>
                </div>

                {/* Trust Signals */}
                <div className='mb-6 rounded-lg bg-blue-50 p-6'>
                  <h4 className='mb-4 flex items-center gap-2 font-semibold text-blue-900'>
                    <Check size={20} />
                    Güvenlik Sertifikaları
                  </h4>
                  <div className='grid grid-cols-2 gap-4 text-center sm:grid-cols-4'>
                    <div className='flex flex-col items-center gap-2'>
                      <div className='flex h-12 w-12 items-center justify-center rounded-full bg-green-100'>
                        <span className='font-bold text-green-600'>🔒</span>
                      </div>
                      <span className='text-xs font-medium text-gray-700'>SSL Güvenli</span>
                    </div>
                    <div className='flex flex-col items-center gap-2'>
                      <div className='flex h-12 w-12 items-center justify-center rounded-full bg-green-100'>
                        <span className='font-bold text-green-600'>✓</span>
                      </div>
                      <span className='text-xs font-medium text-gray-700'>KVKK Uyumlu</span>
                    </div>
                    <div className='flex flex-col items-center gap-2'>
                      <div className='flex h-12 w-12 items-center justify-center rounded-full bg-green-100'>
                        <span className='font-bold text-green-600'>ISO</span>
                      </div>
                      <span className='text-xs font-medium text-gray-700'>ISO 27001</span>
                    </div>
                    <div className='flex flex-col items-center gap-2'>
                      <div className='flex h-12 w-12 items-center justify-center rounded-full bg-green-100'>
                        <span className='font-bold text-green-600'>3D</span>
                      </div>
                      <span className='text-xs font-medium text-gray-700'>3D Secure</span>
                    </div>
                  </div>
                </div>

                {/* Social Proof */}
                <div className='mb-6 rounded-lg bg-orange-50 p-6'>
                  <h4 className='mb-4 flex items-center gap-2 font-semibold text-orange-900'>
                    <Activity size={20} />
                    Topluluk İstatistikleri
                  </h4>
                  <div className='grid grid-cols-1 gap-4 text-center sm:grid-cols-3'>
                    <div>
                      <div className='text-2xl font-bold text-orange-600'>127,843</div>
                      <div className='text-sm text-gray-600'>Aktif Sporcu</div>
                    </div>
                    <div>
                      <div className='text-2xl font-bold text-orange-600'>1,247</div>
                      <div className='text-sm text-gray-600'>Son 24 Saatte Yeni Üye</div>
                    </div>
                    <div>
                      <div className='text-2xl font-bold text-orange-600'>47s</div>
                      <div className='text-sm text-gray-600'>Ortalama Kayıt Süresi</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className='mt-8 flex justify-between border-t border-gray-200 pt-6'>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`flex items-center gap-2 rounded-lg px-6 py-3 font-medium transition-all duration-200 ${
                currentStep === 1
                  ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                  : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <ChevronLeft size={20} />
              Geri
            </motion.button>

            {currentStep < steps.length ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={nextStep}
                disabled={isLoading}
                className='flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-6 py-3 font-medium text-white shadow-lg transition-all duration-200 hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                İleri
                <ChevronRight size={20} />
              </motion.button>
            ) : (
              <motion.button
                whileHover={!isSubmitting ? { scale: 1.02 } : {}}
                whileTap={!isSubmitting ? { scale: 0.98 } : {}}
                onClick={handleSubmit}
                disabled={isSubmitting}
                className='flex items-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3 font-medium text-white shadow-lg transition-all duration-200 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <Check size={20} />
                    Tamamla
                  </>
                )}
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>
      
      {/* OTP Modal */}
      <AnimatePresence>
        {showOTPModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2">Telefon Doğrulama</h3>
              <p className="text-gray-500 text-sm mb-6">
                {formData.phone} numarasına gönderilen 6 haneli kodu girin
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Doğrulama Kodu</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-3 text-center text-2xl font-bold tracking-widest bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="000000"
                  />
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowOTPModal(false); setOtpCode(''); }}
                    className="flex-1 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleVerifyOTP}
                    disabled={otpLoading || otpCode.length !== 6}
                    className="flex-1 py-3 text-white bg-green-600 hover:bg-green-700 rounded-xl font-medium transition-colors disabled:opacity-50"
                  >
                    {otpLoading ? 'Doğrulanıyor...' : 'Doğrula'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OyuncuOnboard;


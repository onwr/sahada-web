import React, { useState, useEffect } from 'react';
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
  X,
  Star,
  Clock,
  Target,
  Activity,
  Mars,
  Venus,
  CircleAlert,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { updateUserData } from '../../services/authService';
import { 
  uploadImage, 
  getImageUrl, 
  getOptimizedImageUrl 
} from '../../services/cdnService';
import ImageUploader from '../ImageUploader';
import ProfileImageUploader from '../ProfileImageUploader';

const SahaSahibiOnboard = () => {
  const navigate = useNavigate();
  const { user, userData, setUserData, setNeedsOnboarding } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    // İşletme Bilgileri
    companyType: 'individual',
    businessName: '',
    authorizedPerson: '',
    businessEmail: '',
    businessPhone: '',
    businessAddress: '',
    businessLocation: { lat: null, lng: null },

    // Doğrulama Belgeleri
    businessLicense: null,
    facilityPhotos: [],
    taxNumber: '',
    taxOffice: '',
    iban: '',
    authorizedPersonId: '',
    profilePhoto: null,

    // Tesis Detayları
    sportTypes: [],
    facilityCount: '',
    facilityTypes: [],
    facilitySizes: [],
    surfaceType: '',
    lighting: false,
    indoorOutdoor: '',
    
    // Olanaklar
    hasShower: false,
    hasParking: false,
    hasCafeteria: false,
    hasCamera: false,
    hasFirstAid: false,
    hasLockers: false,
    hasWheelchairAccess: false,
    hasEquipmentRental: false,

    // Ek Bilgiler
    description: '',
    openingHours: '',
    priceRange: '',
    contactPerson: '',
    contactPhone: '',
  });

  const [errors, setErrors] = useState({});
  const [profileCompletion, setProfileCompletion] = useState(20); // Başlangıç %20
  const [showReward, setShowReward] = useState(false);
  const [profileImageData, setProfileImageData] = useState(null);
  const [agreements, setAgreements] = useState({
    terms: false,
    kvkk: false,
    campaigns: false,
    whatsapp: false
  });
  const [showMap, setShowMap] = useState(false);
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [mapSearchResults, setMapSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 41.0082, lng: 28.9784 });
  const [isDragging, setIsDragging] = useState(false);
  const [pinPosition, setPinPosition] = useState({ x: 50, y: 50 });

  // localStorage key'i
  const storageKey = user ? `sahaSahibiOnboarding_${user.uid}` : null;

  // Onboarding tamamlandıysa dashboard'a yönlendir
  useEffect(() => {
    if (userData?.onboardingCompleted && currentStep !== 3) {
      // Onboarding tamamlandıysa ve son adımda değilsek yönlendir
      if (storageKey) {
        localStorage.removeItem(storageKey);
        localStorage.removeItem(`${storageKey}_step`);
      }
      navigate('/saha-sahibi/dashboard');
      return;
    }
  }, [userData, navigate, storageKey, currentStep]);

  // Component mount olduğunda localStorage'dan currentStep'i yükle
  useEffect(() => {
    if (!storageKey) return;

    try {
      const savedStep = localStorage.getItem(`${storageKey}_step`);
      if (savedStep) {
        const step = parseInt(savedStep, 10);
        if (step >= 1 && step <= 4) {
          setCurrentStep(step);
        }
      }
    } catch (error) {
      console.error('localStorage step okuma hatası:', error);
    }
  }, [storageKey]);

  // Mevcut kullanıcı verilerini yükle (userData öncelikli, localStorage ile birleştir)
  useEffect(() => {
    if (userData) {
      // localStorage'dan veri var mı kontrol et
      let savedData = null;
      if (storageKey) {
        try {
          const saved = localStorage.getItem(storageKey);
          if (saved) {
            savedData = JSON.parse(saved);
          }
        } catch (error) {
          console.error('localStorage okuma hatası:', error);
        }
      }

      setFormData(prev => {
        // userData'dan gelen veriler öncelikli, yoksa localStorage'dan, yoksa prev
        const merged = {
          ...prev,
          businessName: userData.businessName || savedData?.businessName || prev.businessName || '',
          authorizedPerson: userData.authorizedPerson || userData.fullName || savedData?.authorizedPerson || prev.authorizedPerson || '',
          businessEmail: userData.businessEmail || userData.email || savedData?.businessEmail || prev.businessEmail || '',
          businessPhone: userData.businessPhone || userData.phone || savedData?.businessPhone || prev.businessPhone || '',
          businessAddress: userData.businessAddress || savedData?.businessAddress || prev.businessAddress || '',
          businessLocation: userData.businessLocation || savedData?.businessLocation || prev.businessLocation || { lat: null, lng: null },
          taxNumber: userData.taxNumber || savedData?.taxNumber || prev.taxNumber || '',
          taxOffice: userData.taxOffice || savedData?.taxOffice || prev.taxOffice || '',
          iban: userData.iban || savedData?.iban || prev.iban || '',
          authorizedPersonId: userData.authorizedPersonId || savedData?.authorizedPersonId || prev.authorizedPersonId || '',
          profilePhoto: userData.profilePhoto || savedData?.profilePhoto || prev.profilePhoto || null,
          businessLicense: userData.businessLicense || savedData?.businessLicense || prev.businessLicense || null,
          facilityPhotos: userData.facilityPhotos?.length > 0 ? userData.facilityPhotos : (savedData?.facilityPhotos || prev.facilityPhotos || []),
          sportTypes: userData.sportTypes?.length > 0 ? userData.sportTypes : (savedData?.sportTypes || prev.sportTypes || []),
          facilityCount: userData.facilityCount || savedData?.facilityCount || prev.facilityCount || '',
          facilityTypes: userData.facilityTypes?.length > 0 ? userData.facilityTypes : (savedData?.facilityTypes || prev.facilityTypes || []),
          facilitySizes: userData.facilitySizes?.length > 0 ? userData.facilitySizes : (savedData?.facilitySizes || prev.facilitySizes || []),
          surfaceType: userData.surfaceType || savedData?.surfaceType || prev.surfaceType || '',
          lighting: userData.lighting !== undefined ? userData.lighting : (savedData?.lighting !== undefined ? savedData.lighting : prev.lighting),
          indoorOutdoor: userData.indoorOutdoor || savedData?.indoorOutdoor || prev.indoorOutdoor || '',
          hasShower: userData.hasShower !== undefined ? userData.hasShower : (savedData?.hasShower !== undefined ? savedData.hasShower : prev.hasShower),
          hasParking: userData.hasParking !== undefined ? userData.hasParking : (savedData?.hasParking !== undefined ? savedData.hasParking : prev.hasParking),
          hasCafeteria: userData.hasCafeteria !== undefined ? userData.hasCafeteria : (savedData?.hasCafeteria !== undefined ? savedData.hasCafeteria : prev.hasCafeteria),
          hasCamera: userData.hasCamera !== undefined ? userData.hasCamera : (savedData?.hasCamera !== undefined ? savedData.hasCamera : prev.hasCamera),
          hasFirstAid: userData.hasFirstAid !== undefined ? userData.hasFirstAid : (savedData?.hasFirstAid !== undefined ? savedData.hasFirstAid : prev.hasFirstAid),
          hasLockers: userData.hasLockers !== undefined ? userData.hasLockers : (savedData?.hasLockers !== undefined ? savedData.hasLockers : prev.hasLockers),
          hasWheelchairAccess: userData.hasWheelchairAccess !== undefined ? userData.hasWheelchairAccess : (savedData?.hasWheelchairAccess !== undefined ? savedData.hasWheelchairAccess : prev.hasWheelchairAccess),
          hasEquipmentRental: userData.hasEquipmentRental !== undefined ? userData.hasEquipmentRental : (savedData?.hasEquipmentRental !== undefined ? savedData.hasEquipmentRental : prev.hasEquipmentRental),
          description: userData.description || savedData?.description || prev.description || '',
          openingHours: userData.openingHours || savedData?.openingHours || prev.openingHours || '',
          priceRange: userData.priceRange || savedData?.priceRange || prev.priceRange || '',
          contactPerson: userData.contactPerson || savedData?.contactPerson || prev.contactPerson || '',
          contactPhone: userData.contactPhone || savedData?.contactPhone || prev.contactPhone || ''
        };
        return merged;
      });

      setProfileImageData(userData.profilePhoto || savedData?.profilePhoto || null);
      setAgreements({
        terms: userData.agreements?.terms || savedData?.agreements?.terms || false,
        kvkk: userData.agreements?.kvkk || savedData?.agreements?.kvkk || false,
        campaigns: userData.agreements?.campaigns || savedData?.agreements?.campaigns || false,
        whatsapp: userData.agreements?.whatsapp || savedData?.agreements?.whatsapp || false
      });
    }
  }, [userData, storageKey]);

  // formData değiştiğinde localStorage'a kaydet
  useEffect(() => {
    if (!storageKey) return;

    try {
      // File objelerini localStorage'a kaydetme, sadece URL'leri kaydet
      const dataToSave = {
        ...formData,
        // File objelerini null yap (localStorage'da saklanamaz)
        businessLicense: formData.businessLicense instanceof File ? null : formData.businessLicense,
        profilePhoto: formData.profilePhoto instanceof File ? null : formData.profilePhoto,
        // facilityPhotos array'ini koru (URL'ler string olarak saklanır)
        facilityPhotos: formData.facilityPhotos.map(photo => 
          photo instanceof File ? null : photo
        ).filter(Boolean),
      };
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
    } catch (error) {
      console.error('localStorage kaydetme hatası:', error);
    }
  }, [formData, storageKey]);

  // currentStep değiştiğinde localStorage'a kaydet
  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(`${storageKey}_step`, currentStep.toString());
  }, [currentStep, storageKey]);

const steps = [
    { id: 1, title: 'İşletme Bilgileri', description: 'İşletme bilgilerinizi girin' },
    { id: 2, title: 'Doğrulama Belgeleri', description: 'Gerekli belgeleri yükleyin' },
    { id: 3, title: 'Tamamlandı', description: 'Kaydınız hazır!' },
  ];

  const sportTypes = [
    { id: 'football', name: 'Futbol', icon: '⚽' },
    { id: 'basketball', name: 'Basketbol', icon: '🏀' },
    { id: 'tennis', name: 'Tenis', icon: '🎾' },
    { id: 'volleyball', name: 'Voleybol', icon: '🏐' },
    { id: 'badminton', name: 'Badminton', icon: '🏸' },
    { id: 'swimming', name: 'Yüzme', icon: '🏊' },
    { id: 'padel', name: 'Padel', icon: '🎾' },
    { id: 'squash', name: 'Squash', icon: '🏓' },
  ];

  const facilityTypes = [
    { id: 'indoor', name: 'Kapalı Saha', icon: '🏠' },
    { id: 'outdoor', name: 'Açık Saha', icon: '🌞' },
    { id: 'semi-covered', name: 'Yarı Kapalı', icon: '🏗️' },
  ];

  const facilitySizes = [
    { id: '5v5', name: '5v5', description: 'Küçük saha' },
    { id: '7v7', name: '7v7', description: 'Orta saha' },
    { id: '11v11', name: '11v11', description: 'Büyük saha' },
    { id: 'half-court', name: 'Yarı Saha', description: 'Basketbol yarı saha' },
    { id: 'full-court', name: 'Tam Saha', description: 'Basketbol tam saha' },
  ];

  const surfaceTypes = [
    { id: 'grass', name: 'Çim', icon: '🌱' },
    { id: 'synthetic', name: 'Sentetik Halı', icon: '🏟️' },
    { id: 'hardcourt', name: 'Sert Zemin', icon: '🏀' },
    { id: 'clay', name: 'Toprak', icon: '🏐' },
    { id: 'wood', name: 'Parke', icon: '🏓' },
  ];

  const priceRanges = [
    '50-100 TL/saat',
    '100-200 TL/saat',
    '200-300 TL/saat',
    '300-500 TL/saat',
    '500+ TL/saat',
  ];

  const handleInputChange = (field, value) => {
    let formattedValue = value;

    if (field === 'taxNumber') {
      // Sadece rakamlar, max 10 karakter
      formattedValue = value.replace(/\D/g, '').slice(0, 10);
    } else if (field === 'authorizedPersonId') {
      // Sadece rakamlar, max 11 karakter
      formattedValue = value.replace(/\D/g, '').slice(0, 11);
    } else if (field === 'iban') {
      // TR ile başla, boşlukları yönet, max 26 karakter (TR + 24 rakam)
      let clean = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      
      // TR kontrolü ve ekleme
      if (!clean.startsWith('TR')) {
          if (clean.length > 0 && 'TR'.indexOf(clean) === -1) {
             // Eğer kullanıcı T veya R dışında bir şey yazdıysa ve başta TR yoksa
             clean = 'TR' + clean.replace(/^TR/g, ''); 
          }
      }
      
      // Max uzunluk (TR + 24 hane = 26)
      clean = clean.slice(0, 26);
      
      // 4'erli gruplama
      let spaced = '';
      for (let i = 0; i < clean.length; i++) {
        if (i > 0 && i % 4 === 0) spaced += ' ';
        spaced += clean[i];
      }
      formattedValue = spaced;
    }

    setFormData((prev) => ({
      ...prev,
      [field]: formattedValue,
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
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((item) => item !== value)
        : [...prev[field], value],
    }));

    // Progressive profiling - puan hesaplama
    updateProfileCompletion();
  };

  const updateProfileCompletion = () => {
    let completion = 20; // Başlangıç puanı (kayıt)

    // İşletme bilgileri (+25 puan)
    if (formData.businessName) completion += 5;
    if (formData.authorizedPerson) completion += 5;
    if (formData.businessEmail) completion += 5;
    if (formData.businessPhone) completion += 3;
    if (formData.businessAddress) completion += 4;

    // Doğrulama belgeleri (+30 puan)
    if (formData.businessLicense) completion += 10;
    if (formData.facilityPhotos.length > 0) completion += 8;
    if (formData.taxNumber) completion += 5;
    if (formData.iban) completion += 4;
    if (formData.authorizedPersonId) completion += 3;

    // Tesis detayları (+25 puan)
    if (formData.sportTypes.length > 0) completion += 5;
    if (formData.facilityCount) completion += 5;
    if (formData.surfaceType) completion += 5;
    if (formData.indoorOutdoor) completion += 5;
    if (formData.description) completion += 5;

    // Maksimum %100
    completion = Math.min(completion, 100);

    setProfileCompletion(completion);

    // Ödül gösterimi
    if (completion >= 100 && !showReward) {
      setShowReward(true);
    }
  };

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.businessName) {
        newErrors.businessName = 'İşletme adı gereklidir';
      }

      if (!formData.authorizedPerson) {
        newErrors.authorizedPerson = 'Yetkili ad soyad gereklidir';
      }

      if (!formData.businessEmail) {
        newErrors.businessEmail = 'Kurumsal email gereklidir';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.businessEmail)) {
        newErrors.businessEmail = 'Geçerli bir email adresi girin';
      }

      if (!formData.businessPhone) {
        newErrors.businessPhone = 'İşletme telefonu gereklidir';
      } else if (!/^[0-9+\-\s()]+$/.test(formData.businessPhone)) {
        newErrors.businessPhone = 'Geçerli bir telefon numarası girin';
      }

      if (!formData.businessAddress) {
        newErrors.businessAddress = 'İşletme adresi gereklidir';
      }
    } else if (step === 2) {
      if (!formData.businessLicense) {
        newErrors.businessLicense = 'İşletme ruhsatı veya vergi levhası gereklidir';
      }

      if (formData.facilityPhotos.length < 3) {
        newErrors.facilityPhotos = 'En az 3 saha fotoğrafı yüklemelisiniz';
      }

      if (!formData.taxNumber) {
        newErrors.taxNumber = 'Vergi numarası gereklidir';
      } else if (formData.taxNumber.length !== 10) {
        newErrors.taxNumber = 'Vergi numarası 10 haneli olmalıdır';
      }

      if (!formData.taxOffice) {
         newErrors.taxOffice = 'Vergi dairesi gereklidir';
      }

      const cleanIban = formData.iban.replace(/\s/g, '');
      if (!formData.iban) {
        newErrors.iban = 'IBAN gereklidir';
      } else if (!cleanIban.startsWith('TR') || cleanIban.length !== 26) {
        newErrors.iban = 'Geçerli bir IBAN giriniz (TR ile başlamalı ve 26 karakter olmalı)';
      }

      if (!formData.authorizedPersonId) {
        newErrors.authorizedPersonId = 'TC Kimlik No gereklidir';
      } else if (formData.authorizedPersonId.length !== 11) {
        newErrors.authorizedPersonId = 'TC Kimlik numarası 11 haneli olmalıdır';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length));
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleLocationSelect = (lat, lng, address) => {
    setFormData((prev) => ({
      ...prev,
      businessLocation: { lat, lng },
      businessAddress: address,
    }));
    setShowMap(false);
    setMapSearchQuery('');
    setShowSearchResults(false);
    updateProfileCompletion();
  };

  const handleMapSearch = (query) => {
    setMapSearchQuery(query);
    
    // Önceki timeout'u temizle
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    if (query.length < 2) {
      setMapSearchResults([]);
      setShowSearchResults(false);
      setIsSearching(false);
      return;
    }

    // Debounce: 500ms bekle
    const timeout = setTimeout(async () => {
      setIsSearching(true);
      
      try {
        // OpenStreetMap Nominatim API kullanarak gerçek adres verilerini çek
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Türkiye')}&limit=10&addressdetails=1&extratags=1&namedetails=1`,
          {
            headers: {
              'User-Agent': 'SahadaApp/1.0'
            }
          }
        );
        
        if (!response.ok) {
          throw new Error('API isteği başarısız');
        }
        
        const data = await response.json();
        
        // API verilerini uygulama formatına dönüştür
        const results = data.map((item, index) => {
          const address = item.display_name;
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          
          // Konum tipini belirle
          let type = 'Konum';
          if (item.type === 'administrative' && item.class === 'boundary') {
            type = 'İlçe';
          } else if (item.type === 'residential' || item.class === 'place') {
            type = 'Mahalle';
          } else if (item.type === 'highway' && item.class === 'highway') {
            type = 'Cadde';
          } else if (item.type === 'amenity' && item.class === 'leisure') {
            type = 'Spor Tesisi';
          } else if (item.type === 'amenity' && item.class === 'government') {
            type = 'Kamu';
          } else if (item.type === 'natural' && item.class === 'water') {
            type = 'Sahil';
          } else if (item.type === 'highway' && item.class === 'residential') {
            type = 'Sokak';
          }
          
          return {
            name: item.display_name.split(',')[0] || item.name || `Konum ${index + 1}`,
            lat,
            lng,
            address,
            type,
            importance: item.importance || 0
          };
        });
        
        // Önem sırasına göre sırala
        results.sort((a, b) => b.importance - a.importance);
        
        setMapSearchResults(results);
        setShowSearchResults(true);
        
      } catch (error) {
        console.error('Adres arama hatası:', error);
        
        // Hata durumunda boş sonuç göster
        setMapSearchResults([]);
        setShowSearchResults(true);
      } finally {
        setIsSearching(false);
      }
    }, 500);
    
    setSearchTimeout(timeout);
  };

  const handleSearchResultSelect = (result) => {
    setSelectedLocation({ lat: result.lat, lng: result.lng, address: result.address });
    setMapCenter({ lat: result.lat, lng: result.lng });
    handleLocationSelect(result.lat, result.lng, result.address);
  };

  const handleMapClick = (event) => {
    // Harita tıklamasından koordinat al (basit örnek)
    const lat = mapCenter.lat + (Math.random() - 0.5) * 0.01;
    const lng = mapCenter.lng + (Math.random() - 0.5) * 0.01;
    const address = `Seçilen Konum (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    
    setSelectedLocation({ lat, lng, address });
    handleLocationSelect(lat, lng, address);
  };

  const handlePinDragStart = (event) => {
    setIsDragging(true);
    event.preventDefault();
  };

  const handlePinDrag = (event) => {
    if (!isDragging) return;
    
    const rect = event.currentTarget.parentElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    
    // Sınırları kontrol et
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));
    
    setPinPosition({ x: clampedX, y: clampedY });
    
    // Koordinatları hesapla
    const lat = mapCenter.lat + (0.5 - clampedY / 100) * 0.01;
    const lng = mapCenter.lng + (clampedX / 100 - 0.5) * 0.01;
    const address = `Seçilen Konum (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    
    setSelectedLocation({ lat, lng, address });
  };

  const handlePinDragEnd = (event) => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // Son konumu kaydet
    const lat = mapCenter.lat + (0.5 - pinPosition.y / 100) * 0.01;
    const lng = mapCenter.lng + (pinPosition.x / 100 - 0.5) * 0.01;
    const address = `Seçilen Konum (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    
    handleLocationSelect(lat, lng, address);
  };

  // Profil fotoğrafı değişikliği
  const handleProfileImageChange = (imageData) => {
    setProfileImageData(imageData);
    setFormData(prev => ({
      ...prev,
      profilePhoto: imageData
    }));
    updateProfileCompletion();
  };

  // Anlaşma değişikliği
  const handleAgreementChange = (agreementType, checked) => {
    setAgreements(prev => ({
      ...prev,
      [agreementType]: checked
    }));
  };

  const handleSubmit = async () => {
    if (!user) {
      console.error('Kullanıcı giriş yapmamış');
      return;
    }



    // Saha fotoğrafları kontrolü
    if (!formData.facilityPhotos || formData.facilityPhotos.length < 3) {
      setErrors({ facilityPhotos: 'En az 3 saha fotoğrafı yüklemelisiniz' });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // File objelerini URL'lere çevir
      const processedFormData = {
        ...formData,
        businessLicense: formData.businessLicense ? {
          url: formData.businessLicense.url || '',
          fileName: formData.businessLicense.fileName || 'unknown',
          fileSize: formData.businessLicense.fileSize || 0,
          uploadedAt: formData.businessLicense.uploadedAt || new Date()
        } : null,
        facilityPhotos: formData.facilityPhotos ? formData.facilityPhotos.map(photo => ({
          url: photo.url || '',
          fileName: photo.fileName || 'unknown',
          fileSize: photo.fileSize || 0,
          uploadedAt: photo.uploadedAt || new Date()
        })) : [],
        profilePhoto: profileImageData ? {
          url: profileImageData.url || '',
          fileName: profileImageData.fileName || 'unknown',
          fileSize: profileImageData.fileSize || 0,
          uploadedAt: profileImageData.uploadedAt || new Date()
        } : null
      };

      const profileData = {
        ...processedFormData,
        agreements,
        onboardingCompleted: true, // DB'de tamamlandı işaretle
        profileCompleted: true,
        userType: 'owner',
        isApproved: true, // Otomatik onay
        status: 'active',
        updatedAt: new Date()
      };

      // Debug için console.log
      console.log('Profile data to save:', profileData);

      await updateUserData(user.uid, profileData);
      
      // Context'i güncelle ama henüz redirect yapma (Son adımda yapılacak)
      setUserData(prev => ({ 
        ...prev, 
        ...profileData,
        // UI'da hemen redirect olmaması için bellekte false tutabiliriz 
        // veya useEffect kontrolü ekledik (currentStep !== 3)
      }));

      // localStorage'ı temizle
      if (storageKey) {
        localStorage.removeItem(storageKey);
        localStorage.removeItem(`${storageKey}_step`);
      }

      // Adım 3'e (Başarı ekranı) geçiş yap
      setCurrentStep(3);

    } catch (error) {
      console.error('Onboarding kayıt hatası:', error);
      setErrors({ submit: 'Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin.' });
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

              {/* Ödül Sistemi */}
              <div className='mt-3 flex items-center justify-center gap-2'>
                {profileCompletion >= 50 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className='flex items-center gap-1 text-xs text-green-600'
                  >
                    <span>🏆</span>
                    <span>%50 - İlk 10 rezervasyon için %0 komisyon!</span>
                  </motion.div>
                )}
                {profileCompletion >= 75 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className='flex items-center gap-1 text-xs text-green-600'
                  >
                    <span>🎁</span>
                    <span>%75 - 1 ay premium üyelik!</span>
                  </motion.div>
                )}
                {profileCompletion >= 100 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className='flex items-center gap-1 text-xs font-bold text-orange-600'
                  >
                    <span>⭐</span>
                    <span>%100 - Öncelikli doğrulama + rozetler!</span>
                  </motion.div>
                )}
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
                  İşletme Bilgilerinizi Girin
                </h3>

                {/* İşletme Türü Seçimi */}
                <div className="flex gap-4 mb-6">
                  <button
                    type="button"
                    onClick={() => handleInputChange('companyType', 'individual')}
                    className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all ${
                      formData.companyType === 'individual'
                        ? 'border-green-500 bg-green-50 text-green-700 font-medium'
                        : 'border-gray-200 text-gray-600 hover:border-green-200'
                    }`}
                  >
                    Bireysel İşletme
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputChange('companyType', 'corporate')}
                    className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all ${
                      formData.companyType === 'corporate'
                        ? 'border-green-500 bg-green-50 text-green-700 font-medium'
                        : 'border-gray-200 text-gray-600 hover:border-green-200'
                    }`}
                  >
                    Limited / Anonim Şirket
                  </button>
                </div>

                {/* Profil Fotoğrafı */}
                <div className='mb-6'>
                  <label className='mb-3 block text-sm font-medium text-gray-700'>
                    Profil Fotoğrafı
                  </label>
                  <ProfileImageUploader
                    userId={user?.uid}
                    currentImage={profileImageData}
                    onImageChange={handleProfileImageChange}
                    category="profile"
                  />
                </div>

                {/* İşletme Adı */}
                <div>
                  <label className='mb-2 block text-sm font-medium text-gray-700'>
                    {formData.companyType === 'individual' ? 'İşletme Adı (Opsiyonel)' : 'Ticari Ünvan *'}
                  </label>
                  <div className='relative'>
                    <User
                      className='absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400'
                      size={20}
                    />
                    <input
                      type='text'
                      value={formData.businessName}
                      onChange={(e) => handleInputChange('businessName', e.target.value)}
                      placeholder={formData.companyType === 'individual' ? 'Örn: Ahmet Halı Saha' : 'Örn: Ahmet Spor Tesisleri A.Ş.'}
                      className={`w-full rounded-lg border py-3 pr-4 pl-10 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-green-500 focus:outline-none ${
                        errors.businessName ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  {errors.businessName && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className='mt-1 text-sm text-red-500'
                    >
                      {errors.businessName}
                    </motion.p>
                  )}
                </div>

                {/* Yetkili Ad Soyad */}
                <div>
                  <label className='mb-2 block text-sm font-medium text-gray-700'>
                    Yetkili Ad Soyad *
                  </label>
                  <div className='relative'>
                    <User
                      className='absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400'
                      size={20}
                    />
                    <input
                      type='text'
                      value={formData.authorizedPerson}
                      onChange={(e) => handleInputChange('authorizedPerson', e.target.value)}
                      placeholder='Yetkili kişinin adı soyadı'
                      className={`w-full rounded-lg border py-3 pr-4 pl-10 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-green-500 focus:outline-none ${
                        errors.authorizedPerson ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  {errors.authorizedPerson && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className='mt-1 text-sm text-red-500'
                    >
                      {errors.authorizedPerson}
                    </motion.p>
                  )}
                </div>

                {/* Kurumsal Email */}
                <div>
                  <label className='mb-2 block text-sm font-medium text-gray-700'>
                    Kurumsal Email *
                  </label>
                  <div className='relative'>
                    <User
                      className='absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400'
                      size={20}
                    />
                    <input
                      type='email'
                      value={formData.businessEmail}
                      onChange={(e) => handleInputChange('businessEmail', e.target.value)}
                      placeholder='info@isletme.com'
                      className={`w-full rounded-lg border py-3 pr-4 pl-10 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-green-500 focus:outline-none ${
                        errors.businessEmail ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  {errors.businessEmail && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className='mt-1 text-sm text-red-500'
                    >
                      {errors.businessEmail}
                    </motion.p>
                  )}
                </div>

                {/* İşletme Telefonu */}
                <div>
                  <label className='mb-2 block text-sm font-medium text-gray-700'>
                    İşletme Telefonu *
                  </label>
                  <div className='flex gap-2'>
                    <select className='w-24 rounded-lg border border-gray-300 px-3 py-3 focus:border-transparent focus:ring-2 focus:ring-green-500 focus:outline-none'>
                      <option>TR +90</option>
                    </select>
                    <div className='relative flex-1'>
                      <Phone
                        className='absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400'
                        size={20}
                      />
                      <input
                        type='tel'
                        value={formData.businessPhone}
                        onChange={(e) => handleInputChange('businessPhone', e.target.value)}
                        placeholder='(212) XXX XX XX'
                        className={`w-full rounded-lg border py-3 pr-4 pl-10 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-green-500 focus:outline-none ${
                          errors.businessPhone ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                    </div>
                  </div>
                  {errors.businessPhone && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className='mt-1 text-sm text-red-500'
                    >
                      {errors.businessPhone}
                    </motion.p>
                  )}
                </div>

                {/* İşletme Adresi */}
                <div>
                  <label className='mb-2 block text-sm font-medium text-gray-700'>
                    İşletme Adresi *
                  </label>
                  <div className='space-y-3'>
                    <div className='relative'>
                      <Target
                        className='absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400'
                        size={20}
                      />
                      <textarea
                        value={formData.businessAddress}
                        onChange={(e) => handleInputChange('businessAddress', e.target.value)}
                        placeholder='Tam adres bilginizi girin veya harita üzerinden seçin'
                        rows={3}
                        className={`w-full rounded-lg border py-3 pr-4 pl-10 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-green-500 focus:outline-none ${
                          errors.businessAddress ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                    </div>
                    
                    {/* Harita Butonu */}
                    <div className='flex gap-2'>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowMap(!showMap)}
                        className='flex items-center gap-2 rounded-lg border border-green-500 bg-green-50 px-4 py-2 text-green-700 transition-colors hover:bg-green-100'
                      >
                        <Target size={16} />
                        <span className='text-sm font-medium'>
                          {showMap ? 'Haritayı Gizle' : 'Harita Üzerinden Seç'}
                        </span>
                      </motion.button>
                      
                      {formData.businessLocation.lat && formData.businessLocation.lng && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            const url = `https://www.google.com/maps?q=${formData.businessLocation.lat},${formData.businessLocation.lng}`;
                            window.open(url, '_blank');
                          }}
                          className='flex items-center gap-2 rounded-lg border border-blue-500 bg-blue-50 px-4 py-2 text-blue-700 transition-colors hover:bg-blue-100'
                        >
                          <Target size={16} />
                          <span className='text-sm font-medium'>Konumu Görüntüle</span>
                        </motion.button>
                      )}
                    </div>

                    {/* Harita Modal */}
                    {showMap && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className='rounded-lg border border-gray-200 bg-white p-4 shadow-lg'
                      >
                        <div className='mb-3 flex items-center justify-between'>
                          <h4 className='font-medium text-gray-900'>Konum Seçin</h4>
                          <button
                            onClick={() => setShowMap(false)}
                            className='rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                          >
                            <X size={20} />
                          </button>
                        </div>
                        
                        {/* Adres Arama */}
                        <div className='mb-4 relative'>
                          <div className='relative'>
                            <Target
                              className='absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400'
                              size={16}
                            />
                            <input
                              type='text'
                              value={mapSearchQuery}
                              onChange={(e) => handleMapSearch(e.target.value)}
                              placeholder='Sokak, mahalle, cadde arayın'
                              className='w-full rounded-lg border border-gray-300 py-2 pr-4 pl-10 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500 focus:outline-none'
                            />
                          </div>
                          
                          {/* Loading State */}
                          {isSearching && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className='absolute top-full left-0 right-0 z-10 mt-1 rounded-lg border border-gray-200 bg-white p-4 shadow-lg'
                            >
                              <div className='flex items-center gap-3'>
                                <div className='animate-spin rounded-full h-4 w-4 border-2 border-green-500 border-t-transparent'></div>
                                <span className='text-sm text-gray-600'>Aranıyor...</span>
                              </div>
                            </motion.div>
                          )}

                          {/* Arama Sonuçları Dropdown */}
                          {showSearchResults && !isSearching && mapSearchResults.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className='absolute top-full left-0 right-0 z-10 mt-1 max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg'
                            >
                              {mapSearchResults.map((result, index) => (
                                <motion.button
                                  key={index}
                                  whileHover={{ backgroundColor: '#f0fdf4' }}
                                  onClick={() => handleSearchResultSelect(result)}
                                  className='w-full p-3 text-left hover:bg-green-50 border-b border-gray-100 last:border-b-0'
                                >
                                  <div className='flex items-start gap-3'>
                                    <div className='flex-shrink-0 mt-1'>
                                      {result.type === 'Spor Tesisi' && <span className='text-green-500'>🏟️</span>}
                                      {result.type === 'İlçe' && <span className='text-blue-500'>🏘️</span>}
                                      {result.type === 'Mahalle' && <span className='text-purple-500'>🏠</span>}
                                      {result.type === 'Cadde' && <span className='text-orange-500'>🛣️</span>}
                                      {result.type === 'Sokak' && <span className='text-red-500'>🛤️</span>}
                                      {result.type === 'Kamu' && <span className='text-indigo-500'>🏛️</span>}
                                      {result.type === 'Sahil' && <span className='text-cyan-500'>🏖️</span>}
                                      {!['Spor Tesisi', 'İlçe', 'Mahalle', 'Cadde', 'Sokak', 'Kamu', 'Sahil'].includes(result.type) && <Target size={16} className='text-gray-500' />}
                                    </div>
                                    <div className='flex-1 min-w-0'>
                                      <div className='flex items-center gap-2 mb-1'>
                                        <div className='font-medium text-gray-900 text-sm truncate'>{result.name}</div>
                                        <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800'>
                                          {result.type}
                                        </span>
                                      </div>
                                      <div className='text-xs text-gray-500 line-clamp-2'>{result.address}</div>
                                    </div>
                                  </div>
                                </motion.button>
                              ))}
                            </motion.div>
                          )}
                          
                          {/* Arama Sonucu Bulunamadı */}
                          {showSearchResults && !isSearching && mapSearchResults.length === 0 && mapSearchQuery.length >= 2 && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className='absolute top-full left-0 right-0 z-10 mt-1 rounded-lg border border-gray-200 bg-white p-3 shadow-lg'
                            >
                              <div className='flex items-center gap-2 text-sm text-gray-500'>
                                <CircleAlert size={16} />
                                <span>"{mapSearchQuery}" için sonuç bulunamadı</span>
                              </div>
                            </motion.div>
                          )}
                        </div>
                        
                        <div className='mb-3 rounded-lg border border-gray-200 overflow-hidden relative'>
                          <iframe
                            src={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3010.279749111567!2d${mapCenter.lng}!3d${mapCenter.lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14cab9bd6571d149%3A0x1c515b0b4b4b4b4b!2sIstanbul!5e0!3m2!1str!2str!4v1234567890123!5m2!1str!2str`}
                            width="100%"
                            height="300"
                            style={{ border: 0 }}
                            allowFullScreen=""
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            title="Konum Seçimi"
                            onClick={handleMapClick}
                          />
                          
                          {/* Pin Overlay */}
                          <div 
                            className='absolute cursor-move z-10 select-none'
                            style={{
                              left: `${pinPosition.x}%`,
                              top: `${pinPosition.y}%`,
                              transform: 'translate(-50%, -100%)'
                            }}
                            onMouseDown={handlePinDragStart}
                            onMouseMove={handlePinDrag}
                            onMouseUp={handlePinDragEnd}
                            onMouseLeave={handlePinDragEnd}
                          >
                            <div className='relative'>
                              <div className={`w-8 h-8 bg-red-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center transition-transform ${isDragging ? 'scale-110' : 'scale-100'}`}>
                                <div className='w-2 h-2 bg-white rounded-full'></div>
                              </div>
                              <div className='absolute top-full left-1/2 transform -translate-x-1/2 mt-1'>
                                <div className='w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-red-500'></div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Pin Sürükleme Talimatı */}
                          <div className='absolute top-2 left-2 bg-white bg-opacity-90 rounded-lg px-3 py-2 text-xs text-gray-600 shadow-sm'>
                            📍 Pin'i sürükleyerek konum seçin
                          </div>
                        </div>
                        
                        <div className='space-y-2'>
                          <p className='text-sm text-gray-600'>
                            Adres arama kutusuna yazarak konum arayabilir veya harita üzerindeki pin'i sürükleyerek konum seçebilirsiniz
                          </p>
                          
                          {/* Seçilen Konum Gösterimi */}
                          {selectedLocation && (
                            <div className='rounded-lg bg-green-50 border border-green-200 p-3'>
                              <div className='flex items-start gap-2'>
                                <Target size={16} className='text-green-600 mt-0.5' />
                                <div className='text-sm text-green-700'>
                                  <p className='font-medium'>Seçilen Konum:</p>
                                  <p className='text-xs'>{selectedLocation.address}</p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className='rounded-lg bg-blue-50 p-3'>
                            <div className='flex items-start gap-2'>
                              <CircleAlert size={16} className='text-blue-600 mt-0.5' />
                              <div className='text-xs text-blue-700'>
                                <p className='font-medium'>İpucu:</p>
                                <p>Adres arama kutusuna "İstanbul" gibi anahtar kelimeler yazarak arama yapabilir veya harita üzerindeki kırmızı pin'i sürükleyerek konum seçebilirsiniz.</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                  
                  {errors.businessAddress && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className='mt-1 text-sm text-red-500'
                    >
                      {errors.businessAddress}
                    </motion.p>
                  )}
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
                  Doğrulama Belgelerinizi Yükleyin
                </h3>

                {/* İşletme Ruhsatı */}
                <div>
                  <label className='mb-3 block text-sm font-medium text-gray-700'>
                    {formData.companyType === 'individual' ? 'Vergi Levhası / Faaliyet Belgesi *' : 'İşletme Ruhsatı / İmza Sirküleri *'}
                  </label>
                  <ImageUploader
                    userId={user?.uid}
                    category="business-license"
                    initialImages={formData.businessLicense ? (Array.isArray(formData.businessLicense) ? formData.businessLicense : [formData.businessLicense]) : []}
                    onImagesChange={(images) => handleInputChange('businessLicense', images[0] || null)}
                    maxFiles={1}
                    acceptedTypes={['image/jpeg', 'image/png', 'application/pdf']}
                    placeholder="Belge yükleyin (PDF, JPG, PNG)"
                  />
                  {errors.businessLicense && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className='mt-1 text-sm text-red-500'
                    >
                      {errors.businessLicense}
                    </motion.p>
                  )}
                </div>

                {/* Saha Fotoğrafları */}
                <div>
                  <label className='mb-3 block text-sm font-medium text-gray-700'>
                    Saha Fotoğrafları (Min 3, Max 10) *
                  </label>
                  <ImageUploader
                    userId={user?.uid}
                    category="facility-photos"
                    initialImages={formData.facilityPhotos || []}
                    onImagesChange={(images) => handleInputChange('facilityPhotos', images)}
                    maxFiles={10}
                    minFiles={3}
                    acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
                    placeholder="Saha fotoğraflarınızı yükleyin"
                  />
                  {errors.facilityPhotos && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className='mt-1 text-sm text-red-500'
                    >
                      {errors.facilityPhotos}
                    </motion.p>
                  )}
                </div>

                {/* Vergi Bilgileri */}
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                  <div>
                    <label className='mb-2 block text-sm font-medium text-gray-700'>
                      TC / Vergi Numarası *
                    </label>
                    <input
                      type='text'
                      value={formData.taxNumber}
                      onChange={(e) => handleInputChange('taxNumber', e.target.value)}
                      placeholder='1234567890'
                      maxLength={10}
                      className={`w-full rounded-lg border py-3 px-4 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-green-500 focus:outline-none ${
                        errors.taxNumber ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.taxNumber && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className='mt-1 text-sm text-red-500'
                      >
                        {errors.taxNumber}
                      </motion.p>
                    )}
                  </div>

                  <div>
                    <label className='mb-2 block text-sm font-medium text-gray-700'>
                      Vergi Dairesi *
                    </label>
                    <input
                      type='text'
                      value={formData.taxOffice}
                      onChange={(e) => handleInputChange('taxOffice', e.target.value)}
                      placeholder='Vergi dairesi adı'
                      className={`w-full rounded-lg border py-3 px-4 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-green-500 focus:outline-none ${
                        errors.taxOffice ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.taxOffice && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className='mt-1 text-sm text-red-500'
                      >
                        {errors.taxOffice}
                      </motion.p>
                    )}
                  </div>
                </div>

                {/* IBAN */}
                <div>
                  <label className='mb-2 block text-sm font-medium text-gray-700'>
                    IBAN (Ödemeler için) *
                  </label>
                  <input
                    type='text'
                    value={formData.iban}
                    onChange={(e) => handleInputChange('iban', e.target.value)}
                    placeholder='TR00 0000 0000 0000 0000 0000 00'
                    className={`w-full rounded-lg border py-3 px-4 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-green-500 focus:outline-none ${
                      errors.iban ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.iban && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className='mt-1 text-sm text-red-500'
                    >
                      {errors.iban}
                    </motion.p>
                  )}
                </div>

                {/* TC Kimlik */}
                <div>
                  <label className='mb-2 block text-sm font-medium text-gray-700'>
                    {formData.companyType === 'individual' ? 'TC Kimlik No *' : 'Yetkili TC Kimlik No *'}
                  </label>
                  <input
                    type='text'
                    value={formData.authorizedPersonId}
                    onChange={(e) => handleInputChange('authorizedPersonId', e.target.value)}
                    placeholder='12345678901'
                    maxLength={11}
                    className={`w-full rounded-lg border py-3 px-4 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-green-500 focus:outline-none ${
                      errors.authorizedPersonId ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.authorizedPersonId && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className='mt-1 text-sm text-red-500'
                    >
                      {errors.authorizedPersonId}
                    </motion.p>
                  )}
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
                <div className='bg-green-50 rounded-2xl p-8 mb-8'>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    className='mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100 border-4 border-white shadow-lg'
                  >
                    <Check size={48} className='text-green-500' />
                  </motion.div>

                  <h3 className='mb-4 text-3xl font-bold text-gray-900'>Tebrikler! Hesabınız Hazır 🎉</h3>
                  <p className='text-lg text-gray-600 max-w-lg mx-auto'>
                    Saha sahibi hesabınız başarıyla oluşturuldu. Hemen yönetim paneline giderek tesislerinizi eklemeye başlayabilirsiniz.
                  </p>
                </div>

                {/* Panele Git Butonu */}
                <div className='mb-8 flex justify-center'>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setNeedsOnboarding(false);
                      navigate('/saha-sahibi/dashboard');
                    }}
                    className='flex items-center gap-3 rounded-xl bg-gradient-to-r from-green-600 to-green-700 px-8 py-4 text-lg font-bold text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1'
                  >
                    <Target size={24} />
                    Yönetim Paneline Git
                    <ChevronRight size={24} />
                  </motion.button>
                </div>

                <div className='rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-left'>
                  <h4 className='mb-4 font-semibold text-gray-900 border-b pb-2 flex items-center gap-2'>
                    <User size={18} />
                    Başvuru Özeti
                  </h4>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600'>
                    <div>
                        <p className="text-gray-400 text-xs mb-1">İşletme Adı</p>
                        <p className="font-medium text-gray-900">{formData.businessName}</p>
                    </div>
                    <div>
                        <p className="text-gray-400 text-xs mb-1">Yetkili Kişi</p>
                        <p className="font-medium text-gray-900">{formData.authorizedPerson}</p>
                    </div>
                    <div>
                        <p className="text-gray-400 text-xs mb-1">E-posta</p>
                        <p className="font-medium text-gray-900">{formData.businessEmail}</p>
                    </div>
                    <div>
                        <p className="text-gray-400 text-xs mb-1">Telefon</p>
                        <p className="font-medium text-gray-900">{formData.businessPhone}</p>
                    </div>
                     <div className="md:col-span-2">
                        <p className="text-gray-400 text-xs mb-1">Adres</p>
                        <p className="font-medium text-gray-900">{formData.businessAddress}</p>
                    </div>
                    
                    {formData.profilePhoto && (
                      <div className="md:col-span-2 mt-2 pt-4 border-t flex items-center gap-3">
                         <img 
                          src={getOptimizedImageUrl(profileImageData?.url) || getImageUrl(profileImageData?.url)} 
                          alt="Profil" 
                          className="w-12 h-12 rounded-full object-cover border border-gray-200"
                        />
                        <div>
                             <p className="text-xs text-gray-400">Profil Fotoğrafı</p>
                             <p className="text-sm font-medium text-green-600">Yüklendi</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Hata Mesajları */}
                {errors.submit && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className='mb-6 rounded-lg bg-red-50 border border-red-200 p-4'
                  >
                    <div className='flex items-center gap-2'>
                      <CircleAlert size={20} className='text-red-600' />
                      <p className='text-sm text-red-700'>{errors.submit}</p>
                    </div>
                  </motion.div>
                )}

                {/* KVKK Onayları */}

              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          {/* Navigation Buttons - Sadece ilk 2 adımda göster */}
          {currentStep < 3 && (
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

              {currentStep < 2 ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={nextStep}
                  className='flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-6 py-3 font-medium text-white shadow-lg transition-all duration-200 hover:from-green-600 hover:to-green-700'
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
                  className={`flex items-center gap-2 rounded-lg px-6 py-3 font-medium text-white shadow-lg transition-all duration-200 ${
                    isSubmitting
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700'
                  }`}
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
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default SahaSahibiOnboard;

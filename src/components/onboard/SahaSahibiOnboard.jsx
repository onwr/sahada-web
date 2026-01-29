import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import citiesData from '../../utils/iller.json';
import districtsData from '../../utils/ilceler.json';
import {
  User,
  Calendar,
  Phone,
  Camera,
  Star,
  Clock,
  Target,
  Activity,
  Mars,
  Venus,
  CircleAlert,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
} from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { useAuth } from '../../contexts/AuthContext';
import { updateUserData } from '../../services/authService';
import { addTesis, slugify } from '../../services/firestoreService';
import { 
  uploadImage, 
  getImageUrl, 
  getOptimizedImageUrl 
} from '../../services/cdnService';
import ImageUploader from '../ImageUploader';
import ProfileImageUploader from '../ProfileImageUploader';
import toast from '../../utils/toast';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for Leaflet marker icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const DraggableMarker = ({ position, onLocationSelect }) => {
  const markerRef = React.useRef(null);
  const map = useMapEvents({
    click(e) {
      onLocationSelect(e.latlng);
    },
  });

  useEffect(() => {
    if (position) {
      map.flyTo(position, 15);
    }
  }, [position, map]);

  const eventHandlers = React.useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          onLocationSelect(marker.getLatLng());
        }
      },
    }),
    [onLocationSelect]
  );

  return position ? (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
    />
  ) : null;
};

const RecenterMap = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center.lat && center.lng) {
      map.setView([center.lat, center.lng]);
    }
  }, [center, map]);
  return null;
};

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
    city: '',
    district: '',
    businessAddress: '',
    businessLocation: { lat: null, lng: null },

    // Doğrulama Belgeleri
    taxPlate: null,
    activityCertificate: null,
    businessLicense: null,
    signatureCircular: null,
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
    whatsapp: false,
    membershipAgreement: false
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
  
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);


  // Optimize district filtering
  const districts = React.useMemo(() => {
    if (!formData.city) return [];
    
    // Find city ID from name
    const cityEntry = Object.entries(citiesData).find(([id, name]) => name === formData.city);
    if (!cityEntry) return [];

    const cityId = cityEntry[0];
    // Filter districts safely
    try {
        const dataTable = districtsData.find(item => item.type === 'table' && item.name === 'ilce');
        return dataTable?.data?.filter(d => d.il_id === cityId) || [];
    } catch (err) {
        console.error("Districts data error:", err);
        return [];
    }
  }, [formData.city]);

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
          city: userData.city || savedData?.city || prev.city || '',
          district: userData.district || savedData?.district || prev.district || '',
          businessAddress: userData.businessAddress || savedData?.businessAddress || prev.businessAddress || '',
          businessLocation: userData.businessLocation || savedData?.businessLocation || prev.businessLocation || { lat: null, lng: null },
          taxNumber: userData.taxNumber || savedData?.taxNumber || prev.taxNumber || '',
          taxOffice: userData.taxOffice || savedData?.taxOffice || prev.taxOffice || '',
          iban: userData.iban || savedData?.iban || prev.iban || '',
          authorizedPersonId: userData.authorizedPersonId || savedData?.authorizedPersonId || prev.authorizedPersonId || '',
          profilePhoto: userData.profilePhoto || savedData?.profilePhoto || prev.profilePhoto || null,
          taxPlate: userData.taxPlate || savedData?.taxPlate || prev.taxPlate || null,
          activityCertificate: userData.activityCertificate || savedData?.activityCertificate || prev.activityCertificate || null,
          businessLicense: userData.businessLicense || savedData?.businessLicense || prev.businessLicense || null,
          signatureCircular: userData.signatureCircular || savedData?.signatureCircular || prev.signatureCircular || null,
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
        taxPlate: formData.taxPlate instanceof File ? null : formData.taxPlate,
        activityCertificate: formData.activityCertificate instanceof File ? null : formData.activityCertificate,
        businessLicense: formData.businessLicense instanceof File ? null : formData.businessLicense,
        signatureCircular: formData.signatureCircular instanceof File ? null : formData.signatureCircular,
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

    if (field === 'businessPhone') {
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
        
        formattedValue = formatted;
    } else if (field === 'taxNumber') {
      // Şahıs şirketi ise 11, değilse 10 karakter
      const limit = formData.companyType === 'individual' ? 11 : 10;
      formattedValue = value.replace(/\D/g, '').slice(0, limit);
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
      ...(field === 'city' ? { district: '' } : {})
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
    if (formData.taxPlate || formData.businessLicense) completion += 10;
    if (formData.activityCertificate || formData.signatureCircular) completion += 5;
    if (formData.facilityPhotos.length > 0) completion += 5;
    if (formData.taxNumber) completion += 4;
    if (formData.iban) completion += 3;
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

      if (!formData.city) {
        newErrors.city = 'Şehir seçimi gereklidir';
      }

      if (!formData.district) {
        newErrors.district = 'İlçe seçimi gereklidir';
      }

      if (!formData.businessAddress) {
        newErrors.businessAddress = 'İşletme adresi gereklidir';
      }
    } else if (step === 2) {
      if (formData.companyType === 'individual') {
        if (!formData.taxPlate) {
          newErrors.taxPlate = 'Vergi Levhası gereklidir';
        }
        if (!formData.activityCertificate) {
          newErrors.activityCertificate = 'Faaliyet Belgesi gereklidir';
        }
      } else {
        if (!formData.businessLicense) {
          newErrors.businessLicense = 'İşletme Ruhsatı gereklidir';
        }
        if (!formData.signatureCircular) {
          newErrors.signatureCircular = 'İmza Sirküleri gereklidir';
        }
      }

      if (formData.facilityPhotos.length < 3) {
        newErrors.facilityPhotos = 'En az 3 saha fotoğrafı yüklemelisiniz';
      }

      if (!formData.taxNumber) {
        newErrors.taxNumber = formData.companyType === 'individual' ? 'TC Kimlik numarası gereklidir' : 'Vergi numarası gereklidir';
      } else {
        const requiredLength = formData.companyType === 'individual' ? 11 : 10;
        if (formData.taxNumber.length !== requiredLength) {
          newErrors.taxNumber = `${formData.companyType === 'individual' ? 'TC Kimlik' : 'Vergi'} numarası ${requiredLength} haneli olmalıdır`;
        }
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

      if (formData.companyType !== 'individual') {
        if (!formData.authorizedPersonId) {
          newErrors.authorizedPersonId = 'TC Kimlik No gereklidir';
        } else if (formData.authorizedPersonId.length !== 11) {
          newErrors.authorizedPersonId = 'TC Kimlik numarası 11 haneli olmalıdır';
        }
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

  const handleCompanyTypeChange = (type) => {
    handleInputChange('companyType', type);
    handleInputChange('taxNumber', '');
    setErrors(prev => ({ ...prev, taxNumber: '' }));
  };
  
  const sendOTP = async (phone, code) => {
    console.log('=== OWNER SMS GÖNDERME BAŞLADI ===');
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
      
      const message = `Sahada Doğrulama Kodunuz: ${code}\nTelefon numaranızı doğrulamak için bu kodu girin.`;
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
        console.log('=== OWNER SMS GÖNDERME BİTTİ ===');
        
        return success;
      } catch (fetchError) { 
        console.error('14. FETCH HATASI:', fetchError);
        console.error('Hata detayı:', fetchError.message);
        console.log('=== OWNER SMS GÖNDERME HATA İLE BİTTİ (FETCH) ===');
        return true; 
      }
    } catch (error) { 
      console.error('15. GENEL HATA:', error);
      console.error('Hata detayı:', error.message);
      console.log('=== OWNER SMS GÖNDERME HATA İLE BİTTİ (GENEL) ===');
      return false; 
    }
  };
  
  const handleSendOTP = async () => {
    if (!formData.businessPhone || formData.businessPhone.replace(/\D/g, '').length < 10) return;
    setOtpLoading(true);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOTP(otp);
    const sent = await sendOTP(formData.businessPhone, otp);
    setOtpLoading(false);
    if (sent) {
      setShowOTPModal(true);
      toast.success('SMS gönderildi!');
    } else {
      setPhoneVerified(true);
      toast.success('Telefon kaydedildi (SMS hatası nedeniyle doğrulama atlandı)');
      await updateUserData(user.uid, { phoneVerified: true, businessPhone: formData.businessPhone });
    }
  };
  
  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) return;
    setOtpLoading(true);
    const isValid = otpCode === generatedOTP;
    setOtpLoading(false);
    if (isValid) {
      setPhoneVerified(true);
      setShowOTPModal(false);
      setOtpCode('');
      toast.success('Telefon doğrulandı!');
      await updateUserData(user.uid, { phoneVerified: true, businessPhone: formData.businessPhone });
    } else {
      toast.error('Kod hatalı');
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      console.error('Kullanıcı giriş yapmamış');
      return;
    }



    // Zorunlu anlaşmaları kontrol et
    if (!agreements.terms || !agreements.kvkk || !agreements.membershipAgreement) {
      setErrors({ submit: 'Lütfen tüm zorunlu sözleşmeleri onaylayın' });
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
        taxPlate: formData.taxPlate ? {
          url: formData.taxPlate.url || '',
          fileName: formData.taxPlate.fileName || 'unknown',
          fileSize: formData.taxPlate.fileSize || 0,
          uploadedAt: formData.taxPlate.uploadedAt || new Date()
        } : null,
        activityCertificate: formData.activityCertificate ? {
          url: formData.activityCertificate.url || '',
          fileName: formData.activityCertificate.fileName || 'unknown',
          fileSize: formData.activityCertificate.fileSize || 0,
          uploadedAt: formData.activityCertificate.uploadedAt || new Date()
        } : null,
        businessLicense: formData.businessLicense ? {
          url: formData.businessLicense.url || '',
          fileName: formData.businessLicense.fileName || 'unknown',
          fileSize: formData.businessLicense.fileSize || 0,
          uploadedAt: formData.businessLicense.uploadedAt || new Date()
        } : null,
        signatureCircular: formData.signatureCircular ? {
          url: formData.signatureCircular.url || '',
          fileName: formData.signatureCircular.fileName || 'unknown',
          fileSize: formData.signatureCircular.fileSize || 0,
          uploadedAt: formData.signatureCircular.uploadedAt || new Date()
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
        } : null,
        photoURL: profileImageData?.url || formData.profilePhoto?.url || (typeof formData.profilePhoto === 'string' ? formData.profilePhoto : '') || '',
        agreements,
        onboardingCompleted: true, // DB'de tamamlandı işaretle
        profileCompleted: true,
        userType: 'owner',
        isApproved: true, // Otomatik onay
        status: 'active',
        phone: formData.businessPhone,
        updatedAt: new Date()
      };

      // Debug için console.log
      console.log('Profile data to save:', processedFormData);

      await updateUserData(user.uid, processedFormData);

      // Firebase Auth profilini de güncelle
      const finalPhotoURL = profileImageData?.url || formData.profilePhoto?.url || formData.profilePhoto;
      if (finalPhotoURL) {
        try {
          await updateProfile(user, {
            photoURL: String(finalPhotoURL)
          });
        } catch (authError) {
          console.error('Auth profile update error:', authError);
        }
      }
      
      // Saha (Tesis) belgesi oluştur
      // Onboarding sırasında girilen bilgileri kullanarak ilk tesisi otomatik oluşturuyoruz
      try {
        const tesisName = formData.businessName || `${formData.authorizedPerson} Tesisi`;
        const slug = `${slugify(tesisName)}-${user.uid.slice(0, 5)}`;

        const tesisData = {
          name: tesisName,
          slug,
          latitude: formData.businessLocation?.lat,
          longitude: formData.businessLocation?.lng,
          type: 'Futbol', // Varsayılan tip
          capacity: parseInt(formData.facilityCount) || 14,
          price: 0, // Varsayılan fiyat
          description: formData.description || 'Yeni tesisimiz hizmetinizde.',
          facilities: [
            formData.hasShower && 'Duş',
            formData.hasParking && 'Otopark',
            formData.hasCafeteria && 'Kafeterya',
            formData.hasCamera && 'Kamera',
            formData.hasLockers && 'Soyunma Odası'
          ].filter(Boolean),
          workingHours: formData.openingHours || '08:00 - 24:00',
          phone: formData.businessPhone,
          status: 'active',
          isActive: true,
          images: formData.facilityPhotos ? formData.facilityPhotos.map(photo => ({
            url: photo.url || '',
            fileName: photo.fileName || 'unknown',
            fileSize: photo.fileSize || 0,
            uploadedAt: photo.uploadedAt || new Date()
          })) : [],
          ownerId: user.uid,
          rating: 0,
          reservations: 0,
          revenue: 0,
          location: formData.city && formData.district ? `${formData.district}, ${formData.city}` : formData.businessAddress,
          address: formData.businessAddress,
          city: formData.city,
          district: formData.district,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const tesisResult = await addTesis(tesisData);
        if (!tesisResult.success) {
          console.error('Saha oluşturma hatası (onboarding):', tesisResult.error);
          // Ana işlem başarılı olduğu için devam ediyoruz, 
          // kullanıcı panelden manuel de ekleyebilir
        }
      } catch (tesisError) {
        console.error('Saha oluşturma istisnası (onboarding):', tesisError);
      }
      
      // Context'i güncelle ama henüz redirect yapma (Son adımda yapılacak)
      setUserData(prev => ({ 
        ...prev, 
        ...processedFormData,
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
                    onClick={() => handleCompanyTypeChange('individual')}
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
                    onClick={() => handleCompanyTypeChange('corporate')}
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
                      value={formData.businessName || ''}
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
                      value={formData.authorizedPerson || ''}
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
                      value={formData.businessEmail || ''}
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
                    <select 
                      defaultValue="TR"
                      className='w-24 rounded-lg border border-gray-300 px-3 py-3 focus:border-transparent focus:ring-2 focus:ring-green-500 focus:outline-none'
                    >
                      <option value="TR">TR +90</option>
                    </select>
                    <div className='relative flex-1'>
                      <Phone
                        className='absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400'
                        size={20}
                      />
                        <input
                          type='tel'
                          value={formData.businessPhone || ''}
                          onChange={(e) => {
                              const val = e.target.value;
                              if (val.length <= 15) {
                                handleInputChange('businessPhone', val);
                              }
                          }}
                          placeholder='(555) 555 55 55'
                        className={`w-full rounded-lg border py-3 pr-10 pl-10 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-green-500 focus:outline-none ${
                          errors.businessPhone ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                    </div>
                    {formData.businessPhone && formData.businessPhone.replace(/\D/g, '').length >= 10 && (
                      <button
                        type="button"
                        onClick={handleSendOTP}
                        disabled={otpLoading || phoneVerified}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                          phoneVerified 
                            ? 'bg-green-100 text-green-700 cursor-default flex items-center gap-1' 
                            : 'bg-green-600 text-white hover:bg-green-700 shadow-md active:scale-95'
                        }`}
                      >
                        {otpLoading ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : phoneVerified ? (
                          <><Check size={16} /> Doğrulandı</>
                        ) : (
                          'Doğrula'
                        )}
                      </button>
                    )}
                  </div>
                  {phoneVerified && (
                    <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                      <Check size={12} /> Telefon numaranız başarıyla doğrulandı.
                    </p>
                  )}
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
                
                {/* Şehir ve İlçe */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className='mb-2 block text-sm font-medium text-gray-700'>
                      Şehir *
                    </label>
                    <div className='relative'>
                      <Target
                        className='absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400'
                        size={20}
                      />
                      <select
                        value={formData.city || ''}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        className={`w-full rounded-lg border py-3 pr-4 pl-10 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-green-500 focus:outline-none appearance-none bg-white ${
                          errors.city ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Seçiniz</option>
                        {Object.values(citiesData).sort().map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <ChevronRight className="h-4 w-4 text-gray-400 transform rotate-90" />
                      </div>
                    </div>
                    {errors.city && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className='mt-1 text-sm text-red-500'
                      >
                        {errors.city}
                      </motion.p>
                    )}
                  </div>

                  <div>
                    <label className='mb-2 block text-sm font-medium text-gray-700'>
                      İlçe *
                    </label>
                    <div className='relative'>
                      <Target
                        className='absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400'
                        size={20}
                      />
                      <select
                        value={formData.district || ''}
                        onChange={(e) => handleInputChange('district', e.target.value)}
                        disabled={!formData.city}
                        className={`w-full rounded-lg border py-3 pr-4 pl-10 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-green-500 focus:outline-none appearance-none bg-white ${
                          errors.district ? 'border-red-500' : 'border-gray-300'
                        } ${!formData.city ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      >
                        <option value="">Seçiniz</option>
                        {districts.map(d => (
                          <option key={d.id} value={d.name}>{d.name}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <ChevronRight className="h-4 w-4 text-gray-400 transform rotate-90" />
                      </div>
                    </div>
                    {errors.district && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className='mt-1 text-sm text-red-500'
                      >
                        {errors.district}
                      </motion.p>
                    )}
                  </div>
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
                        value={formData.businessAddress || ''}
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
                        
                        <div className='mb-3 rounded-lg border border-gray-200 overflow-hidden relative h-[300px] z-0'>
                          <MapContainer
                            center={mapCenter.lat ? [mapCenter.lat, mapCenter.lng] : [41.0082, 28.9784]}
                            zoom={13}
                            scrollWheelZoom={true}
                            style={{ height: '100%', width: '100%' }}
                          >
                            <TileLayer
                              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <RecenterMap center={mapCenter} />
                            <DraggableMarker
                              position={
                                formData.businessLocation.lat && formData.businessLocation.lng
                                  ? [formData.businessLocation.lat, formData.businessLocation.lng]
                                  : null
                              }
                              onLocationSelect={(latlng) => {
                                handleInputChange('businessLocation', { lat: latlng.lat, lng: latlng.lng });
                              }}
                            />
                          </MapContainer>
                          
                          <div className='absolute top-2 right-2 bg-white bg-opacity-90 rounded-lg px-3 py-2 text-xs text-gray-600 shadow-sm z-[1000]'>
                            📍 Haritaya tıklayın veya pini sürükleyin
                          </div>
                        </div>
                        
                        <div className='space-y-2'>
                          <p className='text-sm text-gray-600'>
                            Adres arama kutusuna yazarak konum arayabilir, haritaya tıklayabilir veya pini sürükleyerek konum seçebilirsiniz
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
                                <p>Adres arama kutusuna "İstanbul" gibi anahtar kelimeler yazarak arama yapabilir veya harita üzerine tıklayarak konum seçebilirsiniz.</p>
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

                {/* Belgeler */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Vergi Levhası */}
                    <div>
                      <label className='mb-3 block text-sm font-medium text-gray-700'>
                        Vergi Levhası *
                      </label>
                      <ImageUploader
                        userId={user?.uid}
                        category="tax-plate"
                        initialImages={formData.taxPlate ? (Array.isArray(formData.taxPlate) ? formData.taxPlate : [formData.taxPlate]) : []}
                        onImagesChange={(images) => handleInputChange('taxPlate', images[0] || null)}
                        maxFiles={1}
                        acceptedTypes={['image/jpeg', 'image/png', 'application/pdf', '.pdf']}
                        placeholder="Vergi levhası yükleyin"
                      />
                      {errors.taxPlate && (
                        <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className='mt-1 text-sm text-red-500'>
                          {errors.taxPlate}
                        </motion.p>
                      )}
                    </div>

                    {/* Faaliyet Belgesi */}
                    <div>
                      <label className='mb-3 block text-sm font-medium text-gray-700'>
                        Faaliyet Belgesi *
                      </label>
                      <ImageUploader
                        userId={user?.uid}
                        category="activity-certificate"
                        initialImages={formData.activityCertificate ? (Array.isArray(formData.activityCertificate) ? formData.activityCertificate : [formData.activityCertificate]) : []}
                        onImagesChange={(images) => handleInputChange('activityCertificate', images[0] || null)}
                        maxFiles={1}
                        acceptedTypes={['image/jpeg', 'image/png', 'application/pdf', '.pdf']}
                        placeholder="Faaliyet belgesi yükleyin"
                      />
                      {errors.activityCertificate && (
                        <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className='mt-1 text-sm text-red-500'>
                          {errors.activityCertificate}
                        </motion.p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* İşletme Ruhsatı */}
                    <div>
                      <label className='mb-3 block text-sm font-medium text-gray-700'>
                        İşletme Ruhsatı (Opsiyonel)
                      </label>
                      <ImageUploader
                        userId={user?.uid}
                        category="business-license"
                        initialImages={formData.businessLicense ? (Array.isArray(formData.businessLicense) ? formData.businessLicense : [formData.businessLicense]) : []}
                        onImagesChange={(images) => handleInputChange('businessLicense', images[0] || null)}
                        maxFiles={1}
                        acceptedTypes={['image/jpeg', 'image/png', 'application/pdf', '.pdf']}
                        placeholder="Ruhsat yükleyin"
                      />
                    </div>

                    {/* İmza Sirküleri */}
                    <div>
                      <label className='mb-3 block text-sm font-medium text-gray-700'>
                        İmza Sirküleri {formData.companyType === 'corporate' ? '*' : '(Opsiyonel)'}
                      </label>
                      <ImageUploader
                        userId={user?.uid}
                        category="signature-circular"
                        initialImages={formData.signatureCircular ? (Array.isArray(formData.signatureCircular) ? formData.signatureCircular : [formData.signatureCircular]) : []}
                        onImagesChange={(images) => handleInputChange('signatureCircular', images[0] || null)}
                        maxFiles={1}
                        acceptedTypes={['image/jpeg', 'image/png', 'application/pdf', '.pdf']}
                        placeholder="İmza sirküleri yükleyin"
                      />
                      {errors.signatureCircular && formData.companyType === 'corporate' && (
                        <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className='mt-1 text-sm text-red-500'>
                          {errors.signatureCircular}
                        </motion.p>
                      )}
                    </div>
                  </div>
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
                      Numara Tipi
                    </label>
                    <div className="flex gap-4 mb-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="radio" 
                                name="taxType"
                                checked={formData.companyType === 'individual'}
                                onChange={() => handleCompanyTypeChange('individual')}
                                className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300"
                            />
                            <span className="text-sm text-gray-700">TC Kimlik No</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="radio" 
                                name="taxType"
                                checked={formData.companyType === 'corporate'}
                                onChange={() => handleCompanyTypeChange('corporate')}
                                className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300"
                            />
                            <span className="text-sm text-gray-700">Vergi Numarası</span>
                        </label>
                    </div>

                    <label className='mb-2 block text-sm font-medium text-gray-700'>
                      {formData.companyType === 'individual' ? 'TC Kimlik Numarası' : 'Vergi Numarası *'}
                    </label>
                    <input
                      type='text'
                      value={formData.taxNumber || ''}
                      onChange={(e) => handleInputChange('taxNumber', e.target.value)}
                      placeholder={formData.companyType === 'individual' ? '12345678901' : '1234567890'}
                      maxLength={formData.companyType === 'individual' ? 11 : 10}
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
                      value={formData.taxOffice || ''}
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
                    value={formData.iban || ''}
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

                {/* Yetkili TC Kimlik (Sadece Kurumsal İçin - Şahıs şirketinde zaten vergi no olarak alınıyor) */}
                {formData.companyType !== 'individual' && (
                <div>
                  <label className='mb-2 block text-sm font-medium text-gray-700'>
                    Yetkili TC Kimlik No *
                  </label>
                  <input
                    type='text'
                    value={formData.authorizedPersonId || ''}
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
                )}

                {/* KVKK ve Sözleşmeler */}
                <div className='mt-8 rounded-lg bg-green-50 p-6'>
                  <h4 className='mb-4 flex items-center gap-2 font-semibold text-green-900'>
                    <Check size={20} />
                    Güvenlik ve Gizlilik
                  </h4>
                  <div className='space-y-3'>
                    <label className='flex items-start gap-3'>
                      <input
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
                        type='checkbox'
                        checked={agreements.whatsapp}
                        onChange={(e) => handleAgreementChange('whatsapp', e.target.checked)}
                        className='mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500'
                      />
                      <span className='text-sm text-gray-700'>
                        WhatsApp'tan bildirimler almak istiyorum.
                      </span>
                    </label>
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
      
      {/* OTP Verification Modal */}
      <AnimatePresence>
        {showOTPModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setShowOTPModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="text-green-600" size={32} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Doğrulama Kodu</h3>
                <p className="text-gray-500 mt-2">
                  <span className="font-medium text-gray-900">{formData.businessPhone}</span> numarasına gönderilen 6 haneli kodu girin.
                </p>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode || ''}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full text-center text-3xl tracking-[0.5em] font-bold py-4 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-all"
                />

                <button
                  onClick={handleVerifyOTP}
                  disabled={otpLoading || otpCode.length !== 6}
                  className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-green-200 hover:bg-green-700 disabled:bg-gray-300 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  {otpLoading ? <Loader2 className="animate-spin" /> : 'Doğrula'}
                </button>

                <p className="text-center text-sm text-gray-500">
                  Kod gelmedi mi? <button onClick={handleSendOTP} className="text-green-600 font-bold hover:underline">Tekrar Gönder</button>
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
};

export default SahaSahibiOnboard;

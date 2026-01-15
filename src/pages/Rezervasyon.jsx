import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import OyuncuSidebar from '../components/OyuncuSidebar';
import { getTesis, searchUsers, checkAvailability, createRezervasyon, createRezervasyonWithTransaction, getPlatformSettings, getUserTeams, getUserData } from '../services/firestoreService';
import { processPayment, checkPaymentStatus, refundPayment, createPaymentForm, retrieveCheckoutForm } from '../services/paymentApiService';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Timestamp } from 'firebase/firestore';
import 'react-datepicker/dist/react-datepicker.css';
import { 
  ArrowLeft, 
  Clock,
  Users,
  MapPin,
  Phone,
  CreditCard,
  Check,
  X,
  Shield,
  Download,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MessageSquare
} from 'lucide-react';
import Header from '../components/Header';

const Rezervasyon = ({ inPanel = false }) => {
  const { user, userData } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [sahaData, setSahaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [showOyuncuModal, setShowOyuncuModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedPrice, setSelectedPrice] = useState(0);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('kredi-karti');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [timeSlots, setTimeSlots] = useState([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState({
    name: '',
    taxNumber: '',
    address: '',
    city: '',
    district: ''
  });
  const [reservationId, setReservationId] = useState(null);
  const [isCreatingReservation, setIsCreatingReservation] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('pending'); // pending, completed, failed, refunded
  const [paymentId, setPaymentId] = useState(null);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [splitPaymentEnabled, setSplitPaymentEnabled] = useState(true);
  const [splitPaymentData, setSplitPaymentData] = useState({
    organizerAmount: 0,
    playersAmount: 0,
    playerAmount: 0, // Oyuncu başına düşen tutar
    organizerPaid: false,
    playersPaid: false,
    totalPaid: 0 // Toplam ödenen tutar
  });
  const [cardData, setCardData] = useState({
    cardName: '',
    cardNumber: '',
    expiryDate: '',
    cvv: ''
  });
  
  // Iframe ödeme state'leri
  const [showPaymentIframe, setShowPaymentIframe] = useState(false);
  const [paymentIframeUrl, setPaymentIframeUrl] = useState('');
  const [paymentFormData, setPaymentFormData] = useState(null);
  const [platformSettings, setPlatformSettings] = useState(null);

  // Oyuncu listesi - organizatör otomatik eklenir
  const [oyuncular, setOyuncular] = useState([]);

  // Yeni oyuncu formu
  const [newOyuncu, setNewOyuncu] = useState({
    name: '',
    phone: '',
    searchTerm: '',
    selectedUser: null
  });

  // Filtrelenmiş kullanıcılar
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Ödeme callback'ini tek sefer işlemek için guard
  const hasHandledPaymentRef = useRef(false);

  // Iframe yükleme hatası state'i
  const [iframeError, setIframeError] = useState(null);
  const iframeLoadTimeoutRef = useRef(null);

  // State Refs for avoiding stale closures in event listeners
  const selectedDateRef = useRef(selectedDate);
  const selectedTimeRef = useRef(selectedTime);
  const sahaDataRef = useRef(sahaData);
  const oyuncularRef = useRef(oyuncular);
  const invoiceDataRef = useRef(invoiceData);
  const splitPaymentEnabledRef = useRef(splitPaymentEnabled);
  const splitPaymentDataRef = useRef(splitPaymentData);
  const selectedPaymentMethodRef = useRef(selectedPaymentMethod);
  const selectedPriceRef = useRef(selectedPrice);
  const userIdRef = useRef(user?.uid);
  const userRef = useRef(user);

  // Update refs when state changes
  useEffect(() => {
    selectedDateRef.current = selectedDate;
    selectedTimeRef.current = selectedTime;
    sahaDataRef.current = sahaData;
    oyuncularRef.current = oyuncular;
    invoiceDataRef.current = invoiceData;
    splitPaymentEnabledRef.current = splitPaymentEnabled;
    splitPaymentDataRef.current = splitPaymentData;
    selectedPaymentMethodRef.current = selectedPaymentMethod;
    selectedPriceRef.current = selectedPrice;
    userIdRef.current = user?.uid;
    userRef.current = user;
  }, [selectedDate, selectedTime, selectedPrice, sahaData, oyuncular, invoiceData, splitPaymentEnabled, splitPaymentData, selectedPaymentMethod, user]);

  // Date Slider Ref
  const dateSliderRef = useRef(null);

  const scrollDateSlider = (direction) => {
    if (dateSliderRef.current) {
      const scrollAmount = 200;
      dateSliderRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };
  const iframeRef = useRef(null);

  // Ödeme polling için referanslar
  const paymentTokenRef = useRef(null);
  const paymentConversationIdRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const pollingStartTimeRef = useRef(null);
  const pollingTimeoutRef = useRef(null);

  // Iframe mesaj dinleyicisi
  useEffect(() => {
    const handleMessage = async (event) => {
      // Sadece ödeme ile ilgili mesajları işle
      if (!event.data || (typeof event.data !== 'object')) {
        return;
      }
      
      // Ödeme başarılı/hatalı mesajlarını kontrol et
      const isPaymentMessage = event.data.success !== undefined || 
                                event.data.error !== undefined ||
                                event.data.paymentId !== undefined ||
                                event.data.type === 'payment_callback' ||
                                event.data.type === 'iframe_error';
      
      if (!isPaymentMessage) {
        return; // Ödeme ile ilgili değilse işleme
      }
      
      console.group('🔔 Payment PostMessage Event');
      console.log('📦 Data:', event.data);
      console.log('🌐 Origin:', event.origin);
      console.log('📍 Current Origin:', window.location.origin);
      console.log('⏰ Timestamp:', new Date().toISOString());
      console.groupEnd();
      
      // DEBUG: Origin kontrolünü geçici olarak gevşet
      const paymentApiUrl = import.meta.env.VITE_PAYMENT_API_BASE_URL || 'http://localhost';
      const allowedOrigins = [
        paymentApiUrl,
        window.location.origin,
        'https://sandbox-api.iyzipay.com',
        'https://api.iyzipay.com',
        'http://localhost',
        'https://localhost'
      ];
      
      const isAllowed = allowedOrigins.some(origin => {
        const matches = event.origin.startsWith(origin) || event.origin === origin;
        if (matches) {
          console.log('✅ Origin allowed:', event.origin, 'matches', origin);
        }
        return matches;
      });
      
      if (!isAllowed) {
        console.warn('⚠️ Güvenilmeyen origin\'den mesaj:', event.origin);
        console.log('📋 Allowed origins:', allowedOrigins);
        // DEBUG: Geçici olarak tüm origin\'leri kabul et
        console.warn('🔓 DEBUG MODE: Tüm origin\'ler kabul ediliyor');
      }
      
      // Iframe error mesajlarını yakala
      if (event?.data?.type === 'iframe_error') {
        console.group('🚨 Iframe Error Message Received');
        console.error('❌ Error:', event.data.error);
        console.error('📋 Details:', event.data.details);
        console.groupEnd();
        setIframeError(event.data.error || 'Ödeme sayfasında bir hata oluştu.');
        setIsPaymentProcessing(false); // Loading'i kapat
        return;
      }
      
      // Payment callback mesajlarını yakala (frontend callback route'undan)
      if (event?.data?.type === 'payment_callback') {
        console.group('🔄 Payment Callback Message Received');
        console.log('🎫 Token:', event.data.token);
        console.log('💬 Conversation ID:', event.data.conversationId);
        console.log('🔗 Callback URL:', event.data.url);
        console.groupEnd();
        
        // Token ile ödeme durumunu kontrol et
        if (event.data.token) {
          try {
            console.log('🔍 Checking payment status via callback token...');
            // Callback'ten gelen token ile checkout form durumunu sorgula
            // Not: checkPaymentStatus paymentId bekler, token ile sorgu için retrieveCheckoutForm kullanılır.
            const result = await retrieveCheckoutForm(event.data.token, event.data.conversationId || '');
            
            console.log('📋 Callback Check Result:', result);
            
            if (result.success && (result.data?.paymentStatus === 'SUCCESS' || result.data?.status === 'success')) {
                // Başarılı ödeme mantığını tetikle
                window.postMessage({
                    type: 'payment_success_verified',
                    success: true,
                    paymentId: result.data.paymentId || result.data.paymentConversationId,
                    data: result.data
                }, window.location.origin);
            } else {
                 console.error('❌ Callback check failed:', result);
                 // Hata mesajı göster ama belki polling yakalar diye hemen kapatma?
                 // Kullanıcıya bilgi ver
                 // setIframeError('Ödeme doğrulaması başarısız oldu.');
            }
          } catch (err) {
            console.error('🚨 Callback check error:', err);
          }
        }
        return;
      }

      // Doğrulanmış başarılı ödeme mesajı (bizim tarafımızdan tetiklenen)
      if (event?.data?.type === 'payment_success_verified') {
         // Aşağıdaki success bloğuna düşmesi için manipüle edelim veya direkt çağıralım
         // Ancak aşağıda event.data.success === true kontrolü var.
         // Bu mesajı handleSuccessPayment gibi bir fonksiyona yönlendirebiliriz.
         // Şimdilik data.success = true olarak kabul edilecek.
      }
      
      // Ödeme başarılı mesajı (callback'ten veya polling'den)
      if (event?.data?.success === true || event?.data?.type === 'payment_success_verified') {
        if (hasHandledPaymentRef.current) {
          console.log('⚠️ Ödeme zaten işlendi (callback), tekrar işlenmeyecek');
          return;
        }
        
        console.log('✅ Ödeme başarılı mesajı alındı:', event.data);
        hasHandledPaymentRef.current = true;
        
        const receivedPaymentId = event.data.paymentId || (event.data.data && event.data.data.paymentId);
        if (!receivedPaymentId) {
          console.warn('⚠️ PaymentId yok, token kullanılacak');
        }
        
        setPaymentId(receivedPaymentId || paymentTokenRef.current);
        
        // Bölünmüş ödeme aktifse, organizatör ödemesi tamamlandı
        if (splitPaymentEnabled) {
          setSplitPaymentData(prev => ({
            ...prev,
            organizerPaid: true,
            totalPaid: (prev.totalPaid || 0) + prev.organizerAmount
          }));
          setPaymentStatus('partial_payment'); // Kısmi ödeme
        } else {
          setPaymentStatus('completed'); // Tam ödeme
        }
        
        // Polling'i durdur (callback'ten geldi)
        stopPolling();
        
        // Modal'ı kapat ve rezervasyonu oluştur
        console.log('🔄 Modal kapatılıyor ve rezervasyon oluşturuluyor (Callback)...');
        setShowPaymentIframe(false);
        // Loading ekranı rezervasyon oluşana kadar kalsın, o yüzden setIsPaymentProcessing(false) demiyoruz henüz
        setCurrentStep(5);
        
        // Güncel dataları ref'lerden al
        const currentData = {
            selectedDate: selectedDateRef.current,
            selectedTime: selectedTimeRef.current,
            sahaData: sahaDataRef.current,
            oyuncular: oyuncularRef.current,
            invoiceData: invoiceDataRef.current,
            splitPaymentEnabled: splitPaymentEnabledRef.current,
            splitPaymentData: splitPaymentDataRef.current,
           selectedPaymentMethod: selectedPaymentMethodRef.current,
           selectedPrice: selectedPriceRef.current,
           user: userRef.current
        };

        handleCreateReservation({ 
          status: splitPaymentEnabledRef.current ? 'partial_payment' : 'completed', 
          id: receivedPaymentId || paymentTokenRef.current,
          data: currentData
        }).catch(error => {
          console.error('❌ Rezervasyon oluşturma hatası (Callback):', error);
          alert('Rezervasyon oluşturulurken hata oluştu. Lütfen destek ile iletişime geçin.');
          setIsPaymentProcessing(false); // Hata durumunda loading'i kapat
        });
        return;
      }
      
      // Ödeme başarısız mesajı
      if (event?.data?.error || event?.data?.success === false) {
        if (hasHandledPaymentRef.current) {
          console.log('⚠️ Ödeme zaten işlendi (callback), tekrar işlenmeyecek');
          return;
        }
        
        console.log('❌ Ödeme başarısız mesajı alındı (Callback):', event.data);
        hasHandledPaymentRef.current = true;
        
        // Polling'i durdur
        stopPolling();
        
        setPaymentStatus('failed');
        setShowPaymentIframe(false);
        setIsPaymentProcessing(false); // Loading'i kapat
        const errorMessage = event.data.error || event.data.message || 'Ödeme işlemi başarısız oldu';
        alert('Ödeme başarısız: ' + errorMessage);
        return;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      stopPolling();
    };
  }, []);

  // Saha verilerini yükle
  useEffect(() => {
    loadSahaData();
    loadPlatformSettings();
  }, [id]);

  useEffect(() => {
    if (user && userData) {
      const organizerName = userData.fullName || userData.displayName || userData.name || user.displayName || user.email?.split('@')[0] || 'Organizatör';
      const organizerPhone = userData.phone || userData.businessPhone || '';
      const organizerAvatar = organizerName.split(' ').map(n => n[0]).join('').toUpperCase() || 'O';
      
      const organizer = {
        id: user.uid,
        name: organizerName,
        phone: organizerPhone,
        status: 'organizator',
        paymentStatus: 'odenecek',
        avatar: organizerAvatar
      };
      
      setOyuncular([organizer]);

      // Kullanıcının takımını yükle
      const fetchUserTeam = async () => {
        try {
          const result = await getUserTeams(user.uid);
          if (result.success && result.data && result.data.length > 0) {
            const team = result.data[0]; // İlk takımı al
            if (team && team.members && team.members.length > 0) {
              const membersPromises = team.members
                .filter(memberId => memberId !== user.uid) // Organizatörü çıkar
                .map(async (memberId) => {
                  try {
                    const memberData = await getUserData(memberId);
                    if (memberData.success && memberData.data) {
                        const m = memberData.data;
                        const fullName = m.fullName || m.displayName || m.name || m.email?.split('@')[0] || 'Oyuncu';
                        const avatar = fullName.split(' ').map(n => n[0]).join('').toUpperCase();
                        return {
                            id: m.uid || memberId,
                            name: fullName,
                            phone: m.phone || m.phoneNumber || '',
                            status: 'oyuncu',
                            paymentStatus: 'odenecek',
                            avatar: m.photoURL || avatar
                        };
                    }
                    return null;
                  } catch (e) {
                    console.error('Üye detayları çekilemedi:', memberId, e);
                    return null;
                  }
                });

              const membersDetails = await Promise.all(membersPromises);
              const validMembers = membersDetails.filter(m => m !== null);
              
              if (validMembers.length > 0) {
                  setOyuncular(prev => {
                      // Mevcut oyuncuları koru, duplicate ekleme
                      const currentIds = new Set(prev.map(p => p.id));
                      const newMembers = validMembers.filter(m => !currentIds.has(m.id));
                      return [...prev, ...newMembers];
                  });
              }
            }
          }
        } catch (err) {
            console.error('Takım yükleme hatası:', err);
        }
      };
      
      fetchUserTeam();
    }
  }, [user, userData]);

  // Platform ayarlarını yükle
  const loadPlatformSettings = async () => {
    try {
      const result = await getPlatformSettings();
      if (result.success) {
        setPlatformSettings(result.data);
      }
    } catch (error) {
      console.error('Platform ayarları yükleme hatası:', error);
    }
  };

  // Komisyon hesaplama fonksiyonları
  const calculateCommission = (basePrice) => {
    if (!platformSettings || !sahaData) {
      return {
        basePrice: basePrice,
        userCommission: 0,
        ownerCommission: 0,
        totalAmount: basePrice,
        ownerAmount: basePrice
      };
    }

    const userCommissionRate = platformSettings.userCommissionRate || 0;
    const ownerCommissionRate = platformSettings.ownerCommissionRate || 0;

    const userCommission = (basePrice * userCommissionRate) / 100;
    const ownerCommission = (basePrice * ownerCommissionRate) / 100;
    const totalAmount = basePrice + userCommission;
    const ownerAmount = basePrice - ownerCommission;

    return {
      basePrice: basePrice,
      userCommission: userCommission,
      ownerCommission: ownerCommission,
      totalAmount: totalAmount,
      ownerAmount: ownerAmount
    };
  };

  const calculateSplitPayment = useCallback(() => {
    if (!sahaData || oyuncular.length === 0) return;
    
    // Fiyat: Seçilen saat fiyatı varsa onu kullan, yoksa saha baz fiyatı.
    const priceToUse = selectedPrice > 0 ? selectedPrice : Number(sahaData.price);

    const commissionData = calculateCommission(priceToUse);
    const totalAmount = commissionData.totalAmount;
    
    // Organizatör: 1 pay, Her oyuncu: 1 pay
    const totalShares = oyuncular.length; // Organizatör dahil tüm oyuncular
    const playersCount = oyuncular.filter(o => o.status !== 'organizator').length; // Organizatör hariç oyuncu sayısı
    
    // Pay başına düşen tutar
    const amountPerShare = totalAmount / totalShares;
    
    // Organizatör payı (1 pay)
    const organizerAmount = Math.ceil(amountPerShare);
    
    // Oyuncular toplam payı
    const playersTotalAmount = totalAmount - organizerAmount;
    
    // Oyuncu başına düşen tutar (oyuncular arasında eşit bölünecek)
    const playerAmount = playersCount > 0 ? Math.ceil(playersTotalAmount / playersCount) : 0;
    
    setSplitPaymentData({
      organizerAmount,
      playersAmount: playersTotalAmount,
      playerAmount, // Oyuncu başına düşen tutar
      organizerPaid: false,
      playersPaid: false,
      totalPaid: 0 // Toplam ödenen tutar
    });
  }, [sahaData, oyuncular]);

  // Tarih değiştiğinde müsaitlik kontrolü yap
  useEffect(() => {
    if (selectedDate) {
      checkTimeAvailability();
    }
  }, [selectedDate]);

  // Oyuncu sayısı, saha fiyatı veya bölünmüş ödeme durumu değiştiğinde otomatik hesaplama
  useEffect(() => {
    // Tek kişi varsa bölünmüş ödeme kapat (Organizatör tek başına ise)
    if (oyuncular.length <= 1 && splitPaymentEnabled) {
       setSplitPaymentEnabled(false);
    }

    if (splitPaymentEnabled && sahaData && oyuncular.length > 0) {
      calculateSplitPayment();
    }
  }, [splitPaymentEnabled, sahaData, oyuncular, selectedPrice, calculateSplitPayment]);


  const loadSahaData = async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await getTesis(id);
      if (result.success) {
        setSahaData(result.data);
        // Varsayılan fiyatı set et
        if (!selectedPrice) setSelectedPrice(Number(result.data.price));
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Saha verileri yüklenirken hata oluştu');
      console.error('Saha yükleme hatası:', err);
    } finally {
      setLoading(false);
    }
  };

  // Müsaitlik kontrolü
  const checkTimeAvailability = async () => {
    if (!id || !selectedDate || !sahaData) return;
    
    setAvailabilityLoading(true);
    
    try {
      // Saha fiyatını baz al
      const basePrice = Number(sahaData.price);
      
      // Dinamik Saat Dilimleri Oluştur
      let rawTimeSlots = [];
      let startHour = 9; // Varsayılan Başlangıç
      let endHour = 24; // Varsayılan Bitiş

      if (sahaData.workingHours) {
        // "08:00 - 24:00" veya "09:00 - 00:00" formatını parse et
        const parts = sahaData.workingHours.split('-').map(p => p.trim());
        if (parts.length === 2) {
            const startH = parseInt(parts[0].split(':')[0]);
            let endH = parseInt(parts[1].split(':')[0]);
            
            // Eğer 00:00 ise 24 alalım (gece yarısı bitişi için)
            if (endH === 0) endH = 24;
            
            // Eğer kapanış saati açılıştan küçükse (örn 10:00 - 02:00) 
            // Şimdilik gece yarısını geçenleri desteklemiyoruz, 24'e sabitliyoruz.
            // Veya sadece aynı gün içindekileri gösteriyoruz.
            if (endH < startH) endH = 24;

            if (!isNaN(startH) && !isNaN(endH)) {
                startHour = startH;
                endHour = endH;
            }
        }
      }

      for (let h = startHour; h < endHour; h++) {
          const nextH = h + 1;
          // Format "18:00"
          const startStr = `${h.toString().padStart(2, '0')}:00`;
          // 24:00 yerine 00:00 veya 24:00, sisteme göre değişir ama genelde 24:00 görseli tercih edilir.
          // Ancak backend "00:00" bekliyor olabilir mi? Genelde range string'i sadece ID gibidir.
          const endStr = `${nextH === 24 ? '00' : (nextH % 24).toString().padStart(2, '0')}:00`; 
          const displayLabel = `${startStr}-${endStr === '00:00' ? '24:00' : endStr}`;

          rawTimeSlots.push({
              time: displayLabel,
              hour: h
          });
      }

      // Eğer slot oluşmadıysa (hata vs) defaultları kullan
      if (rawTimeSlots.length === 0) {
          rawTimeSlots = [
            { time: '18:00-19:00', hour: 18 },
            { time: '19:00-20:00', hour: 19 },
            { time: '20:00-21:00', hour: 20 },
            { time: '21:00-22:00', hour: 21 },
            { time: '22:00-23:00', hour: 22 },
            { time: '23:00-24:00', hour: 23 }
          ];
      }

      // Her saat dilimi için müsaitlik kontrolü ve fiyatlandırma
      const availabilityChecks = await Promise.all(
        rawTimeSlots.map(async (slot) => {
          const result = await checkAvailability(id, selectedDate, slot.time);
          
          let currentPrice = basePrice;
          
          // Özel Fiyatlandırma Kontrolü
          if (sahaData.customPrices && Array.isArray(sahaData.customPrices)) {
              // Slot saati (slot.hour), herhangi bir custom range içinde mi?
              // customPrice yapısı: { start: 17, end: 24, price: 1900 }
              const customRule = sahaData.customPrices.find(rule => 
                  slot.hour >= parseInt(rule.start) && slot.hour < parseInt(rule.end)
              );
              
              if (customRule && customRule.price) {
                  currentPrice = Number(customRule.price);
              }
          }

          // Fiyatı tam sayıya yuvarla
          currentPrice = Math.round(currentPrice);

          return {
            time: slot.time,
            available: result.success ? result.available : false,
            price: `₺${currentPrice.toLocaleString('tr-TR')}`,
            rawPrice: currentPrice, // İşlem için ham fiyat
            error: result.success ? null : result.error
          };
        })
      );

      setTimeSlots(availabilityChecks);
    } catch (error) {
      console.error('Müsaitlik kontrolü hatası:', error);
      const fallbackPrice = sahaData ? sahaData.price : 1200;
      // Hata durumunda fallback
      const errorSlots = [
        '18:00-19:00', '19:00-20:00', '20:00-21:00', 
        '21:00-22:00', '22:00-23:00', '23:00-24:00'
      ].map(time => ({
        time,
        available: false,
        price: `₺${Number(fallbackPrice).toLocaleString('tr-TR')}`,
        error: 'Müsaitlik kontrolü yapılamadı'
      }));
      setTimeSlots(errorSlots);
    } finally {
      setAvailabilityLoading(false);
    }
  };

  // Ödeme durumu polling fonksiyonları
  const startPolling = (token, conversationId) => {
    // Önce mevcut polling'i durdur
    stopPolling();
    
    // Token ve conversationId'yi ref'lere kaydet
    paymentTokenRef.current = token;
    paymentConversationIdRef.current = conversationId;
    pollingStartTimeRef.current = Date.now();
    
    // Maksimum polling süresi: 5 dakika (300 saniye)
    const MAX_POLLING_DURATION = 5 * 60 * 1000;
    
    // Timeout: 5 dakika sonra polling'i durdur
    pollingTimeoutRef.current = setTimeout(() => {
      console.warn('Polling timeout: 5 dakika geçti, polling durduruluyor');
      stopPolling();
      if (!hasHandledPaymentRef.current) {
        setIframeError('Ödeme işlemi zaman aşımına uğradı. Lütfen sayfayı yenileyip tekrar deneyin.');
        setShowPaymentIframe(false);
        setIsPaymentProcessing(false); // Loading'i kapat
      }
    }, MAX_POLLING_DURATION);
    
    // Polling interval'ını başlat (3 saniyede bir kontrol et)
    pollingIntervalRef.current = setInterval(async () => {
      if (!paymentTokenRef.current || !paymentConversationIdRef.current) {
        stopPolling();
        return;
      }
      
      try {
        const result = await retrieveCheckoutForm(
          paymentTokenRef.current,
          paymentConversationIdRef.current
        );
        
        if (result.success && result.data) {
          // Iyzico checkout form durumunu kontrol et
          const paymentStatus = result.data.paymentStatus; // SUCCESS, FAILURE, INITIAL, WAITING
          const status = result.data.status; // success, failure, etc.
          const paymentId = result.data.paymentId;
          
          // Debug, initial durumdaysa çok loglamayalım
          // console.log('🔍 Polling Check:', { paymentStatus, status, paymentId, hasPaymentId: !!paymentId });
          
          // Ödeme başarılı kontrolü
          // Iyzico'da paymentStatus varsa, kesinlikle SUCCESS olmalı.
          // Yoksa (eski versiyon vs) status === 'success' ve paymentId kontrolü yapılır.
          const isPaymentSuccess = paymentStatus 
            ? paymentStatus === 'SUCCESS' 
            : (status === 'success' && paymentId);
          
          if (isPaymentSuccess) {
            // Ödeme başarılı
            console.group('✅ Ödeme Başarılı (Polling)');
            console.log('📊 Payment Status:', paymentStatus);
            console.log('📊 Status:', status);
            console.log('🆔 Payment ID:', paymentId);
            console.log('🎫 Token:', paymentTokenRef.current);
            console.log('🔒 Has Handled:', hasHandledPaymentRef.current);
            console.groupEnd();
            
            stopPolling();
            
            if (hasHandledPaymentRef.current) {
              console.log('⚠️ Ödeme zaten işlendi, tekrar işlenmeyecek');
              return;
            }
            
            // Önce guard'ı set et, sonra işlemleri yap
            hasHandledPaymentRef.current = true;
            
            const receivedPaymentId = paymentId || paymentTokenRef.current;
            setPaymentId(receivedPaymentId);
            
            // Bölünmüş ödeme aktifse, organizatör ödemesi tamamlandı
            if (splitPaymentEnabled) {
              setSplitPaymentData(prev => ({
                ...prev,
                organizerPaid: true,
                totalPaid: (prev.totalPaid || 0) + prev.organizerAmount
              }));
              setPaymentStatus('partial_payment');
            } else {
              setPaymentStatus('completed');
            }
            
            // Modal'ı kapat ve rezervasyonu oluştur
            console.log('🔄 Modal kapatılıyor ve rezervasyon oluşturuluyor...');
            
            // Önce modal'ı kapat, sonra rezervasyonu oluştur
            setShowPaymentIframe(false);
            setCurrentStep(5);
            
             // Güncel dataları ref'lerden al
             const currentData = {
                selectedDate: selectedDateRef.current,
                selectedTime: selectedTimeRef.current,
                sahaData: sahaDataRef.current,
                oyuncular: oyuncularRef.current,
                invoiceData: invoiceDataRef.current,
                splitPaymentEnabled: splitPaymentEnabledRef.current,
                splitPaymentData: splitPaymentDataRef.current,
                selectedPaymentMethod: selectedPaymentMethodRef.current,
                selectedPrice: selectedPriceRef.current,
                user: userRef.current
            };

            // Rezervasyonu oluştur (async işlem)
            handleCreateReservation({ 
              status: splitPaymentEnabledRef.current ? 'partial_payment' : 'completed', 
              id: receivedPaymentId,
              data: currentData
            }).catch(error => {
              console.error('❌ Rezervasyon oluşturma hatası:', error);
              // Rezervasyon oluşturulamadı ama ödeme başarılı, kullanıcıya bilgi ver
              alert('Ödeme başarılı ancak rezervasyon oluşturulurken hata oluştu. Lütfen destek ile iletişime geçin. Ödeme ID: ' + receivedPaymentId);
              setIsPaymentProcessing(false); // Hata durumunda loading'i kapat
            });
            return;
          }
          
          // Ödeme başarısız kontrolü - Polling'de başarısızlığı agresif yönetmiyoruz.
          // Kullanıcı popup'ta hatayı görüp düzeltebilir veya kapatabilir.
          if (paymentStatus === 'FAILURE' || (status === 'failure' && paymentStatus === 'FAILURE')) {
            console.warn('⚠️ Polling: Ödeme başarısız görünüyor, ancak kullanıcı tekrar deneyebilir.', result.data);
            // stopPolling(); // KALDIRILDI
            // setPaymentStatus('failed'); // KALDIRILDI
            // Alert gösterme, kullanıcı popup'ta hatayı görüyor.
            return;
          }
          
          // INITIAL, WAITING veya diğer durumlarda polling devam eder (sessizce)
          // Debug: Sadece ilk birkaç kontrolde log yap
          const pollingDuration = pollingStartTimeRef.current ? Date.now() - pollingStartTimeRef.current : 0;
          if (pollingDuration < 10000) { // İlk 10 saniyede log yap
            console.log('⏳ Ödeme durumu:', { paymentStatus, status, paymentId: !!paymentId });
          }
        } else {
          // Hata durumu - API success: false
          const errorCode = result.errorCode || result.data?.errorCode;
          
          // 5122: Token bulunamadı. Localhost/Sandbox ortamında polling bazen token'ı bulamayabilir.
          // BU DURUMDA ARTIK POLLING'I DURDURMUYORUZ. Iyzico'nun token'ı tanımasını bekliyoruz.
          if (errorCode === '5122' || result.error?.includes('Token') || result.error?.includes('found')) {
             console.warn('⚠️ Polling: Token henuz bulunamadı (5122), bekleniyor...');
             // stopPolling(); // KALDIRILDI: Hemen pes etme
             // return;
          }
          
          // Diğer hatalar için log (sessizce devam et)
          const pollingDuration = pollingStartTimeRef.current ? Date.now() - pollingStartTimeRef.current : 0;
          if (pollingDuration < 30000) { 
            console.warn('Ödeme durumu kontrolü hatası:', result.error || result.data?.error);
          }
        }
      } catch (error) {
        console.error('Polling hatası:', error);
        // Hata durumunda polling'i durdurma, tekrar denemeye devam et
      }
    }, 3000); // 3 saniyede bir kontrol et
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    paymentTokenRef.current = null;
    paymentConversationIdRef.current = null;
    pollingStartTimeRef.current = null;
  };

  // Email'den isim çıkarma fonksiyonu
  const getNameFromEmail = (email) => {
    if (!email || !email.includes('@')) return '';
    
    // @ işaretinden önceki kısmı al
    const emailPrefix = email.split('@')[0];
    
    // Nokta, tire, alt çizgi, sayıları boşlukla değiştir
    let name = emailPrefix
      .replace(/[._-]/g, ' ') // Nokta, alt çizgi, tire -> boşluk
      .replace(/\d+/g, ' ') // Sayıları boşlukla değiştir
      .replace(/\s+/g, ' ') // Birden fazla boşluğu tek boşluğa çevir
      .trim(); // Baş ve sondaki boşlukları temizle
    
    // Her kelimenin ilk harfini büyük yap (Title Case)
    name = name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .trim();
    
    return name || emailPrefix; // Eğer boşsa email prefix'ini döndür
  };

  // Kullanıcı arama fonksiyonu
  const handleUserSearch = async (searchTerm) => {
    setNewOyuncu({ ...newOyuncu, searchTerm });
    
    if (searchTerm.length >= 3) {
      setSearchLoading(true);
      try {
        const result = await searchUsers(searchTerm);
        if (result.success) {
          setFilteredUsers(result.data);
          setShowUserDropdown(true);
        } else {
          console.error('Kullanıcı arama hatası:', result.error);
          setFilteredUsers([]);
          setShowUserDropdown(false);
        }
      } catch (error) {
        console.error('Kullanıcı arama hatası:', error);
        setFilteredUsers([]);
        setShowUserDropdown(false);
      } finally {
        setSearchLoading(false);
      }
    } else {
      setFilteredUsers([]);
      setShowUserDropdown(false);
    }
  };

  // Kullanıcı seçme fonksiyonu
  const handleUserSelect = (user) => {
    const displayName = user.displayName || user.name || (user.email ? getNameFromEmail(user.email) : '');
    setNewOyuncu({
      ...newOyuncu,
      name: displayName,
      phone: user.phone || '',
      selectedUser: user,
      searchTerm: displayName
    });
    setShowUserDropdown(false);
  };

  // Manuel oyuncu ekleme
  const handleManualOyuncuEkle = () => {
    if (newOyuncu.name && newOyuncu.phone) {
      const yeniOyuncu = {
        id: Date.now(),
        name: newOyuncu.name,
        phone: newOyuncu.phone,
        status: 'oyuncu',
        paymentStatus: 'odenecek',
        avatar: newOyuncu.name.split(' ').map(n => n[0]).join('').toUpperCase()
      };
      
      setOyuncular([...oyuncular, yeniOyuncu]);
      setNewOyuncu({ name: '', phone: '', searchTerm: '', selectedUser: null });
      setShowOyuncuModal(false);
    }
  };

  // Kayıtlı kullanıcıdan oyuncu ekleme
  const handleRegisteredUserAdd = () => {
    if (newOyuncu.selectedUser) {
      const displayName = newOyuncu.selectedUser.displayName || newOyuncu.selectedUser.name || (newOyuncu.selectedUser.email ? getNameFromEmail(newOyuncu.selectedUser.email) : '');
      const yeniOyuncu = {
        id: newOyuncu.selectedUser.id,
        name: displayName,
        phone: newOyuncu.selectedUser.phone || '',
        status: 'oyuncu',
        paymentStatus: 'odenecek',
        avatar: displayName.split(' ').map(n => n[0]).join('').toUpperCase()
      };
      
      setOyuncular([...oyuncular, yeniOyuncu]);
      setNewOyuncu({ name: '', phone: '', searchTerm: '', selectedUser: null });
      setShowOyuncuModal(false);
    }
  };

  const handleOyuncuSil = (oyuncuId) => {
    setOyuncular(oyuncular.filter(o => o.id !== oyuncuId));
  };

  // Popup (Window) ödeme işlemi
  const handlePopupPayment = async () => {
    if (!selectedDate || !selectedTime || !sahaData) return;

    // Frontend validasyonu
    if (!invoiceData.name || !invoiceData.taxNumber || !invoiceData.address || !invoiceData.city || !invoiceData.district) {
      alert('Lütfen tüm fatura bilgilerini doldurun.');
      return;
    }

    // Yeni ödeme akışı başlarken guard'ı sıfırla
    hasHandledPaymentRef.current = false;
    setIsPaymentProcessing(true);
    setIframeError(null);

    try {
      // Komisyon hesaplamaları
      // Fiyat: Seçilen saat fiyatı varsa onu kullan, yoksa saha baz fiyatı.
      const priceToUse = selectedPrice > 0 ? selectedPrice : Number(sahaData.price);
      const commissionData = calculateCommission(priceToUse);
      
      // Bölünmüş ödeme aktifse organizatör payı, değilse toplam tutar
      const paymentAmount = splitPaymentEnabled && splitPaymentData.organizerAmount > 0 
        ? splitPaymentData.organizerAmount 
        : commissionData.totalAmount;
      
      const buyerNameParts = invoiceData.name.split(' ');
      const buyerName = buyerNameParts[0] || userData?.fullName?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'Müşteri';
      const buyerSurname = buyerNameParts.slice(1).join(' ') || userData?.fullName?.split(' ').slice(1).join(' ') || user?.displayName?.split(' ').slice(1).join(' ') || '';
      const buyerPhone = userData?.phone || userData?.businessPhone || user?.phoneNumber || '';
      const buyerEmail = user?.email || userData?.email || '';

      // Callback URL - Frontend'e dönmeli
      const paymentApiUrl = import.meta.env.VITE_PAYMENT_API_BASE_URL || 'http://localhost';
      
      const paymentData = {
        conversationId: `reservation_${Date.now()}`,
        price: paymentAmount,
        paidPrice: paymentAmount,
        basketId: `basket_${Date.now()}`,
        reservationId: `reservation_${Date.now()}`,
        reservationName: `${sahaData.name} - ${selectedDate} ${selectedTime}`,
        buyerId: user?.uid || 'buyer_001',
        buyerName: buyerName,
        buyerSurname: buyerSurname,
        buyerPhone: buyerPhone,
        buyerEmail: buyerEmail,
        buyerIdentityNumber: invoiceData.taxNumber,
        buyerAddress: invoiceData.address,
        buyerCity: invoiceData.city,
        buyerZipCode: '34000',
        callbackUrl: `${window.location.origin}/payment-callback`,
        frontendOrigin: window.location.origin,
        splitPaymentEnabled: splitPaymentEnabled,
        splitPaymentData: splitPaymentEnabled ? {
          ...splitPaymentData,
          organizerPaid: false,
          playersPaid: false,
          totalPaid: 0
        } : null
      };

      console.group('ğŸ“¤ Sending Payment Request (Popup)');
      console.log('ğŸ“¦ Payment Data:', paymentData);
      console.groupEnd();
      
      const result = await createPaymentForm(paymentData);
      
      if (result.success && result.data) {
        console.log('âœ… Payment Form Created:', result.data);
        
        // Token ve status polling başlat
        if (result.data.token) {
          startPolling(result.data.token, paymentData.conversationId);
        }

        // Popup Açma
        const width = 800;
        const height = 600;
        const left = (window.innerWidth - width) / 2;
        const top = (window.innerHeight - height) / 2;
        
        const popupWindow = window.open(
          result.data.paymentPageUrl,
          'OdemeEkrani',
          `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`
        );

        if (!popupWindow) {
           alert('Popup tarayıcı tarafından engellendi. Lütfen izin verin.');
           setIsPaymentProcessing(false);
           return;
        }

        // Popup takibi
        const checkInterval = setInterval(() => {
            if (popupWindow.closed) {
                clearInterval(checkInterval);
                console.log('âŒ Popup closed by user');
                
                // Popup kapatıldı, polling devam etsin mi? 
                // Kullanıcı ödemeyi yapıp kapatmış olabilir, polling bunu yakalar.
                // Veya kapatıp vazgeçmiş olabilir.
                // 30 saniye daha bekleyip durduralım veya hemen durduralım? 
                // Premium.jsx hemen checkMembership yapıyordu. Biz de polling'i bir süre daha devam ettirebiliriz.
                // Ancak kullanıcı manuel kapattıysa "İptal edildi" varsayabiliriz.
                
                // Eğer hala işlem yapılmadıysa iptal kabul et
                setTimeout(() => {
                   if (!hasHandledPaymentRef.current) {
                      console.log('❌ Ödeme işlemi kullanıcı tarafından iptal edildi veya tamamlanamadı.');
                      setIsPaymentProcessing(false);
                      // Kullanıcıya bilgi verilmeli mi? Belki sadece overlay kalkar.
                      // setIframeError('Ödeme işlemi tamamlanamadı.');
                      stopPolling();
                   }
                }, 3000);
            }
        }, 1000);

      } else {
        throw new Error(result.error || 'Ödeme formu oluşturulamadı');
      }

    } catch (error) {
      console.error('Payment Error:', error);
      alert('Ödeme başlatılamadı: ' + error.message);
      setIsPaymentProcessing(false);
    }
  };










      





  // Direkt ödeme işlemi
  const handleProcessPayment = async () => {
    if (!selectedDate || !selectedTime || !sahaData) return;

    // Frontend validasyonu
    if (!invoiceData.name || !invoiceData.taxNumber || !invoiceData.address || !invoiceData.city || !invoiceData.district) {
      alert('Lütfen tüm fatura bilgilerini doldurun.');
      return;
    }

    // Kredi kartı validasyonu
    if (!cardData.cardName || !cardData.cardNumber || !cardData.expiryDate || !cardData.cvv) {
      alert('Lütfen tüm kart bilgilerini doldurun.');
      return;
    }

    // Kart numarası kontrolü
    const cardNumber = cardData.cardNumber.replace(/\s/g, '');
    if (cardNumber.length !== 16) {
      alert('Kart numarası 16 haneli olmalıdır.');
      return;
    }

    // CVV kontrolü
    if (cardData.cvv.length < 3 || cardData.cvv.length > 4) {
      alert('CVV kodu 3 veya 4 haneli olmalıdır.');
      return;
    }

    // Son kullanma tarihi kontrolü
    if (!/^\d{2}\/\d{2}$/.test(cardData.expiryDate)) {
      alert('Son kullanma tarihi AA/YY formatında olmalıdır.');
      return;
    }

    // Test kartları kontrolü
    if (['0000000000000000', '1111111111111111', '1234567890123456'].includes(cardNumber)) {
      alert('Test kartları kullanılamaz. Lütfen geçerli bir kart numarası girin.');
      return;
    }

    setIsPaymentProcessing(true);

    try {
      // Komisyon hesaplamaları
      // Fiyat: Seçilen saat fiyatı varsa onu kullan, yoksa saha baz fiyatı.
      const priceToUse = selectedPrice > 0 ? selectedPrice : Number(sahaData.price);
      const commissionData = calculateCommission(priceToUse);
      
      const buyerNameParts = invoiceData.name.split(' ');
      const buyerName = buyerNameParts[0] || userData?.fullName?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'Müşteri';
      const buyerSurname = buyerNameParts.slice(1).join(' ') || userData?.fullName?.split(' ').slice(1).join(' ') || user?.displayName?.split(' ').slice(1).join(' ') || '';
      const buyerPhone = userData?.phone || userData?.businessPhone || user?.phoneNumber || '';
      const buyerEmail = user?.email || userData?.email || '';

      const paymentData = {
        conversationId: `reservation_${Date.now()}`,
        price: commissionData.totalAmount,
        paidPrice: commissionData.totalAmount,
        paymentMethod: selectedPaymentMethod,
        cardData: selectedPaymentMethod === 'kredi-karti' ? cardData : null,
        basketId: `basket_${Date.now()}`,
        reservationId: `reservation_${Date.now()}`,
        reservationName: `${sahaData.name} - ${selectedDate} ${selectedTime}`,
        buyerId: user?.uid || 'buyer_001',
        buyerName: buyerName,
        buyerSurname: buyerSurname,
        buyerPhone: buyerPhone,
        buyerEmail: buyerEmail,
        buyerIdentityNumber: invoiceData.taxNumber,
        buyerAddress: invoiceData.address,
        buyerCity: invoiceData.city,
        buyerZipCode: '34000',
        splitPaymentEnabled: splitPaymentEnabled,
        splitPaymentData: splitPaymentEnabled ? splitPaymentData : null
      };

      const result = await processPayment(paymentData);
      
      if (result.success) {
        setPaymentId(result.data.paymentId);
        setPaymentStatus('completed');
        // Rezervasyonu oluştur
        handleCreateReservation();
      } else {
        console.error('Ödeme işlemi hatası:', result.error);
        setPaymentStatus('failed');
        alert('Ödeme işlemi başarısız: ' + result.error);
      }
    } catch (error) {
      console.error('Ödeme işlemi hatası:', error);
      setPaymentStatus('failed');
      alert('Ödeme işlemi sırasında hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsPaymentProcessing(false);
    }
  };

  // Rezervasyon oluştur
  const handleCreateReservation = async (override = {}) => {
    // Override data varsa onu kullan, yoksa state'i kullan (closure)
    const data = override.data || {
        selectedDate, selectedTime, sahaData, oyuncular, invoiceData, 
        splitPaymentEnabled, splitPaymentData, selectedPaymentMethod, user
    };

    if (!data.selectedDate || !data.selectedTime || !data.sahaData) {
      console.error('❌ Rezervasyon oluşturulamadı: Eksik veri', data);
      setIsPaymentProcessing(false);
      return;
    }

    setIsCreatingReservation(true);

    try {
      // Tarihi Timestamp'e çevir (Timezone güvenli)
      const [year, month, day] = data.selectedDate.split('-').map(Number);
      const safeDate = new Date(year, month - 1, day);
      const reservationDate = Timestamp.fromDate(safeDate);
      
      // Rezervasyon öncesi son müsaitlik kontrolü (race condition önleme)
      const availabilityCheck = await checkAvailability(id, reservationDate, data.selectedTime);
      if (!availabilityCheck.success) {
        alert('Müsaitlik kontrolü yapılamadı. Lütfen tekrar deneyin.');
        setIsCreatingReservation(false);
        setIsPaymentProcessing(false); // Loading kapat
        return;
      }
      
        if (!availabilityCheck.available) {
          alert('Seçtiğiniz saat dilimi artık müsait değil. Lütfen başka bir saat seçin.');
          setIsCreatingReservation(false);
          setIsPaymentProcessing(false); // Loading kapat
          // Müsaitlik listesini yenile
          if (data.selectedDate) {
            checkTimeAvailability();
          }
          return;
        }

      const effectivePaymentStatus = override.status ?? paymentStatus;
      const effectivePaymentId = override.paymentId ?? override.id ?? paymentId;
      
      // Komisyon hesaplamaları
      const commissionData = calculateCommission(data.sahaData.price);

      const safeInvoiceData = data.invoiceData || null;

      const reservationData = {
        tesisId: id,
        tesisName: data.sahaData.name || '',
        tesisLocation: data.sahaData.location || `${data.sahaData.city || ''} ${data.sahaData.district || ''}`.trim() || '',
        userId: data.user?.uid || '', // Rezervasyonu yapan kullanıcı
        ownerId: data.sahaData.ownerId || data.sahaData.userId || '', // Saha sahibi
        customerName: data.invoiceData?.name || data.user?.displayName || data.user?.email || 'Misafir',
        customerPhone: data.invoiceData?.phone || data.user?.phoneNumber || '',
        date: reservationDate,
        timeSlot: data.selectedTime,
        playerIds: Array.from(new Set([data.user?.uid, ...data.oyuncular.map(p => p.id || p.uid).filter(Boolean)])), // Sorgulama için sadece ID'ler
        players: data.oyuncular.map(oyuncu => ({
          id: oyuncu.id || '',
          name: oyuncu.name || '',
          phone: oyuncu.phone || '',
          status: oyuncu.status || 'pending',
          paymentStatus: oyuncu.paymentStatus || 'pending'
        })),
        totalPlayers: data.oyuncular.length,
        basePrice: commissionData.basePrice,
        userCommission: commissionData.userCommission,
        ownerCommission: commissionData.ownerCommission,
        price: commissionData.basePrice,
        totalAmount: commissionData.totalAmount,
        ownerAmount: commissionData.ownerAmount,
        paymentMethod: data.selectedPaymentMethod,
        invoiceData: safeInvoiceData,
        paymentStatus: effectivePaymentStatus,
        paymentId: effectivePaymentId || '',
        splitPaymentEnabled: data.splitPaymentEnabled,
        splitPaymentData: {
          ...data.splitPaymentData,
          playerAmount: data.splitPaymentData.playerAmount || 0,
          organizerPaid: data.splitPaymentEnabled ? data.splitPaymentData.organizerPaid || false : true,
          playersPaid: data.splitPaymentEnabled ? data.splitPaymentData.playersPaid || false : true,
          totalPaid: data.splitPaymentEnabled ? (data.splitPaymentData.totalPaid || data.splitPaymentData.organizerAmount || 0) : commissionData.totalAmount
        },
        status: data.splitPaymentEnabled && effectivePaymentStatus === 'partial_payment' ? 'pending_payment' : 'confirmed',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      console.group('🚀 Creating Reservation');
      console.log('📦 Reservation Data:', reservationData);
      console.log('🆔 Payment ID:', effectivePaymentId);
      console.log('📊 Status:', effectivePaymentStatus);
      console.groupEnd();

      // Transaction ile rezervasyon oluştur (race condition önleme)
      const result = await createRezervasyonWithTransaction(reservationData, id, reservationDate, data.selectedTime);
      
      if (!result.success) {
        console.error('Rezervasyon oluşturma hatası:', result.error);
        if (result.error?.includes('müsait değil') || result.error?.includes('available')) {
          alert('Seçtiğiniz saat dilimi artık müsait değil. Lütfen başka bir saat seçin.');
          // Müsaitlik listesini yenile
          if (data.selectedDate) {
            checkTimeAvailability();
          }
        } else {
          // Ödeme başarılı ama rezervasyon başarısız olduysa
          const isPaid = effectivePaymentStatus === 'completed' || effectivePaymentStatus === 'partial_payment';
          if (isPaid) {
             alert(`Ödeme işleminiz başarıyla alındı ancak rezervasyon kaydı oluşturulurken teknik bir hata oluştu. Lütfen müşteri hizmetlerimizle iletişime geçin.\n\nÖdeme ID: ${effectivePaymentId}\nHata: ${result.error}`);
          } else {
             alert(`Rezervasyon oluşturulurken hata oluştu: ${result.error}`);
          }
        }
        return;
      }
      setReservationId(result.id);
      setCurrentStep(5);
    } catch (error) {
      console.error('Rezervasyon oluşturma hatası (Catch):', error);
      alert('Rezervasyon oluşturulurken beklenmedik bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsCreatingReservation(false);
      setLoading(false);
      setIsPaymentProcessing(false); // Her durumda loading overlay'i kapat
    }
  };
  

  
  const handlePaymentSubmit = async () => {
    if (selectedPaymentMethod === 'sahada-odeme') {
        // Sahada ödeme için direkt rezervasyon oluştur
        const currentData = {
            selectedDate: selectedDate,
            selectedTime: selectedTime,
            sahaData: sahaData,
            oyuncular: oyuncular,
            invoiceData: invoiceData,
            splitPaymentEnabled: false, // Sahada ödemede split olmaz
            splitPaymentData: splitPaymentData,
            selectedPaymentMethod: 'sahada-odeme',
            selectedPrice: selectedPrice > 0 ? selectedPrice : Number(sahaData.price),
            user: user
        };

        setIsPaymentProcessing(true);
        try {
            await handleCreateReservation({
                status: 'pending_payment_at_facility',
                id: 'PAY_AT_FACILITY_' + Date.now(),
                data: currentData
            });
        } catch (error) {
            console.error('Sahada ödeme hatası:', error);
            alert('İşlem sırasında hata oluştu.');
            setIsPaymentProcessing(false);
        }
    } else {
        // Kredi kartı ödemesi - Popup/Iframe aç
        handlePopupPayment();
    }
  };

  // Split payment toggle
  const handleSplitPaymentToggle = (enabled) => {
    setSplitPaymentEnabled(enabled);
    // Hesaplama useEffect tarafından otomatik yapılacak
  };


  // PDF fatura indir - html2canvas ile Türkçe karakter desteği
  const handleDownloadInvoice = async () => {
    if (!reservationId || !sahaData) return;

    const commissionData = calculateCommission(sahaData.price);
    const todayStr = new Date().toLocaleDateString('tr-TR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const formattedDate = selectedDate ? new Date(selectedDate).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : '';

    // Görünmez bir div oluştur
    const invoiceDiv = document.createElement('div');
    invoiceDiv.style.position = 'absolute';
    invoiceDiv.style.left = '-9999px';
    invoiceDiv.style.width = '794px'; // A4 genişliği (pt cinsinden yaklaşık)
    invoiceDiv.style.fontFamily = 'Arial, Helvetica, sans-serif';
    invoiceDiv.style.color = '#0f172a';
    invoiceDiv.style.backgroundColor = '#ffffff';
    invoiceDiv.style.padding = '0';
    invoiceDiv.style.margin = '0';

    invoiceDiv.innerHTML = `
      <div style="width: 100%; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: #fff; padding: 40px 50px; border-radius: 12px 12px 0 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="font-size: 36px; font-weight: 700; letter-spacing: 2px; margin-bottom: 8px;">SAHADA</div>
        <div style="font-size: 16px; opacity: 0.95; font-weight: 400;">Spor Tesisleri Rezervasyon Faturası</div>
      </div>
      
      <div style="padding: 40px 50px; background: #ffffff;">
        <!-- Fatura No ve Tarih -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0;">
          <div>
            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Fatura No</div>
            <div style="font-size: 20px; font-weight: 700; color: #0f172a;">${reservationId}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Fatura Tarihi</div>
            <div style="font-size: 20px; font-weight: 700; color: #0f172a;">${todayStr}</div>
          </div>
        </div>

        <!-- Tesis ve Rezervasyon Bilgileri -->
        <div style="display: flex; gap: 20px; margin-bottom: 30px;">
          <div style="flex: 1; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; font-weight: 600;">Tesis Bilgileri</div>
            <div style="font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">${sahaData.name || ''}</div>
            <div style="font-size: 14px; color: #475569; line-height: 1.5;">${sahaData.location || ''}</div>
            ${sahaData.capacity ? `<div style="font-size: 13px; color: #64748b; margin-top: 8px;">Kapasite: ${sahaData.capacity} kişi</div>` : ''}
          </div>
          <div style="flex: 1; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; font-weight: 600;">Rezervasyon Detayları</div>
            <div style="font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">${formattedDate}</div>
            <div style="font-size: 16px; color: #475569; margin-bottom: 8px;">${selectedTime || ''}</div>
            <div style="font-size: 13px; color: #64748b;">Oyuncu Sayısı: ${oyuncular.length} kişi</div>
          </div>
        </div>

        <!-- Fatura Bilgileri -->
        <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
          <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; font-weight: 600;">Fatura Bilgileri</div>
          <div style="font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 6px;">${invoiceData.name || ''}</div>
          <div style="font-size: 14px; color: #475569; margin-bottom: 4px;">TC/Vergi No: ${invoiceData.taxNumber || ''}</div>
          <div style="font-size: 14px; color: #475569;">${invoiceData.address || ''}, ${invoiceData.district || ''} / ${invoiceData.city || ''}</div>
        </div>

        <!-- Ödeme Bilgileri -->
        <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #0ea5e9;">
          <div style="font-size: 13px; color: #64748b; margin-bottom: 8px;">Ödeme Durumu</div>
          <div style="font-size: 16px; font-weight: 600; color: #0f172a;">
            ${paymentStatus === 'completed' ? 'Ödeme Tamamlandı' : paymentStatus === 'partial_payment' ? 'Kısmi Ödeme' : 'Beklemede'}
          </div>
          ${paymentId ? `<div style="font-size: 12px; color: #64748b; margin-top: 6px;">Ödeme ID: ${paymentId}</div>` : ''}
        </div>

        <!-- Fiyat Detayları Tablosu -->
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
          <thead>
            <tr style="background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);">
              <th style="text-align: left; padding: 16px 20px; border: 1px solid #cbd5e1; font-weight: 600; color: #0f172a; text-transform: uppercase; font-size: 11px; letter-spacing: 1px;">Açıklama</th>
              <th style="text-align: right; padding: 16px 20px; border: 1px solid #cbd5e1; font-weight: 600; color: #0f172a; text-transform: uppercase; font-size: 11px; letter-spacing: 1px;">Tutar</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background: #ffffff;">
              <td style="padding: 16px 20px; border: 1px solid #e2e8f0; color: #0f172a;">Saha Rezervasyonu - ${sahaData.name || ''}</td>
              <td style="text-align: right; padding: 16px 20px; border: 1px solid #e2e8f0; color: #0f172a; font-weight: 600;">₺${commissionData.basePrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            ${commissionData.userCommission > 0 ? `
            <tr style="background: #f8fafc;">
              <td style="padding: 16px 20px; border: 1px solid #e2e8f0; color: #475569;">Platform Komisyonu (${platformSettings?.userCommissionRate || 0}%)</td>
              <td style="text-align: right; padding: 16px 20px; border: 1px solid #e2e8f0; color: #475569;">₺${commissionData.userCommission.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            ` : ''}
          </tbody>
          <tfoot>
            <tr style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: #fff;">
              <td style="padding: 20px; font-weight: 700; font-size: 16px; border: 1px solid #0284c7;">TOPLAM</td>
              <td style="text-align: right; padding: 20px; font-weight: 700; font-size: 16px; border: 1px solid #0284c7;">₺${commissionData.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          </tfoot>
        </table>

        ${oyuncular.length > 0 ? `
        <!-- Oyuncu Listesi -->
        <div style="margin-bottom: 30px;">
          <div style="font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; font-weight: 600;">Oyuncu Listesi</div>
          <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
            ${oyuncular.map((oyuncu, index) => `
              <div style="display: flex; justify-content: space-between; padding: 8px 0; ${index < oyuncular.length - 1 ? 'border-bottom: 1px solid #e2e8f0;' : ''}">
                <div style="font-size: 14px; color: #0f172a;">
                  ${oyuncu.status === 'organizator' ? 'Organizatör' : ''}${oyuncu.name || 'Oyuncu'} ${oyuncu.phone ? `(${oyuncu.phone})` : ''}
                </div>
                <div style="font-size: 12px; color: #64748b;">
                  ${oyuncu.status === 'organizator' ? 'Organizatör' : oyuncu.paymentStatus === 'odendi' ? 'Ödendi' : 'Ödenecek'}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <!-- Footer -->
        <div style="margin-top: 40px; padding-top: 30px; border-top: 2px solid #e2e8f0; text-align: center;">
          <div style="font-size: 11px; color: #64748b; line-height: 1.6;">
            Bu fatura otomatik olarak oluşturulmuştur.<br>
            Herhangi bir sorunuz için <strong style="color: #0ea5e9;">destek@sahada.com</strong> adresinden bizimle iletişime geçebilirsiniz.
          </div>
          <div style="font-size: 10px; color: #94a3b8; margin-top: 12px;">
            Â© ${new Date().getFullYear()} Sahada - Tüm hakları saklıdır.
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(invoiceDiv);

    try {
      // html2canvas ile canvas'a çevir
      const canvas = await html2canvas(invoiceDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: invoiceDiv.offsetWidth,
        height: invoiceDiv.scrollHeight
      });

      // Canvas'ı PDF'e ekle
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`Sahada-Fatura-${reservationId}.pdf`);

      // Geçici div'i kaldır
      document.body.removeChild(invoiceDiv);
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      document.body.removeChild(invoiceDiv);
      alert('Fatura oluşturulurken hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'organizator':
        return 'bg-green-100 text-green-800';
      case 'odenecek':
        return 'bg-green-100 text-green-800';
      case 'davet-gonderildi':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'organizator':
        return 'Organizatör';
      case 'odenecek':
        return 'Ödenecek';
      case 'davet-gonderildi':
        return 'Davet Gönderildi';
      default:
        return status;
    }
  };

  const steps = [
    { id: 1, name: 'Saha Seçimi', completed: true },
    { id: 2, name: 'Saat Seçimi', current: currentStep === 2 },
    { id: 3, name: 'Oyuncu Seçimi', current: currentStep === 3 },
    { id: 4, name: 'Ödeme', current: currentStep === 4 },
    { id: 5, name: 'Onay', current: currentStep === 5 }
  ];

  // Loading state
  if (loading) {
    const content = (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 animate-spin mx-auto mb-4 text-green-600 border-2 border-green-600 border-t-transparent rounded-full"></div>
          <p className="text-gray-600">Saha verileri yükleniyor...</p>
        </div>
      </div>
    );

    if (inPanel) {
      return (
        <div className="flex h-screen bg-gray-50">
          <div className="flex-1">{content}</div>
        </div>
      );
    }
    return content;
  }

  // Error state
  if (error || !sahaData) {
    const content = (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Hata</h3>
          <p className="text-gray-600 mb-4">{error || 'Saha bulunamadı'}</p>
          <button
            onClick={() => navigate(inPanel ? '/oyuncu/dashboard' : '/')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            {inPanel ? 'Dashboard\'a Dön' : 'Ana Sayfaya Dön'}
          </button>
        </div>
      </div>
    );

    if (inPanel) {
      return (
        <div className="flex h-screen bg-gray-50">
          <div className="flex-1">{content}</div>
        </div>
      );
    }
    return content;
  }

  const content = (
    <motion.div 
      className={inPanel ? "flex-1 flex flex-col" : "min-h-screen bg-gray-50"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      {!inPanel && <Header />}

      <div className="container mx-auto px-4 py-8 lg:py-12">
        {/* Stepper */}
        <div className="max-w-4xl mx-auto mb-10">
          <div className="flex items-center justify-between relative">
            {/* Connecting Line */}
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 -z-0 rounded-full"></div>
            <div 
              className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-green-500 transition-all duration-500 -z-0 rounded-full"
              style={{ width: `${((currentStep - 1) / 4) * 100}%` }}
            ></div>

            {/* Steps */}
            {[
              { id: 1, label: 'Saha', icon: MapPin },
              { id: 2, label: 'Zaman', icon: Clock },
              { id: 3, label: 'Kadro', icon: Users },
              { id: 4, label: 'Ödeme', icon: CreditCard },
              { id: 5, label: 'Onay', icon: Check }
            ].map((step) => {
              const Icon = step.icon;
              const isActive = currentStep >= step.id;
              const isCurrent = currentStep === step.id;
              
              return (
                <div key={step.id} className="relative z-10 flex flex-col items-center group cursor-pointer" onClick={() => step.id < currentStep && setCurrentStep(step.id)}>
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${
                      isActive 
                        ? 'bg-green-500 border-green-200 text-white shadow-lg shadow-green-200' 
                        : 'bg-white border-gray-200 text-gray-400 group-hover:border-green-200'
                    } ${isCurrent ? 'scale-125' : ''}`}
                  >
                    <Icon size={18} strokeWidth={2.5} />
                  </div>
                  <span className={`mt-2 text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${isActive ? 'text-green-600' : 'text-gray-400'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Main Content Area */}
          <motion.div 
            className="lg:col-span-2 space-y-6"
            layout
          >
            <AnimatePresence mode="wait">
              {/* Step 1: Saha Detay */}
              {currentStep === 1 && (
                <motion.div 
                  key="step1"
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 20, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                <div className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Saha Görseli */}
                    <div className="md:w-1/3">
                      {sahaData.images && sahaData.images.length > 0 ? (
                        <div className="relative h-48 rounded-lg overflow-hidden group">
                           <img
                            src={sahaData.images[0].optimized_url || sahaData.images[0].url}
                            alt={sahaData.name}
                            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                          <span className="absolute bottom-3 left-3 bg-white/90 backdrop-blur text-gray-900 text-xs font-bold px-2 py-1 rounded">
                            {sahaData.type}
                          </span>
                        </div>
                      ) : (
                        <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                          <span className="text-4xl">ğŸŸï¸</span>
                        </div>
                      )}
                    </div>

                    {/* Saha Bilgileri */}
                    <div className="md:w-2/3 space-y-4">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-1">{sahaData.name}</h2>
                        <div className="flex items-center text-gray-500 text-sm">
                           <MapPin size={16} className="mr-1 text-gray-400" />
                           {sahaData.location}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-3 rounded-lg">
                           <div className="flex items-center gap-2 text-gray-600 mb-1">
                             <Users size={16} className="text-blue-500" />
                             <span className="text-xs font-bold uppercase">Kapasite</span>
                           </div>
                           <p className="font-semibold text-gray-900">{sahaData.capacity} Kişi</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                           <div className="flex items-center gap-2 text-gray-600 mb-1">
                             <Clock size={16} className="text-green-500" />
                             <span className="text-xs font-bold uppercase">Çalışma Saatleri</span>
                           </div>
                           <p className="font-semibold text-gray-900">{sahaData.workingHours}</p>
                        </div>
                      </div>

                      <p className="text-gray-600 text-sm line-clamp-2">{sahaData.description}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                     <div className="flex flex-col">
                        <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Saatlik Ücret</span>
                        <span className="text-2xl font-black text-green-600">₺{sahaData.price}</span>
                     </div>
                     <div className="flex gap-3">
                        <button
                          onClick={() => navigate(inPanel ? `/oyuncu/saha-detay/${id}` : `/saha-detay/${id}`)}
                          className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-600 font-bold hover:bg-white hover:text-red-500 hover:border-red-200 transition-all"
                        >
                          İptal
                        </button>
                        <button
                          onClick={() => setCurrentStep(2)}
                          className="px-8 py-2.5 rounded-lg bg-green-600 text-white font-bold shadow-lg shadow-green-200 hover:bg-green-700 hover:shadow-green-300 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                        >
                          Rezervasyon Yap <ArrowLeft className="rotate-180" size={18} />
                        </button>
                     </div>
                </div>
                </motion.div>
              )}
            </AnimatePresence>


            {/* Step 2: Saat Seçimi */}
            <AnimatePresence mode="wait">
              {currentStep === 2 && (
                <motion.div 
                  key="step2"
                  className="space-y-6"
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 50, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                {/* Tarih ve Saat Seçimi */}
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Müsait Saatler</h2>
                  
                  {/* Tarih Seçimi Slider */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-lg font-bold text-gray-900">Tarih Seçin</label>
                      <div className="flex gap-2">
                         <button onClick={() => scrollDateSlider('left')} className="p-2 rounded-full hover:bg-gray-100 border border-gray-200 transition-colors"><ChevronLeft size={20} className="text-gray-600" /></button>
                         <button onClick={() => scrollDateSlider('right')} className="p-2 rounded-full hover:bg-gray-100 border border-gray-200 transition-colors"><ChevronRight size={20} className="text-gray-600" /></button>
                      </div>
                    </div>
                    
                    <div 
                      ref={dateSliderRef}
                      className="flex overflow-x-auto gap-3 pb-4 scrollbar-hide snap-x p-1" 
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                      {Array.from({ length: 30 }).map((_, i) => {
                         const date = new Date();
                         date.setDate(date.getDate() + i);
                         
                         const year = date.getFullYear();
                         const month = String(date.getMonth() + 1).padStart(2, '0');
                         const day = String(date.getDate()).padStart(2, '0');
                         const dateStr = `${year}-${month}-${day}`;
                         
                         const isSelected = selectedDate === dateStr;
                         
                         const dayName = date.toLocaleDateString('tr-TR', { weekday: 'short' });
                         const dayNumber = date.getDate();
                         const monthName = date.toLocaleDateString('tr-TR', { month: 'short' });

                         return (
                           <motion.button
                             key={i}
                             onClick={() => setSelectedDate(dateStr)}
                             whileHover={{ scale: 1.05 }}
                             whileTap={{ scale: 0.95 }}
                             className={`min-w-[85px] w-[85px] h-[110px] p-2 rounded-2xl flex flex-col items-center justify-center border-2 transition-all cursor-pointer snap-start flex-shrink-0 ${
                               isSelected 
                                 ? 'bg-green-600 border-green-600 text-white shadow-xl shadow-green-200 ring-2 ring-green-200 ring-offset-2 scale-105' 
                                 : 'bg-white border-gray-100 text-gray-400 hover:border-green-200 hover:text-green-600 hover:shadow-md'
                             }`}
                           >
                             <span className="text-xs font-bold uppercase mb-1 opacity-80">{dayName}</span>
                             <span className="text-2xl font-black mb-1">{dayNumber}</span>
                             <span className="text-xs font-medium opacity-80">{monthName}</span>
                           </motion.button>
                         );
                      })}
                    </div>
                  </div>

                  {/* Müsait Saatler */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Müsait Saatler</label>
                    {availabilityLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-6 h-6 animate-spin border-2 border-green-600 border-t-transparent rounded-full"></div>
                        <span className="ml-2 text-gray-600">Müsaitlik kontrol ediliyor...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {timeSlots.map((slot) => (
                          <button
                            key={slot.time}
                            onClick={() => {
                                if (slot.available) {
                                  setSelectedTime(slot.time);
                                  setSelectedPrice(slot.rawPrice);
                                }
                            }}
                            disabled={!slot.available}
                            className={`p-4 rounded-lg border-2 text-left transition-all ${
                              selectedTime === slot.time
                                ? 'border-green-500 bg-green-50'
                                : slot.available
                                ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                : 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-50'
                            }`}
                          >
                            <div className="font-bold text-gray-900 text-lg mb-1">{slot.time}</div>
                            <div className={`text-base font-bold ${selectedTime === slot.time ? 'text-green-700' : 'text-gray-600'}`}>{slot.price}</div>
                            {!slot.available && (
                              <div className="text-xs text-red-600 mt-1">Dolu</div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Devam Et Butonu */}
                <div className="flex justify-end">
                  <button
                    onClick={() => setCurrentStep(3)}
                    disabled={!selectedTime}
                    className={`px-6 py-3 rounded-lg font-semibold ${
                      selectedTime
                        ? 'bg-orange-500 text-white hover:bg-orange-600'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Devam Et
                  </button>
                </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step 3: Oyuncu Seçimi */}
            <AnimatePresence mode="wait">
              {currentStep === 3 && (
                <motion.div 
                  key="step3"
                  className="space-y-6"
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 50, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                {/* Oyuncu Listesi */}
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Oyuncu Listesi</h2>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600">{oyuncular.length} kişi</span>
                      <button
                        onClick={() => setShowOyuncuModal(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Oyuncu Ekle</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {oyuncular.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>Henüz oyuncu eklenmedi</p>
                        <button
                          onClick={() => setShowOyuncuModal(true)}
                          className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          İlk Oyuncuyu Ekle
                        </button>
                      </div>
                    ) : (
                      oyuncular.map((oyuncu) => (
                        <div key={oyuncu.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-semibold text-green-800">{oyuncu.avatar}</span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {oyuncu.name}
                                {oyuncu.status === 'organizator' && (
                                  <span className="ml-2 text-xs text-green-600">(Sen)</span>
                                )}
                              </p>
                              {oyuncu.status === 'organizator' && (
                                <p className="text-sm text-gray-600">{oyuncu.phone}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(oyuncu.paymentStatus)}`}>
                              {getStatusText(oyuncu.paymentStatus)}
                            </span>
                            {oyuncu.status !== 'organizator' && (
                              <button
                                onClick={() => handleOyuncuSil(oyuncu.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Oyuncuyu Kaldır"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Devam Et Butonu */}
                <div className="flex justify-between">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Geri
                  </button>
                  <button
                    onClick={() => setCurrentStep(4)}
                    className="px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600"
                  >
                    Devam Et
                  </button>
                </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step 4: Ödeme */}
            <AnimatePresence mode="wait">
              {currentStep === 4 && (
                <motion.div 
                  key="step4"
                  className="space-y-6"
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 50, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                {/* Ödeme Yöntemi */}
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Ödeme Yöntemi</h2>
                  </div>
                  <div className="flex justify-center">
                    <div className="p-6 rounded-lg border-2 border-green-500 bg-green-50 w-full max-w-sm">
                      <CreditCard className="w-8 h-8 mx-auto mb-3 text-green-600" />
                      <span className="text-lg font-medium text-green-800 text-center block">Kredi Kartı ile Ödeme</span>
                      <p className="text-sm text-green-600 text-center mt-2">Güvenli ve hızlı ödeme</p>
                    </div>
                  </div>
                </div>

                {/* Split Payment Seçeneği */}
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Ödeme Seçenekleri</h3>
                  <div className="space-y-4">
                    <label className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="paymentOption"
                        checked={!splitPaymentEnabled}
                        onChange={() => handleSplitPaymentToggle(false)}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700">Tek Ödeme</span>
                        <p className="text-xs text-gray-500">Tüm tutarı tek seferde ödeyin</p>
                      </div>
                    </label>
                    
                      <label className={`flex items-center space-x-3 cursor-pointer ${splitPaymentEnabled ? 'ring-2 ring-green-600 rounded-lg p-2 bg-green-50' : 'p-2'}`}>
                        <input
                          type="radio"
                          name="paymentOption"
                          checked={splitPaymentEnabled}
                          onChange={() => handleSplitPaymentToggle(true)}
                          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                        />
                      <div>
                        <span className="text-sm font-medium text-gray-700">Bölünmüş Ödeme</span>
                        <p className="text-xs text-gray-500">Organizatör ve oyuncular ayrı ayrı ödeyebilir</p>
                      </div>
                    </label>


                    {/* Sahada Ödeme Seçeneği */}
                    <label className={`flex items-center space-x-3 cursor-pointer ${selectedPaymentMethod === 'sahada-odeme' && !splitPaymentEnabled ? 'ring-2 ring-green-600 rounded-lg p-2 bg-green-50' : 'p-2'}`}>
                      <input
                        type="radio"
                        name="paymentOption" // paymentMethod ile çakışabilir mi? Hayır, bu UI sadece
                        checked={selectedPaymentMethod === 'sahada-odeme' && !splitPaymentEnabled}
                        onChange={() => {
                            setSelectedPaymentMethod('sahada-odeme');
                            setSplitPaymentEnabled(false);
                        }}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700">Sahada Ödeme</span>
                        <p className="text-xs text-gray-500">Ödemeyi tesiste yapın</p>
                      </div>
                    </label>
                  </div>

                  {/* Split Payment Detayları */}
                  {splitPaymentEnabled && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200"
                    >
                      <h4 className="font-medium text-blue-900 mb-2">Bölünmüş Ödeme Detayları</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-blue-700">Organizatör Payı (1 kişi):</span>
                          <span className="font-medium text-blue-900">₺{splitPaymentData.organizerAmount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Oyuncular Toplam ({oyuncular.filter(o => o.status !== 'organizator').length} kişi):</span>
                          <span className="font-medium text-blue-900">₺{splitPaymentData.playersAmount}</span>
                        </div>
                        {oyuncular.filter(o => o.status !== 'organizator').length > 0 && (
                          <div className="flex justify-between text-xs text-blue-600">
                            <span>Oyuncu başına:</span>
                            <span>₺{splitPaymentData.playerAmount}</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-blue-200 pt-2">
                          <span className="text-blue-700 font-medium">Toplam ({oyuncular.length} kişi):</span>
                          <span className="font-bold text-blue-900">₺{selectedPrice > 0 ? selectedPrice : sahaData.price}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>


                {/* Ödeme Bilgileri */}
                  <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Ödeme Bilgileri</h3>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-3">
                      <CreditCard className="w-6 h-6 text-blue-600" />
                      <div>
                        <h4 className="font-medium text-blue-900">Güvenli Ödeme</h4>
                        <p className="text-sm text-blue-700">Kart bilgileriniz iframe ödeme sayfasında güvenle işlenecektir.</p>
                      </div>
                      </div>
                        </div>
                        </div>



                {/* Fatura Bilgileri */}
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Fatura Bilgileri</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Ad Soyad / Firma Adı *</label>
                      <input
                        type="text"
                        value={invoiceData.name}
                        onChange={(e) => setInvoiceData({...invoiceData, name: e.target.value})}
                        placeholder="Mehmet Özkan"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">TC / Vergi No *</label>
                      <input
                        type="text"
                        value={invoiceData.taxNumber}
                        onChange={(e) => setInvoiceData({...invoiceData, taxNumber: e.target.value})}
                        placeholder="00000000000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Adres *</label>
                      <input
                        type="text"
                        value={invoiceData.address}
                        onChange={(e) => setInvoiceData({...invoiceData, address: e.target.value})}
                        placeholder="Mahalle, Sokak, No"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">İl *</label>
                      <input
                        type="text"
                        value={invoiceData.city}
                        onChange={(e) => setInvoiceData({...invoiceData, city: e.target.value})}
                        placeholder="İstanbul"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">İlçe *</label>
                      <input
                        type="text"
                        value={invoiceData.district}
                        onChange={(e) => setInvoiceData({...invoiceData, district: e.target.value})}
                        placeholder="Kadıköy"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Geri Butonu */}
                <div className="flex justify-start">
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Geri
                  </button>
                </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step 5: Onay */}
            <AnimatePresence mode="wait">
              {currentStep === 5 && (
                <motion.div 
                  key="step5"
                  className="space-y-6"
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 50, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Rezervasyon Onayı</h2>
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Rezervasyon Başarılı!</h3>
                    <p className="text-gray-600 mb-4">Rezervasyonunuz oluşturuldu. Rezervasyon numaranız: <strong>{reservationId}</strong></p>
                    <div className="space-y-4">
                      <motion.button
                        onClick={() => navigate(inPanel ? '/oyuncu/dashboard' : '/')}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                      >
                        <ArrowLeft size={20} />
                        {inPanel ? 'Dashboard\'a Dön' : 'Ana Sayfaya Dön'}
                      </motion.button>

                      <motion.button
                        onClick={handleDownloadInvoice}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full px-8 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-300 shadow-sm flex items-center justify-center gap-2"
                      >
                        <Download size={20} />
                        Fatura İndir
                      </motion.button>
                    </div>
                  </div>
                </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Right Column - Saha Bilgileri / Rezervasyon Özeti */}
          {currentStep >= 2 && (
            <motion.div 
              className="lg:col-span-1 h-full"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <div className="sticky top-24">
              {/* Saha Bilgileri - 2-3. adımlar için */}
              {currentStep >= 2 && currentStep < 4 && (
                <div className="bg-white rounded-xl p-6 shadow-lg border">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Saha Bilgileri</h2>
                  
                  {/* Saha Fotoğrafı */}
                  <div className="mb-4">
                    {sahaData.images && sahaData.images.length > 0 ? (
                      <img
                        src={sahaData.images[0].optimized_url || sahaData.images[0].url}
                        alt={sahaData.name}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                        <span className="text-4xl">ğŸŸï¸</span>
                      </div>
                    )}
                  </div>

                  {/* Saha Detayları */}
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">{sahaData.name}</h3>
                      <p className="text-sm text-gray-600">{sahaData.type}</p>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{sahaData.location}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>{sahaData.capacity} kişi kapasiteli</span>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{sahaData.workingHours}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{sahaData.phone}</span>
                    </div>
                  </div>

                  {/* Fiyat */}
                  <div className="mt-6 pt-4 border-t">
                    <div className="flex items-baseline justify-between">
                      <span className="text-lg font-semibold text-gray-900">Saatlik Ücret</span>
                      <span className="text-2xl font-bold text-green-600">₺{selectedPrice > 0 ? selectedPrice : sahaData.price}</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                      <button 
                         className="w-full px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors font-medium flex items-center justify-center space-x-2"
                         onClick={() => {
                           if (!user) {
                             alert('Giriş yapmalısınız');
                             return;
                           }
                           navigate(`/oyuncu/mesajlar?userId=${sahaData.ownerId}`);
                         }}
                       >
                          <MessageSquare className="w-4 h-4" />
                          <span>Mesaj Gönder</span>
                       </button>
                  </div>
                </div>
              )}

              {/* Rezervasyon Özeti - 4. adım için */}
              {currentStep >= 4 && (
                <div className="bg-white rounded-xl p-6 shadow-lg border">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Rezervasyon Özeti</h2>
                  
                  {/* Saha Bilgileri */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-2">{sahaData.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">Saha 2 (6v6)</p>
                    <p className="text-sm text-gray-600 mb-2">{selectedDate}</p>
                    <p className="text-sm text-gray-600">{selectedTime}</p>
                  </div>

                  {/* Oyun Detayları */}
                  <div className="space-y-2 mb-6 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Oyun Türü</span>
                      <span className="text-gray-900">{sahaData.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Format</span>
                      <span className="text-gray-900">6v6</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Süre</span>
                      <span className="text-gray-900">60 dakika</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Oyuncu Sayısı</span>
                      <span className="text-gray-900">{oyuncular.length} kişi</span>
                    </div>
                  </div>

                  {/* Fiyat Detayları */}
                  <div className="space-y-2 mb-6 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Saha Ücreti</span>
                      <span className="text-gray-900">₺{selectedPrice > 0 ? selectedPrice : sahaData.price}</span>
                    </div>
                    
                    {/* Split Payment Detayları */}
                    {splitPaymentEnabled ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Organizatör Payı (1 kişi)</span>
                          <span className="text-gray-900">₺{splitPaymentData.organizerAmount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Oyuncular Toplam ({oyuncular.filter(o => o.status !== 'organizator').length} kişi)</span>
                          <span className="text-gray-900">₺{splitPaymentData.playersAmount}</span>
                        </div>
                        {oyuncular.filter(o => o.status !== 'organizator').length > 0 && (
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Oyuncu başına:</span>
                            <span>₺{splitPaymentData.playerAmount}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-blue-600">
                          <span>Bölünmüş Ödeme</span>
                          <span>âœ“ Aktif</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-green-600">
                        <span>Tek Çekim</span>
                        <span>Seçildi</span>
                      </div>
                    )}
                    
                    <div className="border-t pt-2">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Toplam</span>
                        <span className="text-green-600">₺{selectedPrice > 0 ? selectedPrice : sahaData.price}</span>
                      </div>
                    </div>
                    

                  </div>

                  {/* İndirim Kodu */}
                  <div className="mb-6">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="İndirim kodu"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      />
                      <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
                        Uygula
                      </button>
                    </div>
                  </div>

                  {/* Kullanım Koşulları */}
                  <div className="mb-6">
                    <label className="flex items-start space-x-2">
                      <input
                        type="checkbox"
                        checked={acceptTerms}
                        onChange={(e) => setAcceptTerms(e.target.checked)}
                        className="mt-1"
                      />
                      <span className="text-sm text-gray-600">
                        Kullanım Koşulları ve İptal Politikası'nı kabul ediyorum.
                      </span>
                    </label>
                  </div>

                  {/* Ödeme Butonu */}
                  <button
                    onClick={handlePaymentSubmit}
                    disabled={
                      !acceptTerms || 
                      isPaymentProcessing
                    }
                    className={`w-full py-3 rounded-lg font-semibold transition-all ${
                      acceptTerms && 
                      !isPaymentProcessing
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {isPaymentProcessing ? 'İşleniyor...' : (selectedPaymentMethod === 'sahada-odeme' ? 'Rezervasyonu Tamamla' : 'Kredi Kartı ile Ödeme Yap')}
                  </button>

                  {/* Güvenlik Mesajı */}
                  <div className="mt-4 text-center">
                    <div className="flex items-center justify-center space-x-1 text-sm text-gray-500">
                      <Shield className="w-4 h-4" />
                      <span>256-bit SSL ile Güvenli Ödeme</span>
                    </div>
                  </div>
                </div>
              )}
              </div>
            </motion.div>
          )}
        </div>
      </div>


      {/* Oyuncu Ekleme Modalı */}
      <AnimatePresence>
        {showOyuncuModal && (
          <motion.div 
            className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div 
              className="bg-white rounded-xl p-6 w-full max-w-lg"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Oyuncu Ekle</h3>
              <button
                onClick={() => {
                  setShowOyuncuModal(false);
                  setNewOyuncu({ name: '', phone: '', searchTerm: '', selectedUser: null });
                  setShowUserDropdown(false);
                }}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Kayıtlı Kullanıcı Arama */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kayıtlı Kullanıcılardan Ara
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={newOyuncu.searchTerm}
                    onChange={(e) => handleUserSearch(e.target.value)}
                    placeholder="Ad, telefon veya e-posta ile ara..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                  
                  {/* Dropdown */}
                  <AnimatePresence>
                    {showUserDropdown && filteredUsers.length > 0 && (
                      <motion.div 
                        className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        {filteredUsers.map((user, index) => (
                          <motion.div
                            key={user.id}
                            onClick={() => handleUserSelect(user)}
                            className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: index * 0.05 }}
                          >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-semibold text-green-800">
                                {(() => {
                                  const displayName = user.displayName || user.name || (user.email ? getNameFromEmail(user.email) : 'U');
                                  return displayName.split(' ').map(n => n[0]).join('').toUpperCase();
                                })()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {user.displayName || user.name || (user.email ? getNameFromEmail(user.email) : 'Kullanıcı')}
                              </p>
                              <p className="text-sm text-gray-600">{user.phone || '-'}</p>
                              <p className="text-xs text-gray-500">{user.email || '-'}</p>
                            </div>
                          </div>
                        </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {showUserDropdown && filteredUsers.length === 0 && newOyuncu.searchTerm.length >= 3 && !searchLoading && (
                    <motion.div 
                      className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p className="text-sm text-gray-500 text-center">Kullanıcı bulunamadı</p>
                    </motion.div>
                  )}
                  
                  {searchLoading && (
                    <motion.div 
                      className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 animate-spin border-2 border-green-600 border-t-transparent rounded-full"></div>
                        <p className="text-sm text-gray-500">Aranıyor...</p>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Seçilen Kullanıcı */}
              <AnimatePresence>
                {newOyuncu.selectedUser && (
                  <motion.div 
                    className="bg-green-50 p-4 rounded-lg border border-green-200"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                  >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-green-800">
                        {(() => {
                          const displayName = newOyuncu.selectedUser.displayName || newOyuncu.selectedUser.name || (newOyuncu.selectedUser.email ? getNameFromEmail(newOyuncu.selectedUser.email) : 'U');
                          return displayName.split(' ').map(n => n[0]).join('').toUpperCase();
                        })()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-green-900">
                        {newOyuncu.selectedUser.displayName || newOyuncu.selectedUser.name || (newOyuncu.selectedUser.email ? getNameFromEmail(newOyuncu.selectedUser.email) : 'Kullanıcı')}
                      </p>
                      <p className="text-sm text-green-700">{newOyuncu.selectedUser.phone || '-'}</p>
                    </div>
                    <button
                      onClick={() => setNewOyuncu({ ...newOyuncu, selectedUser: null, searchTerm: '' })}
                      className="ml-auto p-1 text-green-600 hover:text-green-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Ayırıcı */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">veya</span>
                </div>
              </div>

              {/* Manuel Giriş */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Manuel Olarak Ekle</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ad Soyad</label>
                    <input
                      type="text"
                      value={newOyuncu.name}
                      onChange={(e) => setNewOyuncu({...newOyuncu, name: e.target.value})}
                      placeholder="Ahmet Yılmaz"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                    <input
                      type="text"
                      value={newOyuncu.phone}
                      onChange={(e) => setNewOyuncu({...newOyuncu, phone: e.target.value})}
                      placeholder="0532 123 4567"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowOyuncuModal(false);
                  setNewOyuncu({ name: '', phone: '', searchTerm: '', selectedUser: null });
                  setShowUserDropdown(false);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                İptal
              </button>
              
              {newOyuncu.selectedUser ? (
                <button
                  onClick={handleRegisteredUserAdd}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Kayıtlı Kullanıcıyı Ekle
                </button>
              ) : (
                <button
                  onClick={handleManualOyuncuEkle}
                  disabled={!newOyuncu.name || !newOyuncu.phone}
                  className={`px-4 py-2 rounded-lg ${
                    newOyuncu.name && newOyuncu.phone
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Manuel Ekle
                </button>
              )}
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>




              


              

      {/* Full Screen Loading Overlay */}
      <AnimatePresence>
        {isPaymentProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
              <div className="w-20 h-20 mx-auto mb-6 relative">
                <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2">Ödeme İşleniyor</h3>
              <p className="text-gray-600 mb-6">
                Lütfen bekleyin, ödeme işleminiz güvenli bir şekilde gerçekleştiriliyor.
              </p>
              
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                <Shield className="w-4 h-4 text-green-600" />
                <span>256-bit SSL Güvenli Ödeme</span>
              </div>

              <p className="text-xs text-gray-400 mt-4">
                Lütfen sayfayı kapatmayın veya yenilemeyin.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );

  if (inPanel) {
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <OyuncuSidebar />
        <div className="flex-1 overflow-y-auto relative">
          {content}
        </div>
      </div>
    );
  }

  return content;
};

export default Rezervasyon;

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { purchaseMembership, getUserMembership, cancelUserMembership } from '../../services/membershipService';
import { createPaymentForm, checkPaymentStatus } from '../../services/paymentApiService';
import { getPremiumPlans, getPremiumFeatures } from '../../services/firestoreService';
import SahaSahibiSidebar from '../../components/SahaSahibiSidebar';
import { Check, Star, Zap, Shield, Crown, AlertCircle } from 'lucide-react';
import { collection, query, onSnapshot, where, orderBy, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import toast from '../../utils/toast';

const Premium = () => {
  const { user, userData } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // State from Premium.jsx
  const [loading, setLoading] = useState(true);
  const [membership, setMembership] = useState(null);
  const [error, setError] = useState(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [plans, setPlans] = useState([]);
  const [features, setFeatures] = useState([]); // Dynamic features
  
  // Payment Popup State
  const [selectedPlanData, setSelectedPlanData] = useState(null);
  const [showPaymentOverlay, setShowPaymentOverlay] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('idle');
  const [paymentWindow, setPaymentWindow] = useState(null);
  const hasHandledPaymentRef = useRef(false);
  
  // Cancel Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Billing Cycle Toggle (Visual only, to filter plans if needed or just display)
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'

  // --- LOGIC SECTION START ---

  useEffect(() => {
    if (user) {
      loadPlans();
      loadFeatures();
      setupMembershipListener();
    }
  }, [user]);

  // Payment Callback Listener
  useEffect(() => {
    const handleMessage = async (event) => {
      // Security check
      if (event.origin !== 'http://localhost' && event.origin !== window.location.origin) {
        return;
      }

      if (event?.data?.type === 'payment_callback') {
        if (hasHandledPaymentRef.current) return;
        hasHandledPaymentRef.current = true;
        
        const { token } = event.data;
        setPaymentStatus('processing');

        try {
           const verifyRes = await checkPaymentStatus(token);
           // Backend check-payment usually returns { success: true/false, data: { status: 'success', ... } }
           // OR it might return features directly. Let's assume standard success wrapper.
           if (verifyRes.success && (verifyRes.data?.status === 'success' || verifyRes.status === 'success')) {
               handleCreateMembership(token);
           } else {
               setPaymentStatus('failed');
               setError('Ödeme doğrulanamadı: ' + (verifyRes.error || 'Bilinmeyen hata'));
               toast.error('Ödeme doğrulanamadı');
               setTimeout(() => {
                 setShowPaymentOverlay(false);
                 setPaymentStatus('idle');
               }, 3000);
           }
        } catch (e) {
           setPaymentStatus('failed');
           setError('Ödeme kontrolü sırasında hata oluştu.');
           toast.error('Hata oluştu');
           setTimeout(() => {
             setShowPaymentOverlay(false);
             setPaymentStatus('idle');
           }, 3000);
        }
        return;
      }

      if (event?.data?.success) {
        if (hasHandledPaymentRef.current) return;
        hasHandledPaymentRef.current = true;
        
        const paymentId = event.data.paymentId;
        setPaymentStatus('processing');
        handleCreateMembership(paymentId);
      } else if (event?.data?.error) {
        if (hasHandledPaymentRef.current) return;
        hasHandledPaymentRef.current = true;
        
        setPaymentStatus('failed');
        setError('Ödeme başarısız: ' + (event.data.error || 'Bilinmeyen hata'));
        toast.error('Ödeme başarısız');
        setPaymentProcessing(false);
        
        setTimeout(() => {
          setShowPaymentOverlay(false);
          setPaymentStatus('idle');
        }, 3000);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const loadPlans = async () => {
    try {
      const result = await getPremiumPlans();
      if (result.success) {
        const ownerPlans = result.data.filter(
          plan => plan.userType === 'owner' && plan.isActive !== false
        );
        setPlans(ownerPlans);
      }
    } catch (err) {
      console.error('Plan loading error:', err);
    }
  };

  const loadFeatures = async () => {
    try {
      const result = await getPremiumFeatures();
      if (result.success) setFeatures(result.data);
    } catch (err) {
      console.error('Features loading error:', err);
    }
  };

  const setupMembershipListener = () => {
    if (!user) return;
    const membershipRef = doc(db, 'memberships', user.uid);
    const unsubscribe = onSnapshot(membershipRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMembership({
          id: docSnap.id,
          ...data,
          endDate: data.endDate?.toDate ? data.endDate.toDate() : (data.endDate ? new Date(data.endDate) : null)
        });
      } else {
        setMembership(null);
      }
      setLoading(false);
    }, (err) => {
      console.error('Membership listerr error:', err);
      setLoading(false);
    });
    return () => unsubscribe();
  };

  // Real-time updates for Plans & Features
  useEffect(() => {
    if (!user) return;

    const plansQuery = query(
      collection(db, 'premiumPlans'),
      where('userType', '==', 'owner'),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );
    const unsubPlans = onSnapshot(plansQuery, (snap) => {
      const d = [];
      snap.forEach(doc => d.push({id: doc.id, ...doc.data()}));
      setPlans(d);
    });

    const featuresQuery = query(collection(db, 'premiumFeatures'), orderBy('order', 'asc'));
    const unsubFeatures = onSnapshot(featuresQuery, (snap) => {
      const d = [];
      snap.forEach(doc => d.push({id: doc.id, ...doc.data()}));
      setFeatures(d);
    });

    return () => {
      unsubPlans();
      unsubFeatures();
    };
  }, [user]);

  const handlePurchase = async (planId) => {
    if (!user) return navigate('/login');

    const planData = plans.find(p => p.id === planId);
    if (!planData) return setError('Plan bulunamadı');

    setSelectedPlanData(planData);
    setPaymentProcessing(true);
    setError(null);
    hasHandledPaymentRef.current = false;

    try {
      const fullName = userData?.fullName || user.displayName || 'Kullanıcı';
      const nameParts = fullName.split(' ');
      
      const paymentData = {
        price: planData.price,
        paidPrice: planData.price,
        basketId: `premium_${Date.now()}`,
        conversationId: `premium_${user.uid}_${Date.now()}`,
        reservationName: `Premium ${planData.duration === 'monthly' ? 'Aylık' : 'Yıllık'} Üyelik - ${planData.name}`,
        buyerId: user.uid,
        buyerName: nameParts[0] || 'Kullanıcı',
        buyerSurname: nameParts.slice(1).join(' ') || 'Soyad',
        buyerEmail: userData?.email || user.email || '',
        buyerPhone: userData?.phone || user.phone || '05321234567',
        buyerAddress: userData?.address || 'Istanbul',
        buyerCity: userData?.city || 'Istanbul',
        buyerZipCode: userData?.zipCode || '34000',
        buyerIdentityNumber: userData?.identityNumber || '11111111111',
        callbackUrl: `${window.location.origin}/payment-callback`,
        frontendOrigin: window.location.origin,
        currency: 'TRY',
        installment: 1,
        paymentGroup: 'PRODUCT'
      };

      const result = await createPaymentForm(paymentData);

      if (result.success && result.data) {
        setShowPaymentOverlay(true);
        setPaymentStatus('loading');

        const popupWindow = window.open(
          result.data.paymentPageUrl,
          'payment',
          'width=800,height=600,scrollbars=yes,resizable=yes'
        );

        if (!popupWindow) {
          setShowPaymentOverlay(false);
          setPaymentStatus('idle');
          setError('Popup engellendi.');
          setPaymentProcessing(false);
          toast.error('Popup engellendi');
          return;
        }

        setPaymentWindow(popupWindow);
        setPaymentStatus('waiting');
        setPaymentProcessing(false);

        const checkInterval = setInterval(() => {
            if (popupWindow.closed) {
                clearInterval(checkInterval);
                setPaymentStatus('processing');
                checkMembershipAfterPayment();
            }
        }, 1000);

        setTimeout(() => {
             clearInterval(checkInterval);
             setShowPaymentOverlay(prev => {
                 if (prev) setPaymentStatus('idle');
                 return false;
             });
        }, 300000);

      } else {
        setError('Ödeme formu oluşturulamadı.');
        setPaymentProcessing(false);
        toast.error('Hata oluştu');
      }
    } catch (err) {
      setError('Hata oluştu.');
      setPaymentProcessing(false);
      toast.error('Hata oluştu');
    }
  };

  const checkMembershipAfterPayment = async () => {
    if (!user || !selectedPlanData) return;
    try {
        setPaymentStatus('processing');
        await new Promise(r => setTimeout(r, 2000));
        const res = await getUserMembership(user.uid);
        if (res.success && res.data?.status === 'active') {
            setMembership({
                id: user.uid,
                ...res.data,
                endDate: res.data.endDate?.toDate ? res.data.endDate.toDate() : new Date(res.data.endDate)
            });
            setPaymentStatus('success');
            setSelectedPlanData(null);
            toast.success('Premium aktif edildi!');
            setTimeout(() => {
                setShowPaymentOverlay(false);
                setPaymentStatus('idle');
            }, 2000);
        } else {
             // Fallback create
             await handleCreateMembership(null);
        }
    } catch (err) {
        setPaymentStatus('failed');
    }
  };

  const handleCreateMembership = async (paymentId) => {
      if (!selectedPlanData || !user) {
          setPaymentStatus('failed');
          return;
      }
      try {
          const res = await purchaseMembership(
              user.uid,
              selectedPlanData.id,
              selectedPlanData.duration,
              paymentId,
              selectedPlanData.name,
              selectedPlanData.price
          );

          if (res.success) {
              const updated = await getUserMembership(user.uid);
              if (updated.success && updated.data) {
                setMembership({
                    id: user.uid,
                    ...updated.data,
                    endDate: updated.data.endDate?.toDate ? updated.data.endDate.toDate() : new Date(updated.data.endDate)
                });
              }
              setPaymentStatus('success');
              setSelectedPlanData(null);
              toast.success('Premium aktif!');
              setTimeout(() => {
                setShowPaymentOverlay(false);
                setPaymentStatus('idle');
            }, 2000);
          } else {
              setPaymentStatus('failed');
              setError('Üyelik oluşturulamadı.');
          }
      } catch (err) {
          setPaymentStatus('failed');
      }
  };

  const handleCancelClick = () => setShowCancelModal(true);

  const handleCancelConfirm = async () => {
      if (!user) return;
      setCancelling(true);
      try {
          const res = await cancelUserMembership(user.uid);
          if (res.success) {
              setMembership(null);
              setShowCancelModal(false);
              toast.success('İptal edildi');
              // refresh page or state?
              window.location.reload();
          } else {
              setError('İptal hatası');
              toast.error('Hata');
          }
      } catch (e) {
          setError('Hata');
      } finally {
          setCancelling(false);
      }
  };

  // --- UI HELPERS ---

  if (!user) return <div className="p-10">Giriş yapınız.</div>;
  if (loading) return <div className="flex h-screen items-center justify-center bg-gray-50"><div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div></div>;

  // Filter plans based on toggled billing cycle if you want explicit switch
  // OR just show all plans. pricing.jsx style usually has one card per tier.
  // Here we likely have 1 plan 'Business' but with Monthly/Yearly options.
  // Let's assume user wants to see options.
  
  // Group plans by name or display them all? 
  // Let's filter by cycle for cleaner UI like Pricing.jsx
  const visiblePlans = plans.filter(p => p.duration === billingCycle);

  return (
    <div className="flex h-screen bg-gray-50">
        <SahaSahibiSidebar />
        
        <div className="flex-1 flex flex-col overflow-y-auto">
            {/* Header / Hero Section (Adapted from Pricing.jsx to fit Dashboard) */}
            <div className="py-12 px-6 md:px-12 bg-white border-b border-gray-100">
                <div className="max-w-4xl mx-auto text-center">
                     <span className="text-green-600 font-bold text-sm tracking-widest uppercase">Premium Üyelik</span>
                     <h1 className="text-3xl md:text-4xl font-black text-gray-900 mt-2 mb-4">İşletmenizi Zirveye Taşıyın</h1>
                     <p className="text-gray-500 text-lg">
                        Daha fazla görünürlük, gelişmiş raporlar ve %100 doluluk oranı için premium özelliklere geçin.
                     </p>

                     {/* Billing Toggle */}
                     <div className="flex justify-center mt-8">
                        <div className="bg-gray-100 p-1 rounded-xl inline-flex relative">
                             <button 
                                onClick={() => setBillingCycle('monthly')}
                                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all relative z-10 ${billingCycle === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                             >
                                 Aylık
                             </button>
                             <button 
                                onClick={() => setBillingCycle('yearly')}
                                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all relative z-10 ${billingCycle === 'yearly' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                             >
                                 Yıllık <span className="text-xs ml-1 bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">-20%</span>
                             </button>
                        </div>
                     </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="p-6 md:p-12">
                <div className="max-w-6xl mx-auto">
                    
                    {/* Active Membership Banner */}
                    {membership && membership.status === 'active' && (
                        <div className="mb-10 bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                             <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center border border-green-500/30">
                                        <Crown className="w-6 h-6 text-green-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold">Premium Üyelik Aktif</h3>
                                        <p className="text-gray-400 text-sm">
                                            {membership.planName} • {membership.endDate ? `Bitiş: ${membership.endDate.toLocaleDateString('tr-TR')}` : 'Süresiz'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleCancelClick}
                                    className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm font-medium backdrop-blur-sm"
                                >
                                    Üyeliği Yönet / İptal Et
                                </button>
                             </div>
                        </div>
                    )}

                    {/* API Connection Test Button (Temporary) */}
                    <div className="mb-6 flex justify-center">
                        <button
                            onClick={async () => {
                                try {
                                    const paymentApiUrl = import.meta.env.DEV ? '/api' : (import.meta.env.VITE_PAYMENT_API_BASE_URL || 'https://odeme.sahaclub.com');
                                    toast.loading('API Bağlantısı test ediliyor...');
                                    console.log('Testing connection to:', paymentApiUrl);
                                    
                                    // Simple fetch to check CORS
                                    const response = await fetch(`${paymentApiUrl}/test.php`, {
                                        method: 'POST', 
                                        headers: {
                                            'Content-Type': 'application/x-www-form-urlencoded'
                                        },
                                        body: 'test=1&foo=bar'
                                    });
                                    
                                    if (response.ok || response.status === 200 || response.status === 204) {
                                        toast.dismiss();
                                        toast.success('API Bağlantısı Başarılı! CORS sorunu yok görünmüyor.');
                                        alert('Bağlantı Başarılı!\nStatus: ' + response.status + '\nSunucuya erişilebildi.');
                                    } else {
                                        throw new Error('Status: ' + response.status);
                                    }
                                } catch (err) {
                                    toast.dismiss();
                                    toast.error('Bağlantı Hatası: ' + err.message);
                                    alert('Bağlantı Başarısız!\n\nOlası Nedenler:\n1. index.php ve .htaccess dosyaları sunucuya YÜKLENMEDİ.\n2. Sunucu adresi yanlış.\n3. CORS hatası devam ediyor.\n\nHata: ' + err.message);
                                    console.error('Test Error:', err);
                                }
                            }}
                            className="px-4 py-2 bg-gray-800 text-white text-xs font-mono rounded hover:bg-gray-700 transition-colors"
                        >
                            🔌 API Bağlantısını Test Et (Debug)
                        </button>
                    </div>
                
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        
                        {/* Free Plan Card */}
                        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all h-full flex flex-col">
                             <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Başlangıç</div>
                             <div className="text-4xl font-black text-gray-900 mb-2">Ücretsiz</div>
                             <p className="text-gray-500 text-sm mb-6">Platformu tanımak ve temel özelliklerini kullanmak için.</p>
                             
                             <ul className="space-y-4 mb-8 flex-1">
                                <li className="flex items-center gap-3 text-sm text-gray-600"><Check size={18} className="text-green-500" /> Tek Tesis Yönetimi</li>
                                <li className="flex items-center gap-3 text-sm text-gray-600"><Check size={18} className="text-green-500" /> Temel Rezervasyon Takvimi</li>
                                <li className="flex items-center gap-3 text-sm text-gray-600"><Check size={18} className="text-green-500" /> Standart Profil Görünümü</li>
                             </ul>

                             <button disabled className="w-full py-4 rounded-xl border-2 border-gray-100 font-bold text-gray-400 cursor-default">
                                 Mevcut Paket
                             </button>
                        </div>

                        {/* Premium Plan Card (Dynamic) */}
                        {visiblePlans.length > 0 ? visiblePlans.map(plan => (
                             <div key={plan.id} className="bg-gray-900 text-white rounded-3xl p-8 border border-gray-900 shadow-2xl relative overflow-hidden transform md:-translate-y-4 h-full flex flex-col">
                                <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase">Önerilen</div>
                                <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">{plan.name}</div>
                                <div className="flex items-end gap-1 mb-2">
                                    <div className="text-4xl font-black">{plan.price} ₺</div>
                                    <div className="text-gray-400 text-sm mb-1">/{plan.duration === 'yearly' ? 'yıl' : 'ay'}</div>
                                </div>
                                <p className="text-gray-300 text-sm mb-6">İşletmenizi büyütmek için ihtiyacınız olan her şey.</p>

                                <ul className="space-y-4 mb-8 flex-1">
                                    {features.map((feature, idx) => (
                                         <li key={idx} className="flex items-center gap-3 text-sm text-gray-200">
                                            {feature.icon === 'crown' ? <Crown size={18} className="text-green-400" /> : 
                                             feature.icon === 'zap' ? <Zap size={18} className="text-green-400" /> : 
                                             feature.icon === 'shield' ? <Shield size={18} className="text-green-400" /> :
                                             <Check size={18} className="text-green-400" />}
                                            {feature.name}
                                         </li>
                                    ))}
                                    {/* Fallback features if database is empty */}
                                    {features.length === 0 && (
                                        <>
                                            <li className="flex items-center gap-3 text-sm text-gray-200"><Crown size={18} className="text-green-400" /> Sınırsız Tesis Ekleme</li>
                                            <li className="flex items-center gap-3 text-sm text-gray-200"><Zap size={18} className="text-green-400" /> Öne Çıkanlar Listesi</li>
                                            <li className="flex items-center gap-3 text-sm text-gray-200"><Star size={18} className="text-green-400" /> Gelişmiş Gelir Raporları</li>
                                            <li className="flex items-center gap-3 text-sm text-gray-200"><Shield size={18} className="text-green-400" /> 7/24 Öncelikli Destek</li>
                                        </>
                                    )}
                                </ul>

                                <button 
                                    onClick={() => handlePurchase(plan.id)}
                                    disabled={paymentProcessing || (membership && membership.status === 'active')}
                                    className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-700 font-bold text-white transition-all shadow-lg shadow-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {paymentProcessing ? 'İşleniyor...' : (membership && membership.status === 'active' ? 'Zaten Premium' : 'Hemen Başla')}
                                </button>
                             </div>
                        )) : (
                            // Fallback if no dynamic plans found
                             <div className="bg-gray-900 text-white rounded-3xl p-8 border border-gray-900 shadow-2xl relative overflow-hidden transform md:-translate-y-4">
                                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                    <AlertCircle size={48} className="mb-4 text-gray-600"/>
                                    <p>Planlar yükleniyor veya bulunamadı.</p>
                                </div>
                             </div>
                        )}

                        {/* Enterprise Card */}
                        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all h-full flex flex-col">
                             <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Kurumsal</div>
                             <div className="text-4xl font-black text-gray-900 mb-2">Zincir Tesis</div>
                             <p className="text-gray-500 text-sm mb-6">Birden fazla şubesi olan işletmeler için özel çözüm.</p>
                             
                             <ul className="space-y-4 mb-8 flex-1">
                                <li className="flex items-center gap-3 text-sm text-gray-600"><Check size={18} className="text-green-500" /> Çoklu Şube Yönetimi</li>
                                <li className="flex items-center gap-3 text-sm text-gray-600"><Check size={18} className="text-green-500" /> API Entegrasyonu</li>
                                <li className="flex items-center gap-3 text-sm text-gray-600"><Check size={18} className="text-green-500" /> Özel Marka Sayfası</li>
                                <li className="flex items-center gap-3 text-sm text-gray-600"><Check size={18} className="text-green-500" /> Size Özel Müşteri Temsilcisi</li>
                             </ul>

                             <button className="w-full py-4 rounded-xl border-2 border-gray-100 font-bold text-gray-900 hover:border-gray-900 hover:bg-gray-50 transition-all">
                                 Teklif Al
                             </button>
                        </div>

                    </div>
                    
                    {/* FAQ / Trust Section */}
                    <div className="mt-20 text-center">
                        <p className="text-gray-400 text-sm">Güvenli ödeme altyapısı ve 14 gün içinde koşulsuz iade garantisi.</p>
                        <div className="flex justify-center gap-4 mt-4 opacity-50 grayscale">
                             {/* Mock Payment Logos */}
                             <div className="h-8 w-12 bg-gray-200 rounded"></div>
                             <div className="h-8 w-12 bg-gray-200 rounded"></div>
                             <div className="h-8 w-12 bg-gray-200 rounded"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Payment Overlay */}
        {showPaymentOverlay && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center shadow-2xl">
            {paymentStatus === 'loading' && (
              <>
                <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Yükleniyor...</h3>
                <p className="text-gray-600">Ödeme sayfası güvenli bir şekilde açılıyor.</p>
              </>
            )}
            
            {paymentStatus === 'waiting' && (
              <>
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Ödeme Bekleniyor</h3>
                <p className="text-gray-600">Lütfen açılan pencerede ödemeyi tamamlayın.</p>
              </>
            )}
            
            {paymentStatus === 'processing' && (
              <>
                <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">İşleminiz Kontrol Ediliyor</h3>
                <p className="text-gray-600">Üyeliğinizi aktifleştiriyoruz, lütfen bekleyin.</p>
              </>
            )}
            
            {paymentStatus === 'success' && (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">İşlem Başarılı!</h3>
                <p className="text-gray-600">Premium avantajlarının keyfini çıkarın.</p>
              </>
            )}
            
            {paymentStatus === 'failed' && (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Ödeme Başarısız</h3>
                <p className="text-gray-600 mb-4">{error || 'Bir hata oluştu'}</p>
                <button
                  onClick={() => {
                    setShowPaymentOverlay(false);
                    setPaymentStatus('idle');
                  }}
                  className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Kapat
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
               <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
              Üyeliği İptal Et?
            </h3>
            
            <p className="text-center text-gray-600 mb-6 text-sm">
                Premium ayrıcalıklarınızı kaybedeceksiniz. Kalan süreniz için iade yapılmamaktadır. Devam etmek istiyor musunuz?
            </p>

            <div className="space-y-3">
              <button
                onClick={handleCancelConfirm}
                disabled={cancelling}
                className="w-full px-4 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {cancelling && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                {cancelling ? 'İptal Ediliyor...' : 'Evet, İptal Et'}
              </button>
              
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="w-full px-4 py-3 bg-gray-100 text-gray-900 font-bold rounded-xl hover:bg-gray-200 transition-colors"
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Premium;

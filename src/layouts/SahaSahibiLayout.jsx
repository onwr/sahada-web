import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPlatformSettings } from '../services/firestoreService';
import OnBoard from '../pages/saha-sahibi/OnBoard';
import Dashboard from '../pages/saha-sahibi/Dashboard';
import Rezervasyonlar from '../pages/saha-sahibi/Rezervasyonlar';
import Finansal from '../pages/saha-sahibi/Finansal';
import Raporlar from '../pages/saha-sahibi/Raporlar';
import Marketing from '../pages/saha-sahibi/Marketing';
import Turnuvalar from '../pages/saha-sahibi/Turnuvalar';
import Ayarlar from '../pages/saha-sahibi/Ayarlar';
import SahaYonetimi from '../pages/saha-sahibi/SahaYonetimi';
import SahaDetay from '../pages/saha-sahibi/SahaDetay';
import Premium from '../pages/saha-sahibi/Premium';
import CRM from '../pages/saha-sahibi/CRM';
import Destek from '../pages/saha-sahibi/Destek';
import Mesajlar from '../pages/saha-sahibi/Mesajlar';
import Bildirimler from '../pages/saha-sahibi/Bildirimler';
import { Lock, AlertTriangle, ChevronRight, CreditCard, Zap, Gem, Rocket, Check, Gift } from 'lucide-react';
import { activateDemoSubscription } from '../services/firestoreService';
import toast from '../utils/toast';

const SahaSahibiLayout = () => {
  const { userData } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [features, setFeatures] = useState([]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const result = await getPlatformSettings();
        if (result.success) {
          setSettings(result.data);
        }
      } catch (error) {
        console.error('Settings fetch error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Real-time Plans and Features
  useEffect(() => {
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
  }, []);

  // Blocking Logic
  const isPaymentRequired = settings?.membership?.mandatoryPayment;
  
  // Check if user is active (Subscription or non-expired trial)
  const isUserActive = (() => {
    if (userData?.subscriptionStatus === 'active') return true;
    
    // Check trial
    if (userData?.subscriptionType === 'trial' && userData?.trialEndDate) {
      const endDate = userData.trialEndDate.toDate ? userData.trialEndDate.toDate() : new Date(userData.trialEndDate);
      return endDate > new Date();
    }
    
    return false;
  })();

  // Allow crucial pages even if blocked
  const allowedPaths = ['/saha-sahibi/ayarlar', '/saha-sahibi/destek', '/saha-sahibi/onboarding', '/saha-sahibi/bildirimler'];
  const isAllowedPath = allowedPaths.some(path => location.pathname.startsWith(path));

  const shouldBlock = !loading && isPaymentRequired && !isUserActive && !isAllowedPath;

  return (
    <div className="min-h-screen bg-gray-50 relative">
      <Routes>
        <Route path="" element={<Navigate to="dashboard" replace />} />
        <Route path="/onboarding" element={<OnBoard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/rezervasyonlar" element={<Rezervasyonlar />} />
        {/* Route path="/musteriler" element={<Musteriler />} */ }
        <Route path="/finansal" element={<Finansal />} />
        <Route path="/raporlar" element={<Raporlar />} />
        <Route path="/marketing" element={<Marketing />} />
        <Route path="/turnuvalar" element={<Turnuvalar />} />
        <Route path="/ayarlar" element={<Ayarlar />} />
        <Route path="/saha-yonetimi" element={<SahaYonetimi />} />
        <Route path="/saha-detay/:id" element={<SahaDetay />} />
        <Route path="/premium" element={<Premium />} />
        <Route path="/crm" element={<CRM />} />
        <Route path="/mesajlar" element={<Mesajlar />} />
        <Route path="/destek" element={<Destek />} />
        <Route path="/bildirimler" element={<Bildirimler />} />
      </Routes>

      {/* Profile Completion Overlay (Higher Priority) */}
      {!loading && (
        (() => {
          // Check for missing mandatory fields
          const missingFields = [];
          if (!userData?.displayName && !userData?.fullName) missingFields.push('Ad Soyad');
          if (!userData?.phone && !userData?.phoneNumber) missingFields.push('Telefon');
          if (!userData?.city) missingFields.push('Şehir');
          if (!userData?.businessName) missingFields.push('İşletme Adı');

          const isProfileIncomplete = missingFields.length > 0;
          const isOnSettingsPage = location.pathname.startsWith('/saha-sahibi/ayarlar');
          const isOnboardingPage = location.pathname.includes('/onboarding');

          if (isProfileIncomplete && !isOnSettingsPage && !isOnboardingPage) {
            return (
              <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
                {/* Backdrop Blur */}
                <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"></div>
                
                {/* Modal */}
                <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center border-t-4 border-blue-500 animate-in fade-in zoom-in-95 duration-300">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="w-10 h-10 text-blue-600" />
                    </div>
                    
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Profil Bilgileri Eksik</h2>
                    <p className="text-gray-600 mb-6">
                        Sistemi tam kapasiteyle kullanabilmek ve fatura süreçlerinin doğru işlemesi için lütfen zorunlu alanları doldurunuz.
                    </p>

                    <div className="bg-blue-50 rounded-xl p-4 mb-8 text-left border border-blue-100">
                        <p className="text-blue-900 font-medium mb-2 text-sm">Eksik Bilgiler:</p>
                        <ul className="list-disc list-inside text-sm text-blue-800 space-y-1 ml-1">
                          {missingFields.map(field => (
                            <li key={field}>{field}</li>
                          ))}
                        </ul>
                    </div>

                    <button 
                        onClick={() => navigate('/saha-sahibi/ayarlar?tab=profile')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                    >
                        Bilgileri Tamamla
                        <ChevronRight size={20} />
                    </button>
                    
                    <p className="text-xs text-gray-400 mt-6">
                        Bu işlem sadece bir kerelik gereklidir.
                    </p>
                </div>
              </div>
            );
          }
          return null;
        })()
      )}

      {/* Blocking Overlay */}
      {shouldBlock && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto bg-gray-900/40 backdrop-blur-sm">
            <div className="container mx-auto max-w-5xl my-auto">
                <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 flex flex-col lg:flex-row min-h-[600px] animate-in fade-in zoom-in-95 duration-500">
                    
                    {/* Left Side: Info & Demo (40%) */}
                    <div className="lg:w-2/5 bg-gradient-to-br from-green-600 to-emerald-700 p-8 sm:p-12 text-white flex flex-col relative overflow-hidden">
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-400/20 rounded-full -ml-24 -mb-24 blur-2xl"></div>

                        <div className="relative z-10">
                            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-8 shadow-xl">
                                <Lock className="w-8 h-8 text-white" />
                            </div>
                            
                            <h2 className="text-3xl sm:text-4xl font-black mb-6 leading-tight">
                                Dijital Tesis <br />
                                <span className="text-emerald-200">Panelini Keşfet</span>
                            </h2>
                            
                            <p className="text-green-50 text-lg mb-8 leading-relaxed opacity-90">
                                Sahalarını yönetmek, rezervasyonları takip etmek ve gelirlerini artırmak için aboneliğini başlatmalısın.
                            </p>

                            <div className="space-y-4 mb-12">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                                        <Check size={14} className="text-emerald-300" />
                                    </div>
                                    <span className="text-sm font-medium">Sınırsız Saha Tanımlama</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                                        <Check size={14} className="text-emerald-300" />
                                    </div>
                                    <span className="text-sm font-medium">Anlık Rezervasyon Takibi</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                                        <Check size={14} className="text-emerald-300" />
                                    </div>
                                    <span className="text-sm font-medium">Gelişmiş Finansal Raporlar</span>
                                </div>
                            </div>

                            {/* Demo Section */}
                            {!userData?.trialEndDate && (
                                <div className="mt-auto pt-8 border-t border-white/10">
                                    <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10 group hover:border-white/20 transition-all cursor-pointer shadow-lg"
                                        onClick={async () => {
                                            if (window.confirm("15 günlük ücretsiz deneme sürenizi başlatmak istediğinize emin misiniz?")) {
                                                const res = await activateDemoSubscription(userData.uid);
                                                if (res.success) {
                                                    toast.success("Demo süreniz başarıyla başlatıldı! Keyifli kullanımlar.");
                                                    window.location.reload();
                                                } else {
                                                    toast.error("Demo başlatılırken bir hata oluştu.");
                                                }
                                            }
                                        }}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                                <Gift className="w-6 h-6 text-green-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white">Deneme Sürümü</h4>
                                                <p className="text-xs text-green-100">15 Gün Ücretsiz Kullan</p>
                                            </div>
                                            <ChevronRight className="ml-auto w-5 h-5 text-white/50 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {userData?.trialEndDate && (
                                <div className="mt-auto">
                                    <p className="text-sm text-green-100 italic">Demo süreniz sona ermiştir. Devam etmek için paket seçebilirsiniz.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Side: Packages (60%) */}
                    <div className="lg:w-3/5 p-8 sm:p-12 flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Üyelik Paketleri</h3>
                                <p className="text-xs text-gray-500">Sana en uygun paketi seç ve hemen başla</p>
                            </div>
                            <button 
                                onClick={() => window.location.href = '/saha-sahibi/destek'}
                                className="text-sm text-gray-400 font-medium hover:text-green-600 transition-colors"
                            >
                                Yardıma mı ihtiyacın var?
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 flex-1">
                                {plans.length > 0 ? (
                                    plans.map((plan, idx) => (
                                        <div key={plan.id} className={`relative group ${idx === 1 ? 'sm:scale-105 z-10' : ''}`}>
                                            {idx === 1 && (
                                                <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-400 to-rose-500 rounded-[2rem] blur opacity-30 animate-pulse"></div>
                                            )}
                                            <div className={`relative bg-white border ${idx === 1 ? 'border-orange-100 shadow-xl' : 'border-gray-100 shadow-sm'} p-8 rounded-[2rem] h-full flex flex-col hover:shadow-2xl transition-all duration-300`}>
                                                <div className={`w-12 h-12 ${idx === 1 ? 'bg-orange-100' : 'bg-green-50'} rounded-2xl flex items-center justify-center mb-6`}>
                                                    {plan.duration === 'yearly' ? <Rocket className={`w-6 h-6 ${idx === 1 ? 'text-orange-600' : 'text-green-600'}`} /> : <Zap className={`w-6 h-6 ${idx === 1 ? 'text-orange-600' : 'text-green-600'}`} />}
                                                </div>
                                                <h5 className="font-black text-gray-900 text-xl mb-1">{plan.name}</h5>
                                                <div className="flex items-baseline gap-1 mb-6">
                                                    <span className="text-3xl font-black text-gray-900">₺{plan.price}</span>
                                                    <span className="text-gray-400 text-sm font-medium">/ {plan.duration === 'yearly' ? 'Yıl' : 'Ay'}</span>
                                                </div>
                                                
                                                <div className="space-y-4 mb-10 flex-1">
                                                    {features.length > 0 ? features.slice(0, 4).map((feat, fIdx) => (
                                                        <p key={fIdx} className="flex items-center gap-3 text-sm text-gray-600">
                                                            <div className={`w-5 h-5 rounded-full ${idx === 1 ? 'bg-orange-100/50' : 'bg-green-50'} flex items-center justify-center flex-shrink-0`}>
                                                                <Check size={12} className={idx === 1 ? 'text-orange-600' : 'text-green-600'} />
                                                            </div>
                                                            {feat.name}
                                                        </p>
                                                    )) : (
                                                        <>
                                                            <p className="flex items-center gap-3 text-sm text-gray-600"><Check size={14} className="text-green-500" /> Sınırsız Saha Tanımı</p>
                                                            <p className="flex items-center gap-3 text-sm text-gray-600"><Check size={14} className="text-green-500" /> Finansal Detaylar</p>
                                                            <p className="flex items-center gap-3 text-sm text-gray-600"><Check size={14} className="text-green-500" /> Müşteri CRM</p>
                                                        </>
                                                    )}
                                                </div>

                                                <button 
                                                    onClick={() => navigate(`/saha-sahibi/ayarlar?tab=membership&plan=${plan.id}`)}
                                                    className={`w-full py-4 rounded-2xl font-black transition-all transform hover:scale-[1.02] shadow-lg ${
                                                        idx === 1 
                                                            ? 'bg-gray-900 text-white shadow-gray-200' 
                                                            : 'bg-green-600 text-white shadow-green-100 hover:bg-green-700'
                                                    }`}
                                                >
                                                    {idx === 1 ? 'Kurumsal Teklif' : 'Seç & Öde'}
                                                </button>
                                                
                                                {idx === 1 && (
                                                    <span className="absolute top-6 right-6 bg-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">Popüler</span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    /* Fallback static cards if plans haven't loaded yet */
                                    <>
                                        <div className="bg-gray-50 animate-pulse rounded-[2rem] h-80"></div>
                                        <div className="bg-gray-50 animate-pulse rounded-[2rem] h-80"></div>
                                    </>
                                )}
                        </div>

                        <div className="mt-8 flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-100 shadow-sm">
                                <CreditCard className="w-5 h-5 text-gray-400" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-gray-500 leading-tight">
                                    Güvenli ödeme altyapısı ile işlemleriniz korunur. İptal şansı her zaman mevcuttur.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default SahaSahibiLayout;

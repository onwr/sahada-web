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

  // Blocking Logic
  const isPaymentRequired = settings?.membership?.mandatoryPayment;
  
  // Check if user is active (Assuming 'active' status or checking if trial/sub exists)
  // If subscriptionStatus is undefined, we assume they are NOT active if payment is mandatory.
  // We can also add a logic for 'specialRules' exemption here if needed, but for now strict.
  const isUserActive = userData?.subscriptionStatus === 'active'; 

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

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                            {/* Pro Plan */}
                            <div className="relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-emerald-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                                <div className="relative bg-white border border-gray-100 p-6 rounded-3xl h-full flex flex-col shadow-sm hover:shadow-md transition-all">
                                    <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mb-4">
                                        <Zap className="w-5 h-5 text-green-600" />
                                    </div>
                                    <h5 className="font-black text-gray-900 text-lg mb-1">Profesyonel</h5>
                                    <div className="flex items-baseline gap-1 mb-6">
                                        <span className="text-2xl font-black text-gray-900">₺299</span>
                                        <span className="text-gray-400 text-sm font-medium">/ Ay</span>
                                    </div>
                                    <div className="space-y-3 mb-8 text-sm text-gray-600">
                                        <p className="flex items-center gap-2"><Check size={14} className="text-green-500" /> 5 Sahaya Kadar</p>
                                        <p className="flex items-center gap-2"><Check size={14} className="text-green-500" /> Finansal Detaylar</p>
                                        <p className="flex items-center gap-2"><Check size={14} className="text-green-500" /> Müşteri CRM</p>
                                    </div>
                                    <button 
                                        onClick={() => window.location.href = '/saha-sahibi/ayarlar?tab=membership&plan=pro'}
                                        className="mt-auto w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-100"
                                    >
                                        Seç & Öde
                                    </button>
                                </div>
                            </div>

                            {/* Enterprise Plan */}
                            <div className="relative border border-orange-100 bg-orange-50/30 p-6 rounded-3xl flex flex-col group hover:border-orange-200 transition-all">
                                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                                    <Rocket className="w-5 h-5 text-orange-600" />
                                </div>
                                <h5 className="font-black text-gray-900 text-lg mb-1 leading-tight">Sınırsız <br /> Kurumsal</h5>
                                <div className="flex items-baseline gap-1 mb-6">
                                    <span className="text-2xl font-black text-gray-900">₺599</span>
                                    <span className="text-gray-400 text-sm font-medium">/ Ay</span>
                                </div>
                                <div className="space-y-3 mb-8 text-sm text-gray-600">
                                    <p className="flex items-center gap-2"><Check size={14} className="text-orange-500" /> Sınırsız Saha</p>
                                    <p className="flex items-center gap-2"><Check size={14} className="text-orange-500" /> Özel Destek</p>
                                    <p className="flex items-center gap-2"><Check size={14} className="text-orange-500" /> Gelişmiş API</p>
                                </div>
                                <button 
                                    onClick={() => window.location.href = '/saha-sahibi/ayarlar?tab=membership&plan=enterprise'}
                                    className="mt-auto w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all"
                                >
                                    Kurumsal Teklif
                                </button>
                                <span className="absolute top-4 right-4 bg-orange-200 text-orange-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter">Popüler</span>
                            </div>
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

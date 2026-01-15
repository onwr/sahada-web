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
import { Lock, AlertTriangle, ChevronRight, CreditCard } from 'lucide-react';

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
  const allowedPaths = ['/saha-sahibi/ayarlar', '/saha-sahibi/destek', '/saha-sahibi/onboarding'];
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop Blur Layer */}
            <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-md"></div>
            
            {/* Modal Content */}
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center border-t-4 border-red-500 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Lock className="w-10 h-10 text-red-600" />
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Erişim Kısıtlandı</h2>
                <p className="text-gray-600 mb-6">
                    Sistem kullanımı için <strong>aylık ödeme</strong> yapılması gerekmektedir. 
                    Panelinize erişmek için lütfen ödemenizi tamamlayın.
                </p>

                <div className="bg-gray-50 rounded-xl p-4 mb-8 border border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-500 text-sm">Üyelik Durumu</span>
                        <span className="text-red-600 font-bold text-sm flex items-center gap-1">
                            <AlertTriangle size={14} />
                            Pasif
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                         <span className="text-gray-500 text-sm">Gerekli İşlem</span>
                         <span className="text-gray-900 font-bold text-sm">Ödeme Yapılmalı</span>
                    </div>
                </div>

                <div className="space-y-3">
                    <button 
                        onClick={() => window.location.href = '/saha-sahibi/ayarlar?tab=membership'}
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-green-200 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                    >
                        <CreditCard size={20} />
                        Ödeme Yap & Aktifleştir
                    </button>
                    
                    <button 
                        onClick={() => window.location.href = '/saha-sahibi/destek'}
                        className="w-full bg-white hover:bg-gray-50 text-gray-700 py-3.5 rounded-xl font-medium border border-gray-200 transition-colors"
                    >
                        Destek Ekibiyle Görüş
                    </button>
                </div>

                <p className="text-xs text-gray-400 mt-6">
                    Bir hata olduğunu düşünüyorsanız lütfen bizimle iletişime geçin.
                </p>
            </div>
        </div>
      )}
    </div>
  );
};

export default SahaSahibiLayout;

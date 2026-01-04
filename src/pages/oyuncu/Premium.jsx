import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { purchaseMembership, getUserMembership, cancelUserMembership } from '../../services/membershipService';
import { createPaymentForm } from '../../services/paymentApiService';
import OyuncuSidebar from '../../components/OyuncuSidebar';
import { Star, Check, X, AlertCircle, CreditCard, Calendar, Crown } from 'lucide-react';

const Premium = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedPlan = searchParams.get('plan') || 'monthly';
  const [loading, setLoading] = useState(false);
  const [membership, setMembership] = useState(null);
  const [error, setError] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  useEffect(() => {
    loadMembership();
  }, []);

  const loadMembership = async () => {
    if (!user) return;
    try {
      const result = await getUserMembership(user.uid);
      if (result.success) {
        setMembership(result.data);
      }
    } catch (err) {
      console.error('Üyelik bilgisi yükleme hatası:', err);
    }
  };

  const plans = {
    monthly: { price: 99, originalPrice: 149, duration: 'monthly' },
    yearly: { price: 899, originalPrice: 1788, duration: 'yearly', savings: 889 }
  };

  const features = [
    'Performans Analytics',
    'Priority Booking',
    'AI Matching',
    'Scout Mode',
    'Match Highlights',
    'Cashback & Rewards',
    'Pro Network',
    'VIP Events'
  ];

  const handlePurchase = async (duration) => {
    if (!user) {
      navigate('/login');
      return;
    }

    setPaymentProcessing(true);
    setError(null);

    try {
      const plan = plans[duration];
      const paymentData = {
        price: plan.price,
        paidPrice: plan.price,
        basketId: `premium_${Date.now()}`,
        conversationId: `premium_${user.uid}_${Date.now()}`,
        reservationName: `Premium ${duration === 'monthly' ? 'Aylık' : 'Yıllık'} Üyelik`,
        buyerId: user.uid,
        buyerName: user.displayName || 'Kullanıcı',
        buyerSurname: 'Soyad',
        buyerEmail: user.email || '',
        buyerPhone: user.phone || '05321234567',
        buyerAddress: 'Adres',
        buyerCity: 'Istanbul',
        buyerZipCode: '34000',
        buyerIdentityNumber: '00000000000'
      };

      const paymentResult = await createPaymentForm(paymentData);
      
      if (paymentResult.success && paymentResult.data) {
        window.open(paymentResult.data.paymentPageUrl, '_blank', 'width=800,height=600');
        
        const checkInterval = setInterval(async () => {
          try {
            const membershipResult = await getUserMembership(user.uid);
            if (membershipResult.success && membershipResult.data) {
              clearInterval(checkInterval);
              setShowPaymentModal(false);
              setPaymentProcessing(false);
              loadMembership();
            }
          } catch (err) {
            console.error('Ödeme kontrol hatası:', err);
          }
        }, 3000);

        setTimeout(() => {
          clearInterval(checkInterval);
          setPaymentProcessing(false);
        }, 300000);
      } else {
        setError('Ödeme formu oluşturulamadı');
        setPaymentProcessing(false);
      }
    } catch (err) {
      console.error('Ödeme işlemi hatası:', err);
      setError('Ödeme işlemi sırasında hata oluştu');
      setPaymentProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Premium üyeliğinizi iptal etmek istediğinize emin misiniz?')) return;
    
    try {
      const result = await cancelUserMembership(user.uid);
      if (result.success) {
        setMembership(null);
        navigate('/oyuncu/dashboard');
      }
    } catch (err) {
      setError('Üyelik iptal edilirken hata oluştu');
    }
  };

  if (!user) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Lütfen giriş yapın</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <OyuncuSidebar />
      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Premium Üyelik</h1>
        </header>
        <div className="flex-1 p-6 overflow-y-auto">
          {membership && membership.status === 'active' && (
            <div className="mb-6 bg-gradient-to-r from-purple-600 to-purple-800 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Crown className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                    <h3 className="text-xl font-bold">Premium Üyesiniz</h3>
                  </div>
                  <p className="text-purple-100">
                    Üyeliğiniz {membership.endDate ? new Date(membership.endDate).toLocaleDateString('tr-TR') : 'süresiz'} tarihine kadar geçerli
                  </p>
                </div>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                >
                  İptal Et
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {Object.entries(plans).map(([key, plan]) => (
              <div
                key={key}
                className={`bg-white rounded-xl shadow-sm border-2 p-6 ${
                  key === 'yearly' ? 'border-yellow-400' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 capitalize">{key === 'monthly' ? 'Aylık' : 'Yıllık'}</h3>
                    {key === 'yearly' && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                        En Popüler
                      </span>
                    )}
                  </div>
                  <Star className="w-8 h-8 text-purple-600" />
                </div>
                <div className="mb-4">
                  <div className="flex items-baseline space-x-2">
                    <span className="text-4xl font-bold text-gray-900">₺{plan.price}</span>
                    <span className="text-gray-500 line-through">₺{plan.originalPrice}</span>
                  </div>
                  {plan.savings && (
                    <p className="text-sm text-green-600 mt-1">{plan.savings}₺ tasarruf edin!</p>
                  )}
                </div>
                <button
                  onClick={() => handlePurchase(plan.duration)}
                  disabled={paymentProcessing || (membership && membership.status === 'active')}
                  className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {paymentProcessing ? 'İşleniyor...' : membership && membership.status === 'active' ? 'Aktif Üyelik' : 'Satın Al'}
                </button>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Premium Özellikler</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Premium;


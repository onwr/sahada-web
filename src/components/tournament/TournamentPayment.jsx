import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, AlertCircle, X, Loader } from 'lucide-react';
import { createPaymentForm, retrieveCheckoutForm } from '../../services/paymentApiService';
import { processTournamentPayment } from '../../services/firestoreService';
import toast from '../../utils/toast';

const TournamentPayment = ({ 
  tournament, 
  participantId, 
  userId, 
  participantName,
  onPaymentSuccess,
  onCancel 
}) => {
  const [loading, setLoading] = useState(false);
  const [paymentFormContent, setPaymentFormContent] = useState(null);
  const [checkoutToken, setCheckoutToken] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [polling, setPolling] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('pending'); // pending, processing, success, failed

  useEffect(() => {
    if (tournament && tournament.registrationFee > 0) {
      initializePayment();
    }
    return () => {
      if (polling) {
        clearInterval(polling);
      }
    };
  }, [tournament]);

  const initializePayment = async () => {
    try {
      setLoading(true);
      setPaymentStatus('processing');

      const paymentData = {
        price: tournament.registrationFee,
        paidPrice: tournament.registrationFee,
        buyerId: userId,
        buyerName: participantName || 'Oyuncu',
        buyerSurname: '',
        buyerEmail: '', // Email'i userData'dan alabilirsiniz
        buyerPhone: '',
        buyerIdentityNumber: '11111111111', // TC Kimlik numarası
        buyerAddress: '',
        buyerCity: 'Istanbul',
        basketId: `tournament_${tournament.id}_${participantId}`,
        conversationId: `tournament_reg_${tournament.id}_${participantId}_${Date.now()}`,
        reservationId: `tournament_${tournament.id}`,
        reservationName: `${tournament.name} Turnuva Kayıt Ücreti`,
        callbackUrl: `${window.location.origin}/payment-callback?type=tournament&tournamentId=${tournament.id}&participantId=${participantId}`
      };

      const result = await createPaymentForm(paymentData);

      if (result.success && result.data) {
        setPaymentFormContent(result.data.checkoutFormContent);
        setCheckoutToken(result.data.token);
        setConversationId(result.data.conversationId);
        startPolling(result.data.token, result.data.conversationId);
      } else {
        setPaymentStatus('failed');
        toast.error(result.error || 'Ödeme formu oluşturulamadı');
      }
    } catch (error) {
      console.error('Ödeme başlatma hatası:', error);
      setPaymentStatus('failed');
      toast.error('Ödeme başlatılırken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (token, convId) => {
    setPolling(true);
    
    const pollInterval = setInterval(async () => {
      try {
        const result = await retrieveCheckoutForm(token, convId);
        
        if (result.success && result.data) {
          const status = result.data.status;
          
          if (status === 'success') {
            clearInterval(pollInterval);
            setPolling(false);
            await handlePaymentSuccess(result.data);
          } else if (status === 'failure') {
            clearInterval(pollInterval);
            setPolling(false);
            setPaymentStatus('failed');
            toast.error('Ödeme başarısız oldu');
          }
        }
      } catch (error) {
        console.error('Polling hatası:', error);
      }
    }, 3000); // Her 3 saniyede bir kontrol et

    // 5 dakika sonra polling'i durdur
    setTimeout(() => {
      clearInterval(pollInterval);
      setPolling(false);
    }, 300000);
  };

  const handlePaymentSuccess = async (paymentData) => {
    try {
      setPaymentStatus('processing');

      // Turnuva ödeme kaydını güncelle
      const paymentResult = await processTournamentPayment(
        tournament.id,
        participantId,
        {
          paymentId: paymentData.paymentId || checkoutToken,
          paymentMethod: 'card',
          amount: tournament.registrationFee
        }
      );

      if (paymentResult.success) {
        setPaymentStatus('success');
        toast.success('Ödeme başarıyla tamamlandı!');
        
        if (onPaymentSuccess) {
          onPaymentSuccess({
            tournamentId: tournament.id,
            participantId,
            paymentId: paymentData.paymentId || checkoutToken,
            amount: tournament.registrationFee
          });
        }
      } else {
        setPaymentStatus('failed');
        toast.error(paymentResult.error || 'Ödeme kaydı yapılamadı');
      }
    } catch (error) {
      console.error('Ödeme kaydı hatası:', error);
      setPaymentStatus('failed');
      toast.error('Ödeme kaydı yapılırken hata oluştu');
    }
  };

  if (!tournament || tournament.registrationFee <= 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <p className="text-gray-700 font-medium">Bu turnuva ücretsiz</p>
      </div>
    );
  }

  if (paymentStatus === 'success') {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">Ödeme Başarılı!</h3>
        <p className="text-gray-600 mb-4">
          {tournament.name} turnuvasına başarıyla kayıt oldunuz.
        </p>
        <p className="text-sm text-gray-500">
          Ödeneen Tutar: {tournament.registrationFee} ₺
        </p>
      </div>
    );
  }

  if (paymentStatus === 'failed') {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">Ödeme Başarısız</h3>
        <p className="text-gray-600 mb-4">
          Ödeme işlemi tamamlanamadı. Lütfen tekrar deneyin.
        </p>
        <div className="flex justify-center space-x-3">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              İptal
            </button>
          )}
          <button
            onClick={initializePayment}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Turnuva Kayıt Ücreti</h3>
          <p className="text-gray-600 mt-1">{tournament.name}</p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-gray-700 font-medium">Kayıt Ücreti</span>
          <span className="text-2xl font-bold text-gray-900">{tournament.registrationFee} ₺</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <Loader className="w-8 h-8 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Ödeme formu hazırlanıyor...</p>
        </div>
      ) : paymentFormContent ? (
        <div>
          <div className="mb-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
              <CreditCard className="w-4 h-4" />
              <span>Güvenli ödeme formu</span>
            </div>
          </div>

          <div 
            className="border border-gray-200 rounded-lg overflow-hidden"
            dangerouslySetInnerHTML={{ __html: paymentFormContent }}
          />

          {polling && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2 text-sm text-blue-700">
                <Loader className="w-4 h-4 animate-spin" />
                <span>Ödeme kontrol ediliyor...</span>
              </div>
            </div>
          )}

          <div className="mt-4 text-xs text-gray-500 text-center">
            <p>Ödeme işlemi Iyzico güvenli ödeme altyapısı ile gerçekleştirilmektedir.</p>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Ödeme formu yüklenemedi</p>
          <button
            onClick={initializePayment}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Tekrar Dene
          </button>
        </div>
      )}
    </div>
  );
};

export default TournamentPayment;


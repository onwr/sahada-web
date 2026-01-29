import React, { useState, useEffect, useRef } from 'react';
import { CreditCard, CheckCircle, AlertCircle, X, Loader } from 'lucide-react';
import { createPaymentForm, retrieveCheckoutForm } from '../../services/paymentApiService';
import { processTournamentPayment } from '../../services/firestoreService';
import toast from '../../utils/toast';

const TournamentPayment = ({ 
  tournament, 
  participantId, 
  userId, 
  participantName,
  user,
  userData,
  onPaymentSuccess,
  onCancel 
}) => {
  const [loading, setLoading] = useState(false);
  const [iframeUrl, setIframeUrl] = useState('');
  const [checkoutToken, setCheckoutToken] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('pending'); // pending, processing, success, failed

  const pollIntervalRef = useRef(null);
  const pollingTimeoutRef = useRef(null);

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    setIsPolling(false);
  };

  useEffect(() => {
    if (tournament && tournament.registrationFee > 0) {
      initializePayment();
    }
    return () => stopPolling();
  }, [tournament]);

  const initializePayment = async () => {
    try {
      setLoading(true);
      setPaymentStatus('processing');

      // İsim ve soyisimi ayır
      const nameParts = (participantName || 'Oyuncu').split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || 'Sahada';

      const paymentData = {
        price: tournament.registrationFee,
        paidPrice: tournament.registrationFee,
        buyerId: userId,
        buyerName: firstName,
        buyerSurname: lastName,
        buyerEmail: user?.email || userData?.email || 'info@sahada.com',
        buyerPhone: userData?.phone || user?.phoneNumber || '05555555555',
        buyerIdentityNumber: '11111111111', // TC Kimlik numarası
        buyerAddress: 'Istanbul',
        buyerCity: 'Istanbul',
        basketId: `tournament_${tournament.id}_${participantId}`,
        conversationId: `tournament_reg_${tournament.id}_${participantId}_${Date.now()}`,
        reservationId: `tournament_${tournament.id}`,
        reservationName: `${tournament.name} Turnuva Kayıt Ücreti`,
        items: [
          {
            id: `tournament_${tournament.id}`,
            name: `${tournament.name} Kayıt Ücreti`,
            category: 'Tournament',
            price: tournament.registrationFee
          }
        ],
        callbackUrl: `${window.location.origin}/payment-callback?type=tournament&tournamentId=${tournament.id}&participantId=${participantId}`
      };

      const result = await createPaymentForm(paymentData);

      if (result.success && result.data) {
        setIframeUrl(result.data.paymentPageUrl);
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

  // Iframe mesaj dinleyicisi
  useEffect(() => {
    const handleMessage = async (event) => {
      if (event.data?.type === 'payment_callback') {
        const { token, conversationId: convId } = event.data;
        if (token === checkoutToken) {
          stopPolling();
          try {
            const result = await retrieveCheckoutForm(token, convId || conversationId);
            if (result.success && result.data?.status === 'success') {
              handlePaymentSuccess(result.data);
            } else if (result.success && result.data?.status === 'failure') {
              setPaymentStatus('failed');
              toast.error('Ödeme başarısız oldu');
            }
          } catch (error) {
            console.error('Callback handle error:', error);
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [checkoutToken, conversationId]);

  const startPolling = (token, convId) => {
    stopPolling();
    setIsPolling(true);
    
    pollIntervalRef.current = setInterval(async () => {
      try {
        const result = await retrieveCheckoutForm(token, convId);
        
        if (result.success && result.data) {
          const status = result.data.status;
          
          if (status === 'success') {
            stopPolling();
            await handlePaymentSuccess(result.data);
          } else if (status === 'failure') {
            stopPolling();
            setPaymentStatus('failed');
            toast.error('Ödeme başarısız oldu');
          }
        }
      } catch (error) {
        // Polling hatalarını sessizce geç
      }
    }, 4000); 

    // 5 dakika sonra polling'i durdur
    pollingTimeoutRef.current = setTimeout(() => {
      stopPolling();
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
      ) : iframeUrl ? (
        <div>
          <div className="mb-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
              <CreditCard className="w-4 h-4" />
              <span>Güvenli ödeme formu</span>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            <iframe 
              src={iframeUrl}
              className="w-full h-[600px] border-0"
              title="Iyzico Payment Page"
            />
          </div>

          {isPolling && (
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


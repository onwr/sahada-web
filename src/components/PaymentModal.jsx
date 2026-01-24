import React, { useState, useEffect, useRef } from 'react';
import { X, Shield, Lock, CreditCard, ChevronRight, AlertCircle, CheckCircle } from 'lucide-react';
import { createPaymentForm, retrieveCheckoutForm } from '../services/paymentApiService';

const PaymentModal = ({ isOpen, onClose, amount, onSuccess, title, description, user, conversationIdPrefix = 'match_join' }) => {
  const [loading, setLoading] = useState(true);
  const [iframeUrl, setIframeUrl] = useState('');
  const [error, setError] = useState(null);
  const [verifying, setVerifying] = useState(false);
  
  const hasHandledPaymentRef = useRef(false);
  const pollingIntervalRef = useRef(null);
  const pollingTimeoutRef = useRef(null);
  const conversationId = `${conversationIdPrefix}_${Date.now()}_${user?.uid?.substring(0, 5)}`;

  useEffect(() => {
    if (isOpen && user) {
      initiatePayment();
    }
    return () => stopPolling();
  }, [isOpen]);

  const initiatePayment = async () => {
    setLoading(true);
    setError(null);
    hasHandledPaymentRef.current = false;

    try {
      const paymentData = {
        price: amount,
        paidPrice: amount,
        basketId: `B_${Date.now()}`,
        paymentConversationId: conversationId,
        buyer: {
          id: user.uid,
          name: user.displayName?.split(' ')[0] || 'Oyuncu',
          surname: user.displayName?.split(' ').slice(1).join(' ') || 'Sahada',
          email: user.email || 'info@sahada.com',
          identityNumber: '11111111111',
          registrationAddress: 'İstanbul',
          city: 'Istanbul',
          country: 'Turkey',
          phone: user.phoneNumber || '05555555555'
        },
        items: [
          {
            id: 'ITM_01',
            name: title || 'Maç Katılımı',
            category: 'Hizmet',
            price: amount
          }
        ],
        callbackUrl: `${window.location.origin}/payment-callback`
      };

      const result = await createPaymentForm(paymentData);
      
      if (result.success && result.data?.paymentPageUrl) {
        setIframeUrl(result.data.paymentPageUrl);
        // Start polling for status as a backup to PostMessage/Redirect
        startPolling(result.data.token, conversationId);
      } else {
        setError(result.error || 'Ödeme formu oluşturulamadı.');
      }
    } catch (err) {
      console.error('Payment initiation error:', err);
      setError('Ödeme başlatılırken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (token, convId) => {
    stopPolling();
    
    // Polling for 5 minutes max
    pollingTimeoutRef.current = setTimeout(() => stopPolling(), 300000);
    
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const result = await retrieveCheckoutForm(token, convId);
        if (result.success && (result.data?.paymentStatus === 'SUCCESS' || result.data?.status === 'success')) {
          handleSuccess(result.data.paymentId || token);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 4000);
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    if (pollingTimeoutRef.current) clearTimeout(pollingTimeoutRef.current);
  };

  const handleSuccess = (paymentId) => {
    if (hasHandledPaymentRef.current) return;
    hasHandledPaymentRef.current = true;
    stopPolling();
    setVerifying(true);
    
    setTimeout(() => {
      setVerifying(false);
      onSuccess(paymentId);
    }, 1500);
  };

  // Listen for messages from payment callback
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'payment_success' || event.data?.success === true) {
        handleSuccess(event.data.paymentId || 'verified');
      }
      if (event.data?.type === 'payment_error' || event.data?.error) {
        setError(event.data.error || 'Ödeme başarısız oldu.');
        stopPolling();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
              <CreditCard size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{title || 'Güvenli Ödeme'}</h3>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Shield size={12} className="text-green-600" /> Iyzico Güvencesiyle
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-[400px] flex flex-col bg-gray-50 p-4">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-600 font-medium">Ödeme sayfası hazırlanıyor...</p>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4 font-extrabold text-2xl">!</div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">Hata Oluştu</h4>
              <p className="text-gray-600 mb-6">{error}</p>
              <button 
                onClick={initiatePayment}
                className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors"
              >
                Tekrar Dene
              </button>
            </div>
          ) : verifying ? (
             <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 animate-bounce">
                    <CheckCircle size={40} />
                </div>
                <h4 className="text-xl font-bold text-gray-900">Ödeme Onayı</h4>
                <p className="text-gray-600">Ödemeniz başarıyla alındı, yönlendiriliyorsunuz...</p>
             </div>
          ) : (
            <iframe 
              src={iframeUrl}
              className="w-full h-full min-h-[500px] border-0 rounded-2xl bg-white shadow-inner"
              title="Iyzico Payment Page"
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-500">
            <Lock size={14} />
            <span className="text-xs">SSL Şifreli Güvenli Ödeme</span>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Toplam Tutar</p>
            <p className="text-xl font-black text-gray-900">₺{amount}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;

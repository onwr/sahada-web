import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const conversationId = searchParams.get('conversationId');

  useEffect(() => {
    console.group('🔄 Payment Callback Handler');
    console.log('🎫 Token:', token);
    console.log('💬 Conversation ID:', conversationId);
    console.log('📍 Current URL:', window.location.href);
    console.log('🌐 Origin:', window.location.origin);
    console.groupEnd();

    // Parent window'a (iframe içindeki sayfaya) mesaj gönder
    if (window.opener) {
      console.log('📤 Sending message to opener');
      window.opener.postMessage({
        type: 'payment_callback',
        token: token,
        conversationId: conversationId,
        url: window.location.href
      }, '*');
    }

    // Iframe parent'a mesaj gönder
    if (window.parent !== window) {
      console.log('📤 Sending message to parent');
      window.parent.postMessage({
        type: 'payment_callback',
        token: token,
        conversationId: conversationId,
        url: window.location.href
      }, '*');
    }

    // Sayfayı kapat veya yönlendir
    setTimeout(() => {
      if (window.opener) {
        window.close();
      } else {
        // Eğer yeni sekmede açıldıysa, ana sayfaya yönlendir
        window.location.href = '/';
      }
    }, 1000);
  }, [token, conversationId]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Ödeme İşleniyor</h3>
        <p className="text-sm text-gray-600">Lütfen bekleyin...</p>
      </div>
    </div>
  );
};

export default PaymentCallback;


// PHP Payment API Service
const PAYMENT_API_BASE_URL = import.meta.env.DEV ? '/api' : (import.meta.env.VITE_PAYMENT_API_BASE_URL || 'https://odeme.sahaclub.com');

// Helper: JSON'u URL-encoded forma çevir (Artık kullanılmıyor ama helper olarak dursa zarar etmez)
const jsonToUrlEncoded = (obj) => {
  return Object.keys(obj)
    .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(
      typeof obj[key] === 'object' ? JSON.stringify(obj[key]) : obj[key]
    ))
    .join('&');
};

// Payment API Service - Gerçek Iyzico Entegrasyonu

// Iyzico iframe ödeme formu oluştur
export const createPaymentForm = async (paymentData) => {
  const url = `${PAYMENT_API_BASE_URL}/create-payment-form`;
  const startTime = performance.now();
  
  console.group('🌐 Network Request: createPaymentForm');
  console.log('🔗 URL:', url);
  console.log('📦 Request Data:', paymentData);
  console.log('⏰ Start Time:', new Date().toISOString());
  console.log('🌐 Current Origin:', window.location.origin);
  console.log('🔒 Protocol:', window.location.protocol);
  console.log('📡 Network Status:', navigator.onLine ? 'Online' : 'Offline');
  console.log('🔑 API Base URL:', PAYMENT_API_BASE_URL);
  
  try {
    // URL-encoded format kullan (Sunucu JSON kabul etmediği için)
    const formBody = jsonToUrlEncoded(paymentData);
    
    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody
    };
    
    console.log('📤 Fetch Options:', {
      method: fetchOptions.method,
      headers: fetchOptions.headers,
      bodySize: formBody.length + ' bytes',
      contentType: 'application/x-www-form-urlencoded'
    });
    
    const response = await fetch(url, fetchOptions);
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log('📥 Response Received');
    console.log('⏱️ Duration:', duration.toFixed(2) + 'ms');
    console.log('📊 Status:', response.status, response.statusText);
    
    // Headers'ı logla
    const headers = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    console.log('📋 Headers:', headers);
    console.log('🔗 Response URL:', response.url);
    console.log('🔄 Redirected:', response.redirected);
    console.log('✅ OK:', response.ok);

    if (!response.ok) {
      console.error('❌ Response Error');
      const errorText = await response.text();
      console.error('📄 Error Body:', errorText);
      console.groupEnd();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText.substring(0, 100)}`);
    }

    const result = await response.json();
    console.log('📦 Response Data:', result);
    console.groupEnd();
    return result;
  } catch (error) {
    console.error('🚨 Fetch Error');
    console.error('❌ Error Type:', error.name);
    console.error('❌ Error Name:', error.name);
    console.error('❌ Error Message:', error.message);
    console.error('📚 Error Stack:', error.stack);
    console.log('⏱️ Duration before error:', (performance.now() - startTime).toFixed(2) + 'ms');
    console.log('🔗 Failed URL:', url);
    console.log('🌐 Network Info:', {
      online: navigator.onLine,
      connection: navigator.connection || 'N/A'
    });
    
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      console.error('🚫 Network Error Detected');
      console.error('💡 Possible causes:');
      console.error('   - Network connectivity issue');
      console.error('   - Server not responding');
    }
    
    console.groupEnd();
    
    return {
      success: false,
      error: error.message,
      errorType: error.name
    };
  }
};

// Direkt ödeme işlemi
export const processPayment = async (paymentData) => {
  try {
    const formBody = jsonToUrlEncoded(paymentData);
    
    const response = await fetch(`${PAYMENT_API_BASE_URL}/process-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Ödeme işlemi hatası:', error);
    return { success: false, error: error.message };
  }
};

// Ödeme durumu kontrol et
export const checkPaymentStatus = async (paymentId) => {
  try {
    const response = await fetch(`${PAYMENT_API_BASE_URL}/check-payment?paymentId=${paymentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Durum kontrol hatası:', error);
    return { success: false, error: error.message };
  }
};

// İade işlemi
export const refundPayment = async (paymentId, refundAmount, refundReason) => {
  try {
    const formBody = jsonToUrlEncoded({
      paymentId: paymentId,
      refundAmount: refundAmount,
      refundReason: refundReason
    });

    const response = await fetch(`${PAYMENT_API_BASE_URL}/refund-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('İade işlemi hatası:', error);
    return { success: false, error: error.message };
  }
};

// Ödeme formu URL'si oluştur (iframe için)
export const getPaymentFormUrl = (paymentId) => {
  return `${PAYMENT_API_BASE_URL}/payment-form?paymentId=${paymentId}`;
};

// Iyzico Callback için checkout form detaylarını al
export const retrieveCheckoutForm = async (token, conversationId = '') => {
  const url = `${PAYMENT_API_BASE_URL}/retrieve-checkout-form`;
  const startTime = performance.now();
  
  console.group('🌐 Network Request: retrieveCheckoutForm');
  console.log('🔗 URL:', url);
  console.log('📦 Token:', token);
  console.log('📦 ConversationId:', conversationId);
  console.log('⏰ Start Time:', new Date().toISOString());
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        token: token,
        conversationId: conversationId
      })
    });
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log('📥 Response Received');
    console.log('⏱️ Duration:', duration.toFixed(2) + 'ms');
    console.log('📊 Status:', response.status);
    
    if (!response.ok) {
       console.error('❌ Response Error');
       const errorText = await response.text();
       console.error('📄 Error Body:', errorText);
       console.groupEnd();
       throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('📦 Response Data:', result);
    console.groupEnd();
    return result;
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.error('🚨 Retrieve Checkout Form Error');
    console.error('❌ Error Type:', error.name);
    console.error('❌ Error Message:', error.message);
    console.error('⏱️ Duration before error:', duration.toFixed(2) + 'ms');
    console.groupEnd();
    
    return {
      success: false,
      error: error.message || 'Checkout form durumu kontrol edilemedi',
      errorType: error.name
    };
  }
};
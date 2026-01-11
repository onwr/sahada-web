import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Phone, 
  Lock, 
  User, 

  Check,
  Facebook
} from 'lucide-react';
import { 
  registerUser, 
  loginUser, 
  loginWithGoogle, 
  loginWithFacebook,
  resetPassword 
} from '../../services/authService';
import { getAuthPageContent } from '../../services/firestoreService';
import { useAuth } from '../../contexts/AuthContext';

const LoginRegisterForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, userData, setUserData, setNeedsOnboarding } = useAuth();
  const [activeTab, setActiveTab] = useState('login');
  const [userType, setUserType] = useState('player');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    terms: false,
    campaigns: false
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  
  const [pageContent, setPageContent] = useState({
    title: 'Sahada Buluşalım!',
    description: "Türkiye'nin en büyük spor platformuna katıl, takımını kur, sahada yerini al!",
    features: [
      '15.000+ aktif saha',
      '100.000+ sporcu', 
      'Anında oyuncu bulma',
      'Güvenli ödeme sistemi'
    ]
  });

  useEffect(() => {
    const fetchContent = async () => {
      const result = await getAuthPageContent('player');
      if (result.success && result.data) {
        setPageContent(prev => ({ ...prev, ...result.data }));
      }
    };
    fetchContent();
  }, []); // Run only on mount.  Note: imports like useEffect need to be present at top of file. `import React, { useState }` is there but useEffect is missing. I will fix that too.

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Hata mesajını temizle
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (activeTab === 'login') {
      if (!formData.email.trim()) {
        newErrors.email = 'Email veya telefon gereklidir';
      } else if (!/\S+@\S+\.\S+/.test(formData.email) && !/^[0-9+\-\s()]+$/.test(formData.email)) {
        newErrors.email = 'Geçerli bir email veya telefon numarası girin';
      }

      if (!formData.password.trim()) {
        newErrors.password = 'Şifre gereklidir';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Şifre en az 6 karakter olmalıdır';
      }
    } else {
      if (!formData.fullName.trim()) {
        newErrors.fullName = 'Ad soyad gereklidir';
      } else if (formData.fullName.trim().split(' ').length < 2) {
        newErrors.fullName = 'Ad ve soyadınızı girin';
      }

      if (!formData.email.trim()) {
        newErrors.email = 'Email gereklidir';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Geçerli bir email adresi girin';
      }

      if (!formData.phone.trim()) {
        newErrors.phone = userType === 'player' ? 'Oyuncu kaydı için telefon numarası zorunludur' : 'Telefon numarası gereklidir';
      } else if (!/^[0-9+\-\s()]+$/.test(formData.phone)) {
        newErrors.phone = 'Geçerli bir telefon numarası girin';
      }

      if (!formData.password.trim()) {
        newErrors.password = 'Şifre gereklidir';
      } else if (formData.password.length < 8) {
        newErrors.password = 'Şifre en az 8 karakter olmalıdır';
      }

      if (!formData.terms) {
        newErrors.terms = 'Kullanım koşullarını kabul etmelisiniz';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});
    
    try {
      let result;
      
      if (activeTab === 'login') {
        result = await loginUser(formData.email, formData.password);
      } else {
        result = await registerUser({
          ...formData,
          userType,
          onboardingCompleted: false
        });
      }
      
      if (result.success) {
        // Başarılı giriş/kayıt sonrası yönlendirme
        // userType kontrolü: result.user.userType varsa onu kullan, yoksa state'teki userType'ı kullan
        const finalUserType = result.user?.userType || (activeTab === 'register' ? userType : 'player');
        
        // Kayıt sonrası context'i güncelle (userData henüz yüklenmemiş olabilir)
        if (activeTab === 'register' && result.user) {
          setUserData({
            uid: result.user.uid,
            email: result.user.email,
            userType: finalUserType,
            onboardingCompleted: false
          });
          if (setNeedsOnboarding) {
            setNeedsOnboarding(true);
          }
          
          // Context güncellendikten sonra kısa bir gecikme ile yönlendir
          setTimeout(() => {
            if (location.state?.from) {
              navigate(location.state.from, { replace: true });
            } else if (finalUserType === 'player') {
              navigate('/oyuncu/onboarding', { replace: true });
            } else if (finalUserType === 'owner') {
              navigate('/saha-sahibi/onboarding', { replace: true });
            } else {
              navigate('/oyuncu/onboarding', { replace: true });
            }
          }, 100);
        } else {
          // Giriş durumunda hemen yönlendir
            if (location.state?.from) {
              navigate(location.state.from, { replace: true });
            } else if (finalUserType === 'player') {
              navigate('/oyuncu/onboarding', { replace: true });
            } else if (finalUserType === 'owner') {
              navigate('/saha-sahibi/onboarding', { replace: true });
            } else {
              navigate('/oyuncu/onboarding', { replace: true });
            }
        }
      } else {
        setErrors({ submit: result.error });
      }
      
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors({ submit: 'Bir hata oluştu. Lütfen tekrar deneyin.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    setIsLoading(true);
    setErrors({});
    
    try {
      let result;
      
      if (provider === 'google') {
        result = await loginWithGoogle(userType);
      } else if (provider === 'facebook') {
        result = await loginWithFacebook(userType);
      }
      
      if (result.success) {
        // Başarılı giriş sonrası yönlendirme
        // userType kontrolü: result.user.userType varsa onu kullan, yoksa state'teki userType'ı kullan
        const finalUserType = result.user?.userType || userType;
        
        console.log('Sosyal medya yönlendirme kontrolü:', {
          resultUserType: result.user?.userType,
          stateUserType: userType,
          finalUserType
        });
        
        if (location.state?.from) {
          navigate(location.state.from, { replace: true });
        } else if (finalUserType === 'player') {
          navigate('/oyuncu/onboarding');
        } else if (finalUserType === 'owner') {
          navigate('/saha-sahibi/onboarding');
        } else {
          // Varsayılan olarak player'a yönlendir
          navigate('/oyuncu/onboarding');
        }
      } else {
        setErrors({ submit: result.error });
      }
      
    } catch (error) {
      console.error('Social login error:', error);
      setErrors({ submit: 'Sosyal medya girişinde hata oluştu.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!formData.email.trim()) {
      setErrors({ email: 'Şifre sıfırlama için email adresinizi girin' });
      return;
    }

    setIsLoading(true);
    setErrors({});
    
    try {
      const result = await resetPassword(formData.email);
      
      if (result.success) {
        setErrors({ submit: result.message });
        setShowResetPassword(false);
      } else {
        setErrors({ submit: result.error });
      }
      
    } catch (error) {
      console.error('Password reset error:', error);
      setErrors({ submit: 'Şifre sıfırlama hatası oluştu.' });
    } finally {
      setIsLoading(false);
    }
  };

  const socialLoginButtons = [
    { name: 'Google', icon: 'G', color: 'bg-white text-gray-700 border-gray-300', provider: 'google' },
    { name: 'Facebook', icon: Facebook, color: 'bg-[#1877F2] text-white border-transparent', provider: 'facebook' }
  ];

  const features = pageContent.features;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-2 sm:p-4">
      {/* Şifre Sıfırlama Modal */}
      <AnimatePresence>
        {showResetPassword && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowResetPassword(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Şifre Sıfırlama
              </h3>
              <p className="text-gray-600 mb-4">
                E-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim.
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-posta Adresi
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  name="email"
                  placeholder="ornek@email.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
              </div>
              
              {errors.submit && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-sm mb-4 ${
                    errors.submit.includes('gönderildi') ? 'text-green-600' : 'text-red-500'
                  }`}
                >
                  {errors.submit}
                </motion.p>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetPassword(false)}
                  className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  onClick={handlePasswordReset}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {isLoading ? 'Gönderiliyor...' : 'Gönder'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-6xl bg-white rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[500px] sm:min-h-[600px]">
          {/* Sol Kolon - Form */}
          <div className="p-4 sm:p-6 lg:p-8 xl:p-12">
            {/* Tab Navigation */}
            <div className="flex mb-6 sm:mb-8">
              <button
                onClick={() => setActiveTab('login')}
                className={`flex-1 py-2 sm:py-3 text-base sm:text-lg font-semibold transition-colors duration-200 ${
                  activeTab === 'login'
                    ? 'text-black border-b-2 border-green-500'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                Giriş Yap
              </button>
              <button
                onClick={() => setActiveTab('register')}
                className={`flex-1 py-2 sm:py-3 text-base sm:text-lg font-semibold transition-colors duration-200 ${
                  activeTab === 'register'
                    ? 'text-black border-b-2 border-green-500'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                Üye Ol
              </button>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'login' ? (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Sosyal Medya Girişi */}
                  <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                    {socialLoginButtons.map((social, index) => (
                      <motion.button
                        key={social.name}
                        type="button"
                        onClick={() => handleSocialLogin(social.provider)}
                        disabled={isLoading}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={!isLoading ? { scale: 1.02 } : {}}
                        whileTap={!isLoading ? { scale: 0.98 } : {}}
                        className={`w-full flex items-center justify-center gap-2 sm:gap-3 py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md text-sm sm:text-base ${social.color} ${
                          isLoading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {typeof social.icon === 'string' ? (
                          <span className="text-lg font-bold">{social.icon}</span>
                        ) : (
                          <social.icon size={20} />
                        )}
                        <span className="font-medium">
                          {social.name} ile Giriş Yap
                        </span>
                      </motion.button>
                    ))}
                  </div>

                  {/* Ayırıcı */}
                  <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">veya</span>
                    </div>
                  </div>

                  {/* Login Form */}
                  <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email veya Telefon
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                          type="text"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="ornek@email.com veya 5XX XXX XX XX"
                          className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 ${
                            errors.email ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      {errors.email && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-500 text-sm mt-1"
                        >
                          {errors.email}
                        </motion.p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Şifre
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          placeholder="Şifrenizi girin"
                          className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 ${
                            errors.password ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                      {errors.password && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-500 text-sm mt-1"
                        >
                          {errors.password}
                        </motion.p>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="remember"
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                        <span className="ml-2 text-sm text-gray-600">Beni hatırla</span>
                      </label>
                      <button 
                        type="button"
                        onClick={() => setShowResetPassword(true)}
                        className="text-sm text-green-600 hover:text-green-700 font-medium"
                      >
                        Şifremi Unuttum
                      </button>
                    </div>

                    {errors.submit && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-500 text-sm text-center"
                      >
                        {errors.submit}
                      </motion.p>
                    )}
                    
                    <motion.button
                      whileHover={!isLoading ? { scale: 1.02 } : {}}
                      whileTap={!isLoading ? { scale: 0.98 } : {}}
                      type="submit"
                      disabled={isLoading}
                      className={`w-full font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg ${
                        isLoading
                          ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                          : 'bg-orange-500 text-white hover:bg-orange-600'
                      }`}
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Giriş yapılıyor...
                        </div>
                      ) : (
                        'Giriş Yap'
                      )}
                    </motion.button>
                  </form>
                </motion.div>
              ) : (
                  <motion.div
                    key="register"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="mb-6 flex justify-center">
                      <button
                        type="button"
                        onClick={() => navigate('/saha-sahibi-login')}
                        className="text-sm text-green-600 font-medium hover:underline flex items-center gap-1"
                      >
                         Saha sahibi misiniz? Buradan kayıt olun/giriş yapın
                      </button>
                    </div>

                    {/* Sosyal Medya Kayıt */}
                  <div className="space-y-3 mb-6">
                    {socialLoginButtons.map((social, index) => (
                      <motion.button
                        key={social.name}
                        type="button"
                        onClick={() => handleSocialLogin(social.provider)}
                        disabled={isLoading}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={!isLoading ? { scale: 1.02 } : {}}
                        whileTap={!isLoading ? { scale: 0.98 } : {}}
                        className={`w-full flex items-center justify-center gap-2 sm:gap-3 py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md text-sm sm:text-base ${social.color} ${
                          isLoading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {typeof social.icon === 'string' ? (
                          <span className="text-lg font-bold">{social.icon}</span>
                        ) : (
                          <social.icon size={20} />
                        )}
                        <span className="font-medium">
                          {social.name} ile Kayıt Ol
                        </span>
                      </motion.button>
                    ))}
                  </div>

                  {/* Ayırıcı */}
                  <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">veya</span>
                    </div>
                  </div>

                  {/* Register Form */}
                  <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ad Soyad *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                          type="text"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleInputChange}
                          placeholder="Adınız Soyadınız"
                          className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 ${
                            errors.fullName ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      {errors.fullName && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-500 text-sm mt-1"
                        >
                          {errors.fullName}
                        </motion.p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="ornek@email.com"
                          className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 ${
                            errors.email ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      {errors.email && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-500 text-sm mt-1"
                        >
                          {errors.email}
                        </motion.p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Telefon *
                      </label>
                      <div className="flex gap-2">
                        <select className="w-24 px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent">
                          <option>TR +90</option>
                        </select>
                        <div className="relative flex-1">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                          <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            placeholder="5XX XXX XX XX"
                            className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 ${
                              errors.phone ? 'border-red-500' : 'border-gray-300'
                            }`}
                          />
                        </div>
                      </div>
                      {errors.phone && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-500 text-sm mt-1"
                        >
                          {errors.phone}
                        </motion.p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Şifre *
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          placeholder="En az 8 karakter"
                          className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 ${
                            errors.password ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                      {errors.password && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-500 text-sm mt-1"
                        >
                          {errors.password}
                        </motion.p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            name="terms"
                            checked={formData.terms}
                            onChange={handleInputChange}
                            className={`w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 mt-1 ${
                              errors.terms ? 'border-red-500' : ''
                            }`}
                          />
                          <span className="text-sm text-gray-600">
                            <span className="text-green-600 hover:underline cursor-pointer">Kullanım Koşulları</span> ve{' '}
                            <span className="text-green-600 hover:underline cursor-pointer">Gizlilik Politikası</span>'nı kabul ediyorum.
                          </span>
                        </label>
                        {errors.terms && (
                          <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-red-500 text-sm mt-1 ml-7"
                          >
                            {errors.terms}
                          </motion.p>
                        )}
                      </div>
                      
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          name="campaigns"
                          checked={formData.campaigns}
                          onChange={handleInputChange}
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 mt-1"
                        />
                        <span className="text-sm text-gray-600">
                          Kampanyalar hakkında bilgi almak istiyorum.
                        </span>
                      </label>
                    </div>

                    {errors.submit && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-500 text-sm text-center"
                      >
                        {errors.submit}
                      </motion.p>
                    )}
                    
                    <motion.button
                      whileHover={!isLoading ? { scale: 1.02 } : {}}
                      whileTap={!isLoading ? { scale: 0.98 } : {}}
                      type="submit"
                      disabled={isLoading}
                      className={`w-full font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg ${
                        isLoading
                          ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                          : 'bg-orange-500 text-white hover:bg-orange-600'
                      }`}
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Kayıt oluşturuluyor...
                        </div>
                      ) : (
                        'Üye Ol'
                      )}
                    </motion.button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sağ Kolon - Promosyon */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 sm:p-8 lg:p-12 flex flex-col justify-center text-white relative overflow-hidden">
            {/* Dekoratif Elementler */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>
            
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative z-10"
            >
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
                {pageContent.title}
              </h2>
              <p className="text-base sm:text-lg lg:text-xl mb-6 sm:mb-8 text-green-100">
                {pageContent.description}
              </p>
              
              <div className="space-y-3 sm:space-y-4">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                    className="flex items-center gap-2 sm:gap-3"
                  >
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                      <Check size={16} />
                    </div>
                    <span className="text-white font-medium">{feature}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginRegisterForm;

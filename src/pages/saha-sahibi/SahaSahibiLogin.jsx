import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Phone, 
  Lock as LockIcon, 
  User,
  ArrowRight,
  CheckCircle2,
  Building2,
  TrendingUp,
  Users,
  Facebook
} from 'lucide-react';
import { 
  registerUser, 
  loginUser, 
  loginWithGoogle,
  loginWithFacebook,
  resetPassword 
} from '../../services/authService';
import { getAuthPageContent, checkUserExists } from '../../services/firestoreService';
import { useAuth } from '../../contexts/AuthContext';

const SahaSahibiLogin = () => {
  const navigate = useNavigate();
  const { setUserData, setNeedsOnboarding } = useAuth();
  const [activeTab, setActiveTab] = useState('login');
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
    prefixTitle: 'Saha Sahibi Paneli',
    title: 'İşletmenizi',
    highlightedTitle: 'Dijitale Taşıyın',
    description: 'Tesisinizi binlerce sporcuyla buluşturun, rezervasyonları otomatikleştirin ve gelirinizi artırın.',
    features: [
      { title: 'Tesis Yönetimi', desc: 'Sahalarınızı kolayca yönetin, özelliklerini güncelleyin.' },
      { title: 'Müşteri Ağı', desc: 'Binlerce sporcuya doğrudan ulaşın ve doluluk oranınızı artırın.' },
      { title: 'Gelir Takibi', desc: 'Detaylı finansal raporlarla gelirinizi anlık takip edin.' }
    ]
  });

  useEffect(() => {
    const fetchContent = async () => {
      const result = await getAuthPageContent('owner');
      if (result.success && result.data) {
        setPageContent(prev => ({ ...prev, ...result.data }));
      }
    };
    fetchContent();
  }, []);

  const features = pageContent.features;

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (activeTab === 'login') {
      if (!formData.email.trim()) {
        newErrors.email = 'Email veya telefon gereklidir';
      }
      if (!formData.password.trim()) {
        newErrors.password = 'Şifre gereklidir';
      }
    } else {
      if (!formData.fullName.trim()) newErrors.fullName = 'Ad soyad gereklidir';
      if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Geçerli bir email adresi girin';
      }
      if (!formData.phone.trim()) {
        newErrors.phone = 'Telefon numarası gereklidir';
      }
      if (!formData.password || formData.password.length < 6) {
        newErrors.password = 'Şifre en az 6 karakter olmalıdır';
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
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});
    
    try {
      let result;
      if (activeTab === 'login') {
        result = await loginUser(formData.email, formData.password);
      } else {
        // Kayıt öncesi duplicate kontrolü
        const duplicateCheck = await checkUserExists(formData.email, formData.phone);
        if (duplicateCheck.success && duplicateCheck.exists) {
          const newErrors = {};
          duplicateCheck.errors.forEach(err => {
             if(err.type === 'email') newErrors.email = err.message;
             if(err.type === 'phone') newErrors.phone = err.message;
          });
          setErrors(newErrors);
          setIsLoading(false);
          return;
        }

        result = await registerUser({
          ...formData,
          userType: 'owner', // Explicitly set as owner
          onboardingCompleted: false
        });
      }
      
      if (result.success) {
        const userType = result.user?.userType || 'owner';
        
        if (activeTab === 'register' && result.user) {
          setUserData({
            uid: result.user.uid,
            email: result.user.email,
            userType: 'owner',
            onboardingCompleted: false
          });
          if (setNeedsOnboarding) setNeedsOnboarding(true);
        }
        
        // Context'i güncelle
        const nextPath = userType === 'owner' ? '/saha-sahibi/dashboard' : '/oyuncu/dashboard';
        
        // Timeout olmadan direkt yönlendirme yapma, PublicRoute bunu halletmeli
        // Ama eğer PublicRoute hemen devreye girmezse diye manuel yönlendirme ekle
        // Fakat userData'nın oturduğundan emin ol
        setTimeout(() => {
             navigate(nextPath, { replace: true });
        }, 500);
      } else {
        setErrors({ submit: result.error });
      }
    } catch (error) {
      console.error('Auth error:', error);
      setErrors({ submit: 'Bir hata oluştu.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!formData.email.trim()) {
      setErrors({ email: 'Email adresinizi girin' });
      return;
    }
    setIsLoading(true);
    try {
      const result = await resetPassword(formData.email);
      if (result.success) {
        setErrors({ submit: result.message });
        setShowResetPassword(false);
      } else {
        setErrors({ submit: result.error });
      }
    } catch (error) {
      setErrors({ submit: 'Hata oluştu' });
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
        result = await loginWithGoogle('owner'); // Force 'owner' type
      } else if (provider === 'facebook') {
        result = await loginWithFacebook('owner');
      }
      
      if (result.success) {
        // Double check user type, though we forced it for new users
        const userType = result.user?.userType || 'owner';
        
        if (userType === 'owner') {
           navigate('/saha-sahibi/onboarding', { replace: true });
        } else {
           // If an existing player logs in, redirect them away
           navigate('/oyuncu/onboarding', { replace: true });
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

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* ... Left Side remains same ... */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-green-900 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20 mix-blend-overlay"
          style={{ backgroundImage: `url('${pageContent.backgroundImage || "https://images.unsplash.com/photo-1522778119026-d647f0565c6d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"}')` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-br from-green-900/90 to-green-800/90"></div>
        
        <div className="relative z-10 flex flex-col justify-center px-16 text-white h-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20">
                <Building2 size={32} className="text-green-400" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">{pageContent.prefixTitle}</h1>
            </div>

            <h2 className="text-5xl font-bold mb-6 leading-tight">
              {pageContent.title}<br />
              <span className="text-green-400">{pageContent.highlightedTitle}</span>
            </h2>
            
            <p className="text-lg text-gray-300 mb-12 max-w-md leading-relaxed">
              {pageContent.description}
            </p>

            <div className="space-y-8">
              {features.map((feature, index) => {
                const Icon = [Building2, Users, TrendingUp][index % 3];
                return (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + (index * 0.1) }}
                    className="flex gap-4 items-start"
                  >
                    <div className="p-2 bg-green-800/50 rounded-lg">
                      <Icon className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{feature.title}</h3>
                      <p className="text-gray-400 text-sm">{feature.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Form Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-gray-900">
              {activeTab === 'login' ? 'Hoş Geldiniz' : 'Hemen Başlayın'}
            </h2>
            <p className="mt-2 text-gray-600">
              {activeTab === 'login' 
                ? 'Hesabınıza giriş yaparak tesisinizi yönetmeye devam edin.' 
                : 'Ücretsiz hesap oluşturun ve tesisinizi ekleyin.'}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl mb-8">
              <button
                onClick={() => setActiveTab('login')}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeTab === 'login'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Giriş Yap
              </button>
              <button
                onClick={() => setActiveTab('register')}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeTab === 'register'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Kayıt Ol
              </button>
            </div>

            {/* Social Login */}
            <div className="mb-6 space-y-3">
              <button
                type="button"
                onClick={() => handleSocialLogin('google')}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
              >
                <span className="text-lg font-bold text-gray-800">G</span>
                <span className="font-medium text-gray-700">Google ile {activeTab === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSocialLogin('facebook')}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-blue-600 bg-[#1877F2] hover:bg-[#166fe5] transition-all duration-200"
              >
                <Facebook className="text-white" size={20} />
                <span className="font-medium text-white">Facebook ile {activeTab === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}</span>
              </button>
              
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">veya e-posta ile</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {activeTab === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ad Soyad</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      name="fullName"
                      type="text"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      placeholder="Adınız Soyadınız"
                    />
                  </div>
                  {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName}</p>}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">E-posta Adresi</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    name="email"
                    type="text"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    placeholder="ornek@sirket.com"
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
              </div>

              {activeTab === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      placeholder="5XX XXX XX XX"
                    />
                  </div>
                  {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Şifre</label>
                  {activeTab === 'login' && (
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(true)}
                      className="text-xs font-medium text-green-600 hover:text-green-700"
                    >
                      Şifremi unuttum?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
              </div>

              {activeTab === 'register' && (
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    name="terms"
                    checked={formData.terms}
                    onChange={handleInputChange}
                    className="mt-1 w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-500">
                    <span className="text-green-600 cursor-pointer hover:underline">Hizmet Şartları</span> ve <span className="text-green-600 cursor-pointer hover:underline">Gizlilik Politikasını</span> kabul ediyorum.
                  </span>
                </div>
              )}

              {errors.submit && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                  <div className="w-1 h-4 bg-red-500 rounded-full"></div>
                  {errors.submit}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl shadow-lg shadow-green-200 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>{activeTab === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'}</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
               Oyuncu musunuz?{' '}
                <button 
                  onClick={() => navigate('/login')}
                  className="text-green-600 font-medium hover:underline"
                >
                  Oyuncu Girişi
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Password Reset Modal */}
      <AnimatePresence>
        {showResetPassword && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2">Şifrenizi Sıfırlayın</h3>
              <p className="text-gray-500 text-sm mb-6">Email adresinizi girin, size şifre sıfırlama bağlantısı gönderelim.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    name="email"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-green-500"
                    placeholder="ornek@email.com"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowResetPassword(false)}
                    className="flex-1 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
                  >
                    Vazgeç
                  </button>
                  <button
                    onClick={handlePasswordReset}
                    className="flex-1 py-3 text-white bg-green-600 hover:bg-green-700 rounded-xl font-medium transition-colors"
                  >
                    Gönder
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SahaSahibiLogin;

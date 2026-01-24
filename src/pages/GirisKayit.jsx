import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, User, Mail, Lock, Phone, MapPin, Building, UserCheck } from 'lucide-react';
import { registerUser, loginUser } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import toast from '../utils/toast';

const GirisKayit = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUserData, setNeedsOnboarding } = useAuth();
  const [activeTab, setActiveTab] = useState('giris');
  const [userType, setUserType] = useState('player'); // 'player' veya 'owner'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    location: '',
    companyName: ''
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Hata mesajını temizle
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: ''
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (activeTab === 'kayit') {
      if (!formData.firstName.trim()) {
        newErrors.firstName = 'Ad gereklidir';
      }
      if (!formData.lastName.trim()) {
        newErrors.lastName = 'Soyad gereklidir';
      }
      if (!formData.phone.trim()) {
        newErrors.phone = 'Telefon gereklidir';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Şifreler eşleşmiyor';
      }
      if (formData.password.length < 6) {
        newErrors.password = 'Şifre en az 6 karakter olmalıdır';
      }
      if (userType === 'owner' && !formData.companyName.trim()) {
        newErrors.companyName = 'Tesis/Şirket adı gereklidir';
      }
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-posta gereklidir';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Geçerli bir e-posta adresi girin';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Şifre gereklidir';
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
      
      if (activeTab === 'giris') {
        result = await loginUser(formData.email, formData.password);
      } else {
        // Kayıt işlemi
        const fullName = `${formData.firstName} ${formData.lastName}`.trim();
        result = await registerUser({
          email: formData.email,
          password: formData.password,
          fullName,
          phone: formData.phone,
          userType: userType, // 'player' veya 'owner'
          onboardingCompleted: false
        });
      }
      
      if (result.success) {
        // Başarılı giriş/kayıt sonrası yönlendirme
        const user = result.user;
        const finalUserType = user?.userType || (activeTab === 'kayit' ? userType : 'player');
        const onboardingCompleted = user?.onboardingCompleted || false;
        
        // Kayıt sonrası context'i güncelle
        if (activeTab === 'kayit' && user) {
          setUserData({
            uid: user.uid,
            email: user.email,
            userType: finalUserType,
            onboardingCompleted: false
          });
          if (setNeedsOnboarding) {
            setNeedsOnboarding(true);
          }
        }
        
        // Redirect logic
        const locationState = window.history.state?.usr; // state passed via navigate (sometimes available this way in react-router v6+)
        // Better way: use useLocation in the component
        
        if (!onboardingCompleted) {
          const onboardingPath = finalUserType === 'owner' ? '/saha-sahibi/onboarding' : '/oyuncu/onboarding';
          navigate(onboardingPath, { replace: true });
        } else {
          // Check for redirect from state
          const from = location.state?.from || (finalUserType === 'owner' ? '/saha-sahibi/dashboard' : '/oyuncu/dashboard');
          navigate(from, { replace: true });
        }
      } else {
        setErrors({ submit: result.error || 'Bir hata oluştu' });
        toast.error(result.error || 'Bir hata oluştu');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors({ submit: 'Bir hata oluştu. Lütfen tekrar deneyin.' });
      toast.error('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
        {/* Sol Taraf - Resim ve Logo */}
        <div className="hidden lg:flex lg:w-7/12 xl:w-8/12 relative overflow-hidden">
          <div 
            className="w-full h-full bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: 'url(/images/login-background.jpg)' }}
          >
            <div className="absolute inset-0 bg-black/20"></div>

          </div>
        </div>

        {/* Sağ Taraf - Form */}
        <div className="w-full lg:w-5/12 xl:w-4/12 flex items-center justify-center p-4 sm:p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="w-full max-w-md"
          >
            {/* Logo - Mobil için */}
            <div className=" text-center mb-8">
              <img 
                src="/images/logo.png" 
                alt="Sahada Logo" 
                className=" mx-auto mb-4"
              />
            </div>

            {/* Tab Buttons */}
            <div className="flex bg-gray-100 rounded-lg p-1 mb-8">
              <button
                onClick={() => setActiveTab('giris')}
                className={`flex-1 py-3 px-4 rounded-md text-sm font-semibold transition-all duration-200 ${
                  activeTab === 'giris'
                    ? 'bg-white text-green-600 shadow-sm'
                    : 'text-gray-600 hover:text-green-600'
                }`}
              >
                Giriş Yap
              </button>
              <button
                onClick={() => setActiveTab('kayit')}
                className={`flex-1 py-3 px-4 rounded-md text-sm font-semibold transition-all duration-200 ${
                  activeTab === 'kayit'
                    ? 'bg-white text-green-600 shadow-sm'
                    : 'text-gray-600 hover:text-green-600'
                }`}
              >
                Kayıt Ol
              </button>
            </div>

            {/* User Type Selection - Sadece kayıt için */}
            {activeTab === 'kayit' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.3 }}
                className="mb-6"
              >
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Kimlik Seçin
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setUserType('player')}
                    className={`p-4 border-2 rounded-lg text-center transition-all duration-200 ${
                      userType === 'player'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <UserCheck className="w-6 h-6 mx-auto mb-2" />
                    <span className="text-sm font-medium">Oyuncuyum</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserType('owner')}
                    className={`p-4 border-2 rounded-lg text-center transition-all duration-200 ${
                      userType === 'owner'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Building className="w-6 h-6 mx-auto mb-2" />
                    <span className="text-sm font-medium">Saha Sahibiyim</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Ad Soyad - Sadece kayıt için */}
              {activeTab === 'kayit' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ad
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Adınız"
                      required
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-red-500">{errors.firstName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Soyad
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                        errors.lastName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Soyadınız"
                      required
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-red-500">{errors.lastName}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-posta
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full p-3 pl-10 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="ornek@email.com"
                    required
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              {/* Telefon - Sadece kayıt için */}
              {activeTab === 'kayit' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefon
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                    className={`w-full p-3 pl-10 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0555 123 45 67"
                    required
                    />
                  </div>
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
                  )}
                </div>
              )}

              {/* Konum - Sadece kayıt için */}
              {activeTab === 'kayit' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Konum
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="İl, ilçe"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Şirket Adı - Sadece saha sahibi için */}
              {activeTab === 'kayit' && userType === 'owner' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tesis/Şirket Adı
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleInputChange}
                      className={`w-full p-3 pl-10 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      errors.companyName ? 'border-red-500' : 'border-gray-300'
                    }`}
                      placeholder="Tesis adınız"
                      required
                    />
                  </div>
                  {errors.companyName && (
                    <p className="mt-1 text-sm text-red-500">{errors.companyName}</p>
                  )}
                </div>
              )}

              {/* Şifre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Şifre
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full p-3 pl-10 pr-10 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      errors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Şifrenizi girin"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-500">{errors.password}</p>
                )}
              </div>

              {/* Şifre Tekrar - Sadece kayıt için */}
              {activeTab === 'kayit' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Şifre Tekrar
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className={`w-full p-3 pl-10 pr-10 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                    }`}
                      placeholder="Şifrenizi tekrar girin"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>
                  )}
                </div>
              )}

              {/* Error Message */}
              {errors.submit && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{errors.submit}</p>
                </div>
              )}

              {/* Submit Button */}
              <motion.button
                type="submit"
                whileHover={!isLoading ? { scale: 1.02 } : {}}
                whileTap={!isLoading ? { scale: 0.98 } : {}}
                disabled={isLoading}
                className={`w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? 'İşleniyor...' : activeTab === 'giris' ? 'Giriş Yap' : 'Kayıt Ol'}
              </motion.button>

              {/* Forgot Password - Sadece giriş için */}
              {activeTab === 'giris' && (
                <div className="text-center">
                  <button
                    type="button"
                    className="text-sm text-green-600 hover:text-green-700 font-medium"
                  >
                    Şifremi Unuttum
                  </button>
                </div>
              )}
            </form>

            {/* Footer */}
            <div className="mt-8 text-center text-sm text-gray-600">
              <p>
                {activeTab === 'giris' ? 'Hesabınız yok mu?' : 'Zaten hesabınız var mı?'}{' '}
                <button
                  onClick={() => setActiveTab(activeTab === 'giris' ? 'kayit' : 'giris')}
                  className="text-green-600 hover:text-green-700 font-medium"
                >
                  {activeTab === 'giris' ? 'Kayıt Ol' : 'Giriş Yap'}
                </button>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default GirisKayit;

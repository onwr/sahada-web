import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, EyeOff, User, Mail, Lock, Phone, MapPin, Building, UserCheck } from 'lucide-react';
import { registerUser, loginUser } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import toast from '../utils/toast';

const AuthModal = ({ isOpen, onClose, onSuccess }) => {
  const { setUserData, setNeedsOnboarding } = useAuth();
  const [activeTab, setActiveTab] = useState('giris');
  const [userType, setUserType] = useState('player');
  const [showPassword, setShowPassword] = useState(false);
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
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (activeTab === 'kayit') {
      if (!formData.firstName.trim()) newErrors.firstName = 'Ad gereklidir';
      if (!formData.lastName.trim()) newErrors.lastName = 'Soyad gereklidir';
      if (!formData.phone.trim()) newErrors.phone = 'Telefon gereklidir';
      if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Şifreler eşleşmiyor';
      if (formData.password.length < 6) newErrors.password = 'Şifre en az 6 karakter olmalıdır';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'E-posta gereklidir';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Geçerli bir e-posta adresi girin';
    }
    if (!formData.password.trim()) newErrors.password = 'Şifre gereklidir';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      let result;
      if (activeTab === 'giris') {
        result = await loginUser(formData.email, formData.password);
      } else {
        const fullName = `${formData.firstName} ${formData.lastName}`.trim();
        result = await registerUser({
          email: formData.email,
          password: formData.password,
          fullName,
          phone: formData.phone,
          userType: userType,
          onboardingCompleted: false
        });
      }

      if (result.success) {
        if (activeTab === 'kayit' && result.user) {
          setUserData({
            uid: result.user.uid,
            email: result.user.email,
            userType: userType,
            onboardingCompleted: false
          });
          if (setNeedsOnboarding) setNeedsOnboarding(true);
        }
        toast.success(activeTab === 'giris' ? 'Başarıyla giriş yapıldı' : 'Başarıyla kayıt olundu');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setErrors({ submit: result.error || 'Bir hata oluştu' });
        toast.error(result.error || 'Bir hata oluştu');
      }
    } catch (error) {
      setErrors({ submit: 'Bir hata oluştu. Lütfen tekrar deneyin.' });
      toast.error('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
          <X size={24} />
        </button>

        <div className="p-8">
          <div className="text-center mb-8">
            <img src="/images/logo.png" alt="Sahada Logo" className="h-12 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-gray-900">
              {activeTab === 'giris' ? 'Tekrar Hoş Geldin!' : 'Aramıza Katıl!'}
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              {activeTab === 'giris' ? 'Paylaşım yapmak için giriş yapmalısın.' : 'Yeni bir dünya için hemen üye ol.'}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            <button
              onClick={() => setActiveTab('giris')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'giris' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Giriş Yap
            </button>
            <button
              onClick={() => setActiveTab('kayit')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'kayit' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Kayıt Ol
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {activeTab === 'kayit' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Ad</label>
                        <input
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            placeholder="Ad"
                            className={`w-full px-4 py-2 bg-gray-50 border ${errors.firstName ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-green-500 focus:bg-white outline-none transition-all text-sm`}
                            required
                        />
                        {errors.firstName && <p className="text-[10px] text-red-500 font-bold px-1">{errors.firstName}</p>}
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Soyad</label>
                        <input
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            placeholder="Soyad"
                            className={`w-full px-4 py-2 bg-gray-50 border ${errors.lastName ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-green-500 focus:bg-white outline-none transition-all text-sm`}
                            required
                        />
                        {errors.lastName && <p className="text-[10px] text-red-500 font-bold px-1">{errors.lastName}</p>}
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Telefon</label>
                    <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="05xx xxx xx xx"
                        className={`w-full px-4 py-2 bg-gray-50 border ${errors.phone ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-green-500 focus:bg-white outline-none transition-all text-sm`}
                        required
                    />
                    {errors.phone && <p className="text-[10px] text-red-500 font-bold px-1">{errors.phone}</p>}
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">E-posta</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="ornek@email.com"
                className={`w-full px-4 py-2 bg-gray-50 border ${errors.email ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-green-500 focus:bg-white outline-none transition-all text-sm`}
                required
              />
              {errors.email && <p className="text-[10px] text-red-500 font-bold px-1">{errors.email}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Şifre</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••"
                  className={`w-full px-4 py-2 bg-gray-50 border ${errors.password ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-green-500 focus:bg-white outline-none transition-all text-sm`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-[10px] text-red-500 font-bold px-1">{errors.password}</p>}
            </div>

            {activeTab === 'kayit' && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Şifre Tekrar</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="••••••"
                  className={`w-full px-4 py-2 bg-gray-50 border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-green-500 focus:bg-white outline-none transition-all text-sm`}
                  required
                />
                {errors.confirmPassword && <p className="text-[10px] text-red-500 font-bold px-1">{errors.confirmPassword}</p>}
              </div>
            )}

            {errors.submit && (
              <p className="text-xs text-red-500 font-bold px-1">{errors.submit}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-green-600 text-white font-black rounded-xl hover:bg-green-700 transition-all shadow-lg shadow-green-100 flex items-center justify-center gap-2 mt-4 active:scale-95"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                activeTab === 'giris' ? 'Giriş Yap' : 'Kayıt Ol'
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            Giriş veya kayıt yaparak <span className="text-green-600 hover:underline cursor-pointer">Kullanım Koşulları</span>'nı kabul etmiş olursunuz.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthModal;

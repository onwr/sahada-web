import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTesis, toggleFavoriteTesis } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';
import { 
  ArrowLeft, 
  Star, 
  MapPin, 
  Clock, 
  Users, 
  Phone, 
  Mail, 
  Globe, 
  Calendar,
  DollarSign,
  Image as ImageIcon,
  Loader2,
  X,
  Heart,
  Share2,
  Navigation
} from 'lucide-react';

const SahaDetay = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const [sahaData, setSahaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  // Saha verilerini yükle
  useEffect(() => {
    loadSahaData();
  }, [id]);

  // Favori durumunu kontrol et
  useEffect(() => {
    if (userData && userData.favorites && id) {
      setIsFavorite(userData.favorites.includes(id));
    }
  }, [userData, id]);

  const loadSahaData = async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await getTesis(id);
      if (result.success) {
        setSahaData(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Saha verileri yüklenirken hata oluştu');
      console.error('Saha yükleme hatası:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!user) {
      // Giriş yapmamış kullanıcıyı yönlendir veya uyar
      navigate('/login');
      return;
    }
    
    setFavLoading(true);
    try {
      const result = await toggleFavoriteTesis(user.uid, id);
      if (result.success) {
        setIsFavorite(result.isFavorite);
      }
    } catch (error) {
      console.error('Favori değiştirme hatası:', error);
    } finally {
      setFavLoading(false);
    }
  };

  const handleImageClick = (index) => {
    setSelectedImageIndex(index);
    setShowImageModal(true);
  };

  const handleRezerveEt = () => {
    // Rezervasyon sayfasına yönlendir
    navigate(`/rezervasyon/${id}`);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: sahaData?.name,
        text: `${sahaData?.name} - ${sahaData?.type} sahası`,
        url: window.location.href,
      });
    } else {
      // Fallback: URL'yi kopyala
      navigator.clipboard.writeText(window.location.href);
      alert('Link kopyalandı!');
    }
  };

  const handleNavigation = () => {
    if (sahaData?.latitude && sahaData?.longitude) {
      const url = `https://www.google.com/maps?q=${sahaData.latitude},${sahaData.longitude}`;
      window.open(url, '_blank');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-green-600" />
          <p className="text-gray-600">Saha verileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Hata</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    );
  }

  // Saha bulunamadı
  if (!sahaData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🏟️</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Saha Bulunamadı</h3>
          <p className="text-gray-600 mb-4">Aradığınız saha bulunamadı veya silinmiş olabilir.</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{sahaData.name}</h1>
                <p className="text-sm text-gray-600">{sahaData.location}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleShare}
                className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                <Share2 className="w-5 h-5" />
              </button>
              <button 
                onClick={handleToggleFavorite}
                disabled={favLoading}
                className={`p-2 rounded-lg transition-all ${
                  isFavorite 
                    ? 'text-red-500 bg-red-50 hover:bg-red-100' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-red-500'
                }`}
              >
                {favLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Images and Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Image */}
            <div className="relative h-64 md:h-80 bg-gray-200 rounded-xl overflow-hidden">
              {sahaData.images && sahaData.images.length > 0 ? (
                <img
                  src={sahaData.images[0].optimized_url || sahaData.images[0].url}
                  alt={sahaData.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                  <span className="text-6xl">🏟️</span>
                </div>
              )}
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                  {sahaData.status === 'active' ? 'Aktif' : 'Pasif'}
                </span>
                <span className="bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                  {sahaData.type}
                </span>
              </div>
            </div>

            {/* Image Gallery */}
            {sahaData.images && sahaData.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {sahaData.images.slice(1, 5).map((image, index) => (
                  <button
                    key={index}
                    onClick={() => handleImageClick(index + 1)}
                    className="relative h-20 bg-gray-200 rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                  >
                    <img
                      src={image.optimized_url || image.url}
                      alt={`${sahaData.name} ${index + 2}`}
                      className="w-full h-full object-cover"
                    />
                    {sahaData.images.length > 4 && index === 3 && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          +{sahaData.images.length - 4}
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Saha Bilgileri */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Saha Bilgileri</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Kapasite</p>
                      <p className="font-semibold text-gray-900">{sahaData.capacity} kişi</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Çalışma Saatleri</p>
                      <p className="font-semibold text-gray-900">{sahaData.workingHours}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Star className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Puanlama</p>
                      <p className="font-semibold text-gray-900">{sahaData.rating || 0}/5</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-20 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Konum</p>
                      <p className="font-semibold text-gray-900">{sahaData.location}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Açıklama */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Açıklama</h2>
              <p className="text-gray-700 leading-relaxed">{sahaData.description}</p>
            </div>

            {/* Olanaklar */}
            {sahaData.facilities && sahaData.facilities.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Olanaklar</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {sahaData.facilities.map((facility, index) => (
                    <div key={index} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-700">{facility}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* İletişim Bilgileri */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">İletişim Bilgileri</h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">{sahaData.phone}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">{sahaData.email}</span>
                </div>
                {sahaData.website && (
                  <div className="flex items-center space-x-3">
                    <Globe className="w-5 h-5 text-gray-400" />
                    <a 
                      href={sahaData.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-green-600 hover:text-green-700"
                    >
                      {sahaData.website}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Booking Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="bg-white rounded-xl p-6 shadow-lg border">
                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center gap-1 mb-2">
                    <span className="text-4xl font-bold text-green-600">₺{sahaData.price}</span>
                    <span className="text-gray-500">/ saat</span>
                  </div>
                  <p className="text-sm text-gray-600">Saatlik ücret</p>
                </div>

                <div className="space-y-4 mb-6">
                  <button
                    onClick={handleRezerveEt}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all duration-200"
                  >
                    Rezerve Et
                  </button>
                  
                  <button
                    onClick={handleNavigation}
                    className="w-full flex items-center justify-center space-x-2 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Yol Tarifi</span>
                  </button>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>Toplam Rezervasyon</span>
                    <span className="font-semibold">{sahaData.reservations || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Ortalama Puan</span>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="font-semibold">{sahaData.rating || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && sahaData.images && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 z-10 p-2 bg-white bg-opacity-20 rounded-full text-white hover:bg-opacity-30"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={sahaData.images[selectedImageIndex].optimized_url || sahaData.images[selectedImageIndex].url}
              alt={`${sahaData.name} ${selectedImageIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
            {sahaData.images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                {sahaData.images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`w-3 h-3 rounded-full ${
                      index === selectedImageIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SahaDetay;

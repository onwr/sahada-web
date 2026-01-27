import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getTesis, toggleFavoriteTesis, addReview, getTesisReviews, deleteReview, checkCanUserReview } from '../services/firestoreService';
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
  Navigation,
  ChevronLeft,
  ChevronRight,
  Wifi,
  Car,
  Coffee,
  Bath,
  Tv,
  Utensils,
  Shirt,
  Wind
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import toast from '../utils/toast';

const SahaDetay = () => {
  const { idOrSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userData } = useAuth();
  const [sahaData, setSahaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewForm, setReviewForm] = useState({ 
    rating: 5, 
    comment: '',
    surface: 5,
    lighting: 5,
    service: 5
  });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(true);

  const handleShareClick = async () => {
    const name = sahaData?.name || 'Spor Tesisi';
    const slug = sahaData?.slug || sahaData?.id || idOrSlug;
    const shareUrl = `${window.location.origin}/saha/${slug}`;
    const shareTitle = `${name} | Saha Merkezi`;
    const shareText = `🏟️ ${name} halı sahasını incele! Saha Merkezi üzerinden hemen rezervasyon yapabilir veya tesis bilgilerine ulaşabilirsin.`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Paylaşım linki kopyalandı!');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(shareUrl);
          toast.success('Paylaşım linki kopyalandı!');
        } catch (e) {
          toast.error('Link kopyalanamadı');
        }
      }
    }
  };

  useEffect(() => {
    if (sahaData) {
      const name = sahaData.name || 'Spor Tesisi';
      const title = `${name} | Saha Merkezi`;
      document.title = title;

      const updateMeta = (selector, attr, content) => {
        const el = document.querySelector(selector);
        if (el) el.setAttribute(attr, content);
      };

      updateMeta('meta[name="description"]', 'content', `${name} halı saha detayları, rezervasyon imkanları ve kullanıcı yorumları. Saha Merkezi ile hemen maçını planla!`);
      updateMeta('meta[property="og:title"]', 'content', title);
      updateMeta('meta[property="og:description"]', 'content', `${name} tesis detaylarını görüntüle.`);
      if (sahaData.images?.[0]) {
        updateMeta('meta[property="og:image"]', 'content', sahaData.images[0]);
        updateMeta('meta[property="twitter:image"]', 'content', sahaData.images[0]);
      }
    }
  }, [sahaData]);

  // Handle URL cleanup - if accessed by ID, redirect to slug
  useEffect(() => {
    if (sahaData?.slug && idOrSlug === sahaData.id) {
      navigate(`/saha/${sahaData.slug}`, { replace: true });
    }
  }, [sahaData, idOrSlug, navigate]);

  // Saha verilerini yükle
  useEffect(() => {
    loadSahaData();
  }, [idOrSlug]);

  useEffect(() => {
     if (sahaData?.id) {
        loadReviews();
     }
  }, [sahaData?.id]);

  const loadReviews = async () => {
    const tesisId = sahaData?.id || idOrSlug;
    if (!tesisId) return;
    setReviewsLoading(true);
    const result = await getTesisReviews(tesisId);
    if (result.success) {
      setReviews(result.data);
    }
    setReviewsLoading(false);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    const tesisId = sahaData?.id || idOrSlug;
    if (!tesisId) return;

    setSubmittingReview(true);
    try {
      const reviewData = {
        userId: user.uid,
        userName: userData?.fullName || user.displayName || 'Kullanıcı',
        userAvatar: userData?.photoURL || user.photoURL || null,
        rating: reviewForm.rating,
        comment: reviewForm.comment,
        details: {
          surface: reviewForm.surface,
          lighting: reviewForm.lighting,
          service: reviewForm.service
        }
      };

      const result = await addReview(tesisId, reviewData);
      
      if (result.success) {
        setShowReviewModal(false);
        setReviewForm({ rating: 5, comment: '', surface: 5, lighting: 5, service: 5 });
        // Firestore indexing için çok kısa bir bekleme ve update
        setTimeout(() => {
          loadReviews();
          loadSahaData();
        }, 800);
        alert('Değerlendirmeniz başarıyla eklendi!');
      } else {
        alert('Değerlendirme eklenirken bir hata oluştu.');
      }
    } catch (error) {
      console.error(error);
      alert('Hata oluştu.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId, rating) => {
    if (!window.confirm('Bu değerlendirmeyi silmek istediğinizden emin misiniz?')) return;

    const tesisId = sahaData?.id || idOrSlug;
    try {
      const result = await deleteReview(reviewId, tesisId, rating);
      if (result.success) {
        loadReviews();
        loadSahaData();
        toast.success('Değerlendirmeniz silindi.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Silme işlemi sırasında bir hata oluştu.');
    }
  };

  // Favori durumunu kontrol et
  useEffect(() => {
    const tesisId = sahaData?.id || idOrSlug;
    if (userData && userData.favorites && tesisId) {
      setIsFavorite(userData.favorites.includes(tesisId));
    }
  }, [userData, sahaData?.id, idOrSlug]);

  const loadSahaData = async () => {
    if (!idOrSlug) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await getTesis(idOrSlug);
      if (result.success) {
        setSahaData(result.data);
      } else {
        setError(result.error);
      }

      // Değerlendirme izni - Herkese açık hale getirildi
      if (user) {
        setCanReview(true);
        setCheckingPermission(false);
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
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    
    const tesisId = sahaData?.id || idOrSlug;
    setFavLoading(true);
    try {
      const result = await toggleFavoriteTesis(user.uid, tesisId);
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

  const nextImage = () => {
    if (!sahaData?.images) return;
    setSelectedImageIndex((prev) => (prev + 1) % sahaData.images.length);
  };

  const prevImage = () => {
    if (!sahaData?.images) return;
    setSelectedImageIndex((prev) => (prev - 1 + sahaData.images.length) % sahaData.images.length);
  };

  const handleRezerveEt = () => {
    // Rezervasyon sayfasına yönlendir
    const tesisId = sahaData?.id || idOrSlug;
    navigate(`/rezervasyon/${tesisId}`);
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
    <div className="min-h-screen bg-gray-50 font-sans selection:bg-green-100 selection:text-green-900">
      <Header />
      
      {/* Sub Header / Sticky Back Button & Name Bar */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b sticky top-[64px] z-40 transition-all">
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
                <p className="text-sm text-gray-600">
                  {sahaData.location || sahaData.address || (sahaData.latitude ? 'Harita üzerinde işaretli' : 'Konum bilgisi yok')}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleShareClick}
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
            <div 
              onClick={() => handleImageClick(0)}
              className="relative h-64 md:h-80 bg-gray-200 rounded-xl overflow-hidden cursor-zoom-in"
            >
              {sahaData.images && sahaData.images.length > 0 ? (
                <img
                  src={sahaData.images[0].optimized_url || sahaData.images[0].url}
                  alt={sahaData.name}
                  className="w-full h-full object-cover transition-transform hover:scale-105 duration-700"
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
                      <p 
                        onClick={handleNavigation}
                        className="font-semibold text-gray-900 leading-tight cursor-pointer hover:text-green-600 transition-colors"
                      >
                        {sahaData.location || sahaData.address || (sahaData.latitude ? 'Harita üzerinde işaretli' : 'Konum bilgisi yok')}
                      </p>
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {sahaData.facilities.map((facility, index) => {
                    const getIcon = (name) => {
                      const n = name.toLowerCase();
                      if (n.includes('wifi') || n.includes('internet')) return <Wifi size={18} className="text-blue-500" />;
                      if (n.includes('park')) return <Car size={18} className="text-gray-600" />;
                      if (n.includes('kafe') || n.includes('kantin')) return <Coffee size={18} className="text-orange-500" />;
                      if (n.includes('duş') || n.includes('soyuna')) return <Bath size={18} className="text-blue-400" />;
                      if (n.includes('tv') || n.includes('televizyon')) return <Tv size={18} className="text-red-500" />;
                      if (n.includes('yemek') || n.includes('restoran')) return <Utensils size={18} className="text-orange-600" />;
                      if (n.includes('kiralık') || n.includes('ekipman')) return <Shirt size={18} className="text-green-500" />;
                      if (n.includes('klima') || n.includes('havalandırma')) return <Wind size={18} className="text-indigo-400" />;
                      return <div className="w-2 h-2 bg-green-500 rounded-full"></div>;
                    };

                    return (
                      <div key={index} className="flex items-center space-x-3 p-3.5 bg-gray-50 rounded-2xl border border-gray-100/50 hover:bg-white hover:shadow-md hover:border-green-100 transition-all duration-300">
                        {getIcon(facility)}
                        <span className="text-sm font-semibold text-gray-700">{facility}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* İletişim Bilgileri */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">İletişim Bilgileri</h2>
              <div className="space-y-4">
                <div 
                  onClick={handleNavigation}
                  className="flex items-start space-x-3 cursor-pointer group"
                >
                  <MapPin className="w-5 h-5 text-gray-400 mt-1 group-hover:text-green-600 transition-colors" />
                  <span className="text-gray-700 group-hover:text-green-600 transition-colors">
                    {sahaData.address || sahaData.location || (sahaData.latitude ? 'Harita üzerinde işaretli (Yol tarifi için tıklayın)' : 'Konum bilgisi yok')}
                  </span>
                </div>
                {sahaData.phone && (
                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-700">{sahaData.phone}</span>
                  </div>
                )}
                {sahaData.email && (
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-700">{sahaData.email}</span>
                  </div>
                )}
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
            {/* Değerlendirmeler */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Değerlendirmeler</h2>
                  <div className="flex items-center mt-1">
                    <Star className="w-5 h-5 text-yellow-500 fill-current" />
                    <span className="ml-1 font-bold text-gray-900">{sahaData.rating || 0}</span>
                    <span className="mx-1 text-gray-400">•</span>
                    <span className="text-gray-600">{sahaData.ratingCount || 0} değerlendirme</span>
                  </div>
                </div>
                {!user ? (
                   <button 
                     onClick={() => navigate('/login')}
                     className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                   >
                     Yorum Yapmak İçin Giriş Yap
                   </button>
                ) : (
                  <div className="flex flex-col items-end gap-1">
                    <button 
                      onClick={() => setShowReviewModal(true)}
                      className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      Değerlendir
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {reviewsLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-green-600" />
                  </div>
                ) : reviews.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {reviews.map((review) => (
                      <div key={review.id} className="py-6 first:pt-0 last:pb-0">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-full overflow-hidden shrink-0">
                               {review.userAvatar && (
                                 <img 
                                   src={review.userAvatar} 
                                   alt={review.userName} 
                                   className="w-full h-full object-cover"
                                   onError={(e) => {
                                     e.target.style.display = 'none';
                                     const placeholder = e.target.nextSibling;
                                     if (placeholder) placeholder.style.display = 'flex';
                                   }}
                                 />
                               )}
                               <div 
                                 className="w-full h-full items-center justify-center bg-green-50 text-green-600 font-bold"
                                 style={{ display: review.userAvatar ? 'none' : 'flex' }}
                               >
                                 {review.userName?.charAt(0).toUpperCase()}
                               </div>
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 truncate">{review.userName}</p>
                              <p className="text-xs text-gray-500">
                                {review.createdAt?.toDate ? review.createdAt.toDate().toLocaleDateString('tr-TR') : 'Yeni'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="flex bg-yellow-50 px-2 py-1 rounded-lg">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`w-3.5 h-3.5 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                />
                              ))}
                            </div>
                            
                            {user && (user.uid === review.userId || userData?.role === 'admin') && (
                              <button
                                onClick={() => handleDeleteReview(review.id, review.rating)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Yorumu Sil"
                              >
                                <X size={16} />
                              </button>
                            )}
                          </div>
                        </div>

                        {review.comment && (
                          <p className="text-gray-700 text-sm leading-relaxed ml-13">
                            {review.comment}
                          </p>
                        )}
                        
                        {/* Detaylı Puanlar (Opsiyonel Görüntüleme) */}
                        {review.details && (
                          <div className="flex gap-4 mt-2 ml-13">
                            {review.details.surface && (
                              <span className="text-[10px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded">Zemin: {review.details.surface}/5</span>
                            )}
                            {review.details.lighting && (
                              <span className="text-[10px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded">Işık: {review.details.lighting}/5</span>
                            )}
                            {review.details.service && (
                              <span className="text-[10px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded">Hizmet: {review.details.service}/5</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <p className="font-medium">Henüz değerlendirme yapılmamış.</p>
                    <p className="text-sm mt-1">Bu saha hakkındaki ilk yorumu siz yapın!</p>
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
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close Button */}
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 z-[110] p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all transform hover:scale-110 active:scale-90"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Navigation Buttons */}
            {sahaData.images.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); prevImage(); }}
                  className="absolute left-4 z-[110] p-4 bg-white/5 hover:bg-white/20 backdrop-blur-sm rounded-full text-white transition-all group"
                >
                  <ChevronLeft className="w-8 h-8 group-hover:-translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); nextImage(); }}
                  className="absolute right-4 z-[110] p-4 bg-white/5 hover:bg-white/20 backdrop-blur-sm rounded-full text-white transition-all group"
                >
                  <ChevronRight className="w-8 h-8 group-hover:translate-x-1 transition-transform" />
                </button>
              </>
            )}

            {/* Main Image */}
            <div 
              className="relative max-w-5xl max-h-[85vh] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={sahaData.images[selectedImageIndex].optimized_url || sahaData.images[selectedImageIndex].url}
                alt={`${sahaData.name} ${selectedImageIndex + 1}`}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              />
              
              {/* Counter */}
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium">
                {selectedImageIndex + 1} / {sahaData.images.length}
              </div>
            </div>

            {/* Click backdrop to close */}
            <div 
              className="absolute inset-0 z-0" 
              onClick={() => setShowImageModal(false)}
            />
          </div>
        </div>
      )}
      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Değerlendir</h3>
              <button 
                onClick={() => setShowReviewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleReviewSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Puanınız</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewForm(prev => ({ ...prev, rating: star }))}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star 
                        className={`w-8 h-8 ${
                          star <= reviewForm.rating 
                            ? 'text-yellow-400 fill-current' 
                            : 'text-gray-300'
                        }`} 
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Detaylı Puanlama */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 pt-4 border-t border-gray-100">
                {/* Zemin */}
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Zemin</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewForm(prev => ({ ...prev, surface: star }))}
                      >
                        <Star className={`w-4 h-4 ${star <= reviewForm.surface ? 'text-green-500 fill-current' : 'text-gray-300'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Işık */}
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Işık</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewForm(prev => ({ ...prev, lighting: star }))}
                      >
                        <Star className={`w-4 h-4 ${star <= reviewForm.lighting ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hizmet */}
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Hizmet</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewForm(prev => ({ ...prev, service: star }))}
                      >
                        <Star className={`w-4 h-4 ${star <= reviewForm.service ? 'text-blue-500 fill-current' : 'text-gray-300'}`} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Yorumunuz</label>
                <textarea
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 min-h-[100px]"
                  placeholder="Saha hakkındaki düşüncelerinizi paylaşın..."
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submittingReview}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
              >
                {submittingReview ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Gönderiliyor...
                  </>
                ) : (
                  'Değerlendir'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default SahaDetay;
